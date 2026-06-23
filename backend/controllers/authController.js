const User = require('../models/User');
const UserStats = require('../models/UserStats');
const asyncHandler = require('../middleware/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyRefreshToken, 
  generateResetToken, 
  verifyResetToken 
} = require('../utils/jwt');
const crypto = require('crypto');
const validator = require('validator');
const { OAuth2Client } = require('google-auth-library');
const { sendWelcomeEmail, sendResetCodeEmail, sendEmailVerificationCode } = require('../utils/emailService');
const {
  attachAuthCookies,
  clearAuthCookies,
  hashToken,
  parseCookies,
  REFRESH_COOKIE_NAME,
} = require('../utils/authSecurity');

const calculateRank = (xp) => {
  if (xp >= 50000) return 'LEGEND';
  if (xp >= 20000) return 'MASTER';
  if (xp >= 10000) return 'SENIOR';
  if (xp >= 5000) return 'MIDDLE';
  if (xp >= 2000) return 'JUNIOR';
  if (xp >= 500) return 'CANDIDATE';
  return 'AMATEUR';
};

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const normalizeUsername = (username) => String(username || '').trim().toLowerCase();

// Google id_token'ni tekshirish uchun ruxsat etilgan client ID'lar (web/android/ios).
// GOOGLE_CLIENT_IDS=vergul bilan ajratilgan ro'yxat (yoki bitta GOOGLE_CLIENT_ID).
const getGoogleClientIds = () =>
  String(process.env.GOOGLE_CLIENT_IDS || process.env.GOOGLE_CLIENT_ID || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

const googleClient = new OAuth2Client();

// Google profilidan unik username yasaymiz (collision bo'lsa raqam qo'shamiz).
const generateUniqueUsername = async (base) => {
  let candidate = normalizeUsername(base).replace(/[^a-z0-9_]/g, '').slice(0, 20);
  if (candidate.length < 3) candidate = `user${crypto.randomBytes(2).toString('hex')}`;
  let username = candidate;
  let suffix = 0;
  // eslint-disable-next-line no-await-in-loop
  while (await User.findOne({ username })) {
    suffix += 1;
    username = `${candidate}${suffix}`;
  }
  return username;
};

const sanitizeUser = (user) => ({
  _id: user._id,
  username: user.username,
  email: user.email,
  role: user.role,
  firstName: user.firstName,
  lastName: user.lastName,
  avatar: user.avatar || null,
  xp: user.xp || 0,
  streak: user.streak || 0,
  rankTitle: user.rankTitle,
  referralCode: user.referralCode || null,
  referralsCount: user.referralsCount || 0,
  lastClaimedDaily: user.lastClaimedDaily || null,
  emailVerified: user.emailVerified ?? true, // eski userlar verified hisoblanadi
});

// @desc    Register new user
const register = asyncHandler(async (req, res, next) => {
  const { username, email, password, firstName, lastName, referralCode } = req.body;
  const normalizedEmail = normalizeEmail(email);
  const normalizedUsername = normalizeUsername(username);

  if (!normalizedUsername || !normalizedEmail || !password) {
    return next(new ErrorResponse('Please provide username, email, and password', 400));
  }

  if (!validator.isEmail(normalizedEmail)) {
    return next(new ErrorResponse('Please provide a valid email address', 400));
  }

  // Strict password rules
  if (!passwordRegex.test(password)) {
    return next(new ErrorResponse('Password must be at least 8 chars with upper, lower, digit and special char', 400));
  }

  const existingUser = await User.findOne({
    $or: [{ email: normalizedEmail }, { username: normalizedUsername }],
  });
  if (existingUser) {
    return next(new ErrorResponse('Email or username already exists', 400));
  }

  // Check and process Referral Code
  let referredBy = null;
  let startingXp = 0;
  if (referralCode) {
    const referrer = await User.findOne({ referralCode });
    if (referrer) {
      referredBy = referrer._id;
      startingXp = 500; // Bonus for joining via referral
      
      // Award the referrer directly here
      referrer.xp = (referrer.xp || 0) + 1000;
      referrer.rankTitle = calculateRank(referrer.xp);
      referrer.referralsCount = (referrer.referralsCount || 0) + 1;
      await referrer.save();

      // Referrer statsini ham yangilash
      let referrerStats = await UserStats.findOne({ userId: referrer._id });
      if (referrerStats) {
        referrerStats.xp = (referrerStats.xp || 0) + 1000;
        referrerStats.weeklyXp = (referrerStats.weeklyXp || 0) + 1000;
        referrerStats.level = referrerStats.calculateLevel();
        await referrerStats.save();
      }
    }
  }

  const newReferralCode = normalizedUsername.substring(0, 4).toUpperCase() + crypto.randomBytes(2).toString('hex').toUpperCase();

  const user = await User.create({
    username: normalizedUsername,
    email: normalizedEmail,
    password,
    firstName,
    lastName,
    referralCode: newReferralCode,
    referredBy,
    xp: startingXp,
    rankTitle: calculateRank(startingXp)
  });

  const accessToken = generateAccessToken({ userId: user._id });
  const refreshToken = generateRefreshToken({ userId: user._id });

  user.refreshToken = hashToken(refreshToken);
  await user.save();
  attachAuthCookies(res, accessToken, refreshToken);

  // Background tasks
  UserStats.create({ userId: user._id, xp: user.xp, weeklyXp: user.xp }).catch(() => {});

  // Email verification code yuborish (background)
  const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();
  User.findByIdAndUpdate(user._id, {
    emailVerificationCode: hashToken(verifyCode),
    emailVerificationExpire: new Date(Date.now() + 24 * 60 * 60 * 1000),
  }).exec();
  sendEmailVerificationCode(user.email, user.username, verifyCode).catch(() => {});
  sendWelcomeEmail(user.email, user.username).catch(() => {});

  // Telegram admin bildirishnoma
  try {
    const { getBot } = require('../utils/telegramBot');
    const bot = getBot();
    if (bot) bot.notifyNewRegistration(user);
  } catch (_) {}

  res.status(201).json({
    success: true,
    data: {
      user: sanitizeUser(user),
      accessToken,
      refreshToken,
    },
  });
});

// @desc    Login
const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !password) {
    return next(new ErrorResponse('Please provide email and password', 400));
  }

  // Find user by email
  const user = await User.findOne({ email: normalizedEmail }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  if (!user.isActive) {
    return next(new ErrorResponse('Account deactivated', 403));
  }

  const accessToken = generateAccessToken({ userId: user._id });
  const refreshToken = generateRefreshToken({ userId: user._id });

  user.refreshToken = hashToken(refreshToken);
  user.lastLogin = Date.now();
  await user.save();
  attachAuthCookies(res, accessToken, refreshToken);

  res.json({
    success: true,
    data: {
      user: sanitizeUser(user),
      accessToken,
      refreshToken,
    },
  });
});

// @desc    Google bilan kirish / ro'yxatdan o'tish
// Mobil ilova Google'dan olgan id_token'ni yuboradi; uni Google bilan tekshiramiz,
// userni topamiz (yoki yaratamiz) va odatiy login javobini qaytaramiz.
const googleAuth = asyncHandler(async (req, res, next) => {
  const { idToken, referralCode } = req.body;
  if (!idToken) {
    return next(new ErrorResponse('Google token kerak', 400));
  }

  const allowedClientIds = getGoogleClientIds();
  if (allowedClientIds.length === 0) {
    return next(new ErrorResponse('Google auth sozlanmagan', 500));
  }

  // id_token'ni Google bilan tekshiramiz — audience bizning client ID'lardan biri bo'lishi shart.
  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken, audience: allowedClientIds });
    payload = ticket.getPayload();
  } catch (err) {
    return next(new ErrorResponse('Google token yaroqsiz', 401));
  }

  if (!payload || !payload.email) {
    return next(new ErrorResponse('Google token yaroqsiz', 401));
  }

  const googleId = payload.sub;
  const email = normalizeEmail(payload.email);
  const picture = payload.picture || null;
  const firstName = payload.given_name || null;
  const lastName = payload.family_name || null;

  // googleId yoki email bo'yicha mavjud userni qidiramiz.
  let user = await User.findOne({ $or: [{ googleId }, { email }] });

  if (user) {
    // Mavjud (masalan parol bilan ochilgan) akkauntni Google'ga bog'laymiz.
    if (!user.googleId) user.googleId = googleId;
    if (!user.emailVerified) user.emailVerified = true;
    if (!user.avatar && picture) user.avatar = picture;
  } else {
    // Yangi user — referral logikasi (register bilan bir xil).
    let referredBy = null;
    let startingXp = 0;
    if (referralCode) {
      const referrer = await User.findOne({ referralCode });
      if (referrer) {
        referredBy = referrer._id;
        startingXp = 500;
        referrer.xp = (referrer.xp || 0) + 1000;
        referrer.rankTitle = calculateRank(referrer.xp);
        referrer.referralsCount = (referrer.referralsCount || 0) + 1;
        await referrer.save();

        const referrerStats = await UserStats.findOne({ userId: referrer._id });
        if (referrerStats) {
          referrerStats.xp = (referrerStats.xp || 0) + 1000;
          referrerStats.weeklyXp = (referrerStats.weeklyXp || 0) + 1000;
          referrerStats.level = referrerStats.calculateLevel();
          await referrerStats.save();
        }
      }
    }

    const username = await generateUniqueUsername(email.split('@')[0]);
    const newReferralCode = username.substring(0, 4).toUpperCase() + crypto.randomBytes(2).toString('hex').toUpperCase();

    user = new User({
      username,
      email,
      googleId,
      firstName,
      lastName,
      avatar: picture,
      emailVerified: true, // Google emaillari allaqachon tasdiqlangan
      referralCode: newReferralCode,
      referredBy,
      xp: startingXp,
      rankTitle: calculateRank(startingXp),
    });

    // Background tasks (register bilan bir xil)
    UserStats.create({ userId: user._id, xp: user.xp, weeklyXp: user.xp }).catch(() => {});
    sendWelcomeEmail(user.email, user.username).catch(() => {});
    try {
      const { getBot } = require('../utils/telegramBot');
      const bot = getBot();
      if (bot) bot.notifyNewRegistration(user);
    } catch (_) {}
  }

  const accessToken = generateAccessToken({ userId: user._id });
  const refreshToken = generateRefreshToken({ userId: user._id });
  user.refreshToken = hashToken(refreshToken);
  user.lastLogin = Date.now();
  await user.save();
  attachAuthCookies(res, accessToken, refreshToken);

  res.json({
    success: true,
    data: {
      user: sanitizeUser(user),
      accessToken,
      refreshToken,
    },
  });
});

// @desc    Refresh Token
const refresh = asyncHandler(async (req, res, next) => {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[REFRESH_COOKIE_NAME] || req.body?.refreshToken;

  if (!token) return next(new ErrorResponse('No refresh token provided', 400));

  const decoded = verifyRefreshToken(token);
  if (!decoded) return next(new ErrorResponse('Invalid or expired refresh token', 401));

  const user = await User.findById(decoded.userId).select('+refreshToken');
  if (!user || user.refreshToken !== hashToken(token)) {
    return next(new ErrorResponse('Refresh token invalid', 401));
  }

  const accessToken = generateAccessToken({ userId: user._id });
  const newRefreshToken = generateRefreshToken({ userId: user._id });

  user.refreshToken = hashToken(newRefreshToken);
  await user.save();
  attachAuthCookies(res, accessToken, newRefreshToken);

  res.json({
    success: true,
    data: {
      user: sanitizeUser(user),
      accessToken,
      refreshToken: newRefreshToken,
    },
  });
});

// @desc    Logout
const logout = asyncHandler(async (req, res, next) => {
  if (req.user) {
    await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
  }
  clearAuthCookies(res);
  res.json({ success: true, message: 'Logged out' });
});

// @desc    Get Me
const getMe = asyncHandler(async (req, res, next) => {
  let user = await User.findById(req.user._id);

  // Backfill: eski userlar uchun bir martalik referralCode yaratish
  if (!user.referralCode) {
    const newReferralCode = user.username.substring(0, 4).toUpperCase() + crypto.randomBytes(2).toString('hex').toUpperCase();
    user = await User.findByIdAndUpdate(
      user._id,
      { referralCode: newReferralCode },
      { new: true }
    );
  }

  res.json({ success: true, data: sanitizeUser(user) });
});

// @desc    Get Referral Stats and Leaderboard
const getReferralStats = asyncHandler(async (req, res, next) => {
  const currentUserId = req.user._id;

  // Personal invited friends
  const myFriends = await User.find({ referredBy: currentUserId })
    .select('username firstName lastName createdAt xp rankTitle avatar')
    .sort('-createdAt')
    .limit(50);

  // Top overall platform referrers
  const topReferrers = await User.find({ referralsCount: { $gt: 0 } })
    .select('username firstName lastName xp rankTitle referralsCount avatar')
    .sort('-referralsCount')
    .limit(3);

  // Recalculate my total referral XP correctly to ensure UI reflects correctly
  const totalEarnedXp = (req.user.referralsCount || 0) * 1000;

  res.json({
    success: true,
    data: {
      totalFriends: req.user.referralsCount || 0,
      totalEarnedXp,
      myFriends,
      topReferrers
    }
  });
});

// @desc    Claim Daily Reward
const claimDailyReward = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id)
  const now = new Date()

  // Bugun allaqachon olganini tekshirish (UTC kun bo'yicha)
  if (user.lastClaimedDaily) {
    const lastClaim = new Date(user.lastClaimedDaily)
    const todayUTC = now.toISOString().slice(0, 10)
    const lastClaimUTC = lastClaim.toISOString().slice(0, 10)

    if (todayUTC === lastClaimUTC) {
      return next(new ErrorResponse('Bugun mukofot allaqachon olingan. Ertaga qayta urunib ko\'ring.', 400))
    }
  }

  user.xp = (user.xp || 0) + 50
  user.lastClaimedDaily = now
  user.rankTitle = calculateRank(user.xp)

  // UserStats ga ham XP qo'shish (leaderboard uchun)
  let stats = await UserStats.findOne({ userId: user._id })
  if (!stats) {
    stats = await UserStats.create({ userId: user._id })
  }
  stats.xp += 50
  stats.weeklyXp = (stats.weeklyXp || 0) + 50
  stats.level = stats.calculateLevel()

  // Streak yangilash
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (stats.lastActivityDate) {
    const last = new Date(stats.lastActivityDate)
    last.setHours(0, 0, 0, 0)
    const diffDays = Math.floor((today - last) / (1000 * 60 * 60 * 24))
    if (diffDays === 1) {
      stats.streak += 1
    } else if (diffDays > 1) {
      stats.streak = 1
    }
  } else {
    stats.streak = 1
  }
  stats.lastActivityDate = new Date()
  await stats.save()

  // User streak ni stats bilan sinxronlash (bitta save)
  user.streak = stats.streak
  await user.save()

  res.json({
    success: true,
    message: 'Kunlik mukofot qabul qilindi (+50 XP)',
    xp: user.xp,
    streak: user.streak,
    lastClaimedDaily: user.lastClaimedDaily
  })
})

// @desc    Forgot Password
const forgotPassword = asyncHandler(async (req, res, next) => {
  const normalizedEmail = normalizeEmail(req.body?.email);
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    return res.json({ success: true, message: 'If the account exists, a reset code has been sent' });
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  user.resetPasswordCode = hashToken(code);
  user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
  await user.save();

  await sendResetCodeEmail(user.email, user.username, code);

  res.json({ success: true, message: 'If the account exists, a reset code has been sent' });
});

// @desc    Verify Code
const verifyCode = asyncHandler(async (req, res, next) => {
  const { email, code } = req.body;
  const normalizedEmail = normalizeEmail(email);
  const user = await User.findOne({ 
    email: normalizedEmail,
    resetPasswordCode: hashToken(code),
    resetPasswordExpire: { $gt: Date.now() } 
  });

  if (!user) return next(new ErrorResponse('Invalid or expired code', 400));

  const resetToken = generateResetToken({ email: user.email });
  res.json({ success: true, data: { resetToken } });
});

// @desc    Reset Password
const resetPassword = asyncHandler(async (req, res, next) => {
  const { email, resetToken, newPassword } = req.body;
  const normalizedEmail = normalizeEmail(email);

  if (!passwordRegex.test(newPassword)) {
    return next(new ErrorResponse('Password must be at least 8 chars with upper, lower, digit and special char', 400));
  }

  const decoded = verifyResetToken(resetToken);
  if (!decoded || decoded.email !== normalizedEmail) {
    return next(new ErrorResponse('Invalid reset token', 400));
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) return next(new ErrorResponse('User not found', 404));

  user.password = newPassword;
  user.resetPasswordCode = null;
  user.resetPasswordExpire = null;
  user.refreshToken = null;
  await user.save();
  clearAuthCookies(res);

  res.json({ success: true, message: 'Password updated' });
});

// @desc    Email tasdiqlash
const verifyEmail = asyncHandler(async (req, res, next) => {
  const { code } = req.body;
  if (!code) return next(new ErrorResponse('Kod kiritilmadi', 400));

  const user = await User.findOne({
    _id: req.user._id,
    emailVerificationCode: hashToken(code),
    emailVerificationExpire: { $gt: Date.now() },
  }).select('+emailVerificationCode +emailVerificationExpire');

  if (!user) return next(new ErrorResponse('Kod noto\'g\'ri yoki muddati o\'tgan', 400));

  user.emailVerified = true;
  user.emailVerificationCode = null;
  user.emailVerificationExpire = null;
  await user.save();

  res.json({ success: true, message: 'Email muvaffaqiyatli tasdiqlandi' });
});

// @desc    Verification kodni qayta yuborish
const resendVerification = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  if (user.emailVerified) {
    return next(new ErrorResponse('Email allaqachon tasdiqlangan', 400));
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  user.emailVerificationCode = hashToken(code);
  user.emailVerificationExpire = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await user.save();

  sendEmailVerificationCode(user.email, user.username, code).catch(() => {});

  res.json({ success: true, message: 'Tasdiqlash kodi yuborildi' });
});

module.exports = {
  register,
  login,
  googleAuth,
  refreshToken: refresh,
  logout,
  getMe,
  getReferralStats,
  claimDailyReward,
  forgotPassword,
  verifyCode,
  resetPassword,
  verifyEmail,
  resendVerification,
};

const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const dns = require('dns').promises;
const validator = require('validator');

const User = require('../models/User');
const Session = require('../models/Session');
const UserStats = require('../models/UserStats');
const asyncHandler = require('../middleware/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  generateResetToken,
  verifyResetToken,
  generate2FAChallenge,
  verify2FAChallenge,
  REFRESH_ABSOLUTE_TTL_SECONDS,
} = require('../utils/jwt');
const { verifyTotpCode } = require('./twoFactorController');
const {
  sendWelcomeEmail,
  sendResetCodeEmail,
  sendEmailVerificationCode,
  sendNewDeviceLoginEmail,
  sendAccountDeletedEmail,
} = require('../utils/emailService');
const { sendOtpTelegram } = require('../utils/telegramOtpService');
const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');
const {
  attachAuthCookies,
  clearAuthCookies,
  refreshCsrfCookie,
  hashToken,
  hashCode,
  safeEqual,
  parseCookies,
  verifyCsrfToken,
  CSRF_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
} = require('../utils/authSecurity');
const securityLogger = require('../utils/securityLogger');
const { checkPasswordPwned } = require('../utils/hibp');
const { isPasswordReused } = require('../utils/passwordHistory');
const { buildFromReq, extractIp, extractUa } = require('../utils/deviceFingerprint');
const { issueReauthToken } = require('../middleware/stepUp');
const { softDeleteUser } = require('../utils/accountDeletion');

const authDebug = (...args) => {
  if (process.env.NODE_ENV === 'production') return;
  if (process.env.AUTH_DEBUG === 'true') {
    console.log('[AUTH_DEBUG]', ...args);
  }
};

const calculateRank = (xp) => {
  if (xp >= 50000) return 'LEGEND';
  if (xp >= 20000) return 'MASTER';
  if (xp >= 10000) return 'SENIOR';
  if (xp >= 5000) return 'MIDDLE';
  if (xp >= 2000) return 'JUNIOR';
  if (xp >= 500) return 'CANDIDATE';
  return 'AMATEUR';
};

// Require 8+ chars, upper, lower, digit, special — any printable special char
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,128}$/;
// Username: ASCII letters, digits, underscore, dot and hyphen only (3-50 chars)
const usernameRegex = /^[a-z0-9._-]{3,50}$/;

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const normalizeUsername = (username) => String(username || '').trim().toLowerCase();

// Returns { user, method, identifier }
// method: 'email' | 'telegram'
const resolveIdentifier = async (raw, method = 'email', selectFields = '') => {
  const id = String(raw || '').trim();
  if (!id) return { user: null, method, identifier: null };

  let user = null;
  if (method === 'telegram') {
    const username = id.replace(/^@/, '').toLowerCase();
    user = await User.findOne({
      'socialSubscriptions.telegram.username': username,
    }).select(selectFields || undefined);
  } else {
    user = await User.findOne({ email: normalizeEmail(id) }).select(selectFields || undefined);
  }
  return { user, method, identifier: id };
};

// Precomputed dummy hash to keep bcrypt.compare time constant across "user not found" vs "wrong password".
// Cost MUST match the production hash cost (14) used in User pre-save hook —
// mismatched costs leak the user-existence signal via response timing.
// Hash of a random value; attacker can never match this.
const DUMMY_HASH = '$2a$14$9BxHNzsN21NxBCdqgFQu0.xb./zSbPr.GeWqgy85gbqwgzMXEf3qC';

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
  emailVerified: user.emailVerified ?? false,
  totpEnabled: user.totpEnabled ?? false,
  /** Present when the loaded document included `+password` (see getMe / login). */
  hasLocalPassword: user.password != null,
  /** Google account linked (sub is never exposed). */
  googleLinked: Boolean(user.googleId),
  proSubscription: {
    active: Boolean(
      user.proSubscription?.active &&
      (!user.proSubscription?.expiresAt || new Date(user.proSubscription.expiresAt).getTime() > Date.now())
    ),
    plan: user.proSubscription?.plan || 'ai_pro',
    amount: user.proSubscription?.amount || 0,
    purchasedAt: user.proSubscription?.purchasedAt || null,
    expiresAt: user.proSubscription?.expiresAt || null,
  },
});

/**
 * Issue access + refresh tokens.
 *
 * If `existingSession` is provided (refresh-rotation path), the session is updated and the
 * refresh token's `exp` claim is forced to the existing absolute cap (NIST sliding-cap).
 * Otherwise a brand-new Session is created with absoluteExp = now + REFRESH_ABSOLUTE_TTL_SECONDS.
 */
const issueTokens = async (user, req, existingSession = null) => {
  const persisted = await User.findById(user._id).select('+tokenVersion');
  const tokenVersion = persisted?.tokenVersion || 0;

  // Determine absolute exp (epoch seconds)
  const nowSec = Math.floor(Date.now() / 1000);
  const absoluteExpSec = existingSession
    ? Math.floor(existingSession.absoluteExpiresAt.getTime() / 1000)
    : nowSec + REFRESH_ABSOLUTE_TTL_SECONDS;

  // Persist session BEFORE signing so we can embed its id in the refresh payload.
  let session = existingSession;
  if (!session) {
    session = await Session.create({
      userId: user._id,
      refreshTokenHash: 'pending', // overwritten below
      deviceHash: req ? buildFromReq(req) : null,
      ip: req ? extractIp(req) : null,
      ua: req ? String(extractUa(req)).slice(0, 200) : null,
      lastUsedAt: new Date(),
      absoluteExpiresAt: new Date(absoluteExpSec * 1000),
    });
  }

  const accessPayload = { userId: user._id, tv: tokenVersion };
  const refreshPayload = { userId: user._id, tv: tokenVersion, sid: String(session._id) };
  const accessToken = generateAccessToken(accessPayload);
  const refreshToken = generateRefreshToken(refreshPayload, absoluteExpSec);

  // Persist hash of the new refresh token + bump session lastUsedAt
  session.refreshTokenHash = hashToken(refreshToken);
  session.lastUsedAt = new Date();
  if (req) {
    session.ip = extractIp(req) || session.ip;
    session.ua = String(extractUa(req)).slice(0, 200) || session.ua;
  }
  await session.save();

  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        // Backward compat: keep the most-recent hash on the user as a fallback / quick gate.
        refreshToken: hashToken(refreshToken),
        lastLogin: new Date(),
      },
    }
  );

  authDebug('issueTokens:cookies_prepared', {
    userId: String(user._id),
    tokenVersion,
    sessionId: String(session._id),
    accessLen: accessToken.length,
    refreshLen: refreshToken.length,
  });

  return { accessToken, refreshToken, session };
};

/**
 * Native mobil (RN/Expo) httpOnly cookie'ni ishonchli o'qiy olmaydi — shuning uchun
 * token'larni JSON body'da ham qaytaramiz. Web cookie-only (XSS exfiltration) modeli
 * buzilmasligi uchun FAQAT `X-Client-Type: mobile` header bo'lganda. Mobil axios bu
 * header'ni har so'rovda yuboradi (AidevixApp/src/api/axiosInstance.ts).
 */
const mobileTokenBody = (req, accessToken, refreshToken) => {
  const isMobile = req.headers['x-client-type'] === 'mobile';
  if (!isMobile) return {};
  const secret = process.env.MOBILE_API_SECRET;
  // SEC-D01: If a secret is configured, require it (X-Mobile-Secret header) so a
  // plain X-Client-Type header set via XSS can't exfiltrate raw tokens. Otherwise
  // fall back to header-only (legacy) so the live mobile app keeps working until
  // its env is set — but warn once so the gap is visible in logs.
  if (secret) {
    if (req.headers['x-mobile-secret'] !== secret) return {};
    return { accessToken, refreshToken };
  }
  if (!mobileTokenBody._legacyWarned) {
    mobileTokenBody._legacyWarned = true;
    // eslint-disable-next-line no-console
    console.warn('[SEC-D01] MOBILE_API_SECRET not set — mobileTokenBody falling back to header-only (legacy) token issuance. Set MOBILE_API_SECRET to enforce.');
  }
  return { accessToken, refreshToken };
};

/**
 * Anomaly check + new-device email.
 * Returns true if the device is new (and was added to knownDevices).
 */
const trackDeviceAndAlert = async (req, user) => {
  const deviceHash = buildFromReq(req);
  const fresh = await User.findById(user._id).select('+knownDevices');
  const known = fresh?.knownDevices || [];
  const isFirstEver = known.length === 0;
  const isNew = !known.includes(deviceHash);

  if (isNew) {
    await User.updateOne(
      { _id: user._id },
      {
        $addToSet: { knownDevices: deviceHash },
        $set: { lastLoginIp: extractIp(req), lastLoginUa: String(extractUa(req)).slice(0, 200) },
      }
    );
    securityLogger.newDeviceLogin(req, user, deviceHash);
    // Skip email on the very first login (the user is already on this device).
    if (!isFirstEver && user.email && !user.email.endsWith('@deleted.aidevix.local')) {
      sendNewDeviceLoginEmail(user.email, user.username, {
        ip: extractIp(req),
        ua: extractUa(req),
        when: new Date().toISOString(),
      }).catch(() => {});
    }
  }
  return isNew;
};

// Check that an email's domain actually has MX records — quick filter against
// typos and fabricated domains ("user@asdfasdf.xyz"). DNS errors that aren't
// "domain doesn't exist" are soft-passed so transient resolver hiccups don't
// block legitimate registrations.
async function emailDomainHasMx(email) {
  const domain = String(email).split('@')[1];
  if (!domain) return false;
  try {
    const records = await Promise.race([
      dns.resolveMx(domain),
      new Promise((_, rej) => setTimeout(() => rej(new Error('mx_timeout')), 3000)),
    ]);
    return Array.isArray(records) && records.length > 0;
  } catch (err) {
    if (['ENOTFOUND', 'NXDOMAIN', 'ENODATA'].includes(err.code)) return false;
    // timeout / SERVFAIL / etc → don't punish legitimate users
    return true;
  }
}

// @desc    Register new user — creates an unverified account and requires email
//          code verification before any session is issued. The user is NOT logged
//          in by register; they must verify the emailed code and then sign in.
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

  // Block typo'd / fake email domains before we burn DB write cost on them.
  const hasMx = await emailDomainHasMx(normalizedEmail);
  if (!hasMx) {
    return next(new ErrorResponse('Email manzili mavjud emas yoki noto\'g\'ri yozilgan', 400));
  }

  if (!passwordRegex.test(password)) {
    return next(new ErrorResponse('Password must be 8–128 chars with upper, lower, digit and special char', 400));
  }

  if (!usernameRegex.test(normalizedUsername)) {
    return next(new ErrorResponse(
      'Username must be 3–50 chars; only a-z, 0-9, _, . and - allowed',
      400
    ));
  }

  // HIBP breach check (NIST 800-63B §5.1.1.2). Soft-fails on network errors.
  const pwned = await checkPasswordPwned(password);
  if (pwned.pwned) {
    securityLogger.passwordPwned(req, null, pwned.count);
    return next(new ErrorResponse(
      'Bu parol ommaviy ma\'lumot tarqalishida uchragan. Boshqa parol tanlang.',
      400
    ));
  }

  const existingUser = await User.findOne({
    $or: [{ email: normalizedEmail }, { username: normalizedUsername }],
  });
  if (existingUser) {
    // If the conflict is an unverified account on the SAME email, resend the
    // code and surface requiresEmailVerification so the user lands back on the
    // verify-email page instead of being permanently stuck on "already exists".
    // Verified accounts and username collisions still fail closed.
    const isUnverifiedSameEmail =
      existingUser.email === normalizedEmail && existingUser.emailVerified === false;
    if (isUnverifiedSameEmail) {
      const resendCode = crypto.randomInt(100000, 1000000).toString();
      await User.updateOne({ _id: existingUser._id }, {
        $set: {
          emailVerificationCode: hashCode(resendCode),
          emailVerificationExpire: new Date(Date.now() + 15 * 60 * 1000),
          emailVerificationAttempts: 0,
        },
      });
      sendEmailVerificationCode(existingUser.email, existingUser.username, resendCode).catch((err) =>
        securityLogger.suspicious(req, 'email_verify_send_failed', { userId: String(existingUser._id), error: err.message })
      );
      // SEC-D05: status 201 (same as new-user path) + generic message to prevent
      // enumeration of unverified accounts. Flag + email still present for redirect.
      return res.status(201).json({
        success: true,
        requiresEmailVerification: true,
        email: normalizedEmail,
        message: 'Email manzilingizga tasdiqlash kodi yuborildi. Hisobni faollashtirish uchun kodni kiriting.',
      });
    }
    return next(new ErrorResponse('Email or username already exists', 400));
  }

  // Referral linkage is recorded now, but XP bonuses for both sides are deferred
  // to verifyEmailPublic() — paying out before email proof lets an attacker farm
  // XP on an accomplice account by spamming fake signups against their ref code.
  let referredBy = null;
  if (referralCode) {
    const referrer = await User.findOne({ referralCode: String(referralCode).trim() });
    if (referrer && String(referrer._id) !== String(req.user?._id)) {
      referredBy = referrer._id;
    }
  }
  const startingXp = 0;

  const newReferralCode =
    normalizedUsername.substring(0, 4).toUpperCase() +
    crypto.randomBytes(4).toString('hex').toUpperCase();

  // Account starts unverified; no tokens are issued until the email code is
  // confirmed. The hashed code is persisted with the same write so the user
  // record is never in a state where it can be looked up without a pending code.
  const verifyCode = crypto.randomInt(100000, 1000000).toString();
  const user = await User.create({
    username: normalizedUsername,
    email: normalizedEmail,
    password,
    firstName,
    lastName,
    referralCode: newReferralCode,
    referredBy,
    xp: startingXp,
    rankTitle: calculateRank(startingXp),
    emailVerified: false,
    emailVerificationCode: hashCode(verifyCode),
    emailVerificationExpire: new Date(Date.now() + 15 * 60 * 1000),
    emailVerificationAttempts: 0,
  });

  securityLogger.registerSuccess(req, user);

  // Background tasks — stats now, welcome email & bot notification deferred to
  // verifyEmailPublic() so they only fire for real owners.
  UserStats.create({ userId: user._id, xp: user.xp, weeklyXp: user.xp }).catch(() => {});

  // Fire-and-forget verification email — Resend usually returns in <500ms but
  // we still don't block the HTTP response on it.
  sendEmailVerificationCode(user.email, user.username, verifyCode).catch((err) =>
    securityLogger.suspicious(req, 'email_verify_send_failed', { userId: String(user._id), error: err.message })
  );

  res.status(201).json({
    success: true,
    requiresEmailVerification: true,
    email: normalizedEmail,
    message: 'Email manzilingizga tasdiqlash kodi yuborildi. Hisobni faollashtirish uchun kodni kiriting.',
  });
});

// @desc    Login
//
// Enumeration-safe flow:
//  1. Always run bcrypt.compare (against real hash or DUMMY_HASH). Constant time, constant cost.
//  2. ANY failure (no user / google-only / wrong password) → generic 401 "Invalid credentials".
//     Account state (locked, inactive, unverified, 2FA-enrolled) is ONLY revealed after a
//     correct password match — at which point the caller has already proven knowledge of
//     the credential and there's no enumeration left to exploit.
const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !password) {
    return next(new ErrorResponse('Please provide email and password', 400));
  }

  const user = await User.findOne({ email: normalizedEmail }).select(
    '+password +failedLoginAttempts +lockUntil +tokenVersion +totpEnabled +totpSecret +deletedAt'
  );

  const passwordHash = user?.password || DUMMY_HASH;
  const isMatch = await bcrypt.compare(password, passwordHash).catch(() => false);

  if (!user || !user.password || !isMatch) {
    if (user && user.password) {
      await user.registerFailedLogin();
      securityLogger.loginFailed(req, 'wrong_password', {
        userId: String(user._id),
        attempts: user.failedLoginAttempts,
      });
    } else if (user && !user.password) {
      securityLogger.loginFailed(req, 'google_only_account', { userId: String(user._id) });
    } else {
      securityLogger.loginFailed(req, 'user_not_found', { email: normalizedEmail });
    }
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  // From here: password is correct. Account-state errors are safe to reveal.

  if (user.isLocked()) {
    securityLogger.loginLocked(req, user);
    const retryAfterMs = user.lockUntil.getTime() - Date.now();
    const retryMin = Math.max(1, Math.ceil(retryAfterMs / 60000));
    return next(
      new ErrorResponse(`Hisob vaqtincha bloklangan. ${retryMin} daqiqadan so'ng urinib ko'ring.`, 423)
    );
  }

  if (!user.isActive || user.deletedAt) {
    securityLogger.loginFailed(req, 'account_inactive', { userId: String(user._id) });
    return next(new ErrorResponse('Account deactivated', 403));
  }

  await user.resetLoginAttempts();

  // Email verification gate — auto-resend code, do not issue tokens
  if (!user.emailVerified) {
    const code = crypto.randomInt(100000, 1000000).toString();
    await User.updateOne({ _id: user._id }, {
      $set: {
        emailVerificationCode: hashCode(code),
        emailVerificationExpire: new Date(Date.now() + 15 * 60 * 1000),
        emailVerificationAttempts: 0,
      },
    });
    // Fire-and-forget: SMTP can take >10s; never block the HTTP response on it.
    sendEmailVerificationCode(user.email, user.username, code).catch((err) =>
      securityLogger.suspicious(req, 'email_verify_send_failed', {
        userId: String(user._id),
        error: err.message,
      })
    );
    securityLogger.loginFailed(req, 'email_not_verified', { userId: String(user._id) });
    return res.status(403).json({
      success: false,
      requiresEmailVerification: true,
      email: user.email,
      message: 'Email tasdiqlanmagan. Pochtangizga yangi tasdiqlash kodi yuborildi.',
    });
  }

  // 2FA gate — if enrolled, return short-lived challenge instead of session tokens
  if (user.totpEnabled) {
    const challengeId = generate2FAChallenge({ uid: String(user._id) });
    securityLogger.loginSuccess(req, user); // password OK; 2FA pending
    return res.json({
      success: true,
      requires2FA: true,
      challengeId,
    });
  }

  const { accessToken, refreshToken } = await issueTokens(user, req);
  const csrfToken = attachAuthCookies(res, accessToken, refreshToken);
  await trackDeviceAndAlert(req, user);

  securityLogger.loginSuccess(req, user);

  res.json({
    success: true,
    data: { user: sanitizeUser(user) },
    csrfToken,
    ...mobileTokenBody(req, accessToken, refreshToken),
  });
});

// @desc    Complete 2FA login — exchange challengeId + TOTP code for session
const verify2FALogin = asyncHandler(async (req, res, next) => {
  const { challengeId, code } = req.body;
  if (!challengeId || !code) {
    return next(new ErrorResponse('Challenge va kod majburiy', 400));
  }

  const decoded = verify2FAChallenge(challengeId);
  if (!decoded || !decoded.uid) {
    securityLogger.suspicious(req, '2fa_challenge_invalid');
    return next(new ErrorResponse('2FA challenge muddati o\'tgan. Qayta login qiling.', 401));
  }

  const user = await User.findById(decoded.uid).select(
    '+totpEnabled +totpSecret +totpBackupCodes +tokenVersion +password'
  );
  if (!user || !user.totpEnabled || !user.totpSecret) {
    return next(new ErrorResponse('2FA holati o\'zgargan. Qayta login qiling.', 401));
  }
  if (!user.isActive) {
    return next(new ErrorResponse('Account deactivated', 403));
  }

  const totpOk = verifyTotpCode(user.totpSecret, code);

  // Backup code path — single-use, removed after use
  let backupOk = false;
  if (!totpOk) {
    const codeHash = hashToken(String(code).toUpperCase().replace(/\s+/g, ''));
    const idx = (user.totpBackupCodes || []).findIndex((h) => safeEqual(h, codeHash));
    if (idx >= 0) {
      backupOk = true;
      const remaining = user.totpBackupCodes.filter((_, i) => i !== idx);
      await User.updateOne({ _id: user._id }, { $set: { totpBackupCodes: remaining } });
      securityLogger.suspicious(req, '2fa_backup_used', {
        userId: String(user._id),
        remaining: remaining.length,
      });
      // FIX [MEDIUM]: Kam backup kod qolganida foydalanuvchini ogohlantirish uchun flag.
      // remaining.length response ga qo'shiladi (quyida backupCodesRemaining).
      req._backupCodesRemaining = remaining.length;
    }
  }

  if (!totpOk && !backupOk) {
    securityLogger.suspicious(req, '2fa_wrong_code', { userId: String(user._id) });
    return next(new ErrorResponse('TOTP kodi noto\'g\'ri', 401));
  }

  const { accessToken, refreshToken } = await issueTokens(user, req);
  const csrfToken = attachAuthCookies(res, accessToken, refreshToken);
  await trackDeviceAndAlert(req, user);
  securityLogger.loginSuccess(req, user);

  const resp = {
    success: true,
    data: { user: sanitizeUser(user) },
    csrfToken,
    ...mobileTokenBody(req, accessToken, refreshToken),
  };
  // Backup kod ishlatilgan bo'lsa — qancha qolganini bildirish
  if (req._backupCodesRemaining !== undefined) {
    resp.backupCodesRemaining = req._backupCodesRemaining;
    if (req._backupCodesRemaining < 3) {
      resp.backupCodesWarning = 'Backup kodlar kam qoldi. Hisobingizga kirib yangilarini yarating.';
    }
  }
  res.json(resp);
});

// @desc    Public verify email — no auth required (used after login gate blocks unverified users)
//
// Generic response for invalid email to prevent enumeration. Does NOT issue session tokens —
// caller is expected to re-login with email+password after verification (UX-friction-for-clarity trade-off).
const verifyEmailPublic = asyncHandler(async (req, res, next) => {
  const { email, code } = req.body;
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !code) {
    return next(new ErrorResponse('Email va kod majburiy', 400));
  }

  const user = await User.findOne({ email: normalizedEmail }).select(
    '+emailVerificationCode +emailVerificationExpire +emailVerificationAttempts'
  );

  // Generic response for "no user / already verified" — no enumeration
  if (!user || user.emailVerified) {
    return next(new ErrorResponse('Kod noto\'g\'ri yoki muddati o\'tgan', 400));
  }

  if (!user.emailVerificationCode || !user.emailVerificationExpire) {
    return next(new ErrorResponse('Kod noto\'g\'ri yoki muddati o\'tgan', 400));
  }
  if (user.emailVerificationExpire.getTime() < Date.now()) {
    return next(new ErrorResponse('Kod muddati o\'tgan', 400));
  }
  if ((user.emailVerificationAttempts || 0) >= 5) {
    await User.updateOne({ _id: user._id }, {
      $set: { emailVerificationCode: null, emailVerificationExpire: null, emailVerificationAttempts: 0 },
    });
    return next(new ErrorResponse('Juda ko\'p urinish. Yangi kod so\'rang.', 400));
  }
  if (!safeEqual(user.emailVerificationCode, hashCode(code))) {
    await User.updateOne({ _id: user._id }, { $inc: { emailVerificationAttempts: 1 } });
    return next(new ErrorResponse('Kod noto\'g\'ri', 400));
  }

  await User.updateOne({ _id: user._id }, {
    $set: {
      emailVerified: true,
      emailVerificationCode: null,
      emailVerificationExpire: null,
      emailVerificationAttempts: 0,
    },
  });
  securityLogger.emailVerificationSucceeded(req, user);

  // Referral bonus pays out now — both sides — gated by a referralRewarded flag
  // so we never double-pay even if verifyEmailPublic gets retried for any reason.
  if (user.referredBy && !user.referralRewarded) {
    const updated = await User.findOneAndUpdate(
      { _id: user._id, referralRewarded: { $ne: true } },
      { $set: { referralRewarded: true }, $inc: { xp: 500 } },
      { new: true }
    );
    if (updated) {
      User.findByIdAndUpdate(user.referredBy, { $inc: { xp: 1000, referralsCount: 1 } })
        .exec().catch((err) => console.error('[Referral] XP update failed:', err.message));
      UserStats.findOneAndUpdate(
        { userId: user.referredBy },
        { $inc: { xp: 1000, weeklyXp: 1000 } }
      ).exec().catch(() => {});
      UserStats.findOneAndUpdate(
        { userId: user._id },
        { $inc: { xp: 500, weeklyXp: 500 } }
      ).exec().catch(() => {});
    }
  }

  // Onboarding side-effects fire only after the email is proven — keeps fake
  // signups out of Telegram admin notifications and out of the welcome inbox.
  sendWelcomeEmail(user.email, user.username).catch(() => {});
  try {
    const { getBot } = require('../utils/telegramBot');
    const bot = getBot();
    if (bot) bot.notifyNewRegistration(user);
  } catch (_) {}

  res.json({
    success: true,
    message: 'Email tasdiqlandi. Endi login qiling.',
  });
});

// @desc    Public resend verification — no auth required, generic response
const resendVerificationPublic = asyncHandler(async (req, res) => {
  const normalizedEmail = normalizeEmail(req.body?.email);

  // Always respond uniformly to prevent enumeration
  const generic = {
    success: true,
    message: 'Agar email mavjud va tasdiqlanmagan bo\'lsa, tasdiqlash kodi yuboriladi.',
  };

  if (!normalizedEmail) return res.json(generic);

  const user = await User.findOne({ email: normalizedEmail });
  if (!user || user.emailVerified) return res.json(generic);

  const code = crypto.randomInt(100000, 1000000).toString();
  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        emailVerificationCode: hashCode(code),
        emailVerificationExpire: new Date(Date.now() + 15 * 60 * 1000),
        emailVerificationAttempts: 0,
      },
    }
  );
  // Fire-and-forget: SMTP can take >10s; never block the HTTP response on it.
  sendEmailVerificationCode(user.email, user.username, code).catch((err) =>
    securityLogger.suspicious(req, 'email_verify_send_failed', {
      userId: String(user._id),
      error: err.message,
    })
  );

  res.json(generic);
});

// @desc    Refresh Token
const refresh = asyncHandler(async (req, res, next) => {
  const cookies = parseCookies(req.headers.cookie);
  // Native mobil cookie yubora olmaydi — refresh token'ni body'dan ham qabul qilamiz.
  const token = cookies[REFRESH_COOKIE_NAME] || (req.body && req.body.refreshToken);

  if (!token) {
    // Anonim foydalanuvchilar uchun bu KUTILGAN holat (cookie yo'q). `next(Error)`
    // qilsak errorMiddleware uni `error` darajada stack bilan log qiladi — har bir
    // login bo'lmagan sahifa yuklanishida shovqin. Shu sabab to'g'ridan-to'g'ri
    // javob qaytaramiz (security warn log baribir qoladi).
    securityLogger.refreshTokenInvalid(req, 'no_token');
    return res.status(400).json({ success: false, message: 'No refresh token provided' });
  }

  const decoded = verifyRefreshToken(token);
  if (!decoded) {
    securityLogger.refreshTokenInvalid(req, 'invalid_or_expired');
    return next(new ErrorResponse('Invalid or expired refresh token', 401));
  }

  const user = await User.findById(decoded.userId).select('+refreshToken +tokenVersion +password');
  if (!user) {
    securityLogger.refreshTokenInvalid(req, 'user_missing');
    return next(new ErrorResponse('Refresh token invalid', 401));
  }

  // Token version gate
  if (typeof decoded.tv === 'number' && decoded.tv !== (user.tokenVersion || 0)) {
    authDebug('refresh:token_version_mismatch', {
      userId: String(user._id),
      decodedTv: decoded.tv,
      dbTv: user.tokenVersion || 0,
    });
    securityLogger.tokenVersionMismatch(req, user._id);
    clearAuthCookies(res);
    return next(new ErrorResponse('Session expired. Please login again.', 401));
  }

  const incomingHash = hashToken(token);

  // Session-based path (new tokens carry `sid`)
  if (decoded.sid) {
    // refreshTokenHash select:false — quyida solishtirish uchun explicit select
    const session = await Session.findOne({ _id: decoded.sid, userId: user._id })
      .select('+refreshTokenHash');
    if (!session) {
      // Session was already revoked / never existed → treat as reuse
      securityLogger.refreshTokenReuse(req, user._id);
      await Session.deleteMany({ userId: user._id });
      await User.updateOne(
        { _id: user._id },
        { $set: { refreshToken: null }, $inc: { tokenVersion: 1 } }
      );
      clearAuthCookies(res);
      return next(new ErrorResponse('Refresh token compromised. Please login again.', 401));
    }

    if (!safeEqual(session.refreshTokenHash, incomingHash)) {
      // Reuse: this token was rotated already. Burn the entire family.
      securityLogger.refreshTokenReuse(req, user._id);
      await Session.deleteMany({ userId: user._id });
      await User.updateOne(
        { _id: user._id },
        { $set: { refreshToken: null }, $inc: { tokenVersion: 1 } }
      );
      clearAuthCookies(res);
      return next(new ErrorResponse('Refresh token compromised. Please login again.', 401));
    }

    // Absolute lifetime cap (NIST 800-63B sliding-cap)
    if (session.absoluteExpiresAt.getTime() < Date.now()) {
      securityLogger.refreshAbsoluteCapHit(req, user._id);
      await Session.deleteOne({ _id: session._id });
      clearAuthCookies(res);
      return next(new ErrorResponse('Sessiya muddati tugadi. Qayta login qiling.', 401));
    }

    if (!user.isActive) {
      clearAuthCookies(res);
      return next(new ErrorResponse('Account deactivated', 403));
    }

    const { accessToken, refreshToken: newRefreshToken } =
      await issueTokens(user, req, session);
    const csrfToken = attachAuthCookies(res, accessToken, newRefreshToken);
    return res.json({
      success: true,
      data: { user: sanitizeUser(user) },
      csrfToken,
      ...mobileTokenBody(req, accessToken, newRefreshToken),
    });
  }

  // Legacy path — refresh token issued before session model deployed.
  // Allow ONE rotation, then upgrade onto the session model.
  const storedHash = user.refreshToken || '';
  if (!storedHash || !safeEqual(storedHash, incomingHash)) {
    securityLogger.refreshTokenReuse(req, user._id);
    await Session.deleteMany({ userId: user._id });
    await User.updateOne(
      { _id: user._id },
      { $set: { refreshToken: null }, $inc: { tokenVersion: 1 } }
    );
    clearAuthCookies(res);
    return next(new ErrorResponse('Refresh token compromised. Please login again.', 401));
  }
  if (!user.isActive) {
    clearAuthCookies(res);
    return next(new ErrorResponse('Account deactivated', 403));
  }
  const { accessToken, refreshToken: newRefreshToken } = await issueTokens(user, req);
  const csrfToken = attachAuthCookies(res, accessToken, newRefreshToken);
  res.json({
    success: true,
    data: { user: sanitizeUser(user) },
    csrfToken,
    ...mobileTokenBody(req, accessToken, newRefreshToken),
  });
});

// @desc    Logout
const logout = asyncHandler(async (req, res) => {
  if (req.user) {
    // Delete the specific session associated with this refresh cookie (don't kill all sessions).
    const cookies = parseCookies(req.headers.cookie);
    const incoming = cookies[REFRESH_COOKIE_NAME];
    if (incoming) {
      const incomingHash = hashToken(incoming);
      await Session.deleteOne({ userId: req.user._id, refreshTokenHash: incomingHash });
    }
    // Clear legacy fallback hash so old token can't be reused either.
    await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
    securityLogger.logout(req, req.user._id);
  }
  clearAuthCookies(res);
  res.json({ success: true, message: 'Logged out' });
});

// @desc    Logout from ALL devices (barcha sessiyalarni o'chirish)
// FIX [LOW]: "Logout all devices" endpoint — faqat joriy session emas.
// tokenVersion++ qilish orqali mavjud barcha access tokenlar ham bekor bo'ladi.
const logoutAll = asyncHandler(async (req, res) => {
  if (req.user) {
    await Session.deleteMany({ userId: req.user._id });
    await User.updateOne(
      { _id: req.user._id },
      { $set: { refreshToken: null }, $inc: { tokenVersion: 1 } }
    );
    securityLogger.logout(req, req.user._id);
  }
  clearAuthCookies(res);
  res.json({ success: true, message: 'Barcha qurilmalardan chiqildi' });
});

// @desc    Issue / return CSRF token in JSON body
//
// Cross-site frontends (e.g. aidevix.uz hitting railway.app) can't read the
// httpOnly:false CSRF cookie via document.cookie because it lives on the API
// origin. This endpoint surfaces the token in a JSON body so those clients
// can store it in memory and echo it back via X-CSRF-Token. If the existing
// cookie is missing or its HMAC signature is bad, a fresh one is issued.
const getCsrfToken = asyncHandler(async (req, res) => {
  const cookies = parseCookies(req.headers.cookie);
  const existing = cookies[CSRF_COOKIE_NAME];
  const token = existing && verifyCsrfToken(existing) ? existing : refreshCsrfCookie(res);
  res.json({ success: true, data: { token } });
});

// @desc    Get Me
const getMe = asyncHandler(async (req, res) => {
  let user = await User.findById(req.user._id).select('+password');

  if (!user.referralCode) {
    const newReferralCode =
      user.username.substring(0, 4).toUpperCase() +
      crypto.randomBytes(4).toString('hex').toUpperCase();
    user = await User.findByIdAndUpdate(
      user._id,
      { referralCode: newReferralCode },
      { new: true }
    );
  }

  // Surface a CSRF token alongside the user payload so cross-site frontends
  // (where document.cookie can't see the API-origin cookie) can prime their
  // in-memory store without an extra round-trip.
  const cookies = parseCookies(req.headers.cookie);
  const existingCsrf = cookies[CSRF_COOKIE_NAME];
  const csrfToken = existingCsrf && verifyCsrfToken(existingCsrf)
    ? existingCsrf
    : refreshCsrfCookie(res);

  res.json({ success: true, data: sanitizeUser(user), csrfToken });
});

// @desc    Get Referral Stats and Leaderboard
const getReferralStats = asyncHandler(async (req, res) => {
  const currentUserId = req.user._id;

  const myFriends = await User.find({ referredBy: currentUserId })
    .select('username firstName lastName createdAt xp rankTitle avatar')
    .sort('-createdAt')
    .limit(50);

  const topReferrers = await User.find({ referralsCount: { $gt: 0 } })
    .select('username firstName lastName xp rankTitle referralsCount avatar')
    .sort('-referralsCount')
    .limit(3);

  const totalEarnedXp = (req.user.referralsCount || 0) * 1000;

  res.json({
    success: true,
    data: {
      totalFriends: req.user.referralsCount || 0,
      totalEarnedXp,
      myFriends,
      topReferrers,
    },
  });
});

// @desc    Claim Daily Reward
const claimDailyReward = asyncHandler(async (req, res, next) => {
  const now = new Date();
  const todayStart = new Date(now.toISOString().slice(0, 10) + 'T00:00:00.000Z');

  // Atomic check-and-set: prevents double-claim under concurrent requests.
  const user = await User.findOneAndUpdate(
    {
      _id: req.user._id,
      $or: [{ lastClaimedDaily: null }, { lastClaimedDaily: { $lt: todayStart } }],
    },
    { $inc: { xp: 50 }, $set: { lastClaimedDaily: now } },
    { new: true }
  );

  if (!user) {
    return next(new ErrorResponse('Bugun mukofot allaqachon olingan. Ertaga qayta urunib ko\'ring.', 400));
  }

  user.rankTitle = calculateRank(user.xp);

  let stats = await UserStats.findOne({ userId: user._id });
  if (!stats) {
    stats = await UserStats.create({ userId: user._id });
  }
  stats.xp += 50;
  stats.weeklyXp = (stats.weeklyXp || 0) + 50;
  stats.level = stats.calculateLevel();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (stats.lastActivityDate) {
    const last = new Date(stats.lastActivityDate);
    last.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today - last) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      stats.streak += 1;
    } else if (diffDays > 1) {
      stats.streak = 1;
    }
  } else {
    stats.streak = 1;
  }
  stats.lastActivityDate = new Date();
  await stats.save();

  user.streak = stats.streak;
  await user.save({ validateModifiedOnly: true });

  res.json({
    success: true,
    message: 'Kunlik mukofot qabul qilindi (+50 XP)',
    xp: user.xp,
    streak: user.streak,
    lastClaimedDaily: user.lastClaimedDaily,
  });
});

// @desc    Forgot Password — accepts email or telegram username
const forgotPassword = asyncHandler(async (req, res) => {
  const rawIdentifier = req.body?.identifier || req.body?.email;
  const method = req.body?.method === 'telegram' ? 'telegram' : 'email';
  const { user, identifier } = await resolveIdentifier(rawIdentifier, method);

  const genericResponse = {
    success: true,
    message: 'If the account exists, a reset code has been sent',
  };

  if (!user || !identifier) {
    securityLogger.passwordResetRequested(req, identifier || '', false);
    return res.json(genericResponse);
  }

  const code = crypto.randomInt(100000, 1000000).toString();
  user.resetPasswordCode = hashCode(code);
  user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
  user.resetPasswordAttempts = 0;
  await user.save({ validateModifiedOnly: true });

  try {
    if (method === 'telegram') {
      const tgId = user.socialSubscriptions?.telegram?.telegramUserId || user.telegramUserId;
      if (!tgId) throw new Error('Telegram ID topilmadi — avval botni /start qiling');
      await sendOtpTelegram(tgId, code);
    } else {
      await sendResetCodeEmail(user.email, user.username, code);
    }
  } catch (err) {
    securityLogger.suspicious(req, `reset_${method}_send_failed`, {
      userId: String(user._id),
      error: err.message,
    });
  }

  securityLogger.passwordResetRequested(req, identifier, true);
  res.json(genericResponse);
});

// @desc    Verify Reset Code — accepts email or telegram username
const verifyCode = asyncHandler(async (req, res, next) => {
  const rawIdentifier = req.body?.identifier || req.body?.email;
  const method = req.body?.method === 'telegram' ? 'telegram' : 'email';
  const { code } = req.body;

  if (!rawIdentifier || !code) {
    return next(new ErrorResponse('Identifier va kod majburiy', 400));
  }

  const { user } = await resolveIdentifier(
    rawIdentifier,
    method,
    '+resetPasswordCode +resetPasswordExpire +resetPasswordAttempts'
  );

  if (!user || !user.resetPasswordCode || !user.resetPasswordExpire) {
    return next(new ErrorResponse('Invalid or expired code', 400));
  }

  if (user.resetPasswordExpire.getTime() < Date.now()) {
    return next(new ErrorResponse('Invalid or expired code', 400));
  }

  if ((user.resetPasswordAttempts || 0) >= 5) {
    user.resetPasswordCode = null;
    user.resetPasswordExpire = null;
    user.resetPasswordAttempts = 0;
    await user.save({ validateModifiedOnly: true });
    return next(new ErrorResponse('Juda ko\'p noto\'g\'ri urinish. Yangi kod so\'rang.', 400));
  }

  if (!safeEqual(user.resetPasswordCode, hashCode(code))) {
    await User.updateOne({ _id: user._id }, { $inc: { resetPasswordAttempts: 1 } });
    return next(new ErrorResponse('Invalid or expired code', 400));
  }

  // OTP to'g'ri — single-use resetToken yaratib hash'ini saqlaymiz, OTP tozalaymiz
  const resetToken = generateResetToken({ email: user.email, uid: String(user._id) });
  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        resetPasswordCode: null,
        resetPasswordExpire: null,
        resetPasswordAttempts: 0,
        resetTokenHash: hashToken(resetToken),
        resetTokenExpire: new Date(Date.now() + 15 * 60 * 1000),
      },
    }
  );
  res.json({ success: true, data: { resetToken } });
});

// @desc    Reset Password — identifier (email or phone) optional; lookup via JWT uid
const resetPassword = asyncHandler(async (req, res, next) => {
  const { resetToken, newPassword } = req.body;

  if (!resetToken || !newPassword) {
    return next(new ErrorResponse('Majburiy maydonlar to\'ldirilmadi', 400));
  }

  if (!passwordRegex.test(newPassword)) {
    return next(new ErrorResponse('Password must be 8–128 chars with upper, lower, digit and special char', 400));
  }

  // JWT integrity check — uid is the source of truth for lookup
  const decoded = verifyResetToken(resetToken);
  if (!decoded || !decoded.uid) {
    return next(new ErrorResponse('Invalid reset token', 400));
  }

  const user = await User.findById(decoded.uid).select(
    '+resetTokenHash +resetTokenExpire +tokenVersion +refreshToken +passwordHistory +password +deletedAt'
  );
  if (!user) return next(new ErrorResponse('User not found', 404));

  // Deactivated / GDPR-deleted accounts cannot be silently re-activated by
  // anyone holding an old reset link.
  if (user.deletedAt || user.isActive === false) {
    return next(new ErrorResponse('Hisob mavjud emas yoki bloklangan', 403));
  }

  if (!user.resetTokenHash || !user.resetTokenExpire) {
    return next(new ErrorResponse('Invalid or expired reset token', 400));
  }

  if (user.resetTokenExpire.getTime() < Date.now()) {
    await User.updateOne({ _id: user._id }, { $set: { resetTokenHash: null, resetTokenExpire: null } });
    return next(new ErrorResponse('Reset token muddati o\'tgan. Qaytadan so\'rang.', 400));
  }

  if (!safeEqual(user.resetTokenHash, hashToken(resetToken))) {
    await User.updateOne({ _id: user._id }, { $set: { resetTokenHash: null, resetTokenExpire: null } });
    return next(new ErrorResponse('Invalid reset token', 400));
  }

  // HIBP breach check
  const pwned = await checkPasswordPwned(newPassword);
  if (pwned.pwned) {
    securityLogger.passwordPwned(req, user._id, pwned.count);
    return next(new ErrorResponse(
      'Bu parol ommaviy ma\'lumot tarqalishida uchragan. Boshqa parol tanlang.',
      400
    ));
  }

  // Password history — reject reuse of any of the last 5
  const history = [user.password, ...(user.passwordHistory || [])].filter(Boolean);
  if (await isPasswordReused(newPassword, history)) {
    securityLogger.passwordReuseRejected(req, user._id);
    return next(new ErrorResponse('So\'nggi 5 ta paroldan birini takrorlay olmaysiz.', 400));
  }

  // Single-use: clear reset state first
  user.resetTokenHash = null;
  user.resetTokenExpire = null;
  user.password = newPassword;
  user.refreshToken = null;
  await user.save(); // pre-save hook: tokenVersion++, history rotated, passwordChangedAt updated

  // Revoke ALL sessions on this user — password compromise scenario
  await Session.deleteMany({ userId: user._id });
  clearAuthCookies(res);

  securityLogger.passwordResetCompleted(req, user);
  res.json({ success: true, message: 'Password updated. Please login again on all devices.' });
});

// @desc    Change password (authenticated)
const changePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return next(new ErrorResponse('Joriy va yangi parol majburiy', 400));
  }

  if (currentPassword === newPassword) {
    return next(new ErrorResponse('Yangi parol eski paroldan farq qilishi kerak', 400));
  }

  if (!passwordRegex.test(newPassword)) {
    return next(new ErrorResponse('Password must be 8–128 chars with upper, lower, digit and special char', 400));
  }

  const user = await User.findById(req.user._id).select(
    '+password +tokenVersion +refreshToken +passwordHistory'
  );
  if (!user) return next(new ErrorResponse('User not found', 404));

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    securityLogger.loginFailed(req, 'change_password_wrong_current', {
      userId: String(user._id),
    });
    return next(new ErrorResponse('Joriy parol noto\'g\'ri', 400));
  }

  // HIBP breach check
  const pwned = await checkPasswordPwned(newPassword);
  if (pwned.pwned) {
    securityLogger.passwordPwned(req, user._id, pwned.count);
    return next(new ErrorResponse(
      'Bu parol ommaviy ma\'lumot tarqalishida uchragan. Boshqa parol tanlang.',
      400
    ));
  }

  // Password history reuse check
  const history = [user.password, ...(user.passwordHistory || [])].filter(Boolean);
  if (await isPasswordReused(newPassword, history)) {
    securityLogger.passwordReuseRejected(req, user._id);
    return next(new ErrorResponse('So\'nggi 5 ta paroldan birini takrorlay olmaysiz.', 400));
  }

  user.password = newPassword;
  user.refreshToken = null;
  await user.save();

  // Revoke ALL sessions — password change is a security event
  await Session.deleteMany({ userId: user._id });
  clearAuthCookies(res);

  securityLogger.passwordChanged(req, user);
  res.json({
    success: true,
    message: 'Parol muvaffaqiyatli yangilandi. Iltimos, qayta kiring.',
  });
});

// @desc    Verify email
const verifyEmail = asyncHandler(async (req, res, next) => {
  const { code } = req.body;
  if (!code) return next(new ErrorResponse('Kod kiritilmadi', 400));

  const user = await User.findById(req.user._id).select(
    '+emailVerificationCode +emailVerificationExpire +emailVerificationAttempts'
  );

  if (!user || !user.emailVerificationCode || !user.emailVerificationExpire) {
    securityLogger.emailVerificationFailed(req, req.user._id, 'no_active_code');
    return next(new ErrorResponse('Kod noto\'g\'ri yoki muddati o\'tgan', 400));
  }

  if (user.emailVerificationExpire.getTime() < Date.now()) {
    securityLogger.emailVerificationFailed(req, user._id, 'expired');
    return next(new ErrorResponse('Kod noto\'g\'ri yoki muddati o\'tgan', 400));
  }

  if ((user.emailVerificationAttempts || 0) >= 5) {
    user.emailVerificationCode = null;
    user.emailVerificationExpire = null;
    user.emailVerificationAttempts = 0;
    await user.save({ validateModifiedOnly: true });
    securityLogger.emailVerificationFailed(req, user._id, 'too_many_attempts');
    return next(new ErrorResponse('Juda ko\'p noto\'g\'ri urinish. Yangi kod so\'rang.', 400));
  }

  if (!safeEqual(user.emailVerificationCode, hashCode(code))) {
    user.emailVerificationAttempts = (user.emailVerificationAttempts || 0) + 1;
    await user.save({ validateModifiedOnly: true });
    securityLogger.emailVerificationFailed(req, user._id, 'wrong_code');
    return next(new ErrorResponse('Kod noto\'g\'ri yoki muddati o\'tgan', 400));
  }

  user.emailVerified = true;
  user.emailVerificationCode = null;
  user.emailVerificationExpire = null;
  user.emailVerificationAttempts = 0;
  await user.save({ validateModifiedOnly: true });

  securityLogger.emailVerificationSucceeded(req, user);
  res.json({ success: true, message: 'Email muvaffaqiyatli tasdiqlandi' });
});

// @desc    Resend email verification code
const resendVerification = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id);
  if (!user) return next(new ErrorResponse('User not found', 404));

  if (user.emailVerified) {
    return next(new ErrorResponse('Email allaqachon tasdiqlangan', 400));
  }

  const code = crypto.randomInt(100000, 1000000).toString();
  user.emailVerificationCode = hashCode(code);
  user.emailVerificationExpire = new Date(Date.now() + 15 * 60 * 1000);
  user.emailVerificationAttempts = 0;
  await user.save({ validateModifiedOnly: true });

  // Fire-and-forget: SMTP can take >10s; never block the HTTP response on it.
  sendEmailVerificationCode(user.email, user.username, code).catch((err) =>
    securityLogger.suspicious(req, 'email_verify_send_failed', {
      userId: String(user._id),
      error: err.message,
    })
  );

  res.json({ success: true, message: 'Tasdiqlash kodi yuborildi' });
});

// @desc    Google OAuth — ID token verification (Sign in / Sign up)
const googleAuth = asyncHandler(async (req, res, next) => {
  const { credential, accessToken: googleAccessToken } = req.body;

  if (!credential && !googleAccessToken) {
    return next(new ErrorResponse('Google credential required', 400));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    securityLogger.suspicious(req, 'google_auth_not_configured');
    return next(new ErrorResponse('Google authentication not configured', 503));
  }

  let googlePayload;

  if (credential) {
    // ID token yo'li (eski)
    if (typeof credential !== 'string' || credential.length > 5000) {
      securityLogger.suspicious(req, 'google_credential_too_long', { length: credential?.length });
      return next(new ErrorResponse('Google credential yaroqsiz', 400));
    }
    const googleClient = new OAuth2Client(clientId);
    try {
      const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: clientId });
      googlePayload = ticket.getPayload();
    } catch (err) {
      securityLogger.suspicious(req, 'google_auth_token_invalid', { error: err.message });
      return next(new ErrorResponse('Google autentifikatsiya amalga oshmadi', 401));
    }
  } else {
    // access_token yo'li — useGoogleLogin hook ishlatganda
    if (typeof googleAccessToken !== 'string' || googleAccessToken.length > 2048) {
      return next(new ErrorResponse('Google access token yaroqsiz', 400));
    }
    try {
      // Audience tekshiruvi: token AYNAN shu ilova (GOOGLE_CLIENT_ID) uchun berilganligini tasdiqlaymiz.
      // Aks holda boshqa ilovaning valid access token'i bilan account hijack mumkin.
      // `.trim()` + qo'shtirnoq tozalash — Railway/host env'ga qiymat qo'yilganda
      // tasodifan qo'shilib qoladigan bo'sh joy / yangi qator / qo'shtirnoqlardan himoya.
      const expectedAud = (process.env.GOOGLE_CLIENT_ID || '').trim().replace(/^["']|["']$/g, '');
      const { data: tokenInfo } = await axios.get('https://oauth2.googleapis.com/tokeninfo', {
        params: { access_token: googleAccessToken },
        timeout: 8000,
      });
      if (!expectedAud || (tokenInfo.aud !== expectedAud && tokenInfo.azp !== expectedAud)) {
        securityLogger.suspicious(req, 'google_access_token_aud_mismatch', { aud: tokenInfo.aud, azp: tokenInfo.azp });
        return next(new ErrorResponse('Google token audience mos emas', 401));
      }

      const { data } = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${googleAccessToken}` },
        timeout: 8000,
      });
      googlePayload = {
        sub: data.sub,
        email: data.email,
        given_name: data.given_name,
        family_name: data.family_name,
        email_verified: data.email_verified,
      };
    } catch (err) {
      // Google API javobini ham log qilamiz — debug uchun (masalan insufficient scope,
      // invalid_token, audience mos emas). Client'ga generic xabar qaytadi.
      securityLogger.suspicious(req, 'google_access_token_invalid', {
        error: err.message,
        status: err.response?.status,
        googleError: err.response?.data?.error || err.response?.data?.error_description,
      });
      return next(new ErrorResponse('Google access token tekshirilmadi', 401));
    }
  }

  const { sub: googleId, email, given_name: firstName, family_name: lastName, email_verified } = googlePayload;

  if (!email_verified) {
    return next(new ErrorResponse('Google hisob emaili tasdiqlanmagan', 400));
  }
  if (!email) {
    return next(new ErrorResponse('Google hisobdan email olinmadi', 400));
  }

  const normalizedEmail = normalizeEmail(email);

  // googleId bo'yicha yoki email bo'yicha topamiz (mavjud hisob ulash uchun)
  let user = await User.findOne({ $or: [{ googleId }, { email: normalizedEmail }] })
    .select('+tokenVersion +totpEnabled');

  let isNew = false;

  if (user) {
    if (!user.googleId) {
      await User.updateOne({ _id: user._id }, { $set: { googleId } });
      user.googleId = googleId;
    }
    if (!user.isActive) {
      return next(new ErrorResponse('Account deactivated', 403));
    }
  } else {
    isNew = true;

    const baseUsername = normalizedEmail.split('@')[0]
      .replace(/[^a-z0-9]/gi, '_')
      .toLowerCase()
      .slice(0, 20);
    const username = `${baseUsername}_${crypto.randomBytes(2).toString('hex')}`;
    const referralCode = username.substring(0, 4).toUpperCase() + crypto.randomBytes(4).toString('hex').toUpperCase();

    user = await User.create({
      googleId,
      email: normalizedEmail,
      username,
      firstName: firstName || '',
      lastName: lastName || '',
      emailVerified: true,
      referralCode,
      xp: 0,
      rankTitle: 'AMATEUR',
    });

    UserStats.create({ userId: user._id, xp: 0 }).catch(() => {});
    sendWelcomeEmail(user.email, user.username).catch(() => {});
    securityLogger.registerSuccess(req, user);

    try {
      const { getBot } = require('../utils/telegramBot');
      const bot = getBot();
      if (bot) bot.notifyNewRegistration(user);
    } catch (_) {}
  }

  // 2FA gate also applies to Google login — Google solves "first factor", but TOTP is independent.
  if (user.totpEnabled) {
    const challengeId = generate2FAChallenge({ uid: String(user._id) });
    securityLogger.loginSuccess(req, user);
    return res.json({
      success: true,
      requires2FA: true,
      challengeId,
      isNewUser: isNew,
    });
  }

  const { accessToken, refreshToken } = await issueTokens(user, req);
  const csrfToken = attachAuthCookies(res, accessToken, refreshToken);
  await trackDeviceAndAlert(req, user);
  securityLogger.loginSuccess(req, user);

  const oauthUser = await User.findById(user._id).select('+password');
  res.status(isNew ? 201 : 200).json({
    success: true,
    data: { user: sanitizeUser(oauthUser) },
    isNewUser: isNew,
    csrfToken,
    ...mobileTokenBody(req, accessToken, refreshToken),
  });
});

// @desc    Telegram Mini App login — `window.Telegram.WebApp.initData` orqali
//          HMAC validatsiya + foydalanuvchini topish/yaratish + session.
//
//          Body: { initData: string }
//          initData formati URL-encoded query string (Telegram beradi).
const telegramMiniAppAuth = asyncHandler(async (req, res, next) => {
  const { initData } = req.body;

  if (!initData || typeof initData !== 'string' || initData.length > 8000) {
    return next(new ErrorResponse('initData yaroqsiz', 400));
  }

  const { validateInitData } = require('../utils/telegramWebAppAuth');
  const result = validateInitData(initData);

  if (!result.valid) {
    securityLogger.suspicious(req, 'telegram_initdata_invalid', { reason: result.reason });
    return next(new ErrorResponse(`Telegram autentifikatsiya rad etildi (${result.reason})`, 401));
  }

  const tgUser = result.user; // { id, first_name, last_name, username, language_code, photo_url, is_premium }
  const telegramUserId = String(tgUser.id);

  // Avval Telegram ID bo'yicha qidiramiz
  let user = await User.findOne({
    $or: [
      { telegramUserId },
      { 'socialSubscriptions.telegram.telegramUserId': telegramUserId },
    ],
  }).select('+tokenVersion +totpEnabled');

  let isNew = false;

  if (!user) {
    isNew = true;
    // Yangi user yaratamiz — username Telegram dan, agar yo'q bo'lsa fallback
    const tgUsername = (tgUser.username || `tg_${telegramUserId}`).toLowerCase().replace(/[^a-z0-9_]/g, '');
    const baseUsername = tgUsername.slice(0, 20) || `tg_${telegramUserId}`;
    const suffix = crypto.randomBytes(2).toString('hex');
    const username = `${baseUsername}_${suffix}`.slice(0, 30);

    // Email yo'q (Telegram bermaydi) — placeholder bilan yaratamiz, keyin user qo'shadi
    const placeholderEmail = `tg_${telegramUserId}@tg.aidevix.local`;
    const referralCode =
      username.substring(0, 4).toUpperCase() + crypto.randomBytes(4).toString('hex').toUpperCase();

    try {
      user = await User.create({
        username,
        email: placeholderEmail,
        firstName: tgUser.first_name || '',
        lastName: tgUser.last_name || '',
        emailVerified: false, // user keyin haqiqiy email qo'shishi mumkin
        telegramUserId,
        telegramChatId: telegramUserId,
        avatar: tgUser.photo_url || null,
        'socialSubscriptions.telegram.username': tgUser.username || null,
        'socialSubscriptions.telegram.telegramUserId': telegramUserId,
        'socialSubscriptions.telegram.verifiedAt': new Date(),
        referralCode,
        xp: 0,
        rankTitle: 'AMATEUR',
      });
    } catch (e) {
      // Race: parallel TMA auth bir vaqtda user yaratdi (placeholder email unique 11000) — mavjudini olamiz
      if (e && e.code === 11000) {
        isNew = false;
        user = await User.findOne({
          $or: [
            { telegramUserId },
            { 'socialSubscriptions.telegram.telegramUserId': telegramUserId },
          ],
        }).select('+tokenVersion +totpEnabled');
        if (!user) throw e;
      } else {
        throw e;
      }
    }

    if (isNew) {
      UserStats.create({ userId: user._id, xp: 0 }).catch(() => {});
      securityLogger.registerSuccess(req, user);

      // Bot orqali admin'ga yangi user xabarini berish
      try {
        const { getBot } = require('../utils/telegramBot');
        const bot = getBot();
        if (bot && typeof bot.notifyNewRegistration === 'function') {
          bot.notifyNewRegistration(user);
        }
      } catch (_) {}
    }
  } else {
    if (!user.isActive) return next(new ErrorResponse('Account deactivated', 403));
    // Telegram ID ulash (eski user'da bo'lmasa)
    if (!user.telegramUserId) {
      await User.updateOne({ _id: user._id }, { $set: { telegramUserId, telegramChatId: telegramUserId } });
    }
  }

  // 2FA gate — Telegram first factor solves identity, lekin TOTP mustaqil
  if (user.totpEnabled) {
    const challengeId = generate2FAChallenge({ uid: String(user._id) });
    securityLogger.loginSuccess(req, user);
    return res.json({
      success: true,
      requires2FA: true,
      challengeId,
      isNewUser: isNew,
    });
  }

  const { accessToken, refreshToken } = await issueTokens(user, req);
  const csrfToken = attachAuthCookies(res, accessToken, refreshToken);
  await trackDeviceAndAlert(req, user);
  securityLogger.loginSuccess(req, user);

  const fresh = await User.findById(user._id).select('+password');
  res.status(isNew ? 201 : 200).json({
    success: true,
    data: { user: sanitizeUser(fresh) },
    isNewUser: isNew,
    source: 'telegram-miniapp',
    csrfToken,
    ...mobileTokenBody(req, accessToken, refreshToken),
  });
});

// @desc    Telegram "Magic Login" — bot yuborgan opaque single-use kodni cookie sessiyaga almashtirish.
// @route   POST /api/auth/telegram-login
// @access  Public (kod o'zi autentifikatsiya)
const telegramMagicLogin = asyncHandler(async (req, res, next) => {
  const { code } = req.body;
  if (!code || typeof code !== 'string' || code.length > 128) {
    return next(new ErrorResponse('Kod yaroqsiz', 400));
  }

  const MagicLoginToken = require('../models/MagicLoginToken');
  // Atomic single-use: faqat ishlatilmagan kodni "used" qilamiz (replay/parallel oldini olish)
  const tokenDoc = await MagicLoginToken.findOneAndUpdate(
    { token: code, used: false },
    { $set: { used: true } },
    { new: true }
  );
  if (!tokenDoc) {
    return next(new ErrorResponse('Kod yaroqsiz yoki muddati o\'tgan', 401));
  }

  const user = await User.findById(tokenDoc.userId).select('+tokenVersion +totpEnabled');
  // Bir martalik kod — ishlatilgach o'chiramiz
  MagicLoginToken.deleteOne({ _id: tokenDoc._id }).catch(() => {});

  if (!user || !user.isActive || user.deletedAt) {
    return next(new ErrorResponse('Hisob topilmadi yoki faol emas', 401));
  }

  // 2FA gate — Telegram identity birinchi faktor, lekin TOTP mustaqil
  if (user.totpEnabled) {
    const challengeId = generate2FAChallenge({ uid: String(user._id) });
    securityLogger.loginSuccess(req, user);
    return res.json({ success: true, requires2FA: true, challengeId });
  }

  const { accessToken, refreshToken } = await issueTokens(user, req);
  const csrfToken = attachAuthCookies(res, accessToken, refreshToken);
  await trackDeviceAndAlert(req, user);
  securityLogger.loginSuccess(req, user);

  const fresh = await User.findById(user._id).select('+password');
  res.json({
    success: true,
    data: { user: sanitizeUser(fresh) },
    source: 'telegram-magic-login',
    csrfToken,
    ...mobileTokenBody(req, accessToken, refreshToken),
  });
});

// @desc    Step-up reauth — issue 5-min reauth token.
//
// Accepts EITHER:
//   - `password` (for users with a local password)
//   - `googleCredential` (Google ID token; for Google-only accounts and as alt path)
// Used by sensitive operations (account delete, 2FA disable, email change).
const reauth = asyncHandler(async (req, res, next) => {
  const { password, googleCredential } = req.body;

  const user = await User.findById(req.user._id).select('+password');
  if (!user) return next(new ErrorResponse('User not found', 404));

  let verified = false;
  let method = null;

  if (password && user.password) {
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      securityLogger.suspicious(req, 'reauth_wrong_password', { userId: String(user._id) });
      return next(new ErrorResponse('Parol noto\'g\'ri', 401));
    }
    verified = true;
    method = 'password';
  } else if (googleCredential && user.googleId) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return next(new ErrorResponse('Google reauth not configured', 503));
    }
    try {
      const googleClient = new OAuth2Client(clientId);
      const ticket = await googleClient.verifyIdToken({
        idToken: googleCredential,
        audience: clientId,
      });
      const payload = ticket.getPayload();
      // The credential MUST belong to the same Google account linked on this user.
      if (!payload?.sub || payload.sub !== user.googleId) {
        securityLogger.suspicious(req, 'reauth_google_account_mismatch', {
          userId: String(user._id),
        });
        return next(new ErrorResponse('Google hisob mos kelmadi', 401));
      }
      verified = true;
      method = 'google';
    } catch (err) {
      securityLogger.suspicious(req, 'reauth_google_invalid', {
        userId: String(user._id),
        error: err.message,
      });
      return next(new ErrorResponse('Google credential noto\'g\'ri', 401));
    }
  }

  if (!verified) {
    return next(new ErrorResponse(
      user.password
        ? 'Parol majburiy'
        : 'Google credential majburiy (hisobingiz Google bilan ulangan)',
      400
    ));
  }

  const reauthToken = issueReauthToken(user._id);
  res.json({
    success: true,
    data: { reauthToken, expiresIn: 300, method },
  });
});

// @desc    GDPR right-to-erasure — soft-delete + anonymize own account.
//          Requires step-up reauth token (verified by middleware).
const deleteMyAccount = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    clearAuthCookies(res);
    return res.json({ success: true, message: 'Already deleted' });
  }
  const originalEmail = user.email;
  const originalUsername = user.username;
  await softDeleteUser(user._id, 'self');
  clearAuthCookies(res);

  securityLogger.accountDeleted(req, user, 'self');
  if (originalEmail && !originalEmail.endsWith('@deleted.aidevix.local')) {
    sendAccountDeletedEmail(originalEmail, originalUsername).catch((err) => {
      // Email yuborilishi muvaffaqiyatsiz bo'lsa ham hisob o'chirilgan — operator ko'rinishi uchun log
      console.error('[deleteMyAccount] account-deleted email failed:', err.message);
    });
  }
  res.json({
    success: true,
    message: 'Hisob o\'chirildi va anonimlashtirildi. Sizning ma\'lumotlaringiz muvaffaqiyatli o\'chirildi.',
  });
});

module.exports = {
  register,
  login,
  verify2FALogin,
  googleAuth,
  telegramMiniAppAuth,
  telegramMagicLogin,
  refreshToken: refresh,
  logout,
  logoutAll,
  getMe,
  getReferralStats,
  claimDailyReward,
  forgotPassword,
  verifyCode,
  resetPassword,
  changePassword,
  verifyEmail,
  verifyEmailPublic,
  resendVerification,
  resendVerificationPublic,
  reauth,
  deleteMyAccount,
  getCsrfToken,
};

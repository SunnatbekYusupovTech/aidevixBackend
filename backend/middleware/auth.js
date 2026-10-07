const { verifyAccessToken } = require('../utils/jwt');
const User = require('../models/User');
const Session = require('../models/Session');
const { ACCESS_COOKIE_NAME, parseCookies } = require('../utils/authSecurity');
const securityLogger = require('../utils/securityLogger');

const authDebug = (...args) => {
  if (process.env.AUTH_DEBUG === 'true') {
    console.log('[AUTH_DEBUG]', ...args);
  }
};

const AUTH_USER_FIELDS = [
  'username', 'email', 'role', 'isActive', 'firstName', 'lastName', 'avatar',
  'xp', 'streak', 'rankTitle', 'referralCode', 'referralsCount', 'emailVerified',
  'googleId', 'telegramUserId', 'telegramChatId', 'socialSubscriptions', 'proSubscription',
  'lastClaimedDaily', 'createdAt',
  'totpEnabled', // NOT select:false — '+totpEnabled' in an inclusive projection would be a literal key
  '+tokenVersion', '+deletedAt',
].join(' ');

const unauthorized = (res, message) =>
  res.status(401).json({ success: false, message });

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const cookies = parseCookies(req.headers.cookie);
    // Bearer token faqat dev/Swagger uchun. Production'da cookie-only (CLAUDE.md siyosati) —
    // bu CSRF-bypass vektorini yopadi (csrfProtection cookie yo'q so'rovni o'tkazib yuboradi).
    const bearerAllowed = process.env.NODE_ENV !== 'production' || process.env.ALLOW_BEARER_AUTH === 'true';
    const bearerToken =
      bearerAllowed && authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.substring(7)
        : null;
    const token = cookies[ACCESS_COOKIE_NAME] || bearerToken;

    if (!token) {
      return unauthorized(res, 'No token provided. Authorization denied.');
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      authDebug('authenticate:access_verify_failed', {
        hasCookieToken: Boolean(cookies[ACCESS_COOKIE_NAME]),
        hasBearerToken: Boolean(bearerToken),
      });
      return unauthorized(res, 'Invalid or expired token.');
    }

    // P-B12: faqat downstream ishlatadigan maydonlar (req.user.* / checkSubscriptions /
    // enrollment / video Pro tekshiruvi). Hujjat hydrate qilinadi (lean emas) — chunki
    // checkSubscriptions req.user.save() chaqiradi; projection bilan save faqat o'zgargan
    // path'larni yozadi. Yangi maydon kerak bo'lsa shu ro'yxatga qo'shing.
    // AUTH-10: access token'dagi sid bo'yicha sessiya hali mavjudligini parallel tekshiramiz.
    const [user, sessionAlive] = await Promise.all([
      User.findById(decoded.userId).select(AUTH_USER_FIELDS),
      decoded.sid ? Session.exists({ _id: decoded.sid, userId: decoded.userId }) : Promise.resolve(true),
    ]);

    if (!user) {
      return unauthorized(res, 'User not found or inactive.');
    }

    if (!sessionAlive) {
      authDebug('authenticate:session_revoked', { userId: String(user._id) });
      return unauthorized(res, 'Session expired. Please login again.');
    }

    if (!user.isActive || user.deletedAt) {
      securityLogger.suspicious(req, 'inactive_user_access', { userId: String(user._id) });
      return unauthorized(res, 'User not found or inactive.');
    }

    // Treat missing `tv` as 0 — pre-tv tokens must not skip the version check.
    // After logoutAll/resetPassword increments tokenVersion, any old token (tv=0 or absent)
    // will be rejected once tokenVersion > 0, forcing a re-login.
    const tokenTv = typeof decoded.tv === 'number' ? decoded.tv : 0;
    if (tokenTv !== (user.tokenVersion || 0)) {
      authDebug('authenticate:token_version_mismatch', {
        userId: String(user._id),
        decodedTv: tokenTv,
        dbTv: user.tokenVersion || 0,
      });
      securityLogger.tokenVersionMismatch(req, user._id);
      return unauthorized(res, 'Session expired. Please login again.');
    }

    req.user = user;
    next();
  } catch (error) {
    return unauthorized(res, 'Authentication failed.');
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    if (req.user) {
      securityLogger.suspicious(req, 'admin_access_denied', { userId: String(req.user._id) });
    }
    return res.status(403).json({
      success: false,
      message: 'Admin access required.',
    });
  }

  // ADM-07: ixtiyoriy qattiqlashtirish — ADMIN_REQUIRE_2FA=true bo'lsa 2FA'siz admin rad etiladi.
  // Default o'chiq: 2FA yoqmagan mavjud adminlar to'satdan bloklanib qolmasligi uchun.
  if (process.env.ADMIN_REQUIRE_2FA === 'true' && !req.user.totpEnabled) {
    securityLogger.suspicious(req, 'admin_without_2fa', { userId: String(req.user._id) });
    return res.status(403).json({
      success: false,
      code: 'ADMIN_2FA_REQUIRED',
      message: 'Admin amallari uchun 2FA yoqilgan bo\'lishi shart.',
    });
  }

  // FIX [MEDIUM]: Admin audit trail — har bir admin so'rovi loglanadi.
  // Kimdir, qaysi endpoint, qaysi method — traceability uchun.
  securityLogger.suspicious(req, 'admin_endpoint_accessed', {
    userId: String(req.user._id),
    method: req.method,
    path: req.originalUrl.split('?')[0],
  });

  next();
};

module.exports = {
  authenticate,
  requireAdmin,
};

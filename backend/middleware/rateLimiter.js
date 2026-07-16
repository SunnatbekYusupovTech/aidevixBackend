const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const { makeStore, getRedisClient } = require('../config/redis');

// Distributed rate limiting:
//  - REDIS_URL set  → counters live in Redis (Upstash); shared across all instances.
//  - REDIS_URL unset → MemoryStore per instance. OK for dev / single-process; in prod
//    on Railway with N replicas the effective limit is N × configured value.
if (process.env.NODE_ENV === 'production' && !process.env.REDIS_URL) {
  console.warn('⚠️  REDIS_URL not set in production — rate limits are per-instance only.');
}

const jsonMessage = (msg) => ({ success: false, message: msg });

// IPv6-safe IP key (express-rate-limit 8.x requirement)
const ipKey = (req, res) => ipKeyGenerator(req, res);

const baseOpts = (prefix) => ({
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore(prefix),
});

// Umumiy API limit
const apiLimiter = rateLimit({
  ...baseOpts('api'),
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: jsonMessage('Juda ko\'p so\'rov. 15 daqiqadan so\'ng qayta urinib ko\'ring.'),
  keyGenerator: ipKey,
});

// Umumiy auth namespace limit — pragmatik
const authLimiter = rateLimit({
  ...baseOpts('auth'),
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: jsonMessage('Juda ko\'p urinish. 15 daqiqadan so\'ng qayta urinib ko\'ring.'),
  keyGenerator: ipKey,
});

// Login uchun qattiq limit: per IP + per email kombinatsiyasi
const loginLimiter = rateLimit({
  ...baseOpts('login'),
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: jsonMessage('Juda ko\'p login urinishi. Iltimos 15 daqiqadan so\'ng urinib ko\'ring.'),
  keyGenerator: (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    return `${ipKey(req, res)}|${email}`;
  },
  skipSuccessfulRequests: true,
});

// Register uchun IP asosida
const registerLimiter = rateLimit({
  ...baseOpts('register'),
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: jsonMessage('Juda ko\'p ro\'yxatdan o\'tish urinishi. 1 soatdan so\'ng urinib ko\'ring.'),
  keyGenerator: ipKey,
});

// Refresh token uchun qattiqroq limit.
// FIX [CRITICAL]: 40 dan 10 ga tushirildi — valid refresh token olgan hujumchi
// hammerlashini oldini olish uchun. keyGenerator IP-only (req.user yo'q bu endpoint'da),
// lekin 10/15min munosib deb topildi (access token har 15 daqiqada yangilanadi).
const refreshLimiter = rateLimit({
  ...baseOpts('refresh'),
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: jsonMessage('Juda ko\'p token yangilash. Bir oz kutib turing.'),
  keyGenerator: ipKey,
});

const paymentLimiter = rateLimit({
  ...baseOpts('payment'),
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: jsonMessage('To\'lov uchun juda ko\'p so\'rov.'),
  keyGenerator: ipKey,
});

// Payme/Click PROVIDER webhook'lari — provider bitta to'lov uchun bir nechta
// JSON-RPC chaqiruv yuboradi (CheckPerform+Create+Perform+GetStatement) va hammasi
// bir nechta sobit IP'dan keladi. paymentLimiter (20/soat) legit tasdiqlarni
// bloklaydi. Webhook'lar allaqachon signature/Basic-auth bilan himoyalangan,
// shuning uchun bu yerda faqat qo'pol flood himoyasi kerak.
const webhookLimiter = rateLimit({
  ...baseOpts('webhook'),
  windowMs: 15 * 60 * 1000,
  max: 600,
  message: jsonMessage('Juda ko\'p so\'rov.'),
  keyGenerator: ipKey,
});

const uploadLimiter = rateLimit({
  ...baseOpts('upload'),
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: jsonMessage('Upload uchun juda ko\'p so\'rov.'),
  keyGenerator: ipKey,
});

// OTP (forgot password / verify code) — IP + email
const otpLimiter = rateLimit({
  ...baseOpts('otp'),
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: jsonMessage('Juda ko\'p urinish. 15 daqiqadan so\'ng qayta urinib ko\'ring.'),
  keyGenerator: (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    return `${ipKey(req, res)}|${email || 'anon'}`;
  },
});

// Daily reward limiter
const dailyRewardLimiter = rateLimit({
  ...baseOpts('daily'),
  windowMs: 60 * 1000,
  max: 5,
  message: jsonMessage('Juda ko\'p so\'rov. 1 daqiqadan so\'ng qayta urinib ko\'ring.'),
  keyGenerator: (req, res) => (req.user?._id ? String(req.user._id) : ipKey(req, res)),
});

// Email verify kod tekshirish / qayta yuborish — user asosida
const verifyEmailLimiter = rateLimit({
  ...baseOpts('verify'),
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: jsonMessage('Juda ko\'p urinish. 15 daqiqadan so\'ng qayta urinib ko\'ring.'),
  keyGenerator: (req, res) => (req.user?._id ? String(req.user._id) : ipKey(req, res)),
});

// Google OAuth — per-IP, qisman yumshoq (Google o'zi bot himoyasini bajaradi)
const googleLimiter = rateLimit({
  ...baseOpts('google'),
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: jsonMessage('Juda ko\'p Google login urinishi. 15 daqiqadan so\'ng qayta urinib ko\'ring.'),
  keyGenerator: ipKey,
});

// Telegram Mini App auth — HMAC validate'siz hech narsa o'tmaydi, lekin spam himoyasi
const telegramAuthLimiter = rateLimit({
  ...baseOpts('tg_auth'),
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: jsonMessage('Juda ko\'p Telegram autentifikatsiya urinishi.'),
  keyGenerator: ipKey,
});

// 2FA verify — IP + challengeId kombinatsiyasi.
// FIX [HIGH]: Faqat per-IP emas, per-challengeId ham keying qilinadi.
// Yangi challengeId olish uchun qayta login kerak (loginLimiter cheklovida),
// shuning uchun per-challengeId keying brute-force'ni yanada qiyinlashtiradi.
const totpLimiter = rateLimit({
  ...baseOpts('totp'),
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: jsonMessage('Juda ko\'p 2FA urinishi. 15 daqiqadan so\'ng qayta urinib ko\'ring.'),
  keyGenerator: (req, res) => {
    // challengeId dan faqat dastlabki 64 belgini olamiz (JWT header+payload qismi)
    const challengeId = String(req.body?.challengeId || '').slice(0, 64);
    return challengeId
      ? `${ipKey(req, res)}|${challengeId}`
      : ipKey(req, res);
  },
});

// Reauth / change-password / 2FA disable — per-user, qattiq.
// FIX [MEDIUM]: 10 dan 5 ga tushirildi — authenticated brute-force
// (parol taxmin qilish) oynasini toraytirish uchun.
const reauthLimiter = rateLimit({
  ...baseOpts('reauth'),
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: jsonMessage('Juda ko\'p urinish. 15 daqiqadan so\'ng qayta urinib ko\'ring.'),
  keyGenerator: (req, res) => (req.user?._id ? String(req.user._id) : ipKey(req, res)),
});

// Swagger docs Basic-auth — brute-force himoyasi.
// /api-docs va /admin-docs apiLimiter'dan tashqarida (u faqat /api/ prefiksga
// mount qilingan), shuning uchun bu yerda alohida limiter kerak.
const docsLimiter = rateLimit({
  ...baseOpts('docs'),
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: jsonMessage('Juda ko\'p urinish. 15 daqiqadan so\'ng qayta urinib ko\'ring.'),
  keyGenerator: ipKey,
});

// Bug / sayt xatoligi xabarlari — spam oldini olish
const bugReportLimiter = rateLimit({
  ...baseOpts('bug'),
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: jsonMessage('Soatiga 5 tadan ortiq bug xabari yuborib bo\'lmaydi.'),
  keyGenerator: (req, res) => (req.user?._id ? String(req.user._id) : ipKey(req, res)),
});

module.exports = {
  apiLimiter,
  authLimiter,
  loginLimiter,
  registerLimiter,
  refreshLimiter,
  paymentLimiter,
  webhookLimiter,
  uploadLimiter,
  otpLimiter,
  dailyRewardLimiter,
  verifyEmailLimiter,
  googleLimiter,
  telegramAuthLimiter,
  totpLimiter,
  reauthLimiter,
  bugReportLimiter,
  docsLimiter,
  _redisClient: getRedisClient,
};

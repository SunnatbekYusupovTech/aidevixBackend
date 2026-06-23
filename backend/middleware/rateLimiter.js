const rateLimit = require('express-rate-limit');

// Development rejimida barcha limiter'larni o'tkazib yuboramiz —
// test paytida o'zimizni 429 bilan blokirovka qilmaslik uchun.
// Production'da (NODE_ENV !== 'development') limiter avtomatik ishlaydi.
const isDev = process.env.NODE_ENV === 'development';
const skipInDev = () => isDev;

if (isDev) {
  console.log('⚠️  Rate limiter DEV rejimida o\'chirilgan (NODE_ENV=development)');
}

// Umumiy API limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 daqiqa
  max: 500,
  message: { success: false, message: 'Juda ko\'p so\'rov. 15 daqiqadan so\'ng qayta urinib ko\'ring.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInDev,
});

// Auth uchun limit (register/login test qilish uchun kengaytirildi)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { success: false, message: 'Juda ko\'p urinish. 15 daqiqadan so\'ng qayta urinib ko\'ring.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInDev,
});

// To'lov uchun limit
const paymentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 soat
  max: 20,
  message: { success: false, message: 'To\'lov uchun juda ko\'p so\'rov.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInDev,
});

// Upload uchun limit
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Upload uchun juda ko\'p so\'rov.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInDev,
});

// OTP (Forgot password / Verify code) limiter — to prevent brute force
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { success: false, message: 'Juda ko\'p urinish. 15 daqiqadan so\'ng qayta urinib ko\'ring.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInDev,
});

// Daily reward limiter — foydalanuvchi bazaga spam bosmaslik uchun
const dailyRewardLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 daqiqa
  max: 5,
  message: { success: false, message: 'Juda ko\'p so\'rov. 1 daqiqadan so\'ng qayta urinib ko\'ring.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInDev,
});

module.exports = { apiLimiter, authLimiter, paymentLimiter, uploadLimiter, otpLimiter, dailyRewardLimiter };

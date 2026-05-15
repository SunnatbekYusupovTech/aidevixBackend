const express = require('express');
const router = express.Router();
const {
  register,
  login,
  verify2FALogin,
  googleAuth,
  telegramMiniAppAuth,
  refreshToken,
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
} = require('../controllers/authController');
const {
  setup2FA,
  enable2FA,
  disable2FA,
  regenerateBackupCodes,
} = require('../controllers/twoFactorController');
const { authenticate } = require('../middleware/auth');
const captchaCheck = require('../middleware/captchaCheck');
const { requireRecentReauth } = require('../middleware/stepUp');
const {
  otpLimiter,
  loginLimiter,
  registerLimiter,
  refreshLimiter,
  dailyRewardLimiter,
  verifyEmailLimiter,
  googleLimiter,
  telegramAuthLimiter,
  totpLimiter,
  reauthLimiter,
} = require('../middleware/rateLimiter');

// Public — limiters tight, CSRF exempt; CAPTCHA on register/login/forgot.
router.post('/register', registerLimiter, captchaCheck, register);
router.post('/login', loginLimiter, captchaCheck, login);
router.post('/2fa/verify-login', totpLimiter, verify2FALogin);
router.post('/google', googleLimiter, googleAuth);
// Telegram Mini App auth — HMAC validate qilingan initData ostida login/register
router.post('/telegram-init', telegramAuthLimiter, telegramMiniAppAuth);
router.post('/refresh-token', refreshLimiter, refreshToken);
// CSRF token issuance — works for unauthenticated and authenticated users.
// Cross-site frontends call this on boot to prime the in-memory token store.
router.get('/csrf', getCsrfToken);
router.post('/forgot-password', otpLimiter, captchaCheck, forgotPassword);
router.post('/verify-code', otpLimiter, verifyCode);
router.post('/reset-password', otpLimiter, resetPassword);
router.post('/resend-verification-public', otpLimiter, resendVerificationPublic);
router.post('/verify-email-public', otpLimiter, verifyEmailPublic);

// Private
router.post('/logout', authenticate, logout);
// FIX [LOW]: Barcha qurilmalardan chiqish — tokenVersion++ qiladi, barcha sessionlarni o'chiradi.
router.post('/logout-all', authenticate, logoutAll);
router.put('/change-password', authenticate, reauthLimiter, changePassword);
router.post('/daily-reward', authenticate, dailyRewardLimiter, claimDailyReward);
router.get('/me', authenticate, getMe);
router.get('/referrals', authenticate, getReferralStats);
router.post('/verify-email', authenticate, verifyEmailLimiter, verifyEmail);
router.post('/resend-verification', authenticate, verifyEmailLimiter, resendVerification);

// Step-up reauth + GDPR right-to-erasure
router.post('/reauth', authenticate, reauthLimiter, reauth);
router.delete('/me', authenticate, requireRecentReauth, deleteMyAccount);

// 2FA management (authenticated)
router.post('/2fa/setup', authenticate, setup2FA);
router.post('/2fa/enable', authenticate, enable2FA);
// 2FA disable — parol qayta tasdiqlash (step-up reauth) talab qilinadi (account takeover himoyasi)
router.post('/2fa/disable', authenticate, reauthLimiter, requireRecentReauth, disable2FA);
// Backup codes regenerate ham step-up reauth ostida bo'lishi xavfsizroq
router.post('/2fa/backup-codes', authenticate, totpLimiter, requireRecentReauth, regenerateBackupCodes);

module.exports = router;

const express = require('express');
const router = express.Router();
const {
  register,
  login,
  googleAuth,
  refreshToken,
  logout,
  getMe,
  getReferralStats,
  claimDailyReward,
  forgotPassword,
  verifyCode,
  resetPassword,
  verifyEmail,
  resendVerification,
} = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { otpLimiter, authLimiter, dailyRewardLimiter } = require('../middleware/rateLimiter');

// Public
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/google', authLimiter, googleAuth);
router.post('/refresh-token', refreshToken);
router.post('/forgot-password', otpLimiter, forgotPassword);
router.post('/verify-code', otpLimiter, verifyCode);
router.post('/reset-password', otpLimiter, resetPassword);

// Private
router.post('/logout', authenticate, logout);
router.post('/daily-reward', authenticate, dailyRewardLimiter, claimDailyReward);
router.get('/me', authenticate, getMe);
router.get('/referrals', authenticate, getReferralStats);
router.post('/verify-email', authenticate, otpLimiter, verifyEmail);
router.post('/resend-verification', authenticate, otpLimiter, resendVerification);

module.exports = router;

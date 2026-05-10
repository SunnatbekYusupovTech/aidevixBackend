const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const { makeStore } = require('../config/redis');

const { reviewCode } = require('../controllers/playgroundController');
const { authenticate } = require('../middleware/auth');

const playgroundReviewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore('playground_review'),
  message: { success: false, message: 'AI review uchun juda ko\'p so\'rov. 15 daqiqadan so\'ng urinib ko\'ring.' },
  keyGenerator: (req, res) => (req.user?._id ? String(req.user._id) : ipKeyGenerator(req, res)),
});

router.post('/review', authenticate, playgroundReviewLimiter, reviewCode);

module.exports = router;

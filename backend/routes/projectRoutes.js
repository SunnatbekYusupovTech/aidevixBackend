const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const { makeStore } = require('../config/redis');
const {
  getProjectsByCourse,
  getProject,
  completeProject,
  reviewProject,
  createProject,
  updateProject,
  deleteProject,
  getMyProjects,
} = require('../controllers/projectController');
const { authenticate, requireAdmin } = require('../middleware/auth');
const validateObjectId = require('../middleware/validateObjectId');
const { ACCESS_COOKIE_NAME, parseCookies } = require('../utils/authSecurity');

// (login bo'lsa isCompleted va o'z review'lari ko'rsatiladi)
// Ixtiyoriy autentifikatsiya: cookie/Bearer bo'lsa req.user o'rnatiladi, token yaroqsiz bo'lsa
// anonim sifatida davom etadi (401 qaytarmaydi). Production cookie-only bo'lgani uchun cookie ham tekshiriladi.
const optionalAuth = (req, res, next) => {
  const hasBearer = (req.headers.authorization || '').startsWith('Bearer ');
  const hasCookie = Boolean(parseCookies(req.headers.cookie)[ACCESS_COOKIE_NAME]);
  if (!hasBearer && !hasCookie) return next();
  const anonymousRes = { status: () => ({ json: () => next() }) };
  return authenticate(req, anonymousRes, next);
};

// COM-09 / LLM-03: pullik LLM chaqiruvi — per-user limit (playgroundReviewLimiter namunasi bo'yicha)
const reviewUserKey = (req, res) => (req.user?._id ? String(req.user._id) : ipKeyGenerator(req, res));
const projectReviewLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: makeStore('project_review'),
  message: { success: false, message: "AI review uchun juda ko'p so'rov. 1 soatdan so'ng urinib ko'ring." },
  keyGenerator: reviewUserKey,
});
const projectReviewDailyLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 20,
  standardHeaders: false,
  legacyHeaders: false,
  store: makeStore('project_review_day'),
  message: { success: false, message: "Bugungi AI review limiti tugadi. Ertaga urinib ko'ring." },
  keyGenerator: reviewUserKey,
});

router.get('/course/:courseId', optionalAuth, validateObjectId('courseId'), getProjectsByCourse);
router.get('/my', authenticate, getMyProjects); // `/:id` dan OLDIN — aks holda :id='my' bo'ladi
router.get('/:id', optionalAuth, validateObjectId('id'), getProject);
router.post('/:id/complete', authenticate, validateObjectId('id'), completeProject);
router.post('/:id/review', authenticate, validateObjectId('id'), projectReviewLimiter, projectReviewDailyLimiter, reviewProject);

// ─── Admin ────────────────────────────────────────────────────────────────────
router.post('/', authenticate, requireAdmin, createProject);
router.put('/:id', authenticate, requireAdmin, validateObjectId('id'), updateProject);
router.delete('/:id', authenticate, requireAdmin, validateObjectId('id'), deleteProject);

module.exports = router;

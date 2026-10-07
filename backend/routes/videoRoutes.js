const express = require('express');
const router = express.Router();
const {
  getCourseVideos,
  getVideo,
  useVideoLink,
  createVideo,
  updateVideo,
  deleteVideo,
  searchVideos,
  askQuestion,
  getVideoQuestions,
  answerQuestion,
  upvoteQuestion,
  markBestAnswer,
  getUploadCredentialsForVideo,
  uploadVideoProxy,
  checkVideoStatus,
  linkToBunny,
  getTopVideos,
} = require('../controllers/videoController');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { checkSubscriptions } = require('../middleware/subscriptionCheck');
const validateObjectId = require('../middleware/validateObjectId');
const { invalidateCacheOnSuccess } = require('../middleware/cacheMiddleware');

// P-B09: video qo'shish/o'chirish kurs keshidagi videoCount'ni o'zgartiradi
const invalidateCourses = invalidateCacheOnSuccess('cache:/api/courses');
const { ACCESS_COOKIE_NAME, parseCookies } = require('../utils/authSecurity');

// Ixtiyoriy autentifikatsiya: cookie/Bearer bo'lsa req.user o'rnatiladi, token yaroqsiz bo'lsa
// anonim sifatida davom etadi (401 qaytarmaydi). Production cookie-only bo'lgani uchun cookie ham tekshiriladi.
const optionalAuth = (req, res, next) => {
  const hasBearer = (req.headers.authorization || '').startsWith('Bearer ');
  const hasCookie = Boolean(parseCookies(req.headers.cookie)[ACCESS_COOKIE_NAME]);
  if (!hasBearer && !hasCookie) return next();
  const anonymousRes = { status: () => ({ json: () => next() }) };
  return authenticate(req, anonymousRes, next);
};

// ════════════════════════════════════════════════════════════════
// GET /api/videos/course/:courseId
// ════════════════════════════════════════════════════════════════
// ADM-02: optionalAuth — admin bo'lsa bunnyVideoId/bunnyStatus qaytariladi, public uchun yo'q
router.get('/course/:courseId', optionalAuth, getCourseVideos);

router.get('/search', authenticate, searchVideos);
router.get('/top', getTopVideos);

// ════════════════════════════════════════════════════════════════
// GET /api/videos/:id
// ════════════════════════════════════════════════════════════════
router.get('/:id', validateObjectId(), authenticate, checkSubscriptions, getVideo);

// ════════════════════════════════════════════════════════════════
// POST /api/videos/link/:linkId/use
// ════════════════════════════════════════════════════════════════
router.post('/link/:linkId/use', authenticate, useVideoLink);

// ════════════════════════════════════════════════════════════════
// POST /api/videos  |  PUT /api/videos/:id  |  DELETE /api/videos/:id
// ════════════════════════════════════════════════════════════════
router.post('/', authenticate, requireAdmin, invalidateCourses, createVideo);

router.put('/:id', validateObjectId(), authenticate, requireAdmin, invalidateCourses, updateVideo);
router.delete('/:id', validateObjectId(), authenticate, requireAdmin, invalidateCourses, deleteVideo);

// ════════════════════════════════════════════════════════════════
// Bunny.net endpoints (Admin only)
// ════════════════════════════════════════════════════════════════

router.get('/:id/upload-credentials', validateObjectId(), authenticate, requireAdmin, getUploadCredentialsForVideo);

// Video binary'ni backend orqali Bunny'ga oqizadi (octet-stream raw body — body-parser tegmaydi)
router.put('/:id/upload-proxy', validateObjectId(), authenticate, requireAdmin, uploadVideoProxy);

router.get('/:id/status', validateObjectId(), authenticate, requireAdmin, checkVideoStatus);

router.patch('/:id/link-bunny', validateObjectId(), authenticate, requireAdmin, linkToBunny);

router.get('/:id/questions', validateObjectId(), getVideoQuestions);
router.post('/:id/questions', validateObjectId(), authenticate, askQuestion);

router.post('/:id/questions/:questionId/answer', validateObjectId('questionId'), authenticate, requireAdmin, answerQuestion);
router.post('/:id/questions/:questionId/upvote', validateObjectId('questionId'), authenticate, upvoteQuestion);
router.post('/:id/questions/:questionId/best', validateObjectId('questionId'), authenticate, requireAdmin, markBestAnswer);

module.exports = router;

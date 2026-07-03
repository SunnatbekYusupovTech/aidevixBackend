const express = require('express');
const router = express.Router();
const {
  getAllCourses,
  getCourse,
  getTopCourses,
  getCategories,
  getRecommendedCourses,
  getUserRecommendedCourses,
  getAutocomplete,
  getFilterCounts,
  getSitemapCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  rateCourse,
} = require('../controllers/courseController');
const { authenticate, requireAdmin } = require('../middleware/auth');
const validateObjectId = require('../middleware/validateObjectId');

// ════════════════════════════════════════════════════════════════
// GET /api/courses  |  POST /api/courses
// ════════════════════════════════════════════════════════════════
router.get('/',                getAllCourses);
router.get('/top',             getTopCourses);
router.get('/categories',      getCategories);
router.get('/autocomplete',    getAutocomplete);
router.get('/filter-counts',   getFilterCounts);
// Foydalanuvchi uchun aqlli tavsiya — aiStack + tugatilgan kurslar asosida
router.get('/recommended', authenticate, getUserRecommendedCourses);
// Bonus-14: sitemap uchun lightweight endpoint (50-clamp yo'q, slug bilan)
// MUHIM: /:id dan OLDIN turishi shart — Express route tartibi
router.get('/sitemap', getSitemapCourses);
router.post('/', authenticate, requireAdmin, createCourse);

// ════════════════════════════════════════════════════════════════
// GET /api/courses/:id  |  PUT /api/courses/:id  |  DELETE /api/courses/:id
// SEO-007: GET /:id endi slug ham qabul qiladi — validateObjectId olib tashlandi
// Admin operatsiyalar (PUT/DELETE) hali ham ObjectId talab qiladi
// ════════════════════════════════════════════════════════════════
router.get('/:id', getCourse);

router.get('/:id/recommended', getRecommendedCourses);

router.put('/:id', validateObjectId(), authenticate, requireAdmin, updateCourse);
router.delete('/:id', validateObjectId(), authenticate, requireAdmin, deleteCourse);

// SEO-007: users slug URL'da rate qilishi mumkin
router.post('/:id/rate', authenticate, rateCourse);

module.exports = router;

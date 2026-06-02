const express = require('express');
const router  = express.Router();
const {
  getDashboardStats, getTopStudents, getCoursesStats,
  getRecentPayments, getUsers, updateUser, deleteUser,
  getUserDetail, globalSearch, getAnalytics,
  sendTelegramMessage, bulkLinkBunny, reorderVideos, getCourseEnrollmentStats,
  getAllEnrollments, adminAwardXp,
  updatePayment,
  adminListChallenges, adminUpdateChallenge, adminDeleteChallenge,
} = require('../controllers/adminController');
const {
  listPromoCodes, createPromoCode, updatePromoCode, deletePromoCode,
} = require('../controllers/promoController');
const {
  listAiNewsAdmin,
  createAiNewsAdmin,
  updateAiNewsAdmin,
  deleteAiNewsAdmin,
} = require('../controllers/aiNewsController');
const { adminListBugReports, adminReviewBugReport } = require('../controllers/bugReportController');
const {
  adminListPrompts, adminSetPromptVisibility, featurePrompt, deletePrompt,
} = require('../controllers/promptController');
const { authenticate, requireAdmin } = require('../middleware/auth');

const guard = [authenticate, requireAdmin];

// Dashboard
router.get('/stats',          ...guard, getDashboardStats);
router.get('/top-students',   ...guard, getTopStudents);
router.get('/analytics',      ...guard, getAnalytics);

// Courses
router.get('/courses/stats',              ...guard, getCoursesStats);
router.get('/courses/:id/enrollments',    ...guard, getCourseEnrollmentStats);

// Payments
router.get('/payments',     ...guard, getRecentPayments);
router.put('/payments/:id', ...guard, updatePayment);

// Users
router.get('/users',               ...guard, getUsers);
router.get('/users/:id',           ...guard, getUserDetail);
router.put('/users/:id',           ...guard, updateUser);
router.delete('/users/:id',        ...guard, deleteUser);
router.post('/users/:id/award-xp', ...guard, adminAwardXp);

// Enrollments
router.get('/enrollments', ...guard, getAllEnrollments);

// Promo codes
router.get('/promos',        ...guard, listPromoCodes);
router.post('/promos',       ...guard, createPromoCode);
router.put('/promos/:id',    ...guard, updatePromoCode);
router.delete('/promos/:id', ...guard, deletePromoCode);

// Search
router.get('/search', ...guard, globalSearch);

// Bug reports (sayt xatoliklari)
router.get('/bug-reports', ...guard, adminListBugReports);
router.patch('/bug-reports/:id', ...guard, adminReviewBugReport);

// Tools
router.post('/telegram',          ...guard, sendTelegramMessage);
router.post('/videos/bulk-link',  ...guard, bulkLinkBunny);
router.put('/videos/reorder',     ...guard, reorderVideos);

// AI news management
router.get('/ai-news', ...guard, listAiNewsAdmin);
router.post('/ai-news', ...guard, createAiNewsAdmin);
router.put('/ai-news/:id', ...guard, updateAiNewsAdmin);
router.delete('/ai-news/:id', ...guard, deleteAiNewsAdmin);

// Prompts moderation
router.get('/prompts',                  ...guard, adminListPrompts);
router.patch('/prompts/:id/visibility', ...guard, adminSetPromptVisibility);
router.patch('/prompts/:id/feature',    ...guard, featurePrompt);
router.delete('/prompts/:id',           ...guard, deletePrompt);

// Daily challenges
router.get('/challenges',        ...guard, adminListChallenges);
router.put('/challenges/:id',    ...guard, adminUpdateChallenge);
router.delete('/challenges/:id', ...guard, adminDeleteChallenge);

module.exports = router;

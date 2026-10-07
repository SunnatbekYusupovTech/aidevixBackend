const express = require('express');
const router = express.Router();
const {
  getUserStats,
  addVideoWatchXP,
  submitQuiz,
  getQuizByVideo,
  updateProfile,
  useStreakFreeze,
  addStreakFreeze,
  getWeeklyLeaderboard,
  getXPHistory,
  getStreakStatus,
  dailyCheckIn,
} = require('../controllers/xpController');
const { authenticate, requireAdmin } = require('../middleware/auth');
const validateObjectId = require('../middleware/validateObjectId');


router.get('/stats', authenticate, getUserStats);

router.post('/video-watched/:videoId', authenticate, validateObjectId('videoId'), addVideoWatchXP);

router.post('/quiz/:quizId', authenticate, validateObjectId('quizId'), submitQuiz);

router.get('/quiz/video/:videoId', authenticate, validateObjectId('videoId'), getQuizByVideo);

router.put('/profile', authenticate, updateProfile);

router.get('/weekly-leaderboard', getWeeklyLeaderboard);

router.post('/streak-freeze', authenticate, useStreakFreeze);

// D21/COM-14: freeze qo'shish faqat admin (oddiy foydalanuvchi o'ziga bepul qo'sha olmaydi)
router.post('/streak-freeze/add', authenticate, requireAdmin, addStreakFreeze);

router.get('/history', authenticate, getXPHistory);

router.get('/streak-status', authenticate, getStreakStatus);

router.post('/check-in', authenticate, dailyCheckIn);

module.exports = router;

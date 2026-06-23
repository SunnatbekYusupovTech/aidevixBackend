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
  checkIn,
} = require('../controllers/xpController');
const { authenticate } = require('../middleware/auth');


router.get('/stats', authenticate, getUserStats);

router.post('/video-watched/:videoId', authenticate, addVideoWatchXP);

router.post('/quiz/:quizId', authenticate, submitQuiz);

router.get('/quiz/video/:videoId', authenticate, getQuizByVideo);

router.put('/profile', authenticate, updateProfile);

router.get('/weekly-leaderboard', getWeeklyLeaderboard);

router.post('/streak-freeze', authenticate, useStreakFreeze);

router.post('/streak-freeze/add', authenticate, addStreakFreeze);

router.get('/history', authenticate, getXPHistory);

router.get('/streak-status', authenticate, getStreakStatus);

router.post('/check-in', authenticate, checkIn);

module.exports = router;

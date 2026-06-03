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
} = require('../controllers/xpController');
const { authenticate } = require('../middleware/auth');
const validateObjectId = require('../middleware/validateObjectId');


router.get('/stats', authenticate, getUserStats);

router.post('/video-watched/:videoId', authenticate, validateObjectId('videoId'), addVideoWatchXP);

router.post('/quiz/:quizId', authenticate, validateObjectId('quizId'), submitQuiz);

router.get('/quiz/video/:videoId', authenticate, validateObjectId('videoId'), getQuizByVideo);

router.put('/profile', authenticate, updateProfile);

router.get('/weekly-leaderboard', getWeeklyLeaderboard);

router.post('/streak-freeze', authenticate, useStreakFreeze);

router.post('/streak-freeze/add', authenticate, addStreakFreeze);

router.get('/history', authenticate, getXPHistory);

router.get('/streak-status', authenticate, getStreakStatus);

module.exports = router;

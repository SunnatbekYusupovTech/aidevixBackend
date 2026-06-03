const express = require('express');
const router = express.Router();
const { getTopCourses, getTopUsers, getUserPosition, getWeeklyLeaderboard, getWeeklyPrizes } = require('../controllers/rankingController');
const { authenticate } = require('../middleware/auth');
const validateObjectId = require('../middleware/validateObjectId');

router.get('/courses', getTopCourses);
router.get('/users', getTopUsers);
router.get('/users/:userId/position', authenticate, validateObjectId('userId'), getUserPosition);
router.get('/weekly', authenticate, getWeeklyLeaderboard);
router.get('/weekly/prizes', getWeeklyPrizes);

module.exports = router;

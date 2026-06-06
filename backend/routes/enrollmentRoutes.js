const express = require('express');
const router  = express.Router();
const { enrollCourse, getMyEnrollments, markVideoWatched, getCourseProgress, continueLearning } = require('../controllers/enrollmentController');
const { authenticate } = require('../middleware/auth');
const validateObjectId = require('../middleware/validateObjectId');

router.get('/continue', authenticate, continueLearning);
router.post('/:courseId', authenticate, validateObjectId('courseId'), enrollCourse);
router.get('/my', authenticate, getMyEnrollments);
router.get('/:courseId/progress', authenticate, validateObjectId('courseId'), getCourseProgress);
router.post('/:courseId/watch/:videoId', authenticate, validateObjectId('courseId'), validateObjectId('videoId'), markVideoWatched);

module.exports = router;

const express = require('express');
const router  = express.Router();
const { getCourseSections, createSection, addVideoToSection, updateSection, deleteSection } = require('../controllers/sectionController');
const { authenticate, requireAdmin } = require('../middleware/auth');
const validateObjectId = require('../middleware/validateObjectId');

router.get('/course/:courseId', validateObjectId('courseId'), getCourseSections);
router.post('/', authenticate, requireAdmin, createSection);
router.post('/:sectionId/videos/:videoId', authenticate, requireAdmin, validateObjectId('sectionId'), addVideoToSection);
router.put('/:id',    authenticate, requireAdmin, validateObjectId('id'), updateSection);
router.delete('/:id', authenticate, requireAdmin, validateObjectId('id'), deleteSection);

module.exports = router;

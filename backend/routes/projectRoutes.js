const express = require('express');
const router = express.Router();
const {
  getProjectsByCourse,
  getProject,
  completeProject,
  reviewProject,
  createProject,
  updateProject,
  deleteProject,
} = require('../controllers/projectController');
const { authenticate, requireAdmin } = require('../middleware/auth');
const validateObjectId = require('../middleware/validateObjectId');

// Ixtiyoriy autentifikatsiya (login bo'lsa isCompleted ko'rsatiladi)
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authenticate(req, res, next);
  }
  next();
};

router.get('/course/:courseId', optionalAuth, validateObjectId('courseId'), getProjectsByCourse);
router.get('/:id', optionalAuth, validateObjectId('id'), getProject);
router.post('/:id/complete', authenticate, validateObjectId('id'), completeProject);
router.post('/:id/review', authenticate, validateObjectId('id'), reviewProject);

// ─── Admin ────────────────────────────────────────────────────────────────────
router.post('/', authenticate, requireAdmin, createProject);
router.put('/:id', authenticate, requireAdmin, validateObjectId('id'), updateProject);
router.delete('/:id', authenticate, requireAdmin, validateObjectId('id'), deleteProject);

module.exports = router;

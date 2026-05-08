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

// Ixtiyoriy autentifikatsiya (login bo'lsa isCompleted ko'rsatiladi)
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authenticate(req, res, next);
  }
  next();
};

router.get('/course/:courseId', optionalAuth, getProjectsByCourse);
router.get('/:id', optionalAuth, getProject);
router.post('/:id/complete', authenticate, completeProject);
router.post('/:id/review', authenticate, reviewProject);

// ─── Admin ────────────────────────────────────────────────────────────────────
router.post('/', authenticate, requireAdmin, createProject);
router.put('/:id', authenticate, requireAdmin, updateProject);
router.delete('/:id', authenticate, requireAdmin, deleteProject);

module.exports = router;

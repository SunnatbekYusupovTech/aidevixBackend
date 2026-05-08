const express = require('express');
const router = express.Router();
const { listJobs, createJob } = require('../controllers/jobController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/', listJobs);
router.post('/', authenticate, requireAdmin, createJob);

module.exports = router;

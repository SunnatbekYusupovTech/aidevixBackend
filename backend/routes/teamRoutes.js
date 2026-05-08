const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { createTeam, listMyTeams } = require('../controllers/teamController');

router.get('/my', authenticate, listMyTeams);
router.post('/', authenticate, createTeam);

module.exports = router;

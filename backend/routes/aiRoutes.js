const express = require('express');
const router = express.Router();
const { chat } = require('../controllers/aiController');
const { authenticate } = require('../middleware/auth');

router.post('/chat', authenticate, chat);

module.exports = router;

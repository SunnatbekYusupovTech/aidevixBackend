const express = require('express');
const router  = express.Router();
const { getVapidKey, subscribe, unsubscribe } = require('../controllers/pushController');
const { authenticate } = require('../middleware/auth');

// Public — frontend push obuna qilishdan oldin VAPID public key oladi
router.get('/vapid-public-key', getVapidKey);

// Private — cookie auth + CSRF himoyasi (index.js'da csrfProtection global qo'llangan)
router.post('/subscribe',   authenticate, subscribe);
router.post('/unsubscribe', authenticate, unsubscribe);

module.exports = router;

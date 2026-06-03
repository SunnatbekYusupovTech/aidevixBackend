const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { validatePromoCode } = require('../controllers/promoController');

// Promo kodni tekshirish (preview — consume QILMAYDI). To'lov initiate paytida
// haqiqiy atomik consume paymentController.initiatePayment'da bo'ladi.
// GET /api/promos/validate/:code?courseId=<id>
router.get('/validate/:code', authenticate, validatePromoCode);

module.exports = router;

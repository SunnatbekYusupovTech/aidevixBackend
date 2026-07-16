const express = require('express');
const router  = express.Router();
const { initiatePayment, getMyPayments, getPaymentStatus, handlePayme, clickPrepare, clickComplete } = require('../controllers/paymentController');
const { authenticate } = require('../middleware/auth');
const { paymentLimiter, webhookLimiter } = require('../middleware/rateLimiter');
const validateObjectId = require('../middleware/validateObjectId');
router.post('/initiate', authenticate, paymentLimiter, initiatePayment);
router.get('/my', authenticate, getMyPayments);
// Provider webhook'lari — yuqori limitli webhookLimiter (paymentLimiter emas),
// aks holda bitta to'lovning ko'p bosqichli JSON-RPC chaqiruvlari bloklanadi.
router.post('/payme', webhookLimiter, handlePayme);
router.post('/click/prepare', webhookLimiter, clickPrepare);
router.post('/click/complete', webhookLimiter, clickComplete);
router.get('/:id/status', authenticate, validateObjectId('id'), getPaymentStatus);

module.exports = router;

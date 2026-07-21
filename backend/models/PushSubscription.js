const mongoose = require('mongoose');

/**
 * PushSubscription — Web Push obunasi (VAPID)
 * Har bir brauzer/qurilma o'z endpoint'i bilan saqlanadi.
 * Bir user'da bir nechta subscription bo'lishi mumkin (turli qurilmalar).
 */
const pushSubscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  endpoint: {
    type: String,
    required: true,
    unique: true,
  },
  keys: {
    p256dh: { type: String, required: true },
    auth:   { type: String, required: true },
  },
  userAgent: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('PushSubscription', pushSubscriptionSchema);

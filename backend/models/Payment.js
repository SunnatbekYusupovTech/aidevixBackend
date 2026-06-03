const mongoose = require('mongoose');

/**
 * Payment — To'lovlar (Payme / Click)
 */
const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  currency: {
    type: String,
    default: 'UZS',
  },
  provider: {
    type: String,
    enum: ['payme', 'click', 'manual'],
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded', 'cancelled', 'expired'],
    default: 'pending',
  },
  // To'lov provayderidan kelgan ID
  providerTransactionId: {
    type: String,
    default: null,
  },
  // Payme / Click dan kelgan to'liq javob
  providerResponse: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  paidAt: {
    type: Date,
    default: null,
  },
  expiredAt: {
    type: Date,
    default: null,
  },
  cancelledAt: {
    type: Date,
    default: null,
  },
  providerData: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  // Payme millisecond timestamps (required for GetStatement)
  paymeCreateTime:   { type: Number, default: null },
  paymePerformTime:  { type: Number, default: null },
  paymeCancelTime:   { type: Number, default: null },
  paymeCancelReason: { type: Number, default: null },
  // Click fields
  clickTransId:  { type: String, default: null },
  clickPaydocId: { type: String, default: null },
}, {
  timestamps: true,
});

paymentSchema.index({ userId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ providerTransactionId: 1 }, { unique: true, sparse: true });
paymentSchema.index({ userId: 1, courseId: 1 });
paymentSchema.index({ clickTransId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Payment', paymentSchema);

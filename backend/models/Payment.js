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
  // To'lov provayderidan kelgan ID.
  // default YO'Q (undefined): unique index faqat string qiymatlarni indekslaydi (partialFilterExpression);
  // explicit null bo'lsa 2-pending to'lov E11000 berardi (deep-audit D03).
  providerTransactionId: {
    type: String,
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
  clickTransId:  { type: String }, // default yo'q — D03 (yuqoridagi izohga qarang)
  clickPaydocId: { type: String, default: null },
  // Click Prepare'da beriladigan merchant_prepare_id (int); Complete shu qiymat bilan keladi
  clickPrepareId: { type: Number, default: null },
  // Promo rezervatsiyasi: initiate'da band qilinadi, expire/cancel/fail'da bir marta qaytariladi
  promoCodeId:   { type: mongoose.Schema.Types.ObjectId, ref: 'PromoCode', default: null },
  promoReleased: { type: Boolean, default: false },
}, {
  timestamps: true,
});

paymentSchema.index({ userId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ createdAt: -1 });
// sparse null'larni ham indekslaydi — partial index faqat string qiymatlarni (D03).
// Prod'da eski sparse index'ni drop qilib qayta yaratish kerak (audit hisobotidagi mongosh buyruqlari).
paymentSchema.index({ providerTransactionId: 1 }, { unique: true, partialFilterExpression: { providerTransactionId: { $type: 'string' } } });
paymentSchema.index({ userId: 1, courseId: 1 });
// Bitta user+kurs uchun bir vaqtda faqat BITTA pending to'lov (concurrent initiate race, D26)
// (key pattern {userId,courseId,status} — yuqoridagi oddiy {userId,courseId} index bilan to'qnashmasin)
paymentSchema.index({ userId: 1, courseId: 1, status: 1 }, { unique: true, partialFilterExpression: { status: 'pending' }, name: 'uniq_pending_user_course' });
paymentSchema.index({ clickTransId: 1 }, { unique: true, partialFilterExpression: { clickTransId: { $type: 'string' } } });
paymentSchema.index({ status: 1, createdAt: 1 });

module.exports = mongoose.model('Payment', paymentSchema);

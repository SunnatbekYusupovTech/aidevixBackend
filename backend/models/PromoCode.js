const mongoose = require('mongoose');

const promoCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    maxlength: 32,
  },
  description: {
    type: String,
    default: '',
    maxlength: 200,
    trim: true,
  },
  type: {
    type: String,
    enum: ['percent', 'fixed'],
    required: true,
  },
  value: {
    type: Number,
    required: true,
    min: 1,
  },
  maxUses: {
    type: Number,
    default: null, // null = unlimited
    min: 1,
  },
  usedCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  courseIds: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
    },
  ],
  expiresAt: {
    type: Date,
    default: null,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // Promo'ni band qilgan/ishlatgan userlar — bir user bitta promo'ni faqat bir marta ishlatadi.
  // Rezervatsiya bekor bo'lsa ($pull) qaytariladi. Eski hujjatlarda maydon yo'q = hech kim ishlatmagan.
  redeemedBy: {
    type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    default: undefined,
    select: false,
  },
}, { timestamps: true });

// `code` field'da `unique: true` avtomatik unique index yaratadi — alohida `.index({code:1})` kerakmas.
promoCodeSchema.index({ isActive: 1, expiresAt: 1 });

module.exports = mongoose.model('PromoCode', promoCodeSchema);

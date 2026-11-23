const mongoose = require('mongoose');

// Metodikaga ikkinchi bosqich ruxsati. Har bir yozuv BITTA sayt akkauntiga bog'langan:
// login/parol boshqa akkauntda ishlamaydi, shuning uchun parolni ulashish yetarli emas.
const metodikaAccessSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  login: { type: String, required: true, unique: true, lowercase: true, trim: true, minlength: 4, maxlength: 40 },
  passwordHash: { type: String, required: true, select: false },
  isActive: { type: Boolean, default: true },
  expiresAt: { type: Date, default: null },
  note: { type: String, trim: true, maxlength: 300, default: '' },
  // Parol almashtirilganda / ruxsat to'xtatilganda oshiriladi — eski metodika sessiyalari o'ladi.
  sessionVersion: { type: Number, default: 0 },
  failedAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date, default: null },
  lastLoginAt: { type: Date, default: null },
  lastIp: { type: String, maxlength: 64, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('MetodikaAccess', metodikaAccessSchema);

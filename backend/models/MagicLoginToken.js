const mongoose = require('mongoose');

/**
 * MagicLoginToken — Telegram bot "Magic Login" uchun bir martalik opaque token.
 * JWT URL fragment o'rniga (revoke qilib bo'lmaydigan, browser history'da qoladigan)
 * random opaque kod ishlatiladi: DB'da saqlanadi, single-use, 15 daqiqa TTL.
 */
const magicLoginTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  used: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 900, // TTL — 15 daqiqadan keyin avtomatik o'chiriladi
  },
});

module.exports = mongoose.model('MagicLoginToken', magicLoginTokenSchema);

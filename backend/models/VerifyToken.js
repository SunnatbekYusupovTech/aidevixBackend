const mongoose = require('mongoose');
const VERIFY_TOKEN_TTL_SECONDS = 300;

const verifyTokenSchema = new mongoose.Schema({
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
  telegramUserId: {
    type: String,
    default: null,
  },
  telegramUsername: {
    type: String,
    default: null,
  },
  linked: {
    type: Boolean,
    default: false,
  },
  used: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: VERIFY_TOKEN_TTL_SECONDS,
  },
});

module.exports = mongoose.model('VerifyToken', verifyTokenSchema);
module.exports.VERIFY_TOKEN_TTL_SECONDS = VERIFY_TOKEN_TTL_SECONDS;

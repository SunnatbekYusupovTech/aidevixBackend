const mongoose = require('mongoose');

/**
 * VideoXpAward Model (PERF-001)
 *
 * Video XP idempotentligini alohida kolleksiyada saqlaydi — ilgari
 * UserStats.xpAwardedVideos[] embedded massivi cheksiz o'sardi (har video
 * userId hujjatiga qo'shilardi). Bu yerda har (userId, videoId) juftligi
 * bitta hujjat + UNIQUE compound index orqali kafolatlanadi.
 *
 * Idempotentlik: create() duplicate-key (11000) qaytarsa — allaqachon berilgan.
 */
const videoXpAwardSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  videoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Video',
    required: true,
  },
}, {
  timestamps: true,
});

// Atomik idempotentlik: bir juftlik faqat bir marta yoziladi.
videoXpAwardSchema.index({ userId: 1, videoId: 1 }, { unique: true });

module.exports = mongoose.model('VideoXpAward', videoXpAwardSchema);

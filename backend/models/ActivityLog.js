const mongoose = require('mongoose');

/**
 * ActivityLog — Video ko'rish faoliyati yozuvi
 * getHomeStats aggregation'ini tezlashtirish uchun denormalized log.
 * Enrollment.watchedVideos massivini $unwind qilish o'rniga
 * ushbu kolleksiyadan to'g'ridan-to'g'ri aggregation qilinadi.
 *
 * Yozilish sharti: video birinchi marta ko'rilganda (markVideoWatched).
 * Takroriy ko'rishlar qo'shilmaydi (alreadyWatched tekshiruvi).
 */
const activityLogSchema = new mongoose.Schema({
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
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
  },
  watchedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: false, // watchedAt yetarli, createdAt/updatedAt kerak emas
});

// Foydalanuvchi bo'yicha so'rov + so'nggi faollik tartibi
activityLogSchema.index({ userId: 1, watchedAt: -1 });

// Vaqt bo'yicha aggregation (getHomeStats weekly/hourly hisoblash)
activityLogSchema.index({ watchedAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);

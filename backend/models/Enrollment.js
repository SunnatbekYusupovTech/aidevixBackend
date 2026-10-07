const mongoose = require('mongoose');

/**
 * Enrollment — Kursga yozilish
 * Foydalanuvchi to'liq kurs uchun yozilganda yaratiladi.
 */
const enrollmentSchema = new mongoose.Schema({
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
  // To'lov holati
  paymentStatus: {
    type: String,
    enum: ['free', 'pending', 'paid', 'refunded'],
    default: 'free',
  },
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
    default: null,
  },
  // Kurs tugallanish holati
  completedAt: {
    type: Date,
    default: null,
  },
  isCompleted: {
    type: Boolean,
    default: false,
  },
  // Ko'rilgan videolar
  watchedVideos: [{
    videoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Video' },
    watchedAt: { type: Date, default: Date.now },
    watchedSeconds: { type: Number, default: 0 },
  }],
  // Kurs davomiyligi (soniya)
  totalWatchedSeconds: {
    type: Number,
    default: 0,
  },
  // Tugallanish foizi (0-100)
  progressPercent: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
}, {
  timestamps: true,
});

// Bir foydalanuvchi bitta kursga bir marta yozilishi
enrollmentSchema.index({ userId: 1, courseId: 1 }, { unique: true });
enrollmentSchema.index({ userId: 1 });
enrollmentSchema.index({ courseId: 1 });
enrollmentSchema.index({ isCompleted: 1 });
// P-B03: /public/live-activity — sort({ createdAt: -1 }).limit(12)
enrollmentSchema.index({ createdAt: -1 });
// P-B07: continueLearning/digest — { userId, isCompleted } sort updatedAt
enrollmentSchema.index({ userId: 1, isCompleted: 1, updatedAt: -1 });

module.exports = mongoose.model('Enrollment', enrollmentSchema);

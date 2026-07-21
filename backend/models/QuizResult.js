const mongoose = require('mongoose');

/**
 * QuizResult Model
 * Foydalanuvchining quiz natijalarini saqlaydi.
 * XP hisoblash va leaderboard uchun ishlatiladi.
 */
const quizResultSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
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
  // Foizda natija (0-100)
  score: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  // To'plangan XP
  xpEarned: {
    type: Number,
    default: 0,
  },
  // O'tildimi?
  passed: {
    type: Boolean,
    default: false,
  },
  // Berilgan javoblar (qaysi variant tanlangani)
  answers: [
    {
      questionIndex: Number,
      selectedOption: Number,
      isCorrect: Boolean,
    },
  ],
  completedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Har bir user+quiz juftligi uchun faqat bitta natija (takror yechish mumkin emas)
quizResultSchema.index({ userId: 1, quizId: 1 }, { unique: true });
quizResultSchema.index({ userId: 1, createdAt: -1 });
quizResultSchema.index({ completedAt: -1 });

module.exports = mongoose.model('QuizResult', quizResultSchema);

const mongoose = require('mongoose');

/**
 * Quiz Model
 * Har bir video/dars uchun quiz savollarini saqlaydi.
 * Suhrob XP tizimi uchun ishlatadi.
 */
const quizSchema = new mongoose.Schema({
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
  title: {
    type: String,
    required: [true, 'Quiz title is required'],
    trim: true,
  },
  questions: [
    {
      question: {
        type: String,
        required: true,
      },
      options: {
        type: [String],
        validate: {
          validator: (arr) => arr.length >= 2 && arr.length <= 4,
          message: 'Each question must have 2-4 options',
        },
      },
      correctAnswer: {
        type: Number, // index of correct option (0, 1, 2, 3)
        required: true,
        min: 0,
        max: 3,
      },
      xpReward: {
        type: Number,
        default: 10, // Har bir to'g'ri javob uchun XP
      },
    },
  ],
  // O'tish bali (foizda, masalan 70 = 70%)
  passingScore: {
    type: Number,
    default: 70,
    min: 0,
    max: 100,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// P-B07: dars sahifasi — Quiz.findOne({ videoId, isActive })
quizSchema.index({ videoId: 1, isActive: 1 });

module.exports = mongoose.model('Quiz', quizSchema);

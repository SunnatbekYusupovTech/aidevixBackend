const mongoose = require('mongoose');

const spacedRepetitionCardSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  questionKey: { type: String, required: true },
  easeFactor: { type: Number, default: 2.5 },
  intervalDays: { type: Number, default: 1 },
  repetitions: { type: Number, default: 0 },
  dueAt: { type: Date, default: Date.now },
  lastResult: { type: String, enum: ['again', 'hard', 'good', 'easy'], default: 'again' },
}, { timestamps: true });

spacedRepetitionCardSchema.index({ userId: 1, dueAt: 1 });
spacedRepetitionCardSchema.index({ userId: 1, quizId: 1, questionKey: 1 }, { unique: true });

module.exports = mongoose.model('SpacedRepetitionCard', spacedRepetitionCardSchema);

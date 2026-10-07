const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  body: {
    type: String,
    required: true,
    maxlength: 20000, // COM-12: storage bloat cheklovi
  },
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true,
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  upvotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  downvotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  isAccepted: {
    type: Boolean,
    default: false,
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

answerSchema.virtual('score').get(function() {
  return (this.upvotes?.length || 0) - (this.downvotes?.length || 0);
});

// P-B07: Answer.find({ questionId }) va answersCount virtual populate
answerSchema.index({ questionId: 1, isAccepted: -1, createdAt: 1 });

module.exports = mongoose.model('Answer', answerSchema);

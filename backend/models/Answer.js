const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  body: {
    type: String,
    required: true,
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

module.exports = mongoose.model('Answer', answerSchema);

const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  body: {
    type: String,
    required: true,
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true,
  }],
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  views: {
    type: Number,
    default: 0,
  },
  upvotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  downvotes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  isResolved: {
    type: Boolean,
    default: false,
  },
  acceptedAnswer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Answer',
    default: null,
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

questionSchema.virtual('answersCount', {
  ref: 'Answer',
  localField: '_id',
  foreignField: 'questionId',
  count: true,
});

questionSchema.virtual('score').get(function() {
  return (this.upvotes?.length || 0) - (this.downvotes?.length || 0);
});

module.exports = mongoose.model('Question', questionSchema);

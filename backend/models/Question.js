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
    maxlength: 20000, // COM-12: storage bloat cheklovi
  },
  tags: {
    type: [{
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 50,
    }],
    validate: [(v) => !v || v.length <= 10, "Ko'pi bilan 10 ta teg"],
  },
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

// P-B07: forum ro'yxati — sort createdAt/views, tags filter
questionSchema.index({ createdAt: -1 });
questionSchema.index({ views: -1 });
questionSchema.index({ tags: 1, createdAt: -1 });

module.exports = mongoose.model('Question', questionSchema);

const mongoose = require('mongoose');

const VideoQuestionSchema = new mongoose.Schema({
  videoId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Video',  required: true },
  courseId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User',   required: true },
  question:   { type: String, required: true, maxlength: 1000 },
  answer:     { type: String, default: null },
  answeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  answeredAt: { type: Date, default: null },
  isAnswered: { type: Boolean, default: false },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'VideoQuestion', default: null },
  mentions: [{ type: String, trim: true }],
  upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isBestAnswer: { type: Boolean, default: false },
}, { timestamps: true });

VideoQuestionSchema.index({ videoId: 1, createdAt: -1 });
VideoQuestionSchema.index({ parentId: 1, createdAt: 1 });

module.exports = mongoose.model('VideoQuestion', VideoQuestionSchema);

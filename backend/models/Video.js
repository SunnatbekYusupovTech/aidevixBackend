const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Video title is required'],
    trim: true,
  },
  description: {
    type: String,
    default: '',
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
  },
  order: {
    type: Number,
    default: 0,
  },
  duration: {
    type: Number, // in seconds
    default: 0,
  },
  thumbnail: {
    type: String,
    default: null,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  // Bunny.net Stream integration
  bunnyVideoId: {
    type: String,
    default: null,
  },
  // ready | processing | failed | pending
  bunnyStatus: {
    type: String,
    enum: ['pending', 'processing', 'ready', 'failed'],
    default: 'pending',
  },
  // Ko'rishlar soni (statistika uchun)
  viewCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  // Video materiallari (PDF, zip fayllar)
  materials: [
    {
      name: { type: String },
      url: { type: String },
    },
  ],
  // Bo'lim (Section) ga tegishli
  sectionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Section',
    default: null,
  },
  // Savollar (Q&A)
  questions: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      text: { type: String },
      createdAt: { type: Date, default: Date.now },
      answer: { type: String, default: null },
    },
  ],
}, {
  timestamps: true,
});

videoSchema.index({ course: 1, order: 1 });
videoSchema.index({ course: 1, isActive: 1 });
videoSchema.index({ bunnyStatus: 1 });
videoSchema.index({ title: 'text' });
// P-B07: GET /api/videos/top — { isActive: true } sort viewCount
videoSchema.index({ isActive: 1, viewCount: -1 });

module.exports = mongoose.model('Video', videoSchema);

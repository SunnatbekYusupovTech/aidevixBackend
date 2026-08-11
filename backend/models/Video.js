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
  // ─── mkhls-streamer ────────────────────────────────────────────────────────
  // Storage path inside mkhls AND the public URL path: "aidevix/{videoId}.mp4".
  // The namespace is deliberate — when mkhls becomes multi-tenant, Aidevix
  // moves without changing a single path.
  streamPath: {
    type: String,
    default: null,
  },
  streamStatus: {
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
videoSchema.index({ streamStatus: 1 });
// Eslatma: `bunnyStatus_1` indeksi mavjud MongoDB'larda hali turibdi — bu
// qatorni olib tashlash uni tushirmaydi. Migratsiya ataylab qilinmadi
// (spec 2026-08-11 §5); qo'lda tozalash uchun: db.videos.dropIndex('bunnyStatus_1').
videoSchema.index({ title: 'text' });

module.exports = mongoose.model('Video', videoSchema);

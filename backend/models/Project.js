const mongoose = require('mongoose');

/**
 * Project Model — Har bir kurs uchun amaliy loyihalar
 * Admin panel orqali boshqariladi.
 * O'quvchilar loyihani bajarib XP to'playdi.
 */
const projectSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course ID is required'],
  },
  title: {
    type: String,
    required: [true, 'Project title is required'],
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Project description is required'],
  },
  // Loyiha darajasi
  level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner',
  },
  // Tartib raqami (kurs ichidagi loyihalar tartibi)
  order: {
    type: Number,
    default: 0,
  },
  // Texnologiyalar ro'yxati: ['HTML', 'CSS', 'JavaScript']
  technologies: [
    {
      type: String,
      trim: true,
    },
  ],
  // Oldindan bilishi kerak bo'lgan narsalar
  requirements: [
    {
      type: String,
      trim: true,
    },
  ],
  // Loyiha vazifalari (bosqichlar)
  tasks: [
    {
      order: { type: Number, default: 0 },
      title: { type: String, required: true },
      description: { type: String, default: '' },
      hint: { type: String, default: '' },
      xpReward: { type: Number, default: 20 },
    },
  ],
  // Taxminiy vaqt (daqiqada)
  estimatedTime: {
    type: Number,
    default: 60,
  },
  // XP mukofot (loyihani tugatganda)
  xpReward: {
    type: Number,
    default: 200,
  },
  // Loyiha cover rasmi
  thumbnail: {
    type: String,
    default: null,
  },
  // Demo URL (tayyor namuna)
  demoUrl: {
    type: String,
    default: null,
  },
  // GitHub starter template
  githubTemplate: {
    type: String,
    default: null,
  },
  // Kimlar bajargan
  completedBy: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      completedAt: { type: Date, default: Date.now },
      score: { type: Number, default: 0 },
      githubUrl: { type: String, default: null },
    },
  ],
  reviews: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      githubUrl: { type: String, default: null },
      codeSnippet: { type: String, default: '' },
      score: { type: Number, min: 0, max: 100, default: 0 },
      summary: { type: String, default: '' },
      strengths: [{ type: String, trim: true }],
      improvements: [{ type: String, trim: true }],
      model: { type: String, default: 'llama-3.3-70b-versatile' },
      createdAt: { type: Date, default: Date.now },
    },
  ],
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Project', projectSchema);

const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  company: { type: String, required: true, trim: true },
  title: { type: String, required: true, trim: true },
  location: { type: String, default: 'Tashkent' },
  type: { type: String, enum: ['full-time', 'part-time', 'internship', 'contract'], default: 'full-time' },
  level: { type: String, enum: ['junior', 'middle', 'senior', 'lead'], default: 'junior' },
  salaryMin: { type: Number, default: null },
  salaryMax: { type: Number, default: null },
  currency: { type: String, default: 'UZS' },
  skills: [{ type: String, trim: true }],
  applyUrl: { type: String, required: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

jobSchema.index({ createdAt: -1 });
jobSchema.index({ isActive: 1, level: 1, type: 1 });

module.exports = mongoose.model('Job', jobSchema);

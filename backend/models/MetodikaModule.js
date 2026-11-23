const mongoose = require('mongoose');

// Maxfiy kurs metodikasi — blok (modul). Faqat /api/metodika orqali, ikki bosqichli
// ruxsat (sayt akkaunti + metodika login/paroli) bilan o'qiladi.
const metodikaModuleSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  subtitle: { type: String, trim: true, maxlength: 300, default: '' },
  summary: { type: String, trim: true, maxlength: 2000, default: '' },
  outcome: { type: String, trim: true, maxlength: 1000, default: '' },
  weeks: { type: String, trim: true, maxlength: 60, default: '' },
  order: { type: Number, default: 0, min: 0, max: 1000 },
  isPublished: { type: Boolean, default: true },
}, { timestamps: true });

metodikaModuleSchema.index({ order: 1 });

module.exports = mongoose.model('MetodikaModule', metodikaModuleSchema);

const mongoose = require('mongoose');

const DIAGRAM_TYPES = ['flow', 'cycle', 'compare', 'layers', 'cards'];

const line = (max = 1000) => ({ type: String, trim: true, maxlength: max });

const metodikaLessonSchema = new mongoose.Schema({
  module: { type: mongoose.Schema.Types.ObjectId, ref: 'MetodikaModule', required: true },
  number: { type: Number, required: true, min: 1, max: 999 },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  week: { type: Number, min: 0, max: 99, default: 1 },
  durationMinutes: { type: Number, min: 10, max: 600, default: 180 },

  goal: line(1500),            // Maqsad
  outcome: line(2000),         // Natija (artefakt)
  description: line(6000),     // Dars haqida to'liq ma'lumot
  why: line(3000),             // Nega aynan shu mavzu o'rgatiladi
  relation: line(2000),        // Biznesga va loyihaga aloqasi

  mentorPrep: [line()],
  timeline: [{
    _id: false,
    time: line(40),
    title: line(300),
    details: line(1000),
  }],
  keyPoints: [line(1500)],
  demo: [line()],
  practice: [line()],
  template: {
    title: line(200),
    body: { type: String, maxlength: 5000 },
  },
  mistakes: [line()],
  homeworkRequired: [line()],
  homeworkOptional: [line()],
  decision: line(1500),        // Rahbar qarori

  links: [{
    title: line(200),
    url: line(600),
    note: line(300),
  }],
  images: [{
    asset: { type: mongoose.Schema.Types.ObjectId, ref: 'MetodikaAsset', required: true },
    caption: line(300),
  }],
  // "Rasm ko'rinishida tushuntirish" — frontend chizadigan tuzilmali sxema.
  diagrams: [{
    type: { type: String, enum: DIAGRAM_TYPES, default: 'flow' },
    title: line(200),
    caption: line(600),
    leftTitle: line(120),
    rightTitle: line(120),
    items: [{ _id: false, label: line(200), text: line(600) }],
  }],

  isPublished: { type: Boolean, default: true },
}, { timestamps: true });

metodikaLessonSchema.index({ module: 1, number: 1 });
metodikaLessonSchema.index({ number: 1 });

const MetodikaLesson = mongoose.model('MetodikaLesson', metodikaLessonSchema);
MetodikaLesson.DIAGRAM_TYPES = DIAGRAM_TYPES;

module.exports = MetodikaLesson;

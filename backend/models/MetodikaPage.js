const mongoose = require('mongoose');

const SECTION_TYPES = ['text', 'list', 'table', 'note', 'code'];

// Kurs pasporti, ilovalar, lug'at kabi darsdan tashqari sahifalar.
// body: text/note/code — oddiy matn; list — har qator bitta band;
// table — har qator bitta satr, ustunlar " | " bilan ajratiladi (1-qator sarlavha).
const metodikaPageSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  order: { type: Number, default: 0, min: 0, max: 1000 },
  sections: [{
    heading: { type: String, trim: true, maxlength: 200 },
    type: { type: String, enum: SECTION_TYPES, default: 'text' },
    body: { type: String, maxlength: 12000, default: '' },
  }],
  isPublished: { type: Boolean, default: true },
}, { timestamps: true });

metodikaPageSchema.index({ order: 1 });

const MetodikaPage = mongoose.model('MetodikaPage', metodikaPageSchema);
MetodikaPage.SECTION_TYPES = SECTION_TYPES;

module.exports = MetodikaPage;

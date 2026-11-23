const mongoose = require('mongoose');

// Metodika rasmlari ATAYLAB public Blob/CDN'ga yuklanmaydi: public URL ruxsatsiz ham
// ochiladi. Rasm baytlari DB'da turadi va faqat requireMetodikaAccess'dan o'tgan
// so'rovga /api/metodika/assets/:id orqali beriladi.
const metodikaAssetSchema = new mongoose.Schema({
  lesson: { type: mongoose.Schema.Types.ObjectId, ref: 'MetodikaLesson', required: true, index: true },
  data: { type: Buffer, required: true, select: false },
  mime: { type: String, required: true, enum: ['image/jpeg', 'image/png', 'image/webp'] },
  size: { type: Number, required: true },
  filename: { type: String, trim: true, maxlength: 200 },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('MetodikaAsset', metodikaAssetSchema);

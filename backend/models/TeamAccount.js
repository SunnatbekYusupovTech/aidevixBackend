const mongoose = require('mongoose');

const teamAccountSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  company: { type: String, required: true, trim: true },
  seats: { type: Number, default: 5, min: 1 },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  billingPlan: { type: String, enum: ['starter', 'growth', 'enterprise'], default: 'starter' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

teamAccountSchema.index({ ownerId: 1, createdAt: -1 });

module.exports = mongoose.model('TeamAccount', teamAccountSchema);

const mongoose = require('mongoose');

const mentorshipBookingSchema = new mongoose.Schema({
  mentorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  topic: { type: String, required: true, trim: true },
  notes: { type: String, default: '' },
  scheduledAt: { type: Date, required: true },
  durationMin: { type: Number, default: 45 },
  status: { type: String, enum: ['pending', 'confirmed', 'cancelled', 'completed'], default: 'pending' },
  paymentProvider: { type: String, enum: ['payme', 'click', 'stripe', 'none'], default: 'none' },
  amount: { type: Number, default: 0 },
  commissionRate: { type: Number, default: 0.2 },
}, { timestamps: true });

mentorshipBookingSchema.index({ mentorId: 1, scheduledAt: 1 });
mentorshipBookingSchema.index({ studentId: 1, createdAt: -1 });

module.exports = mongoose.model('MentorshipBooking', mentorshipBookingSchema);

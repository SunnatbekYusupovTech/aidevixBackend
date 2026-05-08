const MentorshipBooking = require('../models/MentorshipBooking');
const User = require('../models/User');

const getMentors = async (_req, res) => {
  try {
    const mentors = await User.find({
      role: 'user',
      rankTitle: { $in: ['MASTER', 'LEGEND'] },
      isActive: true,
    }).select('username firstName lastName jobTitle avatar rankTitle aiStack');
    return res.json({ success: true, data: { mentors } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const createBooking = async (req, res) => {
  try {
    const { mentorId, topic, notes, scheduledAt, durationMin = 45 } = req.body;
    const mentor = await User.findById(mentorId).select('rankTitle');
    if (!mentor || !['MASTER', 'LEGEND'].includes(mentor.rankTitle)) {
      return res.status(400).json({ success: false, message: 'Mentor topilmadi yoki eligibility yoq' });
    }
    const booking = await MentorshipBooking.create({
      mentorId,
      studentId: req.user._id,
      topic,
      notes,
      scheduledAt,
      durationMin,
      paymentProvider: 'payme',
    });
    return res.status(201).json({ success: true, data: { booking } });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

const myBookings = async (req, res) => {
  try {
    const bookings = await MentorshipBooking.find({
      $or: [{ mentorId: req.user._id }, { studentId: req.user._id }],
    })
      .populate('mentorId', 'username firstName lastName')
      .populate('studentId', 'username firstName lastName')
      .sort({ scheduledAt: 1 });
    return res.json({ success: true, data: { bookings } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getMentors, createBooking, myBookings };

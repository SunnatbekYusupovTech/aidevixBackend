const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getMentors, createBooking, myBookings } = require('../controllers/mentorshipController');

router.get('/mentors', getMentors);
router.get('/bookings/my', authenticate, myBookings);
router.post('/bookings', authenticate, createBooking);

module.exports = router;

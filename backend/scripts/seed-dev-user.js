/**
 * Local development seed: one admin, one fully-subscribed student, one course.
 *
 * Prints ready-to-paste Bearer tokens. Bearer auth is accepted outside
 * production (middleware/auth.js) and requests without an auth cookie skip
 * CSRF entirely (middleware/csrfProtection.js), so curl needs nothing else.
 *
 * Usage: node scripts/seed-dev-user.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Course = require('../models/Course');
const { generateAccessToken } = require('../utils/jwt');

const SUBSCRIBED = {
  // performSubscriptionCheck leaves instagramSubscribed=false when username
  // is null, so a user with no Instagram handle is blocked from every video.
  instagram: { subscribed: true, username: 'dev_local', verifiedAt: new Date() },
  telegram: { subscribed: true, username: 'dev_local', verifiedAt: new Date() },
};

const upsertUser = async (email, username, role) => {
  // tokenVersion has `select: false` in the schema (models/User.js) — without
  // explicitly selecting it here, accessTokenFor() below would sign every
  // re-run's token with tv=0 while the DB's real value is 1 (the pre-save
  // hook bumps tokenVersion on the password hash at creation), so a re-seed
  // would hand out tokens that middleware/auth.js immediately rejects as
  // stale sessions.
  const existing = await User.findOne({ email }).select('+tokenVersion');
  if (existing) {
    existing.role = role;
    existing.isActive = true;
    existing.socialSubscriptions = SUBSCRIBED;
    await existing.save();
    return existing;
  }
  return User.create({
    username,
    email,
    password: 'DevPassword123!',
    role,
    isActive: true,
    socialSubscriptions: SUBSCRIBED,
  });
};

// generateAccessToken(payload) signs `payload` as-is (utils/jwt.js) — it does
// NOT accept a user document. authController's issueTokens builds { userId, tv }
// (utils/jwt.js consumer, see controllers/authController.js:155), and
// middleware/auth.js reads decoded.userId + decoded.tv (default 0) back out.
const accessTokenFor = (user) => generateAccessToken({ userId: String(user._id), tv: user.tokenVersion || 0 });

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const admin = await upsertUser('admin@dev.local', 'devadmin', 'admin');
  const student = await upsertUser('student@dev.local', 'devstudent', 'user');

  let course = await Course.findOne({ title: 'Dev — mkhls sinov kursi' });
  if (!course) {
    course = await Course.create({
      title: 'Dev — mkhls sinov kursi',
      description: 'Lokal video oqim tekshiruvi uchun.',
      price: 0,
      instructor: admin._id,
      category: 'general',
    });
  }

  console.log('ADMIN_TOKEN=' + accessTokenFor(admin));
  console.log('USER_TOKEN=' + accessTokenFor(student));
  console.log('COURSE_ID=' + course._id);

  await mongoose.disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});

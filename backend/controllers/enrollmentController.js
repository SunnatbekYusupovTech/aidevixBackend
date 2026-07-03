const Enrollment = require('../models/Enrollment');
const Course     = require('../models/Course');
const UserStats  = require('../models/UserStats');
const Certificate = require('../models/Certificate');
const ActivityLog = require('../models/ActivityLog');
const { awardBadges } = require('../utils/badgeService');
const { sendEnrollmentEmail, sendCertificateEmail } = require('../utils/emailService');
const crypto = require('crypto');

/** @desc  Kursga yozilish | @route POST /api/enrollments/:courseId | @access Private */
const enrollCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user._id;

    const course = await Course.findById(courseId);
    if (!course || !course.isActive)
      return res.status(404).json({ success: false, message: 'Kurs topilmadi' });

    const existing = await Enrollment.findOne({ userId, courseId });
    if (existing)
      return res.status(400).json({ success: false, message: 'Siz bu kursga allaqachon yozilgansiz' });

    if (!course.isFree && course.price > 0)
      return res.status(402).json({ success: false, message: 'Bu kurs pullik. Avval to\'lov qiling', data: { price: course.price, courseId } });

    const enrollment = await Enrollment.create({ userId, courseId, paymentStatus: 'free' });

    await Course.findByIdAndUpdate(courseId, { $inc: { studentsCount: 1 } });

    const user = req.user;
    sendEnrollmentEmail(user.email, user.username, course.title).catch(() => {});

    res.status(201).json({ success: true, message: 'Kursga muvaffaqiyatli yozildingiz', data: { enrollment } });
  } catch (err) {
    if (err.code === 11000)
      return res.status(400).json({ success: false, message: 'Siz bu kursga allaqachon yozilgansiz' });
    res.status(500).json({ success: false, message: err.message });
  }
};

/** @desc  Mening kurslarim | @route GET /api/enrollments/my | @access Private */
const getMyEnrollments = async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ userId: req.user._id })
      .populate({ path: 'courseId', select: 'title thumbnail category level rating price instructor', populate: { path: 'instructor', select: 'username jobTitle' } })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: { enrollments } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** @desc  Video ko'rildi deb belgilash | @route POST /api/enrollments/:courseId/watch/:videoId | @access Private */
const markVideoWatched = async (req, res) => {
  try {
    const { courseId, videoId } = req.params;
    const { watchedSeconds = 0 } = req.body;

    // PB-005: parallelize independent reads
    const [enrollment, course] = await Promise.all([
      Enrollment.findOne({ userId: req.user._id, courseId }),
      Course.findById(courseId).select('videos').lean(),
    ]);
    if (!enrollment)
      return res.status(404).json({ success: false, message: 'Siz bu kursga yozilmagansiz' });

    const alreadyWatched = enrollment.watchedVideos.find(w => w.videoId.toString() === videoId);
    if (!alreadyWatched) {
      enrollment.watchedVideos.push({ videoId, watchedSeconds });
      // ActivityLog: birinchi ko'rishni denormalized log'ga yoz (fire-and-forget)
      // getHomeStats aggregation'ini tezlashtirish uchun (PB-001)
      ActivityLog.create({
        userId: req.user._id,
        videoId,
        courseId,
      }).catch(err => console.error('[ActivityLog] yozishda xato:', err.message));
    } else {
      alreadyWatched.watchedSeconds = Math.max(alreadyWatched.watchedSeconds, watchedSeconds);
    }

    // Progress hisoblash
    const totalVideos = course ? course.videos.length : 0;
    enrollment.progressPercent = totalVideos > 0
      ? Math.round((enrollment.watchedVideos.length / totalVideos) * 100)
      : 0;
    enrollment.totalWatchedSeconds += watchedSeconds;

    // Kurs tugallandi
    if (enrollment.progressPercent >= 100 && !enrollment.isCompleted) {
      enrollment.isCompleted = true;
      enrollment.completedAt = new Date();
      await _issueCertificate(req.user, courseId, enrollment._id);
    }

    await enrollment.save();

    // Badge tekshiruv
    const newBadges = await awardBadges(req.user._id);

    res.json({
      success: true,
      data: { progressPercent: enrollment.progressPercent, isCompleted: enrollment.isCompleted, newBadges },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** @desc  Kurs progressi | @route GET /api/enrollments/:courseId/progress | @access Private */
const getCourseProgress = async (req, res) => {
  try {
    const enrollment = await Enrollment.findOne({ userId: req.user._id, courseId: req.params.courseId }).lean();
    if (!enrollment)
      return res.json({ success: true, data: { enrolled: false, progressPercent: 0 } });

    res.json({
      success: true,
      data: {
        enrolled: true,
        progressPercent: enrollment.progressPercent,
        isCompleted: enrollment.isCompleted,
        watchedVideos: enrollment.watchedVideos.map(w => w.videoId),
        completedAt: enrollment.completedAt,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Ichki sertifikat berish funksiyasi
const _issueCertificate = async (user, courseId, enrollmentId) => {
  try {
    const course = await Course.findById(courseId).select('title');
    const code = crypto.randomBytes(8).toString('hex').toUpperCase();
    const cert = await Certificate.create({
      userId: user._id,
      courseId,
      enrollmentId,
      certificateCode: code,
      recipientName: user.username,
      courseName: course.title,
    });
    sendCertificateEmail(user.email, user.username, course.title, code).catch(() => {});

    // Telegram orqali sertifikat haqida xabar yuborish
    try {
      const { getBot } = require('../utils/telegramBot');
      const bot = getBot();
      const telegramId = user.telegramUserId || user.telegramChatId || user.socialSubscriptions?.telegram?.telegramUserId;
      if (bot && telegramId) bot.sendCertificateNotification(telegramId, cert);
    } catch (_) {}

    return cert;
  } catch (err) {
    // duplicate sertifikat bo'lsa skip
  }
};

/** @desc  Davom ettirish — oxirgi ko'rilmagan video | @route GET /api/enrollments/continue | @access Private */
const continueLearning = async (req, res) => {
  try {
    const userId = req.user._id;

    const enrollments = await Enrollment.find({ userId, isCompleted: false })
      .populate({ path: 'courseId', select: 'title thumbnail category' })
      .sort({ updatedAt: -1 })
      .limit(5)
      .lean();

    if (!enrollments.length) {
      return res.json({ success: true, data: null });
    }

    const Video = require('../models/Video');

    const validEnrollments = enrollments.filter(e => e.courseId);
    const nextVideos = await Promise.all(
      validEnrollments.map(enrollment => {
        const watchedIds = enrollment.watchedVideos.map(w => w.videoId.toString());
        return Video.findOne({
          course: enrollment.courseId._id,
          isActive: true,
          _id: { $nin: watchedIds },
        })
          .sort({ order: 1 })
          .select('_id title duration thumbnail order')
          .lean();
      })
    );

    for (let i = 0; i < validEnrollments.length; i++) {
      const nextVideo = nextVideos[i];
      if (nextVideo) {
        const enrollment = validEnrollments[i];
        const watchedIds = enrollment.watchedVideos.map(w => w.videoId.toString());
        return res.json({
          success: true,
          data: {
            course:          enrollment.courseId,
            nextVideo,
            progressPercent: enrollment.progressPercent,
            watchedCount:    watchedIds.length,
          },
        });
      }
    }

    res.json({ success: true, data: null });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { enrollCourse, getMyEnrollments, markVideoWatched, getCourseProgress, continueLearning };

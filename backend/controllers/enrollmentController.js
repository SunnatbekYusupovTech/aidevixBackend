const Enrollment = require('../models/Enrollment');
const Course     = require('../models/Course');
const UserStats  = require('../models/UserStats');
const Certificate = require('../models/Certificate');
const ActivityLog = require('../models/ActivityLog');
const Video = require('../models/Video');
const { awardBadges } = require('../utils/badgeService');
const { sendEnrollmentEmail, sendCertificateEmail } = require('../utils/emailService');
const { computeWatchDelta, sanitizePosition } = require('../utils/watchProgress');
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
    res.status(500).json({ success: false, message: 'Kursga yozilishda xatolik.' });
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
    res.status(500).json({ success: false, message: 'Ma\'lumotlarni olishda xatolik.' });
  }
};

/** @desc  Video ko'rildi deb belgilash | @route POST /api/enrollments/:courseId/watch/:videoId | @access Private */
const markVideoWatched = async (req, res) => {
  try {
    const { courseId, videoId } = req.params;
    // Shartnoma: frontend JORIY POZITSIYAni yuboradi, delta emas.
    // `watchedSeconds` — eski nom, bir reliz qabul qilinadi (Plan 3 gacha).
    const { positionSeconds, watchedSeconds } = req.body;
    // Malformed input (e.g. "abc" -> NaN) or a negative value is sanitized
    // to 0 here, BEFORE it is ever pushed/assigned onto the document — not
    // just before it is fed to computeWatchDelta. Storing an un-sanitized
    // value risks a Mongoose CastError deferred to `save()`, by which point
    // fire-and-forget side effects below would already have run.
    const position = sanitizePosition(positionSeconds ?? watchedSeconds);

    // The active Video set replaces Course.videos as the source of truth here.
    // That array is written by createVideo but never repaired: deleteVideo does
    // not pull from it and updateVideo can set isActive:false without touching
    // it. One stale entry made progressPercent unable to reach 100, so the
    // certificate could never issue for that course again.
    //
    // This is the same query getCourseVideos runs, so progress is now computed
    // over exactly the lessons the student can actually see. It replaces the
    // Course load rather than adding to it — the course document was used for
    // nothing else here, and _issueCertificate takes the courseId string.
    // Covered by the { course: 1, isActive: 1 } index on Video.
    const [enrollment, activeVideos] = await Promise.all([
      Enrollment.findOne({ userId: req.user._id, courseId }),
      Video.find({ course: courseId, isActive: true }).select('_id').lean(),
    ]);
    if (!enrollment)
      return res.status(404).json({ success: false, message: 'Siz bu kursga yozilmagansiz' });

    // The videoId must actually belong to this course. Without this, any
    // enrolled user could POST arbitrary video ids: progressPercent is
    // watchedVideos.length / course.videos.length, so N fake ids drive it to
    // 100 and _issueCertificate fires below — and the viewCount $inc at the
    // end of this handler is what orders videos on the home page.
    //
    // activeVideos is already loaded above, so this costs no extra query.
    // 404 rather than 403: "not part of this course" and "does not exist"
    // are the same thing from the caller's side, and the neighbouring
    // "not enrolled" response above is a 404 too.
    const activeVideoIds = new Set((activeVideos || []).map((v) => v._id.toString()));
    if (!activeVideoIds.has(videoId)) {
      return res.status(404).json({ success: false, message: 'Bu dars ushbu kursga tegishli emas' });
    }

    const alreadyWatched = enrollment.watchedVideos.find(w => w.videoId.toString() === videoId);
    const isFirstWatch = !alreadyWatched;
    const previousPosition = alreadyWatched ? alreadyWatched.watchedSeconds || 0 : 0;
    const delta = computeWatchDelta(previousPosition, position);

    if (isFirstWatch) {
      enrollment.watchedVideos.push({ videoId, watchedSeconds: position });
    } else {
      // Orqaga seek qilish eng uzoq ko'rilgan nuqtani kamaytirmaydi.
      alreadyWatched.watchedSeconds = Math.max(previousPosition, position);
    }

    // Progress hisoblash
    // Numerator and denominator come from the same set, so progress cannot
    // exceed 100 when a watched lesson is later deactivated or deleted. The
    // user loses credit for such a lesson — deliberate: the alternative is a
    // numerator that outgrows its denominator.
    const totalVideos = activeVideoIds.size;
    const watchedActive = enrollment.watchedVideos.filter(
      (w) => activeVideoIds.has(w.videoId.toString())
    ).length;
    enrollment.progressPercent = totalVideos > 0
      ? Math.round((watchedActive / totalVideos) * 100)
      : 0;
    enrollment.totalWatchedSeconds += delta;

    // Kurs tugallandi
    if (enrollment.progressPercent >= 100 && !enrollment.isCompleted) {
      enrollment.isCompleted = true;
      enrollment.completedAt = new Date();
      await _issueCertificate(req.user, courseId, enrollment._id);
    }

    await enrollment.save();

    // viewCount va ActivityLog faqat save muvaffaqiyatli bo'lgandan keyin
    // yoziladi — so'rov keyinroq muvaffaqiyatsiz bo'lib qolsa (masalan,
    // validation xatosi), bu side-effect'lar allaqachon yozilib bo'lmaydi
    // va retry ularni takror yozmaydi.
    if (isFirstWatch) {
      // viewCount shu yerda oshadi — foydalanuvchi videoni haqiqatan ko'ra
      // boshlaganda, bir marta. Ilgari u getVideo'da edi va har refresh'da,
      // hatto video umuman o'ynamaganda ham oshardi.
      Video.updateOne({ _id: videoId }, { $inc: { viewCount: 1 } })
        .exec()
        .catch(err => console.error('[enrollment] viewCount inc:', err.message));

      // ActivityLog: birinchi ko'rishni denormalized log'ga yoz (fire-and-forget)
      // getHomeStats aggregation'ini tezlashtirish uchun (PB-001)
      ActivityLog.create({
        userId: req.user._id,
        videoId,
        courseId,
      }).catch(err => console.error('[ActivityLog] yozishda xato:', err.message));
    }

    // Badge tekshiruv
    const newBadges = await awardBadges(req.user._id);

    res.json({
      success: true,
      data: { progressPercent: enrollment.progressPercent, isCompleted: enrollment.isCompleted, newBadges },
    });
  } catch (err) {
    console.error('[enrollment] markVideoWatched:', err.message);
    res.status(500).json({ success: false, message: 'Video belgilashda xatolik.' });
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
    res.status(500).json({ success: false, message: 'Progress olishda xatolik.' });
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
    console.error('[enrollment] continueLearning:', err.message);
    res.status(500).json({ success: false, message: 'Ma\'lumotlarni olishda xatolik.' });
  }
};

module.exports = { enrollCourse, getMyEnrollments, markVideoWatched, getCourseProgress, continueLearning };

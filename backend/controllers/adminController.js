const mongoose   = require('mongoose');
const User       = require('../models/User');
const Course     = require('../models/Course');
const Video      = require('../models/Video');
const UserStats  = require('../models/UserStats');
const Enrollment = require('../models/Enrollment');
const Payment    = require('../models/Payment');
const { DailyChallenge } = require('../models/DailyChallenge');
const { awardXp } = require('../utils/awardXp');
const logger     = require('../utils/logger');

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

/** @desc  Umumiy statistika | @route GET /api/admin/stats | @access Admin */
const getDashboardStats = async (req, res) => {
  try {
    const [
      totalUsers, totalCourses, totalVideos,
      totalEnrollments, completedEnrollments,
      totalRevenue, newUsersThisMonth,
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      Course.countDocuments({ isActive: true }),
      Video.countDocuments({ isActive: true }),
      Enrollment.countDocuments(),
      Enrollment.countDocuments({ isCompleted: true }),
      Payment.aggregate([{ $match: { status: 'completed' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      User.countDocuments({ createdAt: { $gte: new Date(new Date().setDate(1)) } }),
    ]);

    res.json({
      success: true,
      data: {
        users:       { total: totalUsers, newThisMonth: newUsersThisMonth },
        courses:     { total: totalCourses },
        videos:      { total: totalVideos },
        enrollments: { total: totalEnrollments, completed: completedEnrollments },
        revenue:     { total: totalRevenue[0]?.total || 0, currency: 'UZS' },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Statistika olishda xato' });
  }
};

/** @desc  Top o'quvchilar | @route GET /api/admin/top-students | @access Admin */
const getTopStudents = async (req, res) => {
  try {
    const stats = await UserStats.find()
      .sort({ xp: -1 })
      .limit(10)
      .populate('userId', 'username email');

    // Flatten: frontend expects username, email, xp, level at top level
    const students = stats.map(s => ({
      _id:      s._id,
      username: s.userId?.username,
      email:    s.userId?.email,
      xp:       s.xp,
      level:    s.level,
    }));

    res.json({ success: true, data: { students } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Top o\'quvchilarni olishda xato' });
  }
};

/** @desc  Kurslar statistikasi | @route GET /api/admin/courses/stats | @access Admin */
const getCoursesStats = async (req, res) => {
  try {
    const courses = await Course.find({ isActive: true })
      .select('title category viewCount rating studentsCount ratingCount price isFree')
      .sort({ viewCount: -1 })
      .limit(20);

    res.json({ success: true, data: { courses } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Kurslar statistikasini olishda xato' });
  }
};

/** @desc  So'nggi to'lovlar | @route GET /api/admin/payments | @access Admin */
const getRecentPayments = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 20), 100);

    const payments = await Payment.find()
      .populate('userId',   'username email')
      .populate('courseId', 'title price')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Rename userId→user, courseId→course for frontend
    const data = payments.map(p => ({
      _id:    p._id,
      user:   p.userId,
      course: p.courseId,
      amount: p.amount,
      status: p.status,
      provider: p.provider,
      createdAt: p.createdAt,
    }));

    const total = await Payment.countDocuments();
    res.json({ success: true, data: { payments: data, pagination: { total, page, limit } } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'To\'lovlarni olishda xato' });
  }
};

/** @desc  Foydalanuvchilar ro'yxati | @route GET /api/admin/users | @access Admin */
const getUsers = async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(Math.max(1, parseInt(req.query.limit) || 20), 100);
    const search = req.query.search || '';
    const role   = req.query.role   || '';

    const VALID_ROLES = ['user', 'admin'];
    const filter = {};
    if (search) filter.$or = [
      { username: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
      { email:    { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
    ];
    if (role && VALID_ROLES.includes(role)) filter.role = role;

    const [users, total] = await Promise.all([
      User.find(filter).select('-password -refreshToken').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      User.countDocuments(filter),
    ]);

    res.json({ success: true, data: { users, pagination: { total, page, limit } } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Foydalanuvchilarni olishda xato' });
  }
};

/** @desc  Foydalanuvchini tahrirlash | @route PUT /api/admin/users/:id | @access Admin */
const updateUser = async (req, res) => {
  try {
    const allowed = ['role', 'isActive'];
    const update  = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) update[f] = req.body[f]; });

    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select('-password -refreshToken');
    if (!user) return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi' });

    logger.info('admin_user_update', {
      adminId: String(req.user._id),
      adminUsername: req.user.username,
      targetUserId: req.params.id,
      changes: update,
    });

    res.json({ success: true, data: { user } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Foydalanuvchini tahrirlashda xato' });
  }
};

/** @desc  Foydalanuvchini o'chirish | @route DELETE /api/admin/users/:id | @access Admin */
const deleteUser = async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'O\'zingizni o\'chira olmaysiz' });
    }
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi' });

    logger.info('admin_user_delete', {
      adminId: String(req.user._id),
      adminUsername: req.user.username,
      deletedUserId: req.params.id,
      deletedUsername: user.username,
    });

    res.json({ success: true, message: 'Foydalanuvchi o\'chirildi' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Foydalanuvchini o\'chirishda xato' });
  }
};

/** @desc  User detail | @route GET /api/admin/users/:id | @access Admin */
const getUserDetail = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password -refreshToken');
    if (!user) return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi' });

    const [stats, enrollments, payments] = await Promise.all([
      UserStats.findOne({ userId: req.params.id }),
      Enrollment.find({ userId: req.params.id })
        .populate('courseId', 'title thumbnail category')
        .sort({ createdAt: -1 })
        .limit(20),
      Payment.find({ userId: req.params.id }).sort({ createdAt: -1 }).limit(10),
    ]);

    res.json({ success: true, data: { user, stats, enrollments, payments } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** @desc  Global qidiruv | @route GET /api/admin/search?q= | @access Admin */
const globalSearch = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (q.length < 2) return res.json({ success: true, data: { users: [], courses: [], videos: [] } });

    const regex = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };

    const [users, courses, videos] = await Promise.all([
      User.find({ $or: [{ username: regex }, { email: regex }] })
        .select('username email role isActive avatar').limit(6),
      Course.find({ title: regex, isActive: true })
        .select('title category isPublished studentsCount thumbnail').limit(6),
      Video.find({ title: regex, isActive: true })
        .select('title bunnyStatus course duration')
        .populate('course', 'title').limit(6),
    ]);

    res.json({ success: true, data: { users, courses, videos } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** @desc  Analytics grafik ma'lumotlari | @route GET /api/admin/analytics | @access Admin */
const getAnalytics = async (req, res) => {
  try {
    const now = new Date();
    const sixAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [revenueRaw, signupRaw, enrollData] = await Promise.all([
      Payment.aggregate([
        { $match: { status: 'completed', createdAt: { $gte: sixAgo } } },
        { $group: { _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } }, total: { $sum: '$amount' } } },
        { $sort: { '_id.y': 1, '_id.m': 1 } },
      ]),
      User.aggregate([
        { $match: { createdAt: { $gte: sixAgo } } },
        { $group: { _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { '_id.y': 1, '_id.m': 1 } },
      ]),
      Enrollment.aggregate([
        { $group: { _id: '$courseId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 8 },
        { $lookup: { from: 'courses', localField: '_id', foreignField: '_id', as: 'c' } },
        { $unwind: '$c' },
        { $project: { title: '$c.title', count: 1 } },
      ]),
    ]);

    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return { key: `${d.getFullYear()}-${d.getMonth() + 1}`, label: d.toLocaleString('en', { month: 'short' }) };
    });

    const toSeries = (raw, field) => {
      const map = {};
      raw.forEach(r => { map[`${r._id.y}-${r._id.m}`] = r[field]; });
      return months.map(m => ({ label: m.label, value: map[m.key] || 0 }));
    };

    res.json({
      success: true,
      data: {
        revenue:     toSeries(revenueRaw, 'total'),
        signups:     toSeries(signupRaw, 'count'),
        enrollments: enrollData,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** @desc  Telegram kanalga xabar | @route POST /api/admin/telegram | @access Admin */
const sendTelegramMessage = async (req, res) => {
  try {
    const { message, parseMode = 'HTML' } = req.body;
    if (!message?.trim()) return res.status(400).json({ success: false, message: 'Xabar matni kiritilishi shart' });

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const channel  = process.env.TELEGRAM_CHANNEL_USERNAME || 'aidevix';
    if (!botToken) return res.status(500).json({ success: false, message: 'TELEGRAM_BOT_TOKEN sozlanmagan' });

    const axios = require('axios');
    const tgRes = await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: `@${channel}`,
      text: message.trim(),
      parse_mode: parseMode,
      disable_web_page_preview: false,
    });

    res.json({ success: true, message: `@${channel} kanaliga yuborildi`, data: { messageId: tgRes.data.result?.message_id } });
  } catch (err) {
    const detail = err.response?.data?.description || err.message;
    res.status(500).json({ success: false, message: `Telegram xato: ${detail}` });
  }
};

/** @desc  Bulk Bunny GUID ulash | @route POST /api/admin/videos/bulk-link | @access Admin */
const bulkLinkBunny = async (req, res) => {
  try {
    const { links } = req.body;
    if (!Array.isArray(links) || links.length === 0)
      return res.status(400).json({ success: false, message: 'links massivi bo\'sh' });
    if (links.length > 200)
      return res.status(400).json({ success: false, message: 'Bir martada maksimal 200 ta link' });

    const invalid = links.find(l =>
      !l || typeof l !== 'object' ||
      !isValidId(l.videoId) ||
      typeof l.bunnyVideoId !== 'string' ||
      !/^[a-f0-9-]{20,60}$/i.test(l.bunnyVideoId)
    );
    if (invalid) {
      return res.status(400).json({ success: false, message: 'Yaroqsiz videoId yoki bunnyVideoId formati' });
    }

    const { getBunnyVideoInfo, parseBunnyStatus } = require('../utils/bunny');

    const results = await Promise.allSettled(
      links.map(async ({ videoId, bunnyVideoId }) => {
        const info   = await getBunnyVideoInfo(bunnyVideoId);
        const status = parseBunnyStatus(info.status);
        await Video.findByIdAndUpdate(videoId, { bunnyVideoId, bunnyStatus: status, duration: info.length || 0 });
        return { videoId, bunnyVideoId, status };
      })
    );

    const succeeded = results.filter(r => r.status === 'fulfilled').map(r => r.value);
    const failed    = results.filter(r => r.status === 'rejected').map((r, i) => ({ index: i, error: r.reason?.message }));

    res.json({ success: true, data: { succeeded, failed, total: links.length } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** @desc  Videolarni qayta tartiblash | @route PUT /api/admin/videos/reorder | @access Admin */
const reorderVideos = async (req, res) => {
  try {
    const { videos } = req.body;
    if (!Array.isArray(videos)) return res.status(400).json({ success: false, message: 'videos massivi kerak' });
    if (videos.length > 500) return res.status(400).json({ success: false, message: 'Bir martada maksimal 500 ta video' });

    const invalid = videos.find(v =>
      !v || typeof v !== 'object' ||
      !isValidId(v.id) ||
      typeof v.order !== 'number' || !Number.isFinite(v.order) || v.order < 0 || v.order > 100000
    );
    if (invalid) {
      return res.status(400).json({ success: false, message: 'Yaroqsiz id yoki order' });
    }

    await Promise.all(videos.map(({ id, order }) => Video.findByIdAndUpdate(id, { order })));
    res.json({ success: true, message: 'Tartib yangilandi' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** @desc  Kurs enrollment statistikasi | @route GET /api/admin/courses/:id/enrollments | @access Admin */
const getCourseEnrollmentStats = async (req, res) => {
  try {
    const [enrollments, total, completed] = await Promise.all([
      Enrollment.find({ courseId: req.params.id })
        .populate('userId', 'username email avatar')
        .sort({ createdAt: -1 })
        .limit(50),
      Enrollment.countDocuments({ courseId: req.params.id }),
      Enrollment.countDocuments({ courseId: req.params.id, isCompleted: true }),
    ]);

    res.json({ success: true, data: { enrollments, total, completed } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** @desc  Barcha yozilmalar | @route GET /api/admin/enrollments | @access Admin */
const getAllEnrollments = async (req, res) => {
  try {
    const page        = Math.max(1, parseInt(req.query.page)  || 1);
    const limit       = Math.min(Math.max(1, parseInt(req.query.limit) || 20), 100);
    const search      = (req.query.search || '').trim();
    const courseId    = req.query.courseId || '';
    const isCompleted = req.query.isCompleted;

    const baseMatch = {};
    if (courseId && isValidId(courseId)) baseMatch.courseId = new mongoose.Types.ObjectId(courseId);
    if (isCompleted === 'true')  baseMatch.isCompleted = true;
    if (isCompleted === 'false') baseMatch.isCompleted = false;

    // Agar search bo'lsa — Mongo aggregation orqali (populate-keyin-filter buggidan saqlanish)
    if (search) {
      const r = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

      const pipeline = [
        { $match: baseMatch },
        { $lookup: { from: 'users',   localField: 'userId',   foreignField: '_id', as: 'u' } },
        { $lookup: { from: 'courses', localField: 'courseId', foreignField: '_id', as: 'c' } },
        { $unwind: { path: '$u', preserveNullAndEmptyArrays: true } },
        { $unwind: { path: '$c', preserveNullAndEmptyArrays: true } },
        { $match: { $or: [{ 'u.username': r }, { 'u.email': r }, { 'c.title': r }] } },
        { $sort: { createdAt: -1 } },
        {
          $facet: {
            items: [
              { $skip: (page - 1) * limit },
              { $limit: limit },
              {
                $project: {
                  _id: 1, isCompleted: 1, progress: 1, completedAt: 1, createdAt: 1,
                  userId: { _id: '$u._id', username: '$u.username', email: '$u.email', avatar: '$u.avatar' },
                  courseId: { _id: '$c._id', title: '$c.title', thumbnail: '$c.thumbnail', category: '$c.category' },
                },
              },
            ],
            totalCount: [{ $count: 'c' }],
          },
        },
      ];
      const out = await Enrollment.aggregate(pipeline);
      const row = out[0] || { items: [], totalCount: [] };
      const total = row.totalCount[0]?.c || 0;
      return res.json({ success: true, data: { enrollments: row.items, pagination: { total, page, limit } } });
    }

    const [enrollments, total] = await Promise.all([
      Enrollment.find(baseMatch)
        .populate('userId',   'username email avatar')
        .populate('courseId', 'title thumbnail category')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Enrollment.countDocuments(baseMatch),
    ]);

    res.json({ success: true, data: { enrollments, pagination: { total, page, limit } } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** @desc  To'lov holatini yangilash (refund/cancel) | @route PUT /api/admin/payments/:id | @access Admin */
const updatePayment = async (req, res) => {
  try {
    const ALLOWED = ['completed', 'refunded', 'cancelled', 'failed'];
    const { status, note } = req.body;
    if (!ALLOWED.includes(status)) {
      return res.status(400).json({ success: false, message: `status: ${ALLOWED.join(', ')}` });
    }
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Yaroqsiz to\'lov ID' });
    }

    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ success: false, message: 'To\'lov topilmadi' });

    const oldStatus = payment.status;
    payment.status = status;
    if (status === 'cancelled') payment.cancelledAt = new Date();
    payment.providerResponse = {
      ...(payment.providerResponse || {}),
      adminAction: {
        action: status,
        note: String(note || '').slice(0, 500),
        adminId: String(req.user._id),
        adminUsername: req.user.username,
        at: new Date().toISOString(),
        oldStatus,
      },
    };
    payment.markModified('providerResponse');
    await payment.save();

    // Agar refund qilingan bo'lsa — enrollment'ni o'chirish (manual)
    if (status === 'refunded' && oldStatus === 'completed') {
      await Enrollment.deleteOne({ userId: payment.userId, courseId: payment.courseId });
    }

    logger.info('admin_payment_update', {
      adminId: String(req.user._id),
      adminUsername: req.user.username,
      paymentId: req.params.id,
      oldStatus,
      newStatus: status,
    });

    res.json({ success: true, data: { payment } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** @desc  Kunlik vazifalar ro'yxati | @route GET /api/admin/challenges | @access Admin */
const adminListChallenges = async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 30), 100);

    const [challenges, total] = await Promise.all([
      DailyChallenge.find()
        .sort({ date: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      DailyChallenge.countDocuments(),
    ]);

    res.json({ success: true, data: { challenges, pagination: { total, page, limit } } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** @desc  Kunlik vazifani tahrirlash | @route PUT /api/admin/challenges/:id | @access Admin */
const adminUpdateChallenge = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Yaroqsiz ID' });
    }
    const allowed = ['title', 'description', 'targetCount', 'xpReward', 'isActive', 'type'];
    const update = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) update[f] = req.body[f]; });

    const challenge = await DailyChallenge.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!challenge) return res.status(404).json({ success: false, message: 'Vazifa topilmadi' });

    res.json({ success: true, data: { challenge } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** @desc  Kunlik vazifani o'chirish | @route DELETE /api/admin/challenges/:id | @access Admin */
const adminDeleteChallenge = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Yaroqsiz ID' });
    }
    const challenge = await DailyChallenge.findByIdAndDelete(req.params.id);
    if (!challenge) return res.status(404).json({ success: false, message: 'Vazifa topilmadi' });

    logger.info('admin_challenge_delete', {
      adminId: String(req.user._id),
      adminUsername: req.user.username,
      challengeId: req.params.id,
      date: challenge.date,
    });

    res.json({ success: true, message: 'Vazifa o\'chirildi' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** @desc  Foydalanuvchiga XP berish | @route POST /api/admin/users/:id/award-xp | @access Admin */
const adminAwardXp = async (req, res) => {
  try {
    const { xp, reason } = req.body;
    const amount = parseInt(xp);
    if (!amount || amount < 1 || amount > 100000) {
      return res.status(400).json({ success: false, message: 'XP miqdori 1-100000 orasida bo\'lishi kerak' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi' });

    const result = await awardXp(req.params.id, amount);

    res.json({
      success: true,
      message: `${user.username} ga ${amount} XP berildi`,
      data: { xp: result.xp, level: result.level, reason: reason || 'Admin tomonidan berildi' },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getDashboardStats, getTopStudents, getCoursesStats, getRecentPayments,
  getUsers, updateUser, deleteUser,
  getUserDetail, globalSearch, getAnalytics,
  sendTelegramMessage, bulkLinkBunny, reorderVideos, getCourseEnrollmentStats,
  getAllEnrollments, adminAwardXp,
  updatePayment,
  adminListChallenges, adminUpdateChallenge, adminDeleteChallenge,
};

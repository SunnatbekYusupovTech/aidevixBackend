const User = require('../models/User');
const UserStats = require('../models/UserStats');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Prompt = require('../models/Prompt');
const validator = require('validator');

const getLiveActivity = async (_req, res) => {
  try {
    const [enrollments, prompts] = await Promise.all([
      Enrollment.find().sort({ createdAt: -1 }).limit(12).populate('userId', 'username').populate('courseId', 'title'),
      Prompt.find({ isPublic: true }).sort({ createdAt: -1 }).limit(12).populate('author', 'username'),
    ]);

    const activities = [
      ...enrollments.map((e) => ({
        id: `enr-${e._id}`,
        user: e.userId?.username || 'User',
        action: `${e.courseId?.title || 'Kurs'} kursini boshladi`,
        type: 'enrollment',
        createdAt: e.createdAt,
      })),
      ...prompts.map((p) => ({
        id: `prm-${p._id}`,
        user: p.author?.username || 'User',
        action: `yangi prompt ulashdi: ${p.title}`,
        type: 'prompt',
        createdAt: p.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 20);

    return res.json({ success: true, data: { activities } });
  } catch (err) {
    console.error('[publicController]', err);
    return res.status(500).json({ success: false, message: 'Server xatosi' });
  }
};

const getTeamMembers = async (_req, res) => {
  try {
    const users = await User.find({ isActive: true })
      .select('username firstName lastName avatar role aiStack createdAt')
      .sort({ xp: -1, createdAt: 1 })
      .limit(8)
      .lean();

    const ids = users.map((u) => u._id);
    const stats = await UserStats.find({ userId: { $in: ids } })
      .select('userId xp level streak')
      .lean();
    const statsMap = new Map(stats.map((s) => [String(s.userId), s]));

    const members = users.map((u) => {
      const st = statsMap.get(String(u._id));
      return {
        id: String(u._id),
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username,
        username: u.username,
        avatar: u.avatar || null,
        role: u.role || 'user',
        stack: u.aiStack || [],
        xp: st?.xp || 0,
        level: st?.level || 1,
        streak: st?.streak || 0,
      };
    });

    return res.json({ success: true, data: { members } });
  } catch (err) {
    console.error('[publicController]', err);
    return res.status(500).json({ success: false, message: 'Server xatosi' });
  }
};

const getRoadmap = async (_req, res) => {
  try {
    const categories = await Course.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]);

    const paths = categories.map((c, i) => ({
      id: c._id || `path-${i}`,
      title: (c._id || 'General').toString().toUpperCase(),
      description: `${c.count} ta faol kurs`,
      icon: '📘',
      steps: [
        {
          title: `${(c._id || 'General').toString()} asoslari`,
          category: c._id || 'all',
          level: 'Boshlang\'ich',
          xp: 200,
          icon: '🟡',
        },
        {
          title: `${(c._id || 'General').toString()} amaliyot`,
          category: c._id || 'all',
          level: 'O\'rta',
          xp: 400,
          icon: '⚡',
        },
      ],
    }));

    return res.json({ success: true, data: { paths } });
  } catch (err) {
    console.error('[publicController]', err);
    return res.status(500).json({ success: false, message: 'Server xatosi' });
  }
};

/**
 * @desc  Public contact form — Telegram admin'ga xabar yuboradi
 * @route POST /api/public/contact
 * @access Public (rate-limited)
 * Body: { name, email, subject, message, _honeypot? }
 *
 * Honeypot `_honeypot` field — bot'lar to'ldiradi, biz silently rad qilamiz.
 */
const submitContact = async (req, res) => {
  try {
    const { name, email, subject, message, _honeypot } = req.body || {};
    const safe = (s) => String(s || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').slice(0, 4000);

    // Honeypot — bot to'ldirgan bo'lsa, soxta success qaytaramiz (bot bilmaydi)
    if (_honeypot && String(_honeypot).trim().length > 0) {
      return res.json({ success: true, message: 'Yuborildi' });
    }

    // Validatsiya
    const cleanName = String(name || '').trim();
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanSubject = String(subject || '').trim();
    const cleanMessage = String(message || '').trim();

    if (cleanName.length < 2 || cleanName.length > 100) {
      return res.status(400).json({ success: false, message: 'Ism 2-100 belgi bo\'lsin' });
    }
    if (!validator.isEmail(cleanEmail)) {
      return res.status(400).json({ success: false, message: 'Email yaroqsiz' });
    }
    if (cleanSubject.length < 3 || cleanSubject.length > 200) {
      return res.status(400).json({ success: false, message: 'Mavzu 3-200 belgi bo\'lsin' });
    }
    if (cleanMessage.length < 10 || cleanMessage.length > 5000) {
      return res.status(400).json({ success: false, message: 'Xabar 10-5000 belgi bo\'lsin' });
    }

    // Telegram admin xabarnomasi
    try {
      const { getBot } = require('../utils/telegramBot');
      const bot = getBot();
      const adminId = (process.env.TELEGRAM_ADMIN_CHAT_ID || '').trim();
      if (bot && adminId) {
        const text =
          `📩 <b>Yangi contact xabari</b>\n` +
          `━━━━━━━━━━━━━━━━━━━━━━\n` +
          `👤 <b>${safe(cleanName)}</b>\n` +
          `📧 ${safe(cleanEmail)}\n` +
          `📌 <b>${safe(cleanSubject)}</b>\n\n` +
          `${safe(cleanMessage)}`;
        await bot.sendMessage(adminId, text, { parse_mode: 'HTML' });
      }
    } catch (_) {
      // Telegram fail — admin keyin emaildan ko'radi
    }

    // Email orqali ham xabar berish (admin uchun) — Resend orqali (HTTPS API)
    try {
      const { sendMail } = require('../utils/emailService');
      const adminEmail = process.env.CONTACT_NOTIFY_EMAIL;
      if (adminEmail) {
        await sendMail({
          to: adminEmail,
          subject: `[Contact] ${cleanSubject}`,
          html: `<p><strong>From:</strong> ${safe(cleanName)} &lt;${safe(cleanEmail)}&gt;</p>`
              + `<p>${safe(cleanMessage).replace(/\n/g, '<br/>')}</p>`,
        });
      }
    } catch (_) {
      // Email fail — Telegram orqali yetib bordi
    }

    return res.status(201).json({
      success: true,
      message: 'Xabaringiz qabul qilindi. Tez orada javob beramiz.',
    });
  } catch (err) {
    console.error('[publicController]', err);
    return res.status(500).json({ success: false, message: 'Server xatosi' });
  }
};

module.exports = {
  getLiveActivity,
  getTeamMembers,
  getRoadmap,
  submitContact,
};


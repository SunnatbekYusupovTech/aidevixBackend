const BugReport = require('../models/BugReport');
const asyncHandler = require('../middleware/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const { awardXp } = require('../utils/awardXp');
const { getBot } = require('../utils/telegramBot');

// ADM-05: pageUrl faqat http(s) — javascript:/data: URL admin panelda <a href> orqali XSS bo'lmasin
const sanitizePageUrl = (value) => {
  const raw = String(value || '').trim().slice(0, 800);
  if (!raw) return '';
  try {
    const u = new URL(raw);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString().slice(0, 800) : '';
  } catch {
    return '';
  }
};

const BUG_XP = 100;
const SUGGESTION_XP = 100;

const notifyAdminTelegram = async (report, user) => {
  try {
    const bot = getBot();
    const adminId = (process.env.TELEGRAM_ADMIN_CHAT_ID || '').trim();
    if (!bot || !adminId) return;

    const safe = (s) => String(s || '').slice(0, 3500).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const text =
      `🐛 <b>Yangi bug xabari</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🆔 <code>${report._id}</code>\n` +
      `👤 <b>${safe(user.username)}</b> (${safe(user.email)})\n` +
      `📌 <b>${safe(report.title)}</b>\n` +
      `🔗 Sahifa: <code>${safe(report.pageUrl || '—')}</code>\n\n` +
      `<b>Tavsif:</b>\n${safe(report.description)}\n\n` +
      (report.suggestion?.trim()
        ? `<b>Taklif:</b>\n${safe(report.suggestion)}\n\n`
        : '') +
      `API: <code>PATCH /api/admin/bug-reports/${report._id}</code>\n` +
      `Harakatlar: <code>award_bug</code> | <code>award_suggestion</code> | <code>reject</code>`;

    await bot.sendMessage(adminId, text, { parse_mode: 'HTML' });
  } catch (_) {
    /* ignore */
  }
};

/** POST /api/bug-reports */
const createBugReport = asyncHandler(async (req, res, next) => {
  const { title, description, pageUrl = '', suggestion = '' } = req.body;

  if (!title || String(title).trim().length < 5) {
    return next(new ErrorResponse('Sarlavha kamida 5 belgi bo‘lsin', 400));
  }
  if (!description || String(description).trim().length < 20) {
    return next(new ErrorResponse('Tavsif kamida 20 belgi — qanday takrorlash mumkinligini yozing', 400));
  }

  const report = await BugReport.create({
    user: req.user._id,
    title: String(title).trim().slice(0, 160),
    description: String(description).trim().slice(0, 8000),
    pageUrl: sanitizePageUrl(pageUrl),
    suggestion: String(suggestion || '').trim().slice(0, 4000),
  });

  const user = req.user;
  await notifyAdminTelegram(report, user);

  res.status(201).json({
    success: true,
    message: 'Xabar qabul qilindi. Admin tekshirgach, haqiqiy bug bo‘lsa +100 XP beriladi.',
    data: {
      id: report._id,
      status: report.status,
    },
  });
});

/** GET /api/bug-reports/me */
const myBugReports = asyncHandler(async (req, res) => {
  const list = await BugReport.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50)
    .select('title status bugXpGranted suggestionXpGranted createdAt adminNote');

  res.json({ success: true, data: list });
});

/** GET /api/admin/bug-reports */
const adminListBugReports = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, parseInt(req.query.limit, 10) || 20);
  const status = req.query.status;

  const filter = {};
  if (status && ['pending', 'rejected', 'bug_ok', 'done'].includes(status)) {
    filter.status = status;
  }

  const [items, total] = await Promise.all([
    BugReport.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('user', 'username email avatar')
      .lean(),
    BugReport.countDocuments(filter),
  ]);
  // ADM-05: eski (tuzatishdan oldingi) yozuvlardagi xavfli pageUrl ham chiqishda tozalanadi
  for (const item of items) item.pageUrl = sanitizePageUrl(item.pageUrl);

  res.json({
    success: true,
    data: { items, page, limit, total, pages: Math.ceil(total / limit) },
  });
});

/** PATCH /api/admin/bug-reports/:id */
const adminReviewBugReport = asyncHandler(async (req, res, next) => {
  const { action, adminNote = '' } = req.body;
  const allowed = ['reject', 'award_bug', 'award_suggestion'];

  if (!allowed.includes(action)) {
    return next(new ErrorResponse(`action: ${allowed.join(', ')}`, 400));
  }

  const report = await BugReport.findById(req.params.id);
  if (!report) return next(new ErrorResponse('Topilmadi', 404));

  const note = String(adminNote || '').trim().slice(0, 1000);

  if (action === 'reject') {
    if (report.status !== 'pending') {
      return next(new ErrorResponse('Faqat kutilayotgan xabarni rad etish mumkin', 400));
    }
    if (report.bugXpGranted) {
      return next(new ErrorResponse('XP berilgan — rad etib bo‘lmaydi', 400));
    }
    report.status = 'rejected';
    report.adminNote = note;
    report.reviewedBy = req.user._id;
    report.reviewedAt = new Date();
    await report.save();
    return res.json({ success: true, message: 'Rad etildi', data: report });
  }

  if (action === 'award_bug') {
    if (report.status !== 'pending') {
      return next(new ErrorResponse('Faqat kutilayotgan xabar uchun bug mukofoti', 400));
    }
    if (report.bugXpGranted) {
      return next(new ErrorResponse('Bug mukofoti allaqachon berilgan', 400));
    }

    await awardXp(report.user, BUG_XP);
    report.bugXpGranted = true;
    report.adminNote = note;
    report.reviewedBy = req.user._id;
    report.reviewedAt = new Date();

    const hasSuggestion = !!(report.suggestion && report.suggestion.trim().length >= 10);
    report.status = hasSuggestion ? 'bug_ok' : 'done';

    await report.save();

    return res.json({
      success: true,
      message: `Haqiqiy bug tasdiqlandi — foydalanuvchiga +${BUG_XP} XP`,
      data: report,
    });
  }

  if (action === 'award_suggestion') {
    if (report.status !== 'bug_ok') {
      return next(new ErrorResponse('Avval bug mukofotini bering (status bug_ok)', 400));
    }
    if (!report.suggestion || report.suggestion.trim().length < 10) {
      return next(new ErrorResponse('Taklif matni juda qisqa yoki yo‘q', 400));
    }
    if (report.suggestionXpGranted) {
      return next(new ErrorResponse('Taklif mukofoti allaqachon berilgan', 400));
    }

    await awardXp(report.user, SUGGESTION_XP);
    report.suggestionXpGranted = true;
    report.status = 'done';
    if (note) report.adminNote = report.adminNote ? `${report.adminNote}\n${note}` : note;
    report.reviewedBy = req.user._id;
    report.reviewedAt = new Date();
    await report.save();

    return res.json({
      success: true,
      message: `Taklif qabul qilindi — qo‘shimcha +${SUGGESTION_XP} XP`,
      data: report,
    });
  }

  return next(new ErrorResponse('Noto‘g‘ri harakat', 400));
});

module.exports = {
  createBugReport,
  myBugReports,
  adminListBugReports,
  adminReviewBugReport,
};

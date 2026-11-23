'use strict';

const bcrypt = require('bcryptjs');
const MetodikaModule = require('../models/MetodikaModule');
const MetodikaLesson = require('../models/MetodikaLesson');
const MetodikaPage = require('../models/MetodikaPage');
const MetodikaAsset = require('../models/MetodikaAsset');
const MetodikaAccess = require('../models/MetodikaAccess');
const { parseCookies, safeEqual, hashToken } = require('../utils/authSecurity');
const { isGrantUsable } = require('../middleware/metodikaAccess');
const {
  METODIKA_COOKIE_NAME,
  signMetodikaSession,
  verifyMetodikaSession,
  setMetodikaCookie,
  clearMetodikaCookie,
  isMetodikaOwner,
  audit,
} = require('../utils/metodika');

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

// Ruxsati yo'q foydalanuvchida ham bcrypt ishlaydi — javob vaqti bo'yicha
// "bu akkauntga ruxsat berilganmi" degan ma'lumot sizmasligi uchun.
let dummyHashPromise = null;
const getDummyHash = () => {
  if (!dummyHashPromise) dummyHashPromise = bcrypt.hash('metodika-timing-dummy', 12);
  return dummyHashPromise;
};

const INVALID = {
  success: false,
  code: 'METODIKA_INVALID',
  message: "Login yoki parol noto'g'ri, yoki bu akkauntga metodika ruxsati berilmagan.",
};

const viewerOf = (user) => ({
  id: String(user._id),
  username: user.username,
  name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username,
});

// GET /api/metodika/session
const getSession = async (req, res) => {
  const owner = isMetodikaOwner(req.user);
  let unlocked = owner;
  let expiresAt = null;

  if (!owner) {
    const token = parseCookies(req.headers.cookie)[METODIKA_COOKIE_NAME];
    const decoded = token ? verifyMetodikaSession(token) : null;
    if (
      decoded &&
      decoded.userId === String(req.user._id) &&
      req.authSessionId &&
      decoded.sid === String(req.authSessionId)
    ) {
      const access = await MetodikaAccess.findOne({ user: req.user._id }).lean();
      if (isGrantUsable(access) && decoded.av === access.sessionVersion) {
        unlocked = true;
        expiresAt = new Date(decoded.exp * 1000);
      }
    }
  }

  res.json({ success: true, data: { isOwner: owner, unlocked, expiresAt, viewer: viewerOf(req.user) } });
};

// POST /api/metodika/unlock  { login, password }
const unlock = async (req, res) => {
  const login = typeof req.body?.login === 'string' ? req.body.login.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!login || !password || login.length > 40 || password.length > 128) {
    return res.status(400).json({ success: false, message: 'Login va parolni kiriting.' });
  }
  if (!req.authSessionId) {
    return res.status(403).json({
      success: false,
      code: 'METODIKA_RELOGIN',
      message: 'Avval saytdan chiqib, qayta kiring.',
    });
  }

  const access = await MetodikaAccess.findOne({ user: req.user._id }).select('+passwordHash');
  const now = new Date();

  if (access?.lockUntil && access.lockUntil > now) {
    audit(req, 'unlock_locked', login);
    return res.status(403).json({
      success: false,
      code: 'METODIKA_TEMP_LOCKED',
      message: `Juda ko'p noto'g'ri urinish. ${LOCK_MINUTES} daqiqadan so'ng qayta urinib ko'ring.`,
    });
  }

  const passwordOk = await bcrypt.compare(password, access?.passwordHash || await getDummyHash());
  const loginOk = Boolean(access) && safeEqual(hashToken(login), hashToken(access.login));

  if (!access || !loginOk || !passwordOk || !isGrantUsable(access, now)) {
    if (access) {
      access.failedAttempts = (access.failedAttempts || 0) + 1;
      if (access.failedAttempts >= MAX_FAILED_ATTEMPTS) {
        access.lockUntil = new Date(now.getTime() + LOCK_MINUTES * 60 * 1000);
        access.failedAttempts = 0;
      }
      await access.save();
    }
    audit(req, 'unlock_fail', login);
    return res.status(403).json(INVALID);
  }

  access.failedAttempts = 0;
  access.lockUntil = null;
  access.lastLoginAt = now;
  access.lastIp = req.ip || null;
  await access.save();

  setMetodikaCookie(res, signMetodikaSession({
    userId: String(req.user._id),
    sid: String(req.authSessionId),
    av: access.sessionVersion,
  }));
  audit(req, 'unlock_ok', login);
  return res.json({ success: true, data: { unlocked: true } });
};

// POST /api/metodika/lock
const lock = async (req, res) => {
  clearMetodikaCookie(res);
  audit(req, 'lock');
  res.json({ success: true });
};

// GET /api/metodika/outline — faqat sarlavhalar; dars matni bittalab so'raladi.
const getOutline = async (req, res) => {
  const filter = req.metodika.owner ? {} : { isPublished: true };
  const [modules, lessons, pages] = await Promise.all([
    MetodikaModule.find(filter).sort({ order: 1, createdAt: 1 }).lean(),
    MetodikaLesson.find(filter)
      .select('module number title week durationMinutes outcome isPublished')
      .sort({ number: 1 })
      .lean(),
    MetodikaPage.find(filter).select('title order isPublished').sort({ order: 1, createdAt: 1 }).lean(),
  ]);

  const byModule = new Map(modules.map((m) => [String(m._id), []]));
  for (const lesson of lessons) {
    const bucket = byModule.get(String(lesson.module));
    if (bucket) bucket.push(lesson);
  }

  audit(req, 'view_outline');
  res.json({
    success: true,
    data: {
      modules: modules.map((m) => ({ ...m, lessons: byModule.get(String(m._id)) })),
      pages,
      totals: {
        lessons: lessons.length,
        minutes: lessons.reduce((sum, l) => sum + (l.durationMinutes || 0), 0),
      },
    },
  });
};

const notFound = (res) => res.status(404).json({ success: false, message: 'Topilmadi.' });

// GET /api/metodika/lessons/:id
const getLesson = async (req, res) => {
  const lesson = await MetodikaLesson.findById(req.params.id)
    .populate('module', 'title order weeks isPublished')
    .lean();
  if (!lesson || !lesson.module) return notFound(res);
  if (!req.metodika.owner && (!lesson.isPublished || !lesson.module.isPublished)) return notFound(res);

  audit(req, 'view_lesson', `${lesson.number}. ${lesson.title}`);
  res.json({
    success: true,
    data: {
      ...lesson,
      images: (lesson.images || []).map((img) => ({ _id: img._id, asset: img.asset, caption: img.caption || '' })),
    },
  });
};

// GET /api/metodika/pages/:id
const getPage = async (req, res) => {
  const page = await MetodikaPage.findById(req.params.id).lean();
  if (!page || (!req.metodika.owner && !page.isPublished)) return notFound(res);
  audit(req, 'view_page', page.title);
  res.json({ success: true, data: page });
};

// GET /api/metodika/assets/:id — rasm baytlari faqat ruxsat bilan.
const getAsset = async (req, res) => {
  const asset = await MetodikaAsset.findById(req.params.id).select('+data');
  if (!asset) return notFound(res);

  if (!req.metodika.owner) {
    const lesson = await MetodikaLesson.findOne({ _id: asset.lesson, isPublished: true, 'images.asset': asset._id })
      .populate('module', 'isPublished')
      .lean();
    if (!lesson || !lesson.module?.isPublished) return notFound(res);
  }

  res.set({
    'Content-Type': asset.mime,
    'Content-Length': String(asset.data.length),
    'Content-Disposition': 'inline',
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
    'Cross-Origin-Resource-Policy': 'same-site',
    'X-Robots-Tag': 'noindex, noarchive',
  });
  res.end(asset.data);
};

const CLIENT_EVENTS = {
  devtools: 'client_devtools',
  copy: 'client_copy',
  print: 'client_print',
  screenshot_key: 'client_screenshot_key',
  contextmenu: 'client_contextmenu',
};

// POST /api/metodika/events  { type, target } — brauzerdagi shubhali harakatlar jurnali.
const reportEvent = async (req, res) => {
  const action = Object.hasOwn(CLIENT_EVENTS, req.body?.type) ? CLIENT_EVENTS[req.body.type] : null;
  if (!action) return res.status(400).json({ success: false, message: "Noma'lum hodisa." });
  audit(req, action, typeof req.body.target === 'string' ? req.body.target : '');
  res.json({ success: true });
};

module.exports = {
  getSession,
  unlock,
  lock,
  getOutline,
  getLesson,
  getPage,
  getAsset,
  reportEvent,
};

'use strict';

const MetodikaAccess = require('../models/MetodikaAccess');
const { parseCookies } = require('../utils/authSecurity');
const securityLogger = require('../utils/securityLogger');
const {
  METODIKA_COOKIE_NAME,
  verifyMetodikaSession,
  isMetodikaOwner,
} = require('../utils/metodika');

const locked = (res, code, message) =>
  res.status(403).json({ success: false, code, message });

const isGrantUsable = (access, now = new Date()) =>
  Boolean(access) && access.isActive === true && (!access.expiresAt || access.expiresAt > now);

/**
 * Metodika kontentini o'qish darvozasi. `authenticate`dan KEYIN ishlaydi.
 *
 *  1. Egasi (owner admin) — to'g'ridan-to'g'ri o'tadi.
 *  2. Boshqalar — metodika login/paroli bilan ochilgan httpOnly sessiya cookie kerak. U:
 *     - shu foydalanuvchiga (userId) va AYNAN shu login sessiyasiga (sid) bog'langan —
 *       cookie'ni boshqa akkaunt yoki boshqa qurilmaga ko'chirib bo'lmaydi;
 *     - har so'rovda DB'dagi ruxsat bilan solishtiriladi (faol, muddati, sessionVersion) —
 *       ruxsat olib qo'yilsa yoki parol almashtirilsa keyingi so'rovdayoq yopiladi.
 */
const requireMetodikaAccess = async (req, res, next) => {
  try {
    if (isMetodikaOwner(req.user)) {
      req.metodika = { owner: true };
      return next();
    }

    const token = parseCookies(req.headers.cookie)[METODIKA_COOKIE_NAME];
    const decoded = token ? verifyMetodikaSession(token) : null;

    if (
      !decoded ||
      decoded.userId !== String(req.user._id) ||
      !req.authSessionId ||
      decoded.sid !== String(req.authSessionId)
    ) {
      return locked(res, 'METODIKA_LOCKED', 'Metodikani ochish uchun maxsus login va parol kerak.');
    }

    const access = await MetodikaAccess.findOne({ user: req.user._id }).lean();
    if (!isGrantUsable(access) || decoded.av !== access.sessionVersion) {
      return locked(res, 'METODIKA_LOCKED', 'Metodikaga ruxsat tugagan yoki bekor qilingan.');
    }

    req.metodika = { owner: false, accessId: String(access._id), expiresAt: decoded.exp };
    return next();
  } catch (error) {
    return next(error);
  }
};

// Tahrirlash va ruxsat boshqaruvi. `authenticate` + `requireAdmin`dan keyin ishlaydi.
const requireMetodikaOwner = (req, res, next) => {
  if (!isMetodikaOwner(req.user)) {
    securityLogger.suspicious(req, 'metodika_owner_denied', { userId: String(req.user?._id) });
    return res.status(403).json({ success: false, message: 'Metodikani faqat egasi boshqaradi.' });
  }
  req.metodika = { owner: true };
  return next();
};

module.exports = { requireMetodikaAccess, requireMetodikaOwner, isGrantUsable };

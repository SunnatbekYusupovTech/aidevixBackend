'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const MetodikaModule = require('../models/MetodikaModule');
const MetodikaLesson = require('../models/MetodikaLesson');
const MetodikaPage = require('../models/MetodikaPage');
const MetodikaAsset = require('../models/MetodikaAsset');
const MetodikaAccess = require('../models/MetodikaAccess');
const MetodikaAuditLog = require('../models/MetodikaAuditLog');
const {
  audit,
  sanitizeModule,
  sanitizeLesson,
  sanitizePage,
  str,
} = require('../utils/metodika');

const MAX_IMAGES_PER_LESSON = 12;
const BCRYPT_COST = 12;

const bad = (res, message) => res.status(400).json({ success: false, message });
const notFound = (res) => res.status(404).json({ success: false, message: 'Topilmadi.' });
const isId = (value) => typeof value === 'string' && mongoose.Types.ObjectId.isValid(value);

// ─── Modullar ───────────────────────────────────────────────────────────────

const createModule = async (req, res) => {
  const data = sanitizeModule(req.body);
  if (!data.title) return bad(res, 'Modul nomi majburiy.');
  if (data.order === undefined) data.order = (await MetodikaModule.countDocuments()) + 1;
  const created = await MetodikaModule.create(data);
  audit(req, 'admin_change', `modul yaratildi: ${created.title}`);
  res.status(201).json({ success: true, data: created });
};

const updateModule = async (req, res) => {
  const data = sanitizeModule(req.body);
  if (data.title === '') return bad(res, "Modul nomi bo'sh bo'lmasin.");
  const updated = await MetodikaModule.findByIdAndUpdate(req.params.id, { $set: data }, { new: true, runValidators: true });
  if (!updated) return notFound(res);
  audit(req, 'admin_change', `modul yangilandi: ${updated.title}`);
  res.json({ success: true, data: updated });
};

const deleteModule = async (req, res) => {
  const moduleDoc = await MetodikaModule.findById(req.params.id);
  if (!moduleDoc) return notFound(res);
  const lessons = await MetodikaLesson.find({ module: moduleDoc._id }).select('_id').lean();
  const lessonIds = lessons.map((l) => l._id);
  await MetodikaAsset.deleteMany({ lesson: { $in: lessonIds } });
  await MetodikaLesson.deleteMany({ _id: { $in: lessonIds } });
  await moduleDoc.deleteOne();
  audit(req, 'admin_change', `modul o'chirildi: ${moduleDoc.title} (${lessonIds.length} dars)`);
  res.json({ success: true, data: { deletedLessons: lessonIds.length } });
};

// ─── Darslar ────────────────────────────────────────────────────────────────

const createLesson = async (req, res) => {
  const data = sanitizeLesson(req.body);
  if (!data.title) return bad(res, 'Dars nomi majburiy.');
  if (!isId(req.body?.module) || !(await MetodikaModule.exists({ _id: req.body.module }))) {
    return bad(res, 'Modul topilmadi.');
  }
  if (data.number === undefined) {
    const last = await MetodikaLesson.findOne().sort({ number: -1 }).select('number').lean();
    data.number = (last?.number || 0) + 1;
  }
  const created = await MetodikaLesson.create({ ...data, module: req.body.module });
  audit(req, 'admin_change', `dars yaratildi: ${created.number}. ${created.title}`);
  res.status(201).json({ success: true, data: created });
};

const updateLesson = async (req, res) => {
  const lesson = await MetodikaLesson.findById(req.params.id);
  if (!lesson) return notFound(res);

  const data = sanitizeLesson(req.body);
  if (data.title === '') return bad(res, "Dars nomi bo'sh bo'lmasin.");

  if (req.body?.module !== undefined) {
    if (!isId(req.body.module) || !(await MetodikaModule.exists({ _id: req.body.module }))) {
      return bad(res, 'Modul topilmadi.');
    }
    lesson.module = req.body.module;
  }

  lesson.set(data);

  // Mavjud rasmlar izohi: { "<imageId>": "izoh" }
  const captions = req.body?.imageCaptions;
  if (captions && typeof captions === 'object' && !Array.isArray(captions)) {
    for (const image of lesson.images) {
      const caption = str(captions[String(image._id)], 300);
      if (caption !== undefined) image.caption = caption;
    }
  }

  await lesson.save();
  audit(req, 'admin_change', `dars yangilandi: ${lesson.number}. ${lesson.title}`);
  res.json({ success: true, data: lesson });
};

const deleteLesson = async (req, res) => {
  const lesson = await MetodikaLesson.findById(req.params.id);
  if (!lesson) return notFound(res);
  await MetodikaAsset.deleteMany({ lesson: lesson._id });
  await lesson.deleteOne();
  audit(req, 'admin_change', `dars o'chirildi: ${lesson.number}. ${lesson.title}`);
  res.json({ success: true });
};

// ─── Rasmlar ────────────────────────────────────────────────────────────────

// Content-Type sarlavhasiga ishonmaymiz — fayl boshidagi imzo tekshiriladi.
const sniffImage = (buf) => {
  if (!Buffer.isBuffer(buf) || buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') return 'image/webp';
  return null;
};

const uploadLessonImages = async (req, res) => {
  const lesson = await MetodikaLesson.findById(req.params.id);
  if (!lesson) return notFound(res);

  const files = Array.isArray(req.files) ? req.files : [];
  if (!files.length) return bad(res, 'Rasm tanlanmagan.');
  if (lesson.images.length + files.length > MAX_IMAGES_PER_LESSON) {
    return bad(res, `Bir darsga ko'pi bilan ${MAX_IMAGES_PER_LESSON} ta rasm qo'shish mumkin.`);
  }

  const sniffed = files.map((file) => sniffImage(file.buffer));
  if (sniffed.some((mime) => !mime)) return bad(res, 'Faqat haqiqiy JPG, PNG yoki WEBP rasm qabul qilinadi.');

  const caption = str(req.body?.caption, 300) || '';
  const assets = await MetodikaAsset.insertMany(files.map((file, i) => ({
    lesson: lesson._id,
    data: file.buffer,
    mime: sniffed[i],
    size: file.buffer.length,
    filename: String(file.originalname || '').slice(0, 200),
    uploadedBy: req.user._id,
  })));

  for (const asset of assets) lesson.images.push({ asset: asset._id, caption });
  await lesson.save();
  audit(req, 'admin_change', `rasm qo'shildi (${assets.length}): ${lesson.number}. ${lesson.title}`);
  res.status(201).json({ success: true, data: lesson.images });
};

const deleteLessonImage = async (req, res) => {
  const lesson = await MetodikaLesson.findById(req.params.id);
  if (!lesson) return notFound(res);
  const image = lesson.images.id(req.params.imageId);
  if (!image) return notFound(res);
  await MetodikaAsset.deleteOne({ _id: image.asset, lesson: lesson._id });
  image.deleteOne();
  await lesson.save();
  audit(req, 'admin_change', `rasm o'chirildi: ${lesson.number}. ${lesson.title}`);
  res.json({ success: true, data: lesson.images });
};

// ─── Sahifalar (pasport, ilovalar) ──────────────────────────────────────────

const createPage = async (req, res) => {
  const data = sanitizePage(req.body);
  if (!data.title) return bad(res, 'Sahifa nomi majburiy.');
  if (data.order === undefined) data.order = (await MetodikaPage.countDocuments()) + 1;
  const created = await MetodikaPage.create(data);
  audit(req, 'admin_change', `sahifa yaratildi: ${created.title}`);
  res.status(201).json({ success: true, data: created });
};

const updatePage = async (req, res) => {
  const data = sanitizePage(req.body);
  if (data.title === '') return bad(res, "Sahifa nomi bo'sh bo'lmasin.");
  const updated = await MetodikaPage.findByIdAndUpdate(req.params.id, { $set: data }, { new: true, runValidators: true });
  if (!updated) return notFound(res);
  audit(req, 'admin_change', `sahifa yangilandi: ${updated.title}`);
  res.json({ success: true, data: updated });
};

const deletePage = async (req, res) => {
  const deleted = await MetodikaPage.findByIdAndDelete(req.params.id);
  if (!deleted) return notFound(res);
  audit(req, 'admin_change', `sahifa o'chirildi: ${deleted.title}`);
  res.json({ success: true });
};

// ─── Kirish huquqlari ───────────────────────────────────────────────────────

const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
const generatePassword = (length = 16) =>
  Array.from({ length }, () => PASSWORD_ALPHABET[crypto.randomInt(PASSWORD_ALPHABET.length)]).join('');

const parseExpiry = (value) => {
  if (value === null || value === '') return null;
  if (value === undefined) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const accessView = (a) => ({
  _id: a._id,
  user: a.user,
  login: a.login,
  isActive: a.isActive,
  expiresAt: a.expiresAt,
  note: a.note,
  lastLoginAt: a.lastLoginAt,
  lastIp: a.lastIp,
  lockUntil: a.lockUntil,
  createdAt: a.createdAt,
});

const listAccess = async (req, res) => {
  const items = await MetodikaAccess.find()
    .populate('user', 'username email firstName lastName')
    .sort({ createdAt: -1 })
    .lean();
  res.json({ success: true, data: items.map(accessView) });
};

// POST { identifier (email yoki username), login?, password?, expiresAt?, note? }
const createAccess = async (req, res) => {
  const identifier = str(req.body?.identifier, 200)?.toLowerCase();
  if (!identifier) return bad(res, 'Foydalanuvchi email yoki username kiriting.');

  const user = await User.findOne({ $or: [{ email: identifier }, { username: identifier }] })
    .collation({ locale: 'en', strength: 2 })
    .select('username email');
  if (!user) return res.status(404).json({ success: false, message: "Bunday ro'yxatdan o'tgan foydalanuvchi topilmadi." });
  if (await MetodikaAccess.exists({ user: user._id })) {
    return res.status(409).json({ success: false, message: 'Bu foydalanuvchiga ruxsat allaqachon berilgan.' });
  }

  const login = (str(req.body?.login, 40) || `m-${crypto.randomBytes(4).toString('hex')}`).toLowerCase();
  if (!/^[a-z0-9._-]{4,40}$/.test(login)) return bad(res, "Login 4–40 belgi: lotin harf, raqam, nuqta, '-' yoki '_'.");
  if (await MetodikaAccess.exists({ login })) return res.status(409).json({ success: false, message: 'Bu login band.' });

  const supplied = typeof req.body?.password === 'string' ? req.body.password : '';
  if (supplied && (supplied.length < 10 || supplied.length > 128)) return bad(res, "Parol 10–128 belgi bo'lishi kerak.");
  const password = supplied || generatePassword();

  const expiresAt = parseExpiry(req.body?.expiresAt);
  const created = await MetodikaAccess.create({
    user: user._id,
    login,
    passwordHash: await bcrypt.hash(password, BCRYPT_COST),
    expiresAt: expiresAt === undefined ? null : expiresAt,
    note: str(req.body?.note, 300) || '',
    createdBy: req.user._id,
  });

  audit(req, 'access_granted', `${user.username} (${login})`);
  // Parol faqat SHU javobda bir marta ko'rsatiladi — DB'da faqat hash turadi.
  res.status(201).json({
    success: true,
    data: { ...accessView(created.toObject()), user: { _id: user._id, username: user.username, email: user.email }, password },
  });
};

// PATCH { isActive?, expiresAt?, note?, resetPassword?: true, password? }
const updateAccess = async (req, res) => {
  const access = await MetodikaAccess.findById(req.params.id).populate('user', 'username email');
  if (!access) return notFound(res);

  let newPassword = null;
  if (typeof req.body?.isActive === 'boolean' && req.body.isActive !== access.isActive) {
    access.isActive = req.body.isActive;
    access.sessionVersion += 1;
  }
  const expiresAt = parseExpiry(req.body?.expiresAt);
  if (expiresAt !== undefined) access.expiresAt = expiresAt;
  const note = str(req.body?.note, 300);
  if (note !== undefined) access.note = note;

  if (req.body?.resetPassword === true || typeof req.body?.password === 'string') {
    const supplied = typeof req.body.password === 'string' ? req.body.password : '';
    if (supplied && (supplied.length < 10 || supplied.length > 128)) return bad(res, "Parol 10–128 belgi bo'lishi kerak.");
    newPassword = supplied || generatePassword();
    access.passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);
    access.sessionVersion += 1;
    access.failedAttempts = 0;
    access.lockUntil = null;
  }

  await access.save();
  audit(req, 'access_updated', `${access.user?.username || access.login}`);
  res.json({ success: true, data: { ...accessView(access.toObject()), ...(newPassword ? { password: newPassword } : {}) } });
};

const deleteAccess = async (req, res) => {
  const deleted = await MetodikaAccess.findByIdAndDelete(req.params.id);
  if (!deleted) return notFound(res);
  audit(req, 'access_revoked', deleted.login);
  res.json({ success: true });
};

// ─── Jurnal ─────────────────────────────────────────────────────────────────

const listAudit = async (req, res) => {
  const filter = {};
  if (isId(req.query.user)) filter.user = req.query.user;
  if (typeof req.query.action === 'string' && MetodikaAuditLog.ACTIONS.includes(req.query.action)) {
    filter.action = req.query.action;
  }
  const items = await MetodikaAuditLog.find(filter)
    .populate('user', 'username email')
    .sort({ createdAt: -1 })
    .limit(300)
    .lean();
  res.json({ success: true, data: items });
};

module.exports = {
  createModule, updateModule, deleteModule,
  createLesson, updateLesson, deleteLesson,
  uploadLessonImages, deleteLessonImage,
  createPage, updatePage, deletePage,
  listAccess, createAccess, updateAccess, deleteAccess,
  listAudit,
  sniffImage,
};

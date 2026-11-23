const express = require('express');
const multer = require('multer');

const router = express.Router();
const { authenticate, requireAdmin } = require('../middleware/auth');
const validateObjectId = require('../middleware/validateObjectId');
const { requireMetodikaAccess, requireMetodikaOwner } = require('../middleware/metodikaAccess');
const {
  metodikaUnlockLimiter,
  metodikaReadLimiter,
  metodikaAssetLimiter,
  metodikaEventLimiter,
  metodikaAdminLimiter,
} = require('../middleware/rateLimiter');
const reader = require('../controllers/metodikaController');
const admin = require('../controllers/metodikaAdminController');

/**
 * @swagger
 * tags:
 *   - name: Metodika
 *     description: Maxfiy kurs metodikasi. Sayt akkaunti + alohida metodika login/paroli (httpOnly sessiya) talab qilinadi.
 *
 * /api/metodika/session:
 *   get:
 *     tags: [Metodika]
 *     summary: Joriy foydalanuvchi uchun metodika holati (egasi / ochilgan / yopiq)
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: OK } }
 * /api/metodika/unlock:
 *   post:
 *     tags: [Metodika]
 *     summary: Metodika login/paroli bilan 2 soatlik sessiya ochish
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object, required: [login, password], properties: { login: { type: string }, password: { type: string } } }
 *     responses: { 200: { description: Ochildi }, 403: { description: "Noto'g'ri ma'lumot yoki vaqtincha bloklangan" } }
 * /api/metodika/outline:
 *   get:
 *     tags: [Metodika]
 *     summary: Modullar, dars sarlavhalari va sahifalar ro'yxati
 *     security: [{ bearerAuth: [] }]
 *     responses: { 200: { description: OK }, 403: { description: Metodika yopiq } }
 * /api/metodika/lessons/{id}:
 *   get:
 *     tags: [Metodika]
 *     summary: Bitta darsning to'liq kartasi
 *     security: [{ bearerAuth: [] }]
 *     parameters: [{ in: path, name: id, required: true, schema: { type: string } }]
 *     responses: { 200: { description: OK }, 404: { description: Topilmadi } }
 * /api/metodika/admin/lessons:
 *   post:
 *     tags: [Metodika]
 *     summary: Dars yaratish (faqat metodika egasi). PATCH/PUT/DELETE /admin/lessons/{id} ham mavjud; modules, pages, access uchun ham xuddi shunday CRUD.
 *     security: [{ bearerAuth: [] }]
 *     responses: { 201: { description: Yaratildi }, 403: { description: Faqat egasi } }
 */

router.use((req, res, next) => {
  res.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  next();
});
router.use(authenticate);

// ─── Kirish ────────────────────────────────────────────────────────────────
router.get('/session', reader.getSession);
router.post('/unlock', metodikaUnlockLimiter, reader.unlock);
router.post('/lock', reader.lock);

// ─── O'qish (ruxsat bilan) ─────────────────────────────────────────────────
router.get('/outline', metodikaReadLimiter, requireMetodikaAccess, reader.getOutline);
router.get('/lessons/:id', validateObjectId('id'), metodikaReadLimiter, requireMetodikaAccess, reader.getLesson);
router.get('/pages/:id', validateObjectId('id'), metodikaReadLimiter, requireMetodikaAccess, reader.getPage);
router.get('/assets/:id', validateObjectId('id'), metodikaAssetLimiter, requireMetodikaAccess, reader.getAsset);
router.post('/events', metodikaEventLimiter, requireMetodikaAccess, reader.reportEvent);

// ─── Boshqaruv (faqat egasi) ───────────────────────────────────────────────
const owner = express.Router();
owner.use(requireAdmin, requireMetodikaOwner, metodikaAdminLimiter);

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024, files: 6 },
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) return cb(null, true);
    return cb(new Error('Faqat JPG, PNG, WEBP formatlar qabul qilinadi'), false);
  },
});

// "update" uchun PATCH ham, PUT ham bir xil handler'ga boradi.
const update = (path, ...handlers) => {
  owner.patch(path, ...handlers);
  owner.put(path, ...handlers);
};

owner.post('/modules', admin.createModule);
update('/modules/:id', validateObjectId('id'), admin.updateModule);
owner.delete('/modules/:id', validateObjectId('id'), admin.deleteModule);

owner.post('/lessons', admin.createLesson);
update('/lessons/:id', validateObjectId('id'), admin.updateLesson);
owner.delete('/lessons/:id', validateObjectId('id'), admin.deleteLesson);
owner.post('/lessons/:id/images', validateObjectId('id'), imageUpload.array('images', 6), admin.uploadLessonImages);
owner.delete('/lessons/:id/images/:imageId', validateObjectId('id'), validateObjectId('imageId'), admin.deleteLessonImage);

owner.post('/pages', admin.createPage);
update('/pages/:id', validateObjectId('id'), admin.updatePage);
owner.delete('/pages/:id', validateObjectId('id'), admin.deletePage);

owner.get('/access', admin.listAccess);
owner.post('/access', admin.createAccess);
update('/access/:id', validateObjectId('id'), admin.updateAccess);
owner.delete('/access/:id', validateObjectId('id'), admin.deleteAccess);

owner.get('/audit', admin.listAudit);

router.use('/admin', owner);

module.exports = router;

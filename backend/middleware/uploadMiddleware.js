const multer = require('multer');
const crypto = require('crypto');
const { put } = require('@vercel/blob');

// Vercel Blob — Cloudinary o'rniga (2026-07-04). Sabab: Cloudinary O'zbekistonda
// ro'yxatdan o'tkazmaydi ("services not available in your country"). Fayl multer
// memory storage'ga tushadi, controller putToBlob() bilan Blob'ga yuklaydi.
// Rasm o'lchamlash frontend'da next/image orqali bo'ladi (AVIF/WebP + resize),
// shuning uchun server-side transform shart emas.

// Boot-time visibility — missing token would otherwise only surface as an
// opaque 500 the first time a user tries to upload a file. Logging here makes
// the misconfiguration obvious in Railway logs at startup.
if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.warn('⚠️  BLOB_READ_WRITE_TOKEN missing — avatar/thumbnail uploads will fail.');
  console.warn('   Vercel dashboard → Storage → Blob store → token, so\'ng Railway env\'ga qo\'ying.');
}

const EXT_BY_MIME = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const fileFilter = (req, file, cb) => {
  if (EXT_BY_MIME[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new Error('Faqat JPG, PNG, WEBP formatlar qabul qilinadi'), false);
  }
};

const memory = multer.memoryStorage();
const uploadAvatar    = multer({ storage: memory, fileFilter, limits: { fileSize: 2 * 1024 * 1024 } });
const uploadThumbnail = multer({ storage: memory, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

/**
 * Multer memory faylini Vercel Blob'ga yuklaydi va public URL qaytaradi.
 * Fayl nomi tasodifiy (UUID) — foydalanuvchi nomidan path traversal yo'q,
 * eski avatar ustiga yozilmaydi (cache-safe).
 * @param {Express.Multer.File} file
 * @param {'avatars'|'thumbnails'} folder
 * @returns {Promise<string>} public URL
 */
const putToBlob = async (file, folder) => {
  const ext = EXT_BY_MIME[file.mimetype] || 'bin';
  const key = `aidevix/${folder}/${crypto.randomUUID()}.${ext}`;
  const blob = await put(key, file.buffer, {
    access: 'public',
    contentType: file.mimetype,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  return blob.url;
};

module.exports = { uploadAvatar, uploadThumbnail, putToBlob };

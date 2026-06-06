const axios = require('axios');
const crypto = require('crypto');

const BUNNY_API_BASE = 'https://video.bunnycdn.com';

// ─── Helpers ────────────────────────────────────────────────────────────────

const libraryHeaders = () => ({
  AccessKey: process.env.BUNNY_STREAM_API_KEY,
  'Content-Type': 'application/json',
});

// ─── Video CRUD ─────────────────────────────────────────────────────────────

/**
 * Bunny Stream da yangi video slot yaratadi.
 * @returns {{ guid, title, status, ... }} — bunnyVideoId = guid
 */
const createBunnyVideo = async (title) => {
  const res = await axios.post(
    `${BUNNY_API_BASE}/library/${process.env.BUNNY_LIBRARY_ID}/videos`,
    { title },
    { headers: libraryHeaders() }
  );
  return res.data;
};

/**
 * Bunny Stream dan video o'chiradi.
 */
const deleteBunnyVideo = async (bunnyVideoId) => {
  await axios.delete(
    `${BUNNY_API_BASE}/library/${process.env.BUNNY_LIBRARY_ID}/videos/${bunnyVideoId}`,
    { headers: { AccessKey: process.env.BUNNY_STREAM_API_KEY } }
  );
};

/**
 * Bunny Stream dan video holati va ma'lumotlarini oladi.
 *
 * Status kodlari:
 *  0 = Navbatda (Queued)
 *  1 = Ishlanmoqda (Processing)
 *  2 = Kodlanmoqda (Encoding)
 *  3 = Muvaffaqiyatsiz (Failed)
 *  4 = Tayyor (Finished) ✅
 *  5 = Xato (Error)
 */
const getBunnyVideoInfo = async (bunnyVideoId) => {
  const res = await axios.get(
    `${BUNNY_API_BASE}/library/${process.env.BUNNY_LIBRARY_ID}/videos/${bunnyVideoId}`,
    { headers: { AccessKey: process.env.BUNNY_STREAM_API_KEY } }
  );
  return res.data;
};

// ─── Signed Embed URL ────────────────────────────────────────────────────────

/**
 * Bunny Stream uchun muddatli (signed) embed URL yaratadi.
 *
 * Token formula (Bunny Stream Token Authentication):
 *   token = SHA256(BUNNY_TOKEN_KEY + videoId + expiresAt) → hex
 *   URL   = https://iframe.mediadelivery.net/embed/{libraryId}/{videoId}
 *           ?token={token}&expires={expiresAt}
 *
 * @param {string} bunnyVideoId  - Bunny video GUID
 * @param {number} [expiresInSeconds=7200] - Muddati (default: 2 soat)
 * @returns {{ embedUrl: string, expiresAt: Date }}
 */
const generateSignedEmbedUrl = (bunnyVideoId, expiresInSeconds = 7200) => {
  if (!process.env.BUNNY_TOKEN_KEY) {
    throw new Error('BUNNY_TOKEN_KEY not configured');
  }
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;

  const token = crypto
    .createHash('sha256')
    .update(process.env.BUNNY_TOKEN_KEY + bunnyVideoId + expiresAt)
    .digest('hex');

  const embedUrl = [
    `https://iframe.mediadelivery.net/embed/${process.env.BUNNY_LIBRARY_ID}/${bunnyVideoId}`,
    `?token=${token}`,
    `&expires=${expiresAt}`,
    `&autoplay=false`,
    `&responsive=true`,
    `&captions=false`,
  ].join('');

  return {
    embedUrl,
    expiresAt: new Date(expiresAt * 1000),
  };
};

// ─── Upload Credentials ──────────────────────────────────────────────────────

/**
 * Admin panel uchun to'g'ridan-to'g'ri upload ma'lumotlarini qaytaradi.
 * Admin frontend shu URL ga PUT so'rov yuboradi (video binary).
 *
 * @returns {{ uploadUrl: string, method: string, headers: Object }}
 */
const getUploadCredentials = (bunnyVideoId) => ({
  uploadUrl: `${BUNNY_API_BASE}/library/${process.env.BUNNY_LIBRARY_ID}/videos/${bunnyVideoId}`,
  method: 'PUT',
  headers: {
    AccessKey: process.env.BUNNY_STREAM_API_KEY,
    'Content-Type': 'application/octet-stream',
  },
});

/**
 * Video binary'ni backend orqali Bunny'ga oqizadi (server-side proxy).
 * AccessKey FRONTENDGA chiqmaydi — backend'da qoladi (INT-001 fix).
 * @param {string} bunnyVideoId
 * @param {import('stream').Readable} sourceStream  Express req (octet-stream)
 * @param {string|number} [contentLength]
 */
const streamUploadToBunny = async (bunnyVideoId, sourceStream, contentLength) => {
  if (!process.env.BUNNY_STREAM_API_KEY) throw new Error('BUNNY_STREAM_API_KEY not configured');
  const url = `${BUNNY_API_BASE}/library/${process.env.BUNNY_LIBRARY_ID}/videos/${bunnyVideoId}`;
  const headers = {
    AccessKey: process.env.BUNNY_STREAM_API_KEY,
    'Content-Type': 'application/octet-stream',
  };
  if (contentLength) headers['Content-Length'] = contentLength;
  const { data } = await axios.put(url, sourceStream, {
    headers,
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    timeout: 0, // katta fayllar uchun timeout yo'q
  });
  return data;
};

// ─── Status helper ───────────────────────────────────────────────────────────

const BUNNY_STATUS = {
  0: 'queued',
  1: 'processing',
  2: 'encoding',
  3: 'failed',
  4: 'ready',
  5: 'error',
};

const parseBunnyStatus = (statusCode) => BUNNY_STATUS[statusCode] ?? 'unknown';

module.exports = {
  createBunnyVideo,
  deleteBunnyVideo,
  getBunnyVideoInfo,
  generateSignedEmbedUrl,
  getUploadCredentials,
  streamUploadToBunny,
  parseBunnyStatus,
};

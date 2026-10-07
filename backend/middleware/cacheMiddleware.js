const { getRedisClient } = require('../config/redis');

// ADM-09 / P-B09: kesh kaliti faqat ma'lum query parametrlardan (tartiblangan) quriladi —
// ixtiyoriy "?junk=123" parametrlari yangi kalit yaratib keshni chetlab o'tolmaydi.
const DEFAULT_ALLOWED_PARAMS = ['category', 'search', 'level', 'sort', 'page', 'limit', 'isFree', 'q'];
const MAX_KEY_LENGTH = 512;

const buildCacheKey = (req, allowedParams = DEFAULT_ALLOWED_PARAMS) => {
  const query = req.query || {};
  const parts = allowedParams
    .filter((name) => query[name] !== undefined)
    .sort()
    .map((name) => {
      const value = query[name];
      const str = typeof value === 'string' ? value : JSON.stringify(value);
      return `${encodeURIComponent(name)}=${encodeURIComponent(str)}`;
    });
  const path = `${req.baseUrl || ''}${req.path || ''}`.replace(/\/+$/, '') || '/';
  return `cache:${path}${parts.length ? `?${parts.join('&')}` : ''}`;
};

/**
 * Express middleware to cache responses in Redis.
 * @param {number} durationInSeconds - How long to cache the response
 * @param {{ allowedParams?: string[] }} [options]
 */
const cacheMiddleware = (durationInSeconds = 300, options = {}) => {
  const allowedParams = options.allowedParams || DEFAULT_ALLOWED_PARAMS;
  return async (req, res, next) => {
    // Fagat GET so'rovlarni keshlaymiz
    if (req.method !== 'GET') {
      return next();
    }

    const redisClient = getRedisClient();

    // Agar Redis ulanmagan bo'lsa (dev/local), keshlamay o'tkazib yuborish.
    // X-Cache: BYPASS — production'da Redis yo'qligini header orqali aniqlash mumkin.
    if (!redisClient) {
      res.setHeader('X-Cache', 'BYPASS');
      return next();
    }

    const key = buildCacheKey(req, allowedParams);
    // Juda uzun kalit (masalan, katta search) — keshlanmaydi (Redis xotirasini himoya qilish)
    if (key.length > MAX_KEY_LENGTH) {
      res.setHeader('X-Cache', 'BYPASS');
      return next();
    }

    try {
      // 1. Keshdan o'qishga urinish
      const cachedData = await redisClient.get(key);
      if (cachedData) {
        // Saqlangan JSON matni qayta parse/serialize qilinmasdan yuboriladi
        res.setHeader('X-Cache', 'HIT');
        return res.type('json').send(cachedData);
      }

      // 2. Agar kesh yo'q bo'lsa, `res.json` funksiyasini ushlab qolamiz (intercept)
      res.setHeader('X-Cache', 'MISS');
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        // Faqat muvaffaqiyatli javoblarni keshlaymiz
        if (res.statusCode >= 200 && res.statusCode < 300 && body && body.success) {
          redisClient.set(key, JSON.stringify(body), 'EX', durationInSeconds).catch(err => {
            console.error('Redis kesh yozishda xato:', err.message);
          });
        }
        return originalJson(body);
      };

      next();
    } catch (err) {
      console.error('Redis kesh xatosi:', err.message);
      res.setHeader('X-Cache', 'BYPASS');
      next(); // Xato ketsa, dastur to'xtab qolmasligi uchun keyingi middleware'ga o'tish
    }
  };
};

/**
 * P-B09: berilgan prefiks bo'yicha kesh kalitlarini o'chirish (SCAN + UNLINK, KEYS emas).
 * @param {string} prefix - masalan 'cache:/api/courses'
 */
const invalidateCache = async (prefix) => {
  const redisClient = getRedisClient();
  if (!redisClient) return 0;
  let cursor = '0';
  let removed = 0;
  try {
    do {
      const [next, keys] = await redisClient.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 200);
      cursor = next;
      if (keys.length) {
        removed += await redisClient.unlink(...keys);
      }
    } while (cursor !== '0');
  } catch (err) {
    console.error('Redis kesh tozalashda xato:', err.message);
  }
  return removed;
};

/**
 * Mutatsiya (POST/PUT/DELETE) muvaffaqiyatli bo'lsa, javobdan keyin keshni tozalaydi.
 * @param {string} prefix
 */
const invalidateCacheOnSuccess = (prefix) => (req, res, next) => {
  res.on('finish', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      invalidateCache(prefix).catch(() => {});
    }
  });
  next();
};

module.exports = cacheMiddleware;
module.exports.cacheMiddleware = cacheMiddleware;
module.exports.buildCacheKey = buildCacheKey;
module.exports.invalidateCache = invalidateCache;
module.exports.invalidateCacheOnSuccess = invalidateCacheOnSuccess;

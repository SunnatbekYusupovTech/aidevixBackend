const { getRedisClient } = require('../config/redis');

/**
 * Express middleware to cache responses in Redis.
 * @param {number} durationInSeconds - How long to cache the response
 */
const cacheMiddleware = (durationInSeconds = 300) => {
  return async (req, res, next) => {
    // Fagat GET so'rovlarni keshlaymiz
    if (req.method !== 'GET') {
      return next();
    }

    const redisClient = getRedisClient();
    
    // Agar Redis ulanmagan bo'lsa (dev/local), keshlamay o'tkazib yuborish
    if (!redisClient) {
      return next();
    }

    // Har bir route va query bo'yicha unikal kalit (URL + Query)
    const key = `cache:${req.originalUrl || req.url}`;

    try {
      // 1. Keshdan o'qishga urinish
      const cachedData = await redisClient.get(key);
      if (cachedData) {
        // Agar kesh topilsa, sarlavha qo'shamiz va javob qaytaramiz
        res.setHeader('X-Cache', 'HIT');
        return res.json(JSON.parse(cachedData));
      }

      // 2. Agar kesh yo'q bo'lsa, `res.json` funksiyasini ushlab qolamiz (intercept)
      const originalJson = res.json.bind(res);
      res.json = (body) => {
        // Faqat muvaffaqiyatli javoblarni keshlaymiz
        if (res.statusCode >= 200 && res.statusCode < 300 && body.success) {
          redisClient.set(key, JSON.stringify(body), 'EX', durationInSeconds).catch(err => {
            console.error('Redis kesh yozishda xato:', err.message);
          });
        }
        res.setHeader('X-Cache', 'MISS');
        return originalJson(body);
      };

      next();
    } catch (err) {
      console.error('Redis kesh xatosi:', err.message);
      next(); // Xato ketsa, dastur to'xtab qolmasligi uchun keyingi middleware'ga o'tish
    }
  };
};

module.exports = cacheMiddleware;

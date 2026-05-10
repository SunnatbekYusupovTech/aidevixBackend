/**
 * In-memory subscription cache (TTL: 5 daqiqa)
 *
 * Har video loadda Telegram API ga so'rov yuborilishining oldini oladi.
 * Railway single-instance uchun Map yetarli. Multi-instance kerak bo'lsa — Redis.
 *
 * Cache invalidatsiyasi:
 *   - Foydalanuvchi obunadan chiqib verifyTelegram/verifyInstagram qayta chaqirsa
 *   - subscriptionController da invalidateSubscriptionCache(userId) chaqiriladi
 */

const TTL_MS = 5 * 60 * 1000; // 5 daqiqa
const MAX_ENTRIES = 50000;    // unbounded growth himoyasi (DoS preventsiyasi)

/** @type {Map<string, {data: object, expiresAt: number}>} */
const store = new Map();

// Eski yozuvlarni tozalash (memory leak oldini olish) — har 10 daqiqada
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.expiresAt) store.delete(key);
  }
  // Hali ham juda katta bo'lsa, eng eski 20% ni o'chiramiz
  if (store.size > MAX_ENTRIES) {
    const overflow = store.size - Math.floor(MAX_ENTRIES * 0.8);
    const keysIter = store.keys();
    for (let i = 0; i < overflow; i++) {
      const k = keysIter.next().value;
      if (k === undefined) break;
      store.delete(k);
    }
  }
}, 10 * 60 * 1000);
// Test environment'da Jest open handle qoldirmasligi uchun unref
if (cleanupInterval.unref) cleanupInterval.unref();

/**
 * @param {string|object} userId
 * @returns {{instagramSubscribed: boolean, telegramSubscribed: boolean}|null}
 */
const get = (userId) => {
  const key   = userId.toString();
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.data;
};

/**
 * @param {string|object} userId
 * @param {{instagramSubscribed: boolean, telegramSubscribed: boolean}} data
 */
const set = (userId, data) => {
  // Hot-path overflow guard — interval'gacha kutmasdan eng eski yozuvni o'chiramiz
  if (store.size >= MAX_ENTRIES) {
    const firstKey = store.keys().next().value;
    if (firstKey !== undefined) store.delete(firstKey);
  }
  store.set(userId.toString(), {
    data,
    expiresAt: Date.now() + TTL_MS,
  });
};

/** Foydalanuvchi obuna holatini o'zgartirganida cache ni tozalash */
const invalidate = (userId) => {
  store.delete(userId.toString());
};

module.exports = { get, set, invalidate };

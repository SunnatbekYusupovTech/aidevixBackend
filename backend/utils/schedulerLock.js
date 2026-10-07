// Distributed scheduler lock (P-B04).
// Bir nechta instance (replika yoki deploy overlap) bir xil cron ishini ikki marta
// bajarmasligi uchun: Redis `SET key value NX PX ttl`. Kalit job nomi + davr (sana/hafta)
// bo'yicha — lock run tugagandan keyin ham TTL davomida saqlanadi, shuning uchun shu
// davrda boshqa instance (yoki restart'dan keyingi o'zi) qayta ishga tushirmaydi.
//
// REDIS_URL yo'q bo'lsa — single-instance deb hisoblanadi va ish bajariladi (bir marta log).
const crypto = require('crypto');
const { getRedisClient } = require('../config/redis');

const PREFIX = 'lock:job:';
let warnedNoRedis = false;

/**
 * @param {string} key   masalan `weeklyReset:2026-W41`
 * @param {number} ttlMs lock muddati (davr uzunligidan uzunroq bo'lmasin)
 * @returns {Promise<boolean>} true → shu instance ishni bajarishi kerak
 */
const acquireLock = async (key, ttlMs) => {
  const redis = getRedisClient();
  if (!redis) {
    if (!warnedNoRedis) {
      console.warn('⚠️  schedulerLock: REDIS_URL yo\'q — single-instance rejimi (distributed lock o\'chiq)');
      warnedNoRedis = true;
    }
    return true;
  }
  try {
    const token = `${process.pid}:${crypto.randomBytes(6).toString('hex')}`;
    const res = await redis.set(PREFIX + key, token, 'PX', Math.max(1000, Math.floor(ttlMs)), 'NX');
    return res === 'OK';
  } catch (err) {
    // Redis vaqtincha ishlamasa — dublikat xavfidan ko'ra o'tkazib yuborish xavfsizroq
    console.error(`⚠️  schedulerLock: ${key} lock olinmadi (${err.message}) — run o'tkazib yuborildi`);
    return false;
  }
};

/**
 * Lock olinsa `fn` ni bajaradi. Xatolar yutilmaydi — chaqiruvchiga qaytariladi.
 * @returns {Promise<{ran: boolean, result?: any}>}
 */
const runWithLock = async (key, ttlMs, fn) => {
  const ok = await acquireLock(key, ttlMs);
  if (!ok) {
    console.log(`⏭️  schedulerLock: ${key} boshqa instance'da bajarilgan/bajarilmoqda — skip`);
    return { ran: false };
  }
  const result = await fn();
  return { ran: true, result };
};

// Ichki run funksiyasi eksport qilinmagan schedulerlar (claudeTips) uchun: instance
// darajasidagi leader lock. Olingan lock har ttl/3 da yangilanadi; instance o'lsa TTL
// tugagach bo'shaydi (keyingi restart'da boshqa instance oladi).
const RENEW_LUA =
  "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('pexpire', KEYS[1], ARGV[2]) else return 0 end";

const acquireLeadership = async (name, ttlMs = 60_000) => {
  const redis = getRedisClient();
  if (!redis) return acquireLock(`leader:${name}`, ttlMs); // single-instance → true
  const key = `${PREFIX}leader:${name}`;
  const token = `${process.pid}:${crypto.randomBytes(6).toString('hex')}`;
  try {
    const res = await redis.set(key, token, 'PX', ttlMs, 'NX');
    if (res !== 'OK') return false;
  } catch (err) {
    console.error(`⚠️  schedulerLock: leader:${name} olinmadi (${err.message})`);
    return false;
  }
  const timer = setInterval(() => {
    redis.eval(RENEW_LUA, 1, key, token, ttlMs)
      .then((ok) => { if (!ok) console.warn(`⚠️  schedulerLock: leader:${name} yo'qotildi`); })
      .catch(() => {});
  }, Math.max(1000, Math.floor(ttlMs / 3)));
  if (timer.unref) timer.unref();
  return true;
};

// Toshkent bo'yicha YYYY-MM-DD (davr kaliti uchun)
const tashkentDateKey = (d = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tashkent' }).format(d);

module.exports = { acquireLock, runWithLock, acquireLeadership, tashkentDateKey };

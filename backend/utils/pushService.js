const webpush = require('web-push');
const PushSubscription = require('../models/PushSubscription');

/**
 * pushService — Web Push (VAPID) yuborish qatlami.
 *
 * VAPID env yo'q bo'lsa: bir marta warning log qilinadi va sendPush no-op bo'ladi.
 * Bu prod'da kalit sozlanmagan bo'lsa ham serverni yiqilishdan saqlaydi.
 */

let configured = false;
let warnedMissing = false;

(function initVapid() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:noreply@aidevix.uz';

  if (!publicKey || !privateKey) {
    if (!warnedMissing) {
      console.warn('[pushService] VAPID kalitlari topilmadi (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY). Web Push o\'chirilgan.');
      warnedMissing = true;
    }
    return;
  }

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
  } catch (err) {
    console.warn('[pushService] VAPID sozlashda xato — Web Push o\'chirilgan.');
    configured = false;
  }
})();

const isPushConfigured = () => configured;

// COM-10: blind SSRF himoyasi — faqat ma'lum push servislariga (https) yuboriladi
const PUSH_HOST_EXACT = new Set([
  'fcm.googleapis.com',
  'updates.push.services.mozilla.com',
  'web.push.apple.com',
]);
const PUSH_HOST_SUFFIXES = ['.notify.windows.com', '.push.apple.com'];
const MAX_ENDPOINT_LENGTH = 2048;

const isAllowedPushEndpoint = (endpoint) => {
  if (typeof endpoint !== 'string' || !endpoint || endpoint.length > MAX_ENDPOINT_LENGTH) return false;
  let u;
  try {
    u = new URL(endpoint);
  } catch {
    return false;
  }
  if (u.protocol !== 'https:' || u.username || u.password) return false;
  if (u.port && u.port !== '443') return false;
  const host = u.hostname.toLowerCase();
  return PUSH_HOST_EXACT.has(host) || PUSH_HOST_SUFFIXES.some((s) => host.endsWith(s));
};

const SEND_CONCURRENCY = 5;
const MAX_SUBS_PER_USER = 10;
const SEND_TIMEOUT_MS = 10000;

/**
 * sendPushToUser — bitta user'ning barcha qurilmalariga push yuboradi.
 * @param {string|ObjectId} userId
 * @param {{title:string, body:string, url?:string, tag?:string}} payload
 * @returns {Promise<boolean>} kamida bitta yuborilgan bo'lsa true
 */
const sendPushToUser = async (userId, payload) => {
  if (!configured) return false;

  let subs;
  try {
    subs = await PushSubscription.find({ userId }).sort({ createdAt: -1 }).limit(MAX_SUBS_PER_USER).lean();
  } catch (err) {
    return false;
  }

  if (!subs || subs.length === 0) return false;

  const body = JSON.stringify({
    title: payload?.title || 'Aidevix',
    body: payload?.body || '',
    url: payload?.url || '/',
    tag: payload?.tag || 'aidevix',
  });

  let anySent = false;

  const sendOne = async (sub) => {
    // COM-10: tuzatishdan oldin saqlangan ruxsatsiz endpoint'larga ham so'rov yuborilmaydi
    if (!isAllowedPushEndpoint(sub.endpoint)) return;
    const subscription = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    };
    try {
      await webpush.sendNotification(subscription, body, { timeout: SEND_TIMEOUT_MS });
      anySent = true;
    } catch (err) {
      const statusCode = err && err.statusCode;
      // 404/410 — endpoint o'lgan (unsubscribe/expired) → tozalaymiz
      if (statusCode === 404 || statusCode === 410) {
        await PushSubscription.deleteOne({ endpoint: sub.endpoint }).catch(() => {});
      }
    }
  };

  // COM-10: cheklangan parallellik (bir user'ning ko'p obunasi bir vaqtda portlamasin)
  for (let i = 0; i < subs.length; i += SEND_CONCURRENCY) {
    await Promise.all(subs.slice(i, i + SEND_CONCURRENCY).map(sendOne));
  }

  return anySent;
};

module.exports = { sendPushToUser, isPushConfigured, isAllowedPushEndpoint, MAX_SUBS_PER_USER };

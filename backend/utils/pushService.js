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
    subs = await PushSubscription.find({ userId });
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

  await Promise.all(
    subs.map(async (sub) => {
      const subscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
      };
      try {
        await webpush.sendNotification(subscription, body);
        anySent = true;
      } catch (err) {
        const statusCode = err && err.statusCode;
        // 404/410 — endpoint o'lgan (unsubscribe/expired) → tozalaymiz
        if (statusCode === 404 || statusCode === 410) {
          await PushSubscription.deleteOne({ endpoint: sub.endpoint }).catch(() => {});
        }
      }
    })
  );

  return anySent;
};

module.exports = { sendPushToUser, isPushConfigured };

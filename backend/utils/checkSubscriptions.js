const {
  checkInstagramSubscriptionRealTime,
  checkTelegramSubscription,
} = require('./socialVerification');
const cache = require('./subscriptionCache');

/**
 * Perform real-time subscription check for a user.
 * Cache TTL: 5 daqiqa (Telegram API call takrorlanmaydi).
 * Falls back to stored DB value for Instagram when INSTAGRAM_ACCESS_TOKEN not configured.
 * @param {Object} user - Mongoose User document
 * @returns {{ instagramSubscribed: boolean, telegramSubscribed: boolean, changed: boolean }}
 */
const performSubscriptionCheck = async (user) => {
  // Cache hit — Telegram API ga so'rov yubormasdan qaytarish
  const cached = cache.get(user._id);
  if (cached) {
    return { ...cached, changed: false };
  }
  let instagramSubscribed = false;
  let telegramSubscribed = false;
  let changed = false;

  // Instagram: fall back to DB value when API token not configured
  if (user.socialSubscriptions.instagram.username) {
    if (process.env.INSTAGRAM_ACCESS_TOKEN) {
      instagramSubscribed = await checkInstagramSubscriptionRealTime(
        user.socialSubscriptions.instagram.username,
        user._id
      );
    } else {
      instagramSubscribed = user.socialSubscriptions.instagram.subscribed;
    }

    if (user.socialSubscriptions.instagram.subscribed !== instagramSubscribed) {
      user.socialSubscriptions.instagram.subscribed = instagramSubscribed;
      user.socialSubscriptions.instagram.verifiedAt = instagramSubscribed ? new Date() : null;
      changed = true;
    }
  }

  // Telegram: public kanalni real-time tekshirish
  if (user.socialSubscriptions.telegram.username) {
    // Faqat isbotlangan (bot / initData orqali bog'langan) Telegram ID'ga ishoniladi
    const telegramUserId = user.telegramUserId || null;

    if (telegramUserId) {
      const result = await checkTelegramSubscription(telegramUserId);
      if (result.checked) {
        // API muvaffaqiyatli javob berdi — natija ishonchli
        telegramSubscribed = result.subscribed;
      } else {
        // API xato bo'lsa DB qiymatini saqlaymiz (foydalanuvchini nohaq bloklash emas)
        console.error('Telegram real-time check failed, using DB fallback');
        telegramSubscribed = user.socialSubscriptions.telegram.subscribed;
      }
    } else {
      telegramSubscribed = user.socialSubscriptions.telegram.subscribed;
    }

    if (user.socialSubscriptions.telegram.subscribed !== telegramSubscribed) {
      user.socialSubscriptions.telegram.subscribed = telegramSubscribed;
      user.socialSubscriptions.telegram.verifiedAt = telegramSubscribed ? new Date() : null;
      changed = true;
    }
  } else {
    telegramSubscribed = user.socialSubscriptions.telegram.subscribed;
  }

  // Cache ga saqlash (keyingi 5 daqiqa uchun)
  cache.set(user._id, { instagramSubscribed, telegramSubscribed });

  return { instagramSubscribed, telegramSubscribed, changed };
};

module.exports = { performSubscriptionCheck };

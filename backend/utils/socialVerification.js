const axios = require('axios');

// ─── Telegram Bot API bilan ishlash uchun yordamchi ───────────────────────────

const VALID_MEMBER_STATUSES = ['member', 'administrator', 'creator'];

/**
 * Telegram Bot API orqali foydalanuvchi kanalda a'zo ekanligini tekshiradi.
 * @param {string} botToken
 * @param {string} chatId   — "@username" yoki numeric "-100..."
 * @param {string|number} userId
 * @returns {Promise<{isMember: boolean, status: string|null}>}
 */
/**
 * Telegram `getChatMember` — HTTP 200 bo‘lsa ham `ok:false` qaytishi mumkin (Bot API qoidasi).
 * 429 uchun qisqa retry (rate limit — GDPR / xavfsizlik monitoringida ham tavsiya etiladi).
 */
const getChatMemberStatus = async (botToken, chatId, userId) => {
  const url = `https://api.telegram.org/bot${botToken}/getChatMember`;

  const fetchOnce = async () => {
    const { data } = await axios.get(url, {
      params: { chat_id: chatId, user_id: userId },
      timeout: 12000,
      validateStatus: () => true,
    });
    return data;
  };

  let data = await fetchOnce();
  if (data?.error_code === 429 && data?.parameters?.retry_after) {
    const wait = Math.min(10, Number(data.parameters.retry_after) || 3) * 1000;
    await new Promise((r) => setTimeout(r, wait));
    data = await fetchOnce();
  } else if (data?.error_code === 429) {
    await new Promise((r) => setTimeout(r, 2500));
    data = await fetchOnce();
  }

  if (!data?.ok) {
    const err = new Error(data?.description || 'Telegram getChatMember failed');
    err.response = { status: data?.error_code === 400 ? 400 : 502, data };
    throw err;
  }

  const status = data.result?.status || null;
  return {
    isMember: VALID_MEMBER_STATUSES.includes(status),
    status,
  };
};

// ─── Instagram ────────────────────────────────────────────────────────────────

// Instagram username qoidasi: 1-30 belgi, harf/raqam/nuqta/pastki chiziq.
const INSTAGRAM_USERNAME_RE = /^[a-z0-9._]{3,30}$/;

/**
 * Instagram obunasini soft-check qilish.
 * Instagram API cheklovlari sababli haqiqiy tekshiruv IMKONSIZ — bu foydalanuvchining
 * o'z da'vosi (honor system). PAY-02: natija `verified: false`,
 * `verificationSource: 'self_reported'` bilan qaytadi — bu kriptografik/API isbot emas va
 * xavfsizlik qarorlari uchun ishlatilmasligi kerak. `subscribed` UX/gate uchun saqlanadi
 * (aks holda hech kim Instagram shartini bajara olmaydi).
 */
const verifyInstagramSubscription = async (username, userId) => {
  const normalized = String(username || '').trim().replace(/^@/, '').toLowerCase();
  if (!INSTAGRAM_USERNAME_RE.test(normalized)) {
    return { subscribed: false, username: null, verifiedAt: null, verified: false, verificationSource: null };
  }

  return {
    subscribed: true,
    username: normalized,
    verifiedAt: new Date(),
    verified: false,
    verificationSource: 'self_reported',
  };
};

/**
 * Instagram real-time tekshiruvi (soft-check — har doim true).
 */
const checkInstagramSubscriptionRealTime = async (username) => {
  return !!username;
};

// ─── Telegram ─────────────────────────────────────────────────────────────────

/**
 * Telegram obunasini birinchi marta verify qilish (bitta kanal).
 * Foydalanuvchi ro'yxatdan o'tganda yoki verify-telegram endpoint chaqirilganda.
 */
const verifyTelegramSubscription = async (telegramUsername, telegramUserId, channelUsername) => {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.warn('[TG Verify] TELEGRAM_BOT_TOKEN sozlanmagan');
    return { subscribed: false, username: telegramUsername, verifiedAt: null };
  }

  const channel = channelUsername || process.env.TELEGRAM_CHANNEL_USERNAME;
  if (!channel) {
    console.warn('[TG Verify] TELEGRAM_CHANNEL_USERNAME sozlanmagan');
    return { subscribed: false, username: telegramUsername, verifiedAt: null };
  }

  try {
    const chatId = /^-?\d+$/.test(channel) ? channel : `@${channel}`;
    const { isMember } = await getChatMemberStatus(botToken, chatId, telegramUserId);

    return {
      subscribed: isMember,
      username: telegramUsername,
      verifiedAt: isMember ? new Date() : null,
    };
  } catch (error) {
    console.error('[TG Verify] Xatolik:', error.message);
    return { subscribed: false, username: telegramUsername, verifiedAt: null };
  }
};

/**
 * Real-time Telegram subscription check (bitta kanal, boolean).
 * Video access oldidan chaqiriladi.
 */
const checkTelegramSubscriptionRealTime = async (telegramUserId, channelUsername) => {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return false;

  try {
    const chatId = /^-?\d+$/.test(channelUsername) ? channelUsername : `@${channelUsername}`;
    const { isMember } = await getChatMemberStatus(botToken, chatId, telegramUserId);
    return isMember;
  } catch {
    return false;
  }
};

/**
 * Telegram obunasini public kanal uchun real-time tekshirish.
 *
 * API xato va "not subscribed" ni aniq farqlaydi:
 *   checked = true  → API javob berdi, natija ishonchli
 *   checked = false → API xato (network/timeout), DB fallback kerak
 *
 * @param {string|number} telegramUserId
 * @returns {Promise<{subscribed: boolean, checked: boolean}>}
 */
const checkTelegramSubscription = async (telegramUserId) => {
  if (!telegramUserId) return { subscribed: false, checked: false };

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    console.warn('[TG Check] TELEGRAM_BOT_TOKEN sozlanmagan');
    return { subscribed: false, checked: false };
  }

  const channel = process.env.TELEGRAM_CHANNEL_USERNAME;
  if (!channel) {
    console.warn('[TG Check] TELEGRAM_CHANNEL_USERNAME sozlanmagan');
    return { subscribed: false, checked: false };
  }

  try {
    const chatId = /^-?\d+$/.test(channel) ? channel : `@${channel}`;
    const { isMember, status } = await getChatMemberStatus(botToken, chatId, telegramUserId);

    if (!isMember) {
      console.log(`[TG Check] User ${telegramUserId} — status: ${status} (not subscribed)`);
    }

    return { subscribed: isMember, checked: true };
  } catch (err) {
    // 400 = user not found / kicked — aniq not subscribed
    if (err.response?.status === 400) {
      console.log(`[TG Check] User ${telegramUserId} — API 400 (not found in channel)`);
      return { subscribed: false, checked: true };
    }

    // Network / timeout — ishonchli emas, DB fallback ishlatiladi
    console.error('[TG Check] API xatolik:', err.message);
    return { subscribed: false, checked: false };
  }
};

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  verifyInstagramSubscription,
  verifyTelegramSubscription,
  checkInstagramSubscriptionRealTime,
  checkTelegramSubscriptionRealTime,
  checkTelegramSubscription,
};

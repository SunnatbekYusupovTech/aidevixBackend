/**
 * Telegram Mini App (Web App) initData HMAC validatsiyasi.
 *
 * Telegram doc: https://core.telegram.org/bots/webapps#validating-data-received-via-the-web-app
 *
 * Mini App ichida `window.Telegram.WebApp.initData` olinadi va backend'ga yuboriladi.
 * Server bot tokeni bilan HMAC tekshirib, foydalanuvchini autentifikatsiya qiladi.
 *
 * Xavfsizlik:
 *   - auth_date 24 soatdan eski bo'lsa rad qilamiz (token replay himoyasi)
 *   - HMAC timing-safe equality (crypto.timingSafeEqual)
 *   - Bot token env'da bo'lishi shart
 */

const crypto = require('crypto');

const MAX_AUTH_AGE_SECONDS = 24 * 60 * 60; // 24 soat

/**
 * @param {string} initDataRaw — `window.Telegram.WebApp.initData` qiymati (URL-encoded)
 * @returns {{ valid: boolean, reason?: string, user?: object, auth_date?: number, query_id?: string, start_param?: string }}
 */
function validateInitData(initDataRaw) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return { valid: false, reason: 'bot_token_missing' };
  }
  if (!initDataRaw || typeof initDataRaw !== 'string') {
    return { valid: false, reason: 'init_data_missing' };
  }

  const params = new URLSearchParams(initDataRaw);
  const hash = params.get('hash');
  if (!hash) return { valid: false, reason: 'hash_missing' };

  // data-check-string qurish — hash ni olib tashlab, qolgan paramlarni alifbo tartibida
  params.delete('hash');
  const dataCheckString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join('\n');

  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();

  const computedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  // Timing-safe equality
  const a = Buffer.from(computedHash, 'hex');
  const b = Buffer.from(hash, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { valid: false, reason: 'hash_mismatch' };
  }

  const authDate = Number(params.get('auth_date') || 0);
  if (!authDate || Number.isNaN(authDate)) {
    return { valid: false, reason: 'auth_date_invalid' };
  }
  const now = Math.floor(Date.now() / 1000);
  if (now - authDate > MAX_AUTH_AGE_SECONDS) {
    return { valid: false, reason: 'auth_date_expired' };
  }

  // user JSON
  let user = null;
  const userRaw = params.get('user');
  if (userRaw) {
    try {
      user = JSON.parse(userRaw);
    } catch (_) {
      return { valid: false, reason: 'user_parse_failed' };
    }
  }
  if (!user || !user.id) return { valid: false, reason: 'user_missing' };

  return {
    valid: true,
    user,
    auth_date: authDate,
    query_id: params.get('query_id') || null,
    start_param: params.get('start_param') || null,
  };
}

module.exports = { validateInitData, MAX_AUTH_AGE_SECONDS };

/**
 * CAPTCHA gate — returns 403 if a token is required but missing/invalid.
 *
 * Reads token from header `X-Captcha-Token` or body `captchaToken`.
 * No-op if `CAPTCHA_PROVIDER`/`CAPTCHA_SECRET` env vars are unset (dev/opt-in).
 */
const { verifyCaptcha, isEnabled } = require('../utils/captcha');
const securityLogger = require('../utils/securityLogger');
const { isTrustedMobileClient } = require('../utils/authSecurity');

const captchaCheck = async (req, res, next) => {
  if (!isEnabled()) return next();

  // Mobil ilovalar brauzer CAPTCHA'ni render qila olmaydi. AUTH-03: faqat header emas —
  // X-Client-Type: mobile + to'g'ri X-Mobile-Secret (MOBILE_API_SECRET) bo'lsagina skip.
  // Header'ni istalgan skript qo'ya oladi, shuning uchun u yolg'iz isbot emas.
  if (isTrustedMobileClient(req)) return next();

  const token =
    req.headers['x-captcha-token'] ||
    req.headers['X-Captcha-Token'] ||
    req.body?.captchaToken;

  const result = await verifyCaptcha(token, req.ip);
  if (result.ok) return next();

  securityLogger.suspicious(req, 'captcha_failed', {
    reason: result.reason,
    provider: result.provider,
  });
  return res.status(403).json({
    success: false,
    code: 'CAPTCHA_REQUIRED',
    message: 'CAPTCHA verification failed. Please retry.',
  });
};

module.exports = captchaCheck;

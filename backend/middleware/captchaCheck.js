/**
 * CAPTCHA gate — returns 403 if a token is required but missing/invalid.
 *
 * Reads token from header `X-Captcha-Token` or body `captchaToken`.
 * No-op if `CAPTCHA_PROVIDER`/`CAPTCHA_SECRET` env vars are unset (dev/opt-in).
 */
const { verifyCaptcha, isEnabled } = require('../utils/captcha');
const securityLogger = require('../utils/securityLogger');

const captchaCheck = async (req, res, next) => {
  if (!isEnabled()) return next();

  // Mobil ilovalar brauzer CAPTCHA'ni render qila olmaydi. X-Client-Type: mobile
  // header'i bor so'rovlarni skip qilamiz — bu so'rovlar rate-limiter bilan himoyalangan.
  if (req.headers['x-client-type'] === 'mobile') return next();

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

const crypto = require('crypto');
const { CSRF_SECRET } = require('../config/jwt');

const ACCESS_COOKIE_NAME = 'aidevix_access';
const REFRESH_COOKIE_NAME = 'aidevix_refresh';
const CSRF_COOKIE_NAME = 'aidevix_csrf';
const CSRF_HEADER_NAME = 'x-csrf-token';

const hashToken = (value) =>
  crypto.createHash('sha256').update(String(value)).digest('hex');

// Past-entropiyali OTP kodlar (6-xonali email/reset kodlari, keyspace ~900k) uchun.
// Oddiy SHA-256 DB leak'da millisekundlarda brute qilinadi. OTP_PEPPER (server-secret)
// bilan HMAC — DB dump yolg'iz o'zi kodni tiklashga yetmaydi.
// Backward-compatible: OTP_PEPPER o'rnatilmagan bo'lsa hashToken (plain SHA-256)'ga
// tushadi → mavjud xatti-harakat o'zgarmaydi. Kodlar 10-15 daqiqada eskirgani uchun
// pepper qo'shilganda migration kerak emas (eski kodlar o'z-o'zidan eskiradi).
const hashCode = (value) => {
  const pepper = process.env.OTP_PEPPER;
  if (!pepper) return hashToken(value);
  return crypto.createHmac('sha256', pepper).update(String(value)).digest('hex');
};

const safeEqual = (a = '', b = '') => {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  try {
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
};

const parseCookies = (cookieHeader = '') =>
  cookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, part) => {
      const separatorIndex = part.indexOf('=');
      if (separatorIndex === -1) return acc;

      const key = part.slice(0, separatorIndex).trim();
      const raw = part.slice(separatorIndex + 1).trim();
      // Malformed percent-encoding (e.g. "%E0%") throws URIError. Fall back to the
      // raw value — csrfProtection runs sync and unguarded, so an attacker must not
      // be able to turn a bad cookie into a 500. A raw value simply fails hash/safeEqual.
      let value;
      try {
        value = decodeURIComponent(raw);
      } catch {
        value = raw;
      }
      acc[key] = value;
      return acc;
    }, {});

const getCookieBaseOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
  path: '/',
});

const serializeCookie = (name, value, options = {}) => {
  const normalized = {
    ...getCookieBaseOptions(),
    ...options,
  };

  const parts = [`${name}=${encodeURIComponent(value)}`];

  if (normalized.maxAge !== undefined) parts.push(`Max-Age=${normalized.maxAge}`);
  if (normalized.domain) parts.push(`Domain=${normalized.domain}`);
  if (normalized.path) parts.push(`Path=${normalized.path}`);
  if (normalized.expires) parts.push(`Expires=${normalized.expires.toUTCString()}`);
  if (normalized.httpOnly) parts.push('HttpOnly');
  if (normalized.secure) parts.push('Secure');
  if (normalized.sameSite) parts.push(`SameSite=${normalized.sameSite}`);

  return parts.join('; ');
};

const generateCsrfToken = () => {
  const random = crypto.randomBytes(32).toString('hex');
  const signature = crypto
    .createHmac('sha256', CSRF_SECRET)
    .update(random)
    .digest('hex');
  return `${random}.${signature}`;
};

const verifyCsrfToken = (token) => {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [random, signature] = parts;
  if (!random || !signature) return false;
  const expected = crypto
    .createHmac('sha256', CSRF_SECRET)
    .update(random)
    .digest('hex');
  return safeEqual(signature, expected);
};

const attachAuthCookies = (res, accessToken, refreshToken) => {
  const csrfToken = generateCsrfToken();
  const cookies = [
    serializeCookie(ACCESS_COOKIE_NAME, accessToken, { maxAge: 15 * 60 }),
    serializeCookie(REFRESH_COOKIE_NAME, refreshToken, { maxAge: 7 * 24 * 60 * 60 }),
    // CSRF cookie — readable by JS so axios can echo it back as X-CSRF-Token
    serializeCookie(CSRF_COOKIE_NAME, csrfToken, { httpOnly: false, maxAge: 7 * 24 * 60 * 60 }),
  ];

  res.setHeader('Set-Cookie', cookies);
  return csrfToken;
};

// Refresh just the CSRF cookie without touching access/refresh tokens.
// Returns the new token so the caller can include it in the JSON response —
// frontends on different origins (cross-site setups) cannot read the cookie
// directly and rely on the body value instead.
const refreshCsrfCookie = (res) => {
  const csrfToken = generateCsrfToken();
  const cookie = serializeCookie(CSRF_COOKIE_NAME, csrfToken, {
    httpOnly: false,
    maxAge: 7 * 24 * 60 * 60,
  });
  // Don't clobber any existing Set-Cookie headers (e.g. from auth flows).
  const existing = res.getHeader('Set-Cookie');
  if (existing) {
    res.setHeader('Set-Cookie', Array.isArray(existing) ? [...existing, cookie] : [existing, cookie]);
  } else {
    res.setHeader('Set-Cookie', cookie);
  }
  return csrfToken;
};

const clearAuthCookies = (res) => {
  const expired = new Date(0);
  const cookies = [
    serializeCookie(ACCESS_COOKIE_NAME, '', { expires: expired, maxAge: 0 }),
    serializeCookie(REFRESH_COOKIE_NAME, '', { expires: expired, maxAge: 0 }),
    serializeCookie(CSRF_COOKIE_NAME, '', { httpOnly: false, expires: expired, maxAge: 0 }),
  ];

  res.setHeader('Set-Cookie', cookies);
};

module.exports = {
  ACCESS_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  attachAuthCookies,
  refreshCsrfCookie,
  clearAuthCookies,
  hashToken,
  hashCode,
  safeEqual,
  parseCookies,
  generateCsrfToken,
  verifyCsrfToken,
};

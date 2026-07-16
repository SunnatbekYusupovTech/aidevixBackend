const crypto = require('crypto');

const DEV_FALLBACK = {
  ACCESS: 'dev-only-access-secret-do-not-use-in-production',
  REFRESH: 'dev-only-refresh-secret-do-not-use-in-production',
  RESET: 'dev-only-reset-secret-do-not-use-in-production',
  CSRF: 'dev-only-csrf-secret-do-not-use-in-production',
};

const MIN_SECRET_LENGTH = 32;

const loadSecret = (name, devFallback) => {
  const value = process.env[name];
  if (process.env.NODE_ENV === 'production') {
    if (!value) {
      throw new Error(`FATAL: ${name} is required in production. Set a strong random secret (>=${MIN_SECRET_LENGTH} chars).`);
    }
    if (value.length < MIN_SECRET_LENGTH) {
      throw new Error(`FATAL: ${name} is too short (${value.length} chars). Minimum ${MIN_SECRET_LENGTH} chars.`);
    }
    if (Object.values(DEV_FALLBACK).includes(value)) {
      throw new Error(`FATAL: ${name} is using a development placeholder. Replace with a unique production secret.`);
    }
    return value;
  }
  if (!value) {
    console.warn(`⚠️  ${name} not set — using development fallback. Production WILL refuse to boot without this.`);
    return devFallback;
  }
  return value;
};

const ACCESS_TOKEN_SECRET = loadSecret('ACCESS_TOKEN_SECRET', DEV_FALLBACK.ACCESS);
const REFRESH_TOKEN_SECRET = loadSecret('REFRESH_TOKEN_SECRET', DEV_FALLBACK.REFRESH);
const RESET_TOKEN_SECRET = loadSecret('RESET_TOKEN_SECRET', DEV_FALLBACK.RESET);
const CSRF_SECRET = loadSecret('CSRF_SECRET', DEV_FALLBACK.CSRF);
// Reauth (step-up) tokeni uchun alohida secret — blast radiusni qisqartiradi.
// Env qo'yilmagan bo'lsa RESET_TOKEN_SECRET'ga fallback (mavjud deploylar buzilmaydi).
const REAUTH_TOKEN_SECRET = process.env.REAUTH_TOKEN_SECRET
  ? loadSecret('REAUTH_TOKEN_SECRET', RESET_TOKEN_SECRET)
  : RESET_TOKEN_SECRET;

if (process.env.NODE_ENV === 'production') {
  const secrets = [ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET, RESET_TOKEN_SECRET, CSRF_SECRET];
  // Agar REAUTH uchun alohida secret berilgan bo'lsa, u ham boshqalardan farqli
  // bo'lishi shart — aks holda step-up token boshqa maqsad bilan to'qnashadi.
  if (process.env.REAUTH_TOKEN_SECRET) secrets.push(REAUTH_TOKEN_SECRET);
  const unique = new Set(secrets);
  if (unique.size !== secrets.length) {
    throw new Error('FATAL: ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET, RESET_TOKEN_SECRET, CSRF_SECRET (va berilgan bo\'lsa REAUTH_TOKEN_SECRET) must all be unique.');
  }
}

module.exports = {
  ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_SECRET,
  RESET_TOKEN_SECRET,
  REAUTH_TOKEN_SECRET,
  CSRF_SECRET,
  ACCESS_TOKEN_EXPIRE: process.env.ACCESS_TOKEN_EXPIRE || '15m',
  REFRESH_TOKEN_EXPIRE: process.env.REFRESH_TOKEN_EXPIRE || '7d',
  _generateDevSecretHint: () => crypto.randomBytes(48).toString('hex'),
};

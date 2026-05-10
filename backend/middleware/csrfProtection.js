const {
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  ACCESS_COOKIE_NAME,
  parseCookies,
  safeEqual,
  verifyCsrfToken,
} = require('../utils/authSecurity');
const securityLogger = require('../utils/securityLogger');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Routes where CSRF is not required (no-auth endpoints + refresh + webhooks)
const EXEMPT_PATHS = [
  /^\/api\/auth\/login$/,
  /^\/api\/auth\/register$/,
  /^\/api\/auth\/google$/,
  /^\/api\/auth\/telegram-init$/,
  /^\/api\/auth\/2fa\/verify-login$/,
  /^\/api\/auth\/refresh-token$/,
  /^\/api\/auth\/forgot-password$/,
  /^\/api\/auth\/verify-code$/,
  /^\/api\/auth\/reset-password$/,
  /^\/api\/auth\/resend-verification-public$/,
  /^\/api\/auth\/verify-email-public$/,
  /^\/api\/payments\/(payme|click)(\/.*)?$/, // Payment provider webhooks
  /^\/api\/subscriptions\/telegram\/webhook$/,
];

const isExempt = (path) => EXEMPT_PATHS.some((re) => re.test(path));

/**
 * CSRF Protection — Double-Submit Cookie Pattern
 *
 * For state-changing requests with an auth cookie, requires:
 *  - aidevix_csrf cookie (set on login/register/refresh)
 *  - X-CSRF-Token header matching the cookie value
 *  - The token signature validates against CSRF_SECRET (HMAC)
 *
 * Requests without an auth cookie are passed through (no session to hijack).
 */
const csrfProtection = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) return next();
  if (isExempt(req.path)) return next();

  const cookies = parseCookies(req.headers.cookie);

  // If there is no auth cookie, the request is not authenticated via cookies
  // and CSRF is not a concern (pure Bearer token or unauthenticated request).
  if (!cookies[ACCESS_COOKIE_NAME]) return next();

  const cookieToken = cookies[CSRF_COOKIE_NAME];
  const headerToken = req.headers[CSRF_HEADER_NAME] || req.headers[CSRF_HEADER_NAME.toUpperCase()];

  if (!cookieToken || !headerToken) {
    securityLogger.csrfRejected(req);
    return res.status(403).json({
      success: false,
      message: 'CSRF token missing. Please refresh the page and try again.',
    });
  }

  if (!safeEqual(cookieToken, headerToken)) {
    securityLogger.csrfRejected(req);
    return res.status(403).json({
      success: false,
      message: 'CSRF token mismatch.',
    });
  }

  if (!verifyCsrfToken(cookieToken)) {
    securityLogger.csrfRejected(req);
    return res.status(403).json({
      success: false,
      message: 'CSRF token invalid.',
    });
  }

  next();
};

module.exports = csrfProtection;

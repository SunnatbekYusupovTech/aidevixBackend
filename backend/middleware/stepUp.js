/**
 * Step-up authentication — sensitive operations require recent password / 2FA proof.
 *
 * Use after `authenticate`. The client must include `X-Reauth-Token` header carrying a
 * short-lived JWT issued by `POST /api/auth/reauth` (current-password verify).
 *
 * Token audience: `aidevix-reauth`. Lifetime: 5 minutes. Bound to `userId`.
 */
const jwt = require('jsonwebtoken');
const { REAUTH_TOKEN_SECRET } = require('../config/jwt');
const securityLogger = require('../utils/securityLogger');

const REAUTH_AUD = 'aidevix-reauth';
const REAUTH_TTL = '5m';

const issueReauthToken = (userId) =>
  jwt.sign({ uid: String(userId) }, REAUTH_TOKEN_SECRET, {
    algorithm: 'HS256',
    issuer: 'aidevix',
    audience: REAUTH_AUD,
    expiresIn: REAUTH_TTL,
  });

const verifyReauthToken = (token) => {
  try {
    return jwt.verify(token, REAUTH_TOKEN_SECRET, {
      algorithms: ['HS256'],
      issuer: 'aidevix',
      audience: REAUTH_AUD,
    });
  } catch {
    return null;
  }
};

const requireRecentReauth = (req, res, next) => {
  const token = req.headers['x-reauth-token'];
  if (!token) {
    return res.status(401).json({
      success: false,
      code: 'REAUTH_REQUIRED',
      message: 'Bu amal uchun parolni qayta tasdiqlang.',
    });
  }
  const decoded = verifyReauthToken(token);
  if (!decoded || !decoded.uid || String(decoded.uid) !== String(req.user?._id)) {
    securityLogger.suspicious(req, 'reauth_token_invalid', {
      userId: String(req.user?._id || 'anon'),
    });
    return res.status(401).json({
      success: false,
      code: 'REAUTH_REQUIRED',
      message: 'Reauth tokeni noto\'g\'ri yoki muddati o\'tgan.',
    });
  }
  next();
};

module.exports = { requireRecentReauth, issueReauthToken, verifyReauthToken };

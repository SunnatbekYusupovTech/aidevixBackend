const Session = require('../models/Session');
const asyncHandler = require('../middleware/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const securityLogger = require('../utils/securityLogger');
const { parseCookies, REFRESH_COOKIE_NAME, hashToken } = require('../utils/authSecurity');

const safeUaSnippet = (ua) => (ua ? String(ua).slice(0, 200) : null);

/**
 * GET /api/sessions — list current user's active sessions.
 *
 * Marks the session that issued the current request as `current: true`,
 * so the UI can render "This device" for it.
 */
const listMySessions = asyncHandler(async (req, res) => {
  const sessions = await Session.find({ userId: req.user._id })
    .sort({ lastUsedAt: -1 })
    .select('ip ua deviceHash lastUsedAt absoluteExpiresAt createdAt');

  // Identify current session via the refresh cookie hash
  const cookies = parseCookies(req.headers.cookie);
  const currentRefresh = cookies[REFRESH_COOKIE_NAME];
  const currentHash = currentRefresh ? hashToken(currentRefresh) : null;
  // refreshTokenHash select:false — query filter sifatida ishlatish mumkin (returnda projection emas).
  // Faqat _id kerak, demak select:false bilan muammo yo'q.
  let currentId = null;
  if (currentHash) {
    const cur = await Session.findOne({
      userId: req.user._id,
      refreshTokenHash: currentHash,
    }).select('_id');
    currentId = cur?._id ? String(cur._id) : null;
  }

  res.json({
    success: true,
    data: sessions.map((s) => ({
      id: String(s._id),
      ip: s.ip,
      ua: safeUaSnippet(s.ua),
      lastUsedAt: s.lastUsedAt,
      createdAt: s.createdAt,
      absoluteExpiresAt: s.absoluteExpiresAt,
      current: currentId === String(s._id),
    })),
  });
});

/**
 * DELETE /api/sessions/:id — revoke one session.
 */
const revokeSession = asyncHandler(async (req, res, next) => {
  const session = await Session.findOne({ _id: req.params.id, userId: req.user._id });
  if (!session) return next(new ErrorResponse('Session not found', 404));

  await Session.deleteOne({ _id: session._id });
  securityLogger.sessionRevoked(req, req.user._id, session._id, 'self');
  res.json({ success: true, message: 'Session revoked' });
});

/**
 * DELETE /api/sessions — revoke ALL sessions except the current one.
 * Forces re-login on every other device.
 */
const revokeOtherSessions = asyncHandler(async (req, res) => {
  const cookies = parseCookies(req.headers.cookie);
  const currentRefresh = cookies[REFRESH_COOKIE_NAME];
  const currentHash = currentRefresh ? hashToken(currentRefresh) : null;

  const filter = { userId: req.user._id };
  if (currentHash) filter.refreshTokenHash = { $ne: currentHash };

  const result = await Session.deleteMany(filter);
  securityLogger.sessionRevoked(req, req.user._id, null, 'self_all_others');
  res.json({ success: true, message: `${result.deletedCount} session revoked` });
});

module.exports = { listMySessions, revokeSession, revokeOtherSessions };

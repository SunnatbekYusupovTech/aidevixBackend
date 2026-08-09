/**
 * mkhls-streamer client.
 *
 * Aidevix is a CONSUMER of mkhls, not a fork of it: this module is the only
 * place that knows mkhls speaks HTTP, wraps everything in {success, data},
 * or identifies videos by an underscore-collapsed ID. Callers deal only in
 * streamPath ("aidevix/{videoId}.mp4") and the four Aidevix statuses.
 */
const axios = require('axios');

// Read env per call, never at import time: jest's setup.js runs before test
// files, and freezing config at require() makes tests order-dependent.
const BASE_URL   = () => (process.env.MKHLS_BASE_URL || 'http://localhost:8080').replace(/\/+$/, '');
const PUBLIC_URL = () => (process.env.MKHLS_PUBLIC_URL || BASE_URL()).replace(/\/+$/, '');
const NAMESPACE  = () => process.env.MKHLS_NAMESPACE || 'aidevix';
const TOKEN_TTL  = () => Number(process.env.MKHLS_STREAM_TOKEN_TTL || 14400);

const REQUEST_TIMEOUT_MS = 15000;
// Re-login this long before the JWT actually expires, so a request never
// leaves with a token that dies in flight.
const TOKEN_EXPIRY_MARGIN_MS = 60000;

class MkhlsError extends Error {
  constructor(message, { code = 'REQUEST_FAILED', status } = {}) {
    super(message);
    this.name = 'MkhlsError';
    this.code = code;
    this.status = status;
  }
}

// ─── Path and status rules ───────────────────────────────────────────────────

/**
 * streamPath → mkhls video ID, mirroring entity.NormalizeVideoID.
 *
 * mkhls applies this itself on the transcode endpoint but NOT on GET or
 * DELETE /admin/videos/{id}, so the client must apply it on every call.
 */
const pathToId = (streamPath) => {
  const raw = String(streamPath || '').replace(/\\/g, '/');
  if (!raw.trim()) throw new MkhlsError('mkhls: streamPath required', { code: 'INVALID_PATH' });
  if (raw.split('/').some((seg) => seg === '..' || seg === '.')) {
    // mkhls's path.Clean would resolve these silently. Our paths are always
    // generated, never user-supplied, so a traversal segment means a bug.
    throw new MkhlsError(`mkhls: unsafe streamPath: ${raw}`, { code: 'INVALID_PATH' });
  }
  const id = raw.replace(/^\/+/, '').replace(/\/+$/, '').replace(/\/+/g, '_');
  if (!id) throw new MkhlsError('mkhls: streamPath required', { code: 'INVALID_PATH' });
  return id;
};

const buildStreamPath = (videoId) => `${NAMESPACE()}/${videoId}.mp4`;

const STATUS_MAP = {
  pending: 'pending',
  draft: 'pending',
  processing: 'processing',
  ready: 'ready',
  error: 'failed',
  unavailable: 'failed',
};

/**
 * mkhls status → Aidevix streamStatus.
 *
 * An unrecognised status maps to 'processing', not 'failed': it means "we
 * cannot tell yet". 'processing' keeps the 30s poll running and recovers on
 * its own; 'failed' tells the viewer to contact an administrator and stops.
 */
const parseStreamStatus = (mkhlsStatus) => {
  const mapped = STATUS_MAP[mkhlsStatus];
  if (mapped) return mapped;
  console.warn(`[mkhls] unknown video status: ${mkhlsStatus} — treating as processing`);
  return 'processing';
};

const buildHlsUrl = (streamPath, token) =>
  `${PUBLIC_URL()}/vod/${streamPath}/master.m3u8?token=${encodeURIComponent(token)}`;

// ─── Transport ───────────────────────────────────────────────────────────────

const unwrap = (body) => {
  if (!body || typeof body !== 'object' || body.success !== true) {
    throw new MkhlsError(
      `mkhls: ${body?.error?.code || 'UNKNOWN'}: ${body?.error?.message || 'unexpected response'}`,
      { code: body?.error?.code || 'UNKNOWN' }
    );
  }
  if (body.data === undefined) {
    // A success envelope with no payload is not a shape any operation in this
    // module expects (deleteVideo's {deleted: true} etc. always sends data).
    // Surfacing it as a MkhlsError keeps the boundary contract instead of
    // letting callers hit a raw TypeError on `data.token`/`data.expires_at`.
    throw new MkhlsError('mkhls: success response missing data', { code: 'MALFORMED_RESPONSE' });
  }
  return body.data;
};

const toMkhlsError = (err) => {
  const status = err.response?.status;
  const body = err.response?.data;
  const code =
    body?.error?.code ||
    (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND'
      ? 'UNREACHABLE'
      : 'REQUEST_FAILED');
  return new MkhlsError(
    `mkhls ${status || err.code || 'error'}: ${body?.error?.message || err.message}`,
    { code, status }
  );
};

let cachedToken = null; // { token, expiresAt } — expiresAt in ms since epoch

const getAdminToken = async ({ force = false } = {}) => {
  if (!force && cachedToken && cachedToken.expiresAt - TOKEN_EXPIRY_MARGIN_MS > Date.now()) {
    return cachedToken.token;
  }
  let res;
  try {
    res = await axios.post(
      `${BASE_URL()}/admin/login`,
      {
        username: process.env.MKHLS_ADMIN_USERNAME,
        password: process.env.MKHLS_ADMIN_PASSWORD,
      },
      { timeout: REQUEST_TIMEOUT_MS }
    );
  } catch (err) {
    cachedToken = null;
    throw toMkhlsError(err);
  }
  const data = unwrap(res.data);
  cachedToken = { token: data.token, expiresAt: Number(data.expires_at) * 1000 };
  return cachedToken.token;
};

const _resetAuthCache = () => {
  cachedToken = null;
};

/**
 * Authenticated request returning the raw axios response, so callers that
 * care about the status code (transcode: 202 vs 409) can read it.
 * Retries exactly once on 401 with a fresh login.
 */
const authedRequest = async (config, { retryOn401 = true } = {}) => {
  const token = await getAdminToken();
  try {
    return await axios({
      baseURL: BASE_URL(),
      timeout: REQUEST_TIMEOUT_MS,
      ...config,
      headers: { Authorization: `Bearer ${token}`, ...(config.headers || {}) },
    });
  } catch (err) {
    if (err.response?.status === 401 && retryOn401) {
      _resetAuthCache();
      return authedRequest(config, { retryOn401: false });
    }
    throw toMkhlsError(err);
  }
};

const authedData = async (config, opts) => unwrap((await authedRequest(config, opts)).data);

// ─── Stream tokens ───────────────────────────────────────────────────────────

/**
 * A viewing token scoped to one lesson.
 *
 * client_ip is deliberately empty (spec §3): on mobile networks the IP
 * changes mid-lesson and an IP-bound token kills the player. The path
 * restriction plus a short TTL carries the protection.
 */
const generateStreamToken = async (streamPath, ttlSeconds = TOKEN_TTL()) => {
  const data = await authedData({
    method: 'post',
    url: '/admin/tokens/stream',
    data: {
      allowed_path: `/vod/${streamPath}`,
      client_ip: '',
      expires_in: ttlSeconds,
    },
  });
  return { token: data.token, expiresAt: new Date(Number(data.expires_at) * 1000) };
};

module.exports = {
  MkhlsError,
  pathToId,
  buildStreamPath,
  parseStreamStatus,
  buildHlsUrl,
  getAdminToken,
  generateStreamToken,
  authedRequest,
  authedData,
  _resetAuthCache,
};

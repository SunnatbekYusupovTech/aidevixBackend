'use strict';

const express    = require('express');
const request    = require('supertest');
const bcrypt     = require('bcryptjs');
const mongoose   = require('mongoose');

// ─── Mock all external dependencies before importing routes ──────────────────

jest.mock('../../models/User');
jest.mock('../../models/Session');
jest.mock('../../models/UserStats');
jest.mock('../../utils/emailService', () => ({
  sendWelcomeEmail:          jest.fn().mockResolvedValue(undefined),
  sendEmailVerificationCode: jest.fn().mockResolvedValue(undefined),
  sendNewDeviceLoginEmail:   jest.fn().mockResolvedValue(undefined),
  sendResetCodeEmail:        jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../utils/hibp', () => ({
  checkPasswordPwned: jest.fn().mockResolvedValue({ pwned: false, count: 0, checked: false }),
}));
jest.mock('../../utils/telegramBot', () => ({
  initTelegramBot: jest.fn(),
  getBot: jest.fn().mockReturnValue(null),
}));
jest.mock('../../utils/deviceFingerprint', () => ({
  buildFromReq: jest.fn().mockReturnValue('testhash'),
  extractIp:    jest.fn().mockReturnValue('127.0.0.1'),
  extractUa:    jest.fn().mockReturnValue('test-agent'),
}));
jest.mock('../../utils/securityLogger', () =>
  Object.fromEntries([
    'loginSuccess','loginFailed','loginLocked','registerSuccess','logout',
    'newDeviceLogin','tokenVersionMismatch','suspicious','passwordPwned',
    'passwordReuseRejected','sessionRevoked','refreshAbsoluteCapHit',
    'accountDeleted','emailVerificationFailed','emailVerificationSucceeded',
    'passwordChanged','passwordResetRequested','passwordResetCompleted',
    'refreshTokenReuse','refreshTokenInvalid','csrfRejected',
  ].map((k) => [k, jest.fn()]))
);
jest.mock('../../middleware/rateLimiter', () =>
  new Proxy({}, {
    get: () => (req, res, next) => next(),
  })
);
jest.mock('../../utils/subscriptionCache', () => ({
  get: jest.fn().mockReturnValue(null),
  set: jest.fn(),
  invalidate: jest.fn(),
}));

const User      = require('../../models/User');
const Session   = require('../../models/Session');
const UserStats = require('../../models/UserStats');

// Mongoose query mock: works with both `await Model.findOne(...)` (thenable)
// and `await Model.findOne(...).select(...)` (chained select).
const q = (value) => ({
  select:   jest.fn().mockResolvedValue(value),
  populate: jest.fn().mockReturnThis(),
  sort:     jest.fn().mockReturnThis(),
  limit:    jest.fn().mockReturnThis(),
  skip:     jest.fn().mockReturnThis(),
  then:     (resolve, reject) => Promise.resolve(value).then(resolve, reject),
  catch:    (fn)              => Promise.resolve(value).catch(fn),
  finally:  (fn)              => Promise.resolve(value).finally(fn),
});

// ─── Test app ────────────────────────────────────────────────────────────────

const authRoutes    = require('../../routes/authRoutes');
const errorHandler  = require('../../middleware/errorMiddleware');

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use(errorHandler);
  return app;
};

// ─── Fixtures ────────────────────────────────────────────────────────────────

let testPasswordHash;

beforeAll(async () => {
  // bcrypt cost 4 for test speed
  testPasswordHash = await bcrypt.hash('Valid@Pass1!', 4);
});

const mockUserId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439011');

const makeUser = (overrides = {}) => ({
  _id: mockUserId,
  username: 'testuser',
  email: 'test@example.com',
  password: testPasswordHash,
  role: 'user',
  isActive: true,
  deletedAt: null,
  emailVerified: true,
  tokenVersion: 0,
  totpEnabled: false,
  failedLoginAttempts: 0,
  lockUntil: null,
  xp: 0,
  streak: 0,
  rankTitle: 'AMATEUR',
  referralCode: 'TEST1234',
  referralsCount: 0,
  knownDevices: ['testhash'],
  socialSubscriptions: {
    telegram: { subscribed: false, username: null, telegramUserId: null },
    instagram: { subscribed: false, username: null },
  },
  proSubscription: { active: false, plan: 'ai_pro', amount: 0, purchasedAt: null, expiresAt: null },
  isLocked: jest.fn().mockReturnValue(false),
  registerFailedLogin: jest.fn().mockResolvedValue(undefined),
  resetLoginAttempts: jest.fn().mockResolvedValue(undefined),
  hasAllSubscriptions: jest.fn().mockReturnValue(false),
  save: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const makeSession = () => ({
  _id: new mongoose.Types.ObjectId(),
  refreshTokenHash: 'pending',
  absoluteExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  lastUsedAt: new Date(),
  ip: '127.0.0.1',
  ua: 'test-agent',
  save: jest.fn().mockResolvedValue(undefined),
});

// ─── /api/auth/register ───────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  let app;

  beforeEach(() => {
    app = createApp();
    jest.clearAllMocks();

    // Default: no existing user, creation succeeds
    User.findOne.mockReturnValue(q(null));

    const user = makeUser();
    User.create.mockResolvedValue(user);
    User.findById.mockReturnValue(q(user));
    User.updateOne.mockResolvedValue({ modifiedCount: 1 });
    User.findByIdAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue(user), ...q(user) });
    UserStats.create.mockResolvedValue({});
    Session.create.mockResolvedValue(makeSession());
  });

  const validBody = {
    username: 'newuser',
    email: 'new@example.com',
    password: 'Valid@Pass1!',
  };

  // Auth flow (2026-05-15): registration no longer auto-logins. It returns
  // requiresEmailVerification and issues NO session cookies until the user
  // verifies their email — this prevents an unverified session.
  test('201 with email-verification required on valid registration', async () => {
    const res = await request(app).post('/api/auth/register').send(validBody);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.requiresEmailVerification).toBe(true);
    expect(res.body.email).toBeDefined();
  });

  test('registration must NOT set auth cookies before email verification', async () => {
    const res = await request(app).post('/api/auth/register').send(validBody);
    const cookies = res.headers['set-cookie'] || [];
    expect(cookies.some((c) => c.startsWith('aidevix_access='))).toBe(false);
    expect(cookies.some((c) => c.startsWith('aidevix_refresh='))).toBe(false);
  });

  test('400 when username is missing', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'a@b.com', password: 'Valid@Pass1!' });
    expect(res.status).toBe(400);
  });

  test('400 when email is missing', async () => {
    const res = await request(app).post('/api/auth/register').send({ username: 'user', password: 'Valid@Pass1!' });
    expect(res.status).toBe(400);
  });

  test('400 when password is missing', async () => {
    const res = await request(app).post('/api/auth/register').send({ username: 'user', email: 'a@b.com' });
    expect(res.status).toBe(400);
  });

  test('400 for invalid email format', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...validBody, email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/email/i);
  });

  test('400 for weak password — missing uppercase', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...validBody, password: 'valid@pass1!' });
    expect(res.status).toBe(400);
  });

  test('400 for weak password — missing special char', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...validBody, password: 'ValidPass1111' });
    expect(res.status).toBe(400);
  });

  test('400 for weak password — missing digit', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...validBody, password: 'Valid@Password' });
    expect(res.status).toBe(400);
  });

  test('400 for short password (< 8 chars)', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...validBody, password: 'Ab@1' });
    expect(res.status).toBe(400);
  });

  test('400 for username with spaces', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...validBody, username: 'user name' });
    expect(res.status).toBe(400);
  });

  test('400 for username too short (< 3 chars)', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...validBody, username: 'ab' });
    expect(res.status).toBe(400);
  });

  test('400 when email or username already exists', async () => {
    User.findOne.mockReturnValue(q(makeUser()));
    const res = await request(app).post('/api/auth/register').send(validBody);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already exists/i);
  });

  test('400 for breached password (HIBP)', async () => {
    const { checkPasswordPwned } = require('../../utils/hibp');
    checkPasswordPwned.mockResolvedValueOnce({ pwned: true, count: 5000, checked: true });
    const res = await request(app).post('/api/auth/register').send(validBody);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/parol/i);
  });

  test('response does not expose password hash', async () => {
    const res = await request(app).post('/api/auth/register').send(validBody);
    const body = JSON.stringify(res.body);
    expect(body).not.toContain('$2a$');
    expect(body).not.toContain(testPasswordHash?.slice(0, 10) || '$2a$');
  });
});

// ─── /api/auth/login ──────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  let app;
  let user;

  beforeEach(() => {
    app = createApp();
    user = makeUser();
    jest.clearAllMocks();

    User.findById.mockReturnValue(q(user));
    User.updateOne.mockResolvedValue({ modifiedCount: 1 });
    User.findByIdAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue(user), ...q(user) });
    Session.create.mockResolvedValue(makeSession());
  });

  const credentials = { email: 'test@example.com', password: 'Valid@Pass1!' };

  test('400 when email is missing', async () => {
    User.findOne.mockReturnValue(q(null));
    const res = await request(app).post('/api/auth/login').send({ password: 'Valid@Pass1!' });
    expect(res.status).toBe(400);
  });

  test('400 when password is missing', async () => {
    User.findOne.mockReturnValue(q(null));
    const res = await request(app).post('/api/auth/login').send({ email: 'test@example.com' });
    expect(res.status).toBe(400);
  });

  test('401 for wrong password', async () => {
    User.findOne.mockReturnValue(q(user));
    const res = await request(app).post('/api/auth/login').send({ email: 'test@example.com', password: 'Wrong@Pass1!' });
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid credentials/i);
  });

  test('401 for non-existent email — SAME error message (enumeration safe)', async () => {
    User.findOne.mockReturnValue(q(null));
    const res = await request(app).post('/api/auth/login').send({ email: 'nobody@example.com', password: 'Any@Pass1!' });
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid credentials/i);
  });

  test('wrong password and non-existent user return identical error messages', async () => {
    // Wrong password
    User.findOne.mockReturnValue(q(user));
    const wrongPassRes = await request(app).post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'Wrong@Pass1!' });

    // Non-existent user
    User.findOne.mockReturnValue(q(null));
    const noUserRes = await request(app).post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'Any@Pass1!' });

    expect(wrongPassRes.body.message).toBe(noUserRes.body.message);
  });

  test('200 and sets auth cookies on correct credentials', async () => {
    User.findOne.mockReturnValue(q(user));
    const res = await request(app).post('/api/auth/login').send(credentials);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies.some((c) => c.startsWith('aidevix_access='))).toBe(true);
    expect(cookies.some((c) => c.startsWith('aidevix_refresh='))).toBe(true);
  });

  test('login response includes user data, not raw password', async () => {
    User.findOne.mockReturnValue(q(user));
    const res = await request(app).post('/api/auth/login').send(credentials);
    const body = JSON.stringify(res.body);
    expect(body).not.toContain('$2a$');
    expect(res.body.data?.user?.password).toBeUndefined();
  });

  test('423 for locked account (after correct password)', async () => {
    const lockedUser = makeUser({
      isLocked: jest.fn().mockReturnValue(true),
      lockUntil: new Date(Date.now() + 15 * 60 * 1000),
    });
    User.findOne.mockReturnValue(q(lockedUser));
    const res = await request(app).post('/api/auth/login').send(credentials);
    expect(res.status).toBe(423);
  });

  test('403 for inactive account', async () => {
    const inactiveUser = makeUser({ isActive: false, isLocked: jest.fn().mockReturnValue(false) });
    User.findOne.mockReturnValue(q(inactiveUser));
    const res = await request(app).post('/api/auth/login').send(credentials);
    expect(res.status).toBe(403);
  });

  test('403 with requiresEmailVerification flag for unverified email', async () => {
    const unverifiedUser = makeUser({ emailVerified: false });
    User.findOne.mockReturnValue(q(unverifiedUser));
    User.updateOne.mockResolvedValue({ modifiedCount: 1 });
    const res = await request(app).post('/api/auth/login').send(credentials);
    expect(res.status).toBe(403);
    expect(res.body.requiresEmailVerification).toBe(true);
    expect(res.body.email).toBe(unverifiedUser.email);
  });

  test('login with 2FA enrolled returns challengeId, not tokens', async () => {
    const twoFaUser = makeUser({ totpEnabled: true, totpSecret: 'JBSWY3DPEHPK3PXP' });
    User.findOne.mockReturnValue(q(twoFaUser));
    const res = await request(app).post('/api/auth/login').send(credentials);
    expect(res.status).toBe(200);
    expect(res.body.requires2FA).toBe(true);
    expect(res.body.challengeId).toBeDefined();
    // No auth cookies should be set yet
    const cookies = res.headers['set-cookie'] || [];
    expect(cookies.some((c) => c.startsWith('aidevix_access='))).toBe(false);
  });

  test('google-only account returns generic 401 (no password)', async () => {
    const googleUser = makeUser({ password: undefined, googleId: 'google-123' });
    User.findOne.mockReturnValue(q(googleUser));
    const res = await request(app).post('/api/auth/login').send(credentials);
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid credentials/i);
  });

  test('case-insensitive email normalization', async () => {
    User.findOne.mockReturnValue(q(user));
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'TEST@EXAMPLE.COM', password: 'Valid@Pass1!' });
    // Should reach the user lookup — email is normalized before query
    expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
  });
});

// ─── /api/auth/logout ─────────────────────────────────────────────────────────

describe('POST /api/auth/logout', () => {
  let app;

  beforeEach(() => {
    app = createApp();
    jest.clearAllMocks();
  });

  test('401 when no auth token provided', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(401);
  });

  test('200 and clears auth cookies when authenticated', async () => {
    const user = makeUser();
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });

    // Mock logout internals
    const Session = require('../../models/Session');
    Session.deleteMany = jest.fn().mockResolvedValue({ deletedCount: 1 });
    User.updateOne.mockResolvedValue({ modifiedCount: 1 });

    const { generateAccessToken } = require('../../utils/jwt');
    const token = generateAccessToken({ userId: String(user._id), tv: 0 });

    // Provide a valid refresh token cookie (logout reads it to find the session)
    const { verifyRefreshToken } = require('../../utils/jwt');
    const refreshToken = require('../../utils/jwt').generateRefreshToken(
      { userId: String(user._id), tv: 0, sid: 'session1' }
    );
    const { REFRESH_COOKIE_NAME } = require('../../utils/authSecurity');

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`)
      .set('Cookie', `${REFRESH_COOKIE_NAME}=${refreshToken}`);

    expect(res.status).toBe(200);

    // Cookies should be cleared (Max-Age=0 or Expires in the past)
    const cookies = res.headers['set-cookie'] || [];
    const accessCookie = cookies.find((c) => c.startsWith('aidevix_access='));
    if (accessCookie) {
      expect(accessCookie).toMatch(/max-age=0|expires=.*1970/i);
    }
  });
});

// ─── /api/auth/me ─────────────────────────────────────────────────────────────

describe('GET /api/auth/me', () => {
  let app;

  beforeEach(() => {
    app = createApp();
    jest.clearAllMocks();
  });

  test('401 when unauthenticated', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('200 returns user profile when authenticated', async () => {
    const user = makeUser();
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });

    const { generateAccessToken } = require('../../utils/jwt');
    const token = generateAccessToken({ userId: String(user._id), tv: 0 });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    // getMe returns { data: sanitizeUser(user) } — no nested .user key
    expect(res.body.data?.email).toBe(user.email);
    expect(res.body.data?.password).toBeUndefined();
  });
});

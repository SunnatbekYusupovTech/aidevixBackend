'use strict';

const express = require('express');
const request = require('supertest');

// Mock User model before importing middleware
jest.mock('../../models/User');
jest.mock('../../models/Session');
jest.mock('../../utils/securityLogger', () => ({
  suspicious: jest.fn(),
  loginSuccess: jest.fn(),
  loginFailed: jest.fn(),
  registerSuccess: jest.fn(),
  tokenVersionMismatch: jest.fn(),
  newDeviceLogin: jest.fn(),
}));

const User = require('../../models/User');
const Session = require('../../models/Session');
const { authenticate, requireAdmin } = require('../../middleware/auth');
const { generateAccessToken } = require('../../utils/jwt');

// Minimal Express app that applies authenticate + a protected route
const buildApp = (extraMiddleware = []) => {
  const app = express();
  app.use(express.json());
  app.get('/protected', authenticate, ...extraMiddleware, (req, res) => {
    res.json({ success: true, userId: String(req.user._id) });
  });
  app.get('/admin', authenticate, requireAdmin, (req, res) => {
    res.json({ success: true, role: req.user.role });
  });
  return app;
};

const baseUser = (overrides = {}) => ({
  _id: '507f1f77bcf86cd799439011',
  username: 'testuser',
  email: 'test@example.com',
  role: 'user',
  isActive: true,
  deletedAt: null,
  tokenVersion: 0,
  totpEnabled: false,
  ...overrides,
});

describe('authenticate middleware', () => {
  let app;

  beforeEach(() => {
    app = buildApp();
    jest.clearAllMocks();
  });

  test('401 when no token provided', async () => {
    const res = await request(app).get('/protected');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('401 for invalid/garbage token in Authorization header', async () => {
    const res = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer not.a.valid.token');
    expect(res.status).toBe(401);
  });

  test('401 for expired access token', async () => {
    const jwt = require('jsonwebtoken');
    const { ACCESS_TOKEN_SECRET } = require('../../config/jwt');
    const expired = jwt.sign(
      { userId: '507f1f77bcf86cd799439011', tv: 0 },
      ACCESS_TOKEN_SECRET,
      { algorithm: 'HS256', issuer: 'aidevix', audience: 'aidevix-api', expiresIn: '1ms' }
    );
    await new Promise((r) => setTimeout(r, 5));
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
  });

  test('401 when user not found in database', async () => {
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(null) });
    const token = generateAccessToken({ userId: '507f1f77bcf86cd799439011', tv: 0 });
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/not found/i);
  });

  test('401 when user account is inactive', async () => {
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(baseUser({ isActive: false })),
    });
    const token = generateAccessToken({ userId: '507f1f77bcf86cd799439011', tv: 0 });
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  test('401 when user is soft-deleted (deletedAt set)', async () => {
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(baseUser({ deletedAt: new Date() })),
    });
    const token = generateAccessToken({ userId: '507f1f77bcf86cd799439011', tv: 0 });
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  test('401 when tokenVersion in JWT does not match DB (revoked session)', async () => {
    // DB tokenVersion is 5, but JWT was issued with tv=0 (old session)
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(baseUser({ tokenVersion: 5 })),
    });
    const token = generateAccessToken({ userId: '507f1f77bcf86cd799439011', tv: 0 });
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/session expired/i);
  });

  test('200 with valid token, matching tokenVersion', async () => {
    const user = baseUser({ tokenVersion: 3 });
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(user),
    });
    const token = generateAccessToken({ userId: user._id, tv: 3 });
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.userId).toBe(user._id);
  });

  test('accepts token from cookie (aidevix_access)', async () => {
    const user = baseUser();
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(user),
    });
    const token = generateAccessToken({ userId: user._id, tv: 0 });
    const { ACCESS_COOKIE_NAME } = require('../../utils/authSecurity');
    const res = await request(app)
      .get('/protected')
      .set('Cookie', `${ACCESS_COOKIE_NAME}=${token}`);
    expect(res.status).toBe(200);
  });

  test('cookie token takes precedence when both cookie and Bearer provided', async () => {
    const validUser = baseUser({ tokenVersion: 0 });
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(validUser),
    });
    const validToken = generateAccessToken({ userId: validUser._id, tv: 0 });
    const invalidBearer = 'Bearer invalid.token.here';
    const { ACCESS_COOKIE_NAME } = require('../../utils/authSecurity');
    const res = await request(app)
      .get('/protected')
      .set('Cookie', `${ACCESS_COOKIE_NAME}=${validToken}`)
      .set('Authorization', invalidBearer);
    expect(res.status).toBe(200);
  });

  test('attaches user object to req.user on success', async () => {
    const user = baseUser({ role: 'admin' });
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(user),
    });
    const token = generateAccessToken({ userId: user._id, tv: 0 });
    const res = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.userId).toBe(user._id);
  });

  test.each([-60000, 0, 60000])('enforces the session absolute expiry even before TTL deletion (offset %i)', async (offset) => {
    const user = baseUser();
    const now = Date.now();
    const expiresAt = new Date(now + offset);
    User.findById.mockReturnValue({ select: jest.fn().mockResolvedValue(user) });
    Session.exists.mockImplementation(async (filter) =>
      !filter.absoluteExpiresAt?.$gt || expiresAt > filter.absoluteExpiresAt.$gt ? { _id: 'session-id' } : null);
    const token = generateAccessToken({ userId: user._id, tv: 0, sid: 'session-id' });
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(offset > 0 ? 200 : 401);
  });
});

describe('requireAdmin middleware', () => {
  let app;

  beforeEach(() => {
    app = buildApp();
    jest.clearAllMocks();
  });

  test('403 when user role is not admin', async () => {
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(baseUser({ role: 'user' })),
    });
    const token = generateAccessToken({ userId: '507f1f77bcf86cd799439011', tv: 0 });
    const res = await request(app)
      .get('/admin')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  test('200 when user role is admin', async () => {
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(baseUser({ role: 'admin' })),
    });
    const token = generateAccessToken({ userId: '507f1f77bcf86cd799439011', tv: 0 });
    const res = await request(app)
      .get('/admin')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('admin');
  });

  test('401 when unauthenticated (no token)', async () => {
    const res = await request(app).get('/admin');
    expect(res.status).toBe(401);
  });
});

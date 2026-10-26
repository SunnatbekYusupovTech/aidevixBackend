'use strict';

const express = require('express');
const request = require('supertest');
const { docsLimiter, loginLimiter } = require('../../middleware/rateLimiter');
const { apiBurstLimiter, accountApiLimiter, accountRateKey, isProviderWebhook } = require('../../middleware/rateLimiter');
const { generateAccessToken } = require('../../utils/jwt');
const apiResponseSecurity = require('../../middleware/apiResponseSecurity');

function buildApp(limiter, handler = (_req, res) => res.json({ success: true })) {
  const app = express();
  app.set('trust proxy', 1); // Local test harness supplies the proxy's client IP.
  app.use(express.json());
  app.use(limiter);
  app.all('/probe', handler);
  return app;
}

describe('IP rate-limit regression', () => {
  test('31st request from the same IP is blocked; another IP remains usable', async () => {
    const app = buildApp(docsLimiter);
    for (let i = 0; i < 30; i += 1) {
      expect((await request(app).get('/probe').set('X-Forwarded-For', '192.0.2.11')).status).toBe(200);
    }
    const blocked = await request(app).get('/probe').set('X-Forwarded-For', '192.0.2.11');
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers['retry-after'])).toBeGreaterThan(0);
    expect((await request(app).get('/probe').set('X-Forwarded-For', '192.0.2.12')).status).toBe(200);
  });

  test('rotating IPv6 interface addresses in one /56 cannot reset the quota', async () => {
    const app = buildApp(docsLimiter);
    for (let i = 1; i <= 30; i += 1) {
      await request(app).get('/probe').set('X-Forwarded-For', `2001:db8:1234:5600::${i.toString(16)}`);
    }
    expect((await request(app).get('/probe').set('X-Forwarded-For', '2001:db8:1234:56ff::abcd')).status).toBe(429);
    expect((await request(app).get('/probe').set('X-Forwarded-For', '2001:db8:1234:5700::1')).status).toBe(200);
  });

  test('failed logins for one email from different IPs have independent IP quotas', async () => {
    const app = buildApp(loginLimiter, (_req, res) => res.status(401).json({ success: false }));
    for (let i = 0; i < 30; i += 1) {
      expect((await request(app).post('/probe').set('X-Forwarded-For', '192.0.2.21').send({ email: 'fixture@example.test' })).status).toBe(401);
    }
    expect((await request(app).post('/probe').set('X-Forwarded-For', '192.0.2.22').send({ email: 'fixture@example.test' })).status).toBe(401);
    expect((await request(app).post('/probe').set('X-Forwarded-For', '192.0.2.21').send({ email: 'fixture@example.test' })).status).toBe(429);
  });
});

describe('Layered API abuse protection', () => {
  const userId = '507f1f77bcf86cd799439011';
  test('account identity comes from a verified access token, never raw claims or headers', () => {
    const token = generateAccessToken({ userId, tv: 0 });
    expect(accountRateKey({ headers: { cookie: `aidevix_access=${token}` } })).toBe(userId);
    expect(accountRateKey({ headers: { authorization: `Bearer ${token}` } })).toBe(userId);
    expect(accountRateKey({ headers: { cookie: 'aidevix_access=forged', authorization: `Bearer ${token}` } })).toBeNull();
    expect(accountRateKey({ headers: { 'x-user-id': userId, authorization: 'Bearer fake.jwt.signature' } })).toBeNull();
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      expect(accountRateKey({ headers: { authorization: `Bearer ${token}` } })).toBeNull();
    } finally { process.env.NODE_ENV = original; }
  });

  test('IP bursts stop before the downstream handler', async () => {
    let handled = 0;
    const app = buildApp([apiResponseSecurity, apiBurstLimiter], (_req, res) => { handled += 1; res.json({ success: true }); });
    for (let i = 0; i < 120; i += 1) {
      expect((await request(app).get('/probe').set('X-Forwarded-For', '192.0.2.31')).status).toBe(200);
    }
    const blocked = await request(app).get('/probe').set('X-Forwarded-For', '192.0.2.31');
    expect(blocked.status).toBe(429);
    expect(handled).toBe(120);
    expect(blocked.headers['cache-control']).toBe('private, no-store');
  });

  test('rotating IPs and access tokens for one account does not reset its quota', async () => {
    const app = buildApp(accountApiLimiter);
    const token = generateAccessToken({ userId, tv: 0 });
    for (let i = 0; i < 300; i += 1) {
      expect((await request(app).get('/probe').set('X-Forwarded-For', `198.51.100.${1 + i % 200}`).set('Cookie', `aidevix_access=${token}`)).status).toBe(200);
    }
    const anotherToken = generateAccessToken({ userId, tv: 0, sid: 'different-session' });
    expect((await request(app).get('/probe').set('X-Forwarded-For', '203.0.113.1').set('Cookie', `aidevix_access=${anotherToken}`)).status).toBe(429);
    const otherUser = generateAccessToken({ userId: '507f1f77bcf86cd799439012', tv: 0 });
    expect((await request(app).get('/probe').set('Cookie', `aidevix_access=${otherUser}`)).status).toBe(200);
    expect((await request(app).get('/probe')).status).toBe(200);
  });

  test('only exact provider POST endpoints use their separate webhook quota', () => {
    for (const path of ['/api/payments/payme', '/api/payments/click/prepare', '/api/payments/click/complete/?x=1']) {
      expect(isProviderWebhook({ method: 'POST', originalUrl: path })).toBe(true);
    }
    for (const path of ['/api/payments/initiate', '/api/payments/payme/suffix', '/api/payments/my']) {
      expect(isProviderWebhook({ method: 'POST', originalUrl: path })).toBe(false);
    }
    expect(isProviderWebhook({ method: 'GET', originalUrl: '/api/payments/payme' })).toBe(false);
  });
});

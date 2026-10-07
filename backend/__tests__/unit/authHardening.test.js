'use strict';

// AUTH-02 / AUTH-03 / AUTH-12 / PAY-02 — pure helpers added by the 2026-10 auth hardening.

const speakeasy = require('speakeasy');
const { otpIdentityKey } = require('../../middleware/rateLimiter');
const { isTrustedMobileClient } = require('../../utils/authSecurity');
const { verifyTotpStep } = require('../../controllers/twoFactorController');
const { verifyInstagramSubscription } = require('../../utils/socialVerification');

describe('otpIdentityKey (AUTH-02)', () => {
  test('keys on identifier first, normalized — ignores attacker-chosen email', () => {
    const a = otpIdentityKey({ body: { identifier: 'Victim@X.com', email: 'r1@x.com' } });
    const b = otpIdentityKey({ body: { identifier: ' victim@x.com', email: 'r2@x.com' } });
    expect(a).toBe('email:victim@x.com');
    expect(b).toBe(a);
  });

  test('falls back to email, separates telegram method, strips @', () => {
    expect(otpIdentityKey({ body: { email: 'A@B.com' } })).toBe('email:a@b.com');
    expect(otpIdentityKey({ body: { identifier: '@Bob', method: 'telegram' } })).toBe('telegram:bob');
    expect(otpIdentityKey({ body: {} })).toBe('email:anon');
  });
});

describe('isTrustedMobileClient (AUTH-03)', () => {
  const original = process.env.MOBILE_API_SECRET;
  afterEach(() => {
    if (original === undefined) delete process.env.MOBILE_API_SECRET;
    else process.env.MOBILE_API_SECRET = original;
  });

  test('header alone is never trusted', () => {
    delete process.env.MOBILE_API_SECRET;
    expect(isTrustedMobileClient({ headers: { 'x-client-type': 'mobile' } })).toBe(false);
  });

  test('requires matching X-Mobile-Secret when MOBILE_API_SECRET is set', () => {
    process.env.MOBILE_API_SECRET = 'test-mobile-secret-value';
    expect(isTrustedMobileClient({ headers: { 'x-client-type': 'mobile', 'x-mobile-secret': 'wrong' } })).toBe(false);
    expect(isTrustedMobileClient({ headers: { 'x-client-type': 'mobile', 'x-mobile-secret': 'test-mobile-secret-value' } })).toBe(true);
    expect(isTrustedMobileClient({ headers: { 'x-mobile-secret': 'test-mobile-secret-value' } })).toBe(false);
  });
});

describe('verifyTotpStep (AUTH-12)', () => {
  const secret = speakeasy.generateSecret({ length: 20 }).base32;

  test('returns the absolute time-step of the matching code', () => {
    const now = Date.now();
    const step = Math.floor(now / 1000 / 30);
    const cur = speakeasy.totp({ secret, encoding: 'base32', time: Math.floor(now / 1000) });
    const prev = speakeasy.totp({ secret, encoding: 'base32', time: Math.floor(now / 1000) - 30 });
    expect(verifyTotpStep(secret, cur, now)).toBe(step);
    expect(verifyTotpStep(secret, prev, now)).toBe(step - 1);
  });

  test('returns null for malformed or wrong codes', () => {
    expect(verifyTotpStep(secret, 'abc')).toBeNull();
    expect(verifyTotpStep(null, '123456')).toBeNull();
  });
});

describe('verifyInstagramSubscription (PAY-02)', () => {
  test('is explicitly self-reported, never "verified"', async () => {
    const v = await verifyInstagramSubscription('@Some.User', 'uid');
    expect(v.verified).toBe(false);
    expect(v.verificationSource).toBe('self_reported');
    expect(v.username).toBe('some.user');
  });

  test('rejects invalid usernames', async () => {
    expect((await verifyInstagramSubscription('no spaces allowed', 'uid')).subscribed).toBe(false);
  });
});

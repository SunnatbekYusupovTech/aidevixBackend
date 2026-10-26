'use strict';

jest.mock('../../models/User');
jest.mock('../../models/Session');
jest.mock('../../models/VerifyToken');
jest.mock('../../utils/socialVerification', () => ({
  checkTelegramSubscription: jest.fn().mockResolvedValue({ checked: true, subscribed: false }),
}));
jest.mock('../../utils/subscriptionCache', () => ({ invalidate: jest.fn() }));
jest.mock('../../utils/telegramBot', () => ({ getBot: jest.fn().mockReturnValue(null) }));

const User = require('../../models/User');
const Session = require('../../models/Session');
const VerifyToken = require('../../models/VerifyToken');
const { linkTelegramByToken, setTelegramId } = require('../../controllers/subscriptionController');
const { issueSocketToken, resolveSocketUser } = require('../../sockets/socketAuth');
const { generateAccessToken } = require('../../utils/jwt');
const q = value => ({ select: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue(value) });
const userId = '507f1f77bcf86cd799439011';
const sessionId = '507f1f77bcf86cd799439022';
const fixture = overrides => ({
  _id: userId, username: 'owner', role: 'user', isActive: true, tokenVersion: 0,
  socialSubscriptions: { telegram: { subscribed: false } }, save: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe('Telegram linking codes', () => {
  let user;
  beforeEach(() => {
    jest.clearAllMocks();
    user = fixture();
    User.findById.mockResolvedValue(user);
    User.findOne.mockReturnValue(q(null));
    User.updateMany.mockResolvedValue({ modifiedCount: 0 });
    User.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });
  });

  const row = (age, linked = false) => {
    const entry = { _id: 'verification', userId, token: 'proof-code', linked,
      createdAt: new Date(Date.now() - age), save: jest.fn().mockResolvedValue(undefined) };
    VerifyToken.findOne.mockResolvedValue(entry);
    VerifyToken.findOneAndUpdate.mockImplementation(async (filter, update) => {
      if (filter.linked === false && entry.linked) return null;
      if (filter.used?.$ne === true && entry.used) return null;
      if (filter.createdAt?.$gt && entry.createdAt <= filter.createdAt.$gt) return null;
      Object.assign(entry, update.$set);
      return entry;
    });
    return entry;
  };

  test.each([300000, 301000, 3600000])('expired token cannot link account at %i ms', async age => {
    row(age);
    expect(await linkTelegramByToken('proof-code', 123456, 'owner')).toBe(false);
    expect(User.findById).not.toHaveBeenCalled();
  });

  test('used token cannot be replayed by another Telegram account', async () => {
    row(1000, true);
    expect(await linkTelegramByToken('proof-code', 654321, 'different')).toBe(false);
    expect(User.findById).not.toHaveBeenCalled();
  });

  test('fresh code links once and only one parallel consumer wins', async () => {
    row(1000);
    const outcomes = await Promise.all([
      linkTelegramByToken('proof-code', 123456, 'owner'),
      linkTelegramByToken('proof-code', 654321, 'different'),
    ]);
    expect(outcomes.filter(Boolean)).toHaveLength(1);
  });

  test('fresh token cannot overwrite an existing different proven Telegram link', async () => {
    row(1000);
    user.telegramUserId = '777777';
    expect(await linkTelegramByToken('proof-code', 123456, 'owner')).toBe(false);
    expect(user.save).not.toHaveBeenCalled();
    expect(User.updateOne).not.toHaveBeenCalled();
  });

  test('a concurrent identity link cannot be overwritten after the initial read', async () => {
    row(1000);
    User.updateOne.mockResolvedValue({ matchedCount: 0, modifiedCount: 0 });
    expect(await linkTelegramByToken('proof-code', 123456, 'owner')).toBe(false);
  });

  test('legacy raw Telegram IDs are still rejected without HMAC ownership proof', async () => {
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await setTelegramId({ user: { _id: userId }, body: { telegramUserId: '123456' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(User.findById).not.toHaveBeenCalled();
  });
});

describe('socket handshakes honor session revocation and absolute expiry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    User.findById.mockReturnValue(q(fixture()));
    Session.exists.mockResolvedValue({ _id: sessionId });
  });

  test('a cookie from a revoked session is rejected before user lookup', async () => {
    Session.exists.mockResolvedValue(null);
    const token = generateAccessToken({ userId, tv: 0, sid: sessionId });
    expect(await resolveSocketUser({ handshake: { headers: { cookie: `aidevix_access=${token}` } } })).toBeNull();
  });

  test('a session-bound socket token is rejected after revocation', async () => {
    const token = issueSocketToken(fixture(), sessionId);
    Session.exists.mockResolvedValue(null);
    expect(await resolveSocketUser({ handshake: { auth: { token } } })).toBeNull();
  });

  test.each([-1000, 60000])('socket access checks absolute expiry (offset %i)', async offset => {
    const expiresAt = new Date(Date.now() + offset);
    Session.exists.mockImplementation(async filter =>
      !filter.absoluteExpiresAt?.$gt || expiresAt > filter.absoluteExpiresAt.$gt ? { _id: sessionId } : null);
    const token = issueSocketToken(fixture(), sessionId);
    const result = await resolveSocketUser({ handshake: { auth: { token } } });
    if (offset < 0) expect(result).toBeNull();
    else expect(result.id).toBe(userId);
  });

  test('legacy short-lived socket credentials remain compatible with tokenVersion verification', async () => {
    const token = issueSocketToken(fixture());
    expect((await resolveSocketUser({ handshake: { auth: { token } } })).id).toBe(userId);
    expect(Session.exists).not.toHaveBeenCalled();
  });
});

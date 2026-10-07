'use strict';

const crypto = require('crypto');
const {
  buildClickSignString,
  isPaymeTxExpired,
  PAYME_TX_TIMEOUT_MS,
} = require('../../controllers/paymentController');

const md5 = (s) => crypto.createHash('md5').update(s).digest('hex');

describe('buildClickSignString (Click SHOP-API)', () => {
  const SECRET = 'test-secret';
  const base = {
    click_trans_id: '123456',
    service_id: '1111',
    merchant_trans_id: '64b7f0c2a1b2c3d4e5f60718',
    amount: '99000.00',
    sign_time: '2026-10-07 10:00:00',
  };

  test('prepare (action=0): click_trans_id+service_id+SECRET+merchant_trans_id+amount+action+sign_time', () => {
    const body = { ...base, action: '0', merchant_prepare_id: '999' };
    expect(buildClickSignString(body, SECRET)).toBe(
      '123456' + '1111' + SECRET + '64b7f0c2a1b2c3d4e5f60718' + '99000.00' + '0' + '2026-10-07 10:00:00'
    );
  });

  test('complete (action=1): merchant_prepare_id goes between merchant_trans_id and amount', () => {
    const body = { ...base, action: '1', merchant_prepare_id: '777' };
    expect(buildClickSignString(body, SECRET)).toBe(
      '123456' + '1111' + SECRET + '64b7f0c2a1b2c3d4e5f60718' + '777' + '99000.00' + '1' + '2026-10-07 10:00:00'
    );
  });

  test('numeric action/ids (JSON body) produce the same string as form strings', () => {
    const asStrings = { ...base, action: '1', merchant_prepare_id: '777' };
    const asNumbers = { ...base, click_trans_id: 123456, service_id: 1111, action: 1, merchant_prepare_id: 777 };
    expect(buildClickSignString(asNumbers, SECRET)).toBe(buildClickSignString(asStrings, SECRET));
  });

  test('complete signature differs from prepare formula (prepare_id is part of the hash)', () => {
    const complete = { ...base, action: '1', merchant_prepare_id: '777' };
    const otherPrepare = { ...complete, merchant_prepare_id: '778' };
    expect(md5(buildClickSignString(complete, SECRET))).not.toBe(md5(buildClickSignString(otherPrepare, SECRET)));
  });

  test('missing fields become empty strings, never "undefined"', () => {
    expect(buildClickSignString({ action: '1' }, SECRET)).not.toMatch(/undefined|null/);
  });
});

describe('isPaymeTxExpired (Payme 12h timeout)', () => {
  const now = 1_800_000_000_000;

  test('timeout constant is 12 hours (43 200 000 ms)', () => {
    expect(PAYME_TX_TIMEOUT_MS).toBe(43_200_000);
  });

  test('exactly 12h old is NOT expired; 12h + 1ms is expired', () => {
    expect(isPaymeTxExpired(now - PAYME_TX_TIMEOUT_MS, now)).toBe(false);
    expect(isPaymeTxExpired(now - PAYME_TX_TIMEOUT_MS - 1, now)).toBe(true);
  });

  test('fresh and 13h-old transactions', () => {
    expect(isPaymeTxExpired(now - 60_000, now)).toBe(false);
    expect(isPaymeTxExpired(now - 13 * 3600 * 1000, now)).toBe(true);
  });

  test('missing / invalid create time is never treated as expired', () => {
    expect(isPaymeTxExpired(null, now)).toBe(false);
    expect(isPaymeTxExpired(undefined, now)).toBe(false);
    expect(isPaymeTxExpired(0, now)).toBe(false);
    expect(isPaymeTxExpired('abc', now)).toBe(false);
  });
});

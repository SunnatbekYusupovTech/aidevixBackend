'use strict';

// COM-10 (push endpoint allowlist) and ADM-09 / P-B09 (normalized cache key) regression tests.
jest.mock('../../models/PushSubscription', () => ({}));

const { isAllowedPushEndpoint } = require('../../utils/pushService');
const { buildCacheKey } = require('../../middleware/cacheMiddleware');

describe('isAllowedPushEndpoint (COM-10)', () => {
  test.each([
    'https://fcm.googleapis.com/fcm/send/abc',
    'https://updates.push.services.mozilla.com/wpush/v2/abc',
    'https://wns2-par02p.notify.windows.com/w/?token=abc',
    'https://web.push.apple.com/abc',
    'https://api.push.apple.com/abc',
  ])('allows %s', (url) => {
    expect(isAllowedPushEndpoint(url)).toBe(true);
  });

  test.each([
    'http://fcm.googleapis.com/fcm/send/abc',
    'https://169.254.169.254/latest/meta-data',
    'https://internal.railway.internal:5432/',
    'https://fcm.googleapis.com.evil.com/x',
    'https://evilnotify.windows.com.attacker.io/x',
    'https://fcm.googleapis.com:8443/x',
    'https://user:pass@fcm.googleapis.com/x',
    'javascript:alert(1)',
    '',
    123,
  ])('rejects %s', (url) => {
    expect(isAllowedPushEndpoint(url)).toBe(false);
  });
});

describe('buildCacheKey (ADM-09)', () => {
  const req = (query) => ({ baseUrl: '/api/courses', path: '/', query });

  test('ignores unknown params and sorts known ones', () => {
    const a = buildCacheKey(req({ page: '1', category: 'react', junk: String(Math.random()) }));
    const b = buildCacheKey(req({ category: 'react', page: '1' }));
    expect(a).toBe(b);
    expect(a).toBe('cache:/api/courses?category=react&page=1');
  });

  test('different known values give different keys', () => {
    expect(buildCacheKey(req({ page: '1' }))).not.toBe(buildCacheKey(req({ page: '2' })));
  });
});

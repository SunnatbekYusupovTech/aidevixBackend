'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadWorker({ policy = 'public, max-age=3600', cached = null, offline = false } = {}) {
  const handlers = {};
  const writes = [];
  const removed = [];
  const oldCaches = ['aidevix-runtime-v3-2026-05-13-push', 'aidevix-pages-v3-2026-05-13-push'];
  const cache = { match: async () => cached?.clone(), put: async (request) => writes.push(request.url) };
  vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, '../public/sw.js'), 'utf8'), {
    URL, Response,
    self: {
      location: { origin: 'https://site.example' },
      addEventListener: (name, handler) => { handlers[name] = handler; },
      registration: {}, clients: { claim: async () => {} },
    },
    caches: {
      open: async () => cache, keys: async () => oldCaches,
      delete: async (name) => { removed.push(name); return true; }, match: async () => null,
    },
    fetch: async () => {
      if (offline) throw new Error('fixture offline');
      return new Response('fixture-account-A', { headers: { 'cache-control': policy } });
    },
  });
  return {
    writes, removed,
    async fetch(url, { navigate = false, preload = null } = {}) {
      let result;
      handlers.fetch({
        request: { url: `https://site.example${url}`, method: 'GET', mode: navigate ? 'navigate' : 'cors' },
        preloadResponse: Promise.resolve(preload),
        respondWith: (promise) => { result = promise; },
      });
      return result;
    },
    async activate() { let complete; handlers.activate({ waitUntil: (promise) => { complete = promise; } }); await complete; },
  };
}

test('every API proxy alias bypasses CacheStorage', async () => {
  for (const alias of ['/api/proxy/auth/me', '/api/auth/me', '/api-proxy/auth/me']) {
    const worker = loadWorker({ policy: 'private, no-store' });
    assert.equal(await worker.fetch(alias), undefined, `${alias} must use network directly`);
    assert.equal(worker.writes.length, 0);
  }
});

test('private/no-store responses never enter runtime or navigation caches', async () => {
  for (const policy of ['private', 'no-store', 'private, no-store', 'no-cache']) {
    for (const navigate of [false, true]) {
      const worker = loadWorker({ policy });
      const response = await worker.fetch('/account-data', { navigate });
      assert.equal(response.status, 200);
      assert.equal(worker.writes.length, 0, `${policy}, navigation=${navigate}`);
    }
  }
});

test('private navigation-preload responses are returned without caching', async () => {
  const worker = loadWorker();
  const preload = new Response('fixture-private', { headers: { 'cache-control': 'private, no-store' } });
  assert.equal((await worker.fetch('/profile', { navigate: true, preload })).status, 200);
  assert.equal(worker.writes.length, 0);
});

test('offline fallback cannot return a previously cached private response', async () => {
  const cached = new Response('fixture-account-A', { headers: { 'cache-control': 'private, no-store' } });
  const worker = loadWorker({ cached, offline: true });
  const response = await worker.fetch('/account-data');
  assert.equal(response.status, 504);
  assert.doesNotMatch(await response.text(), /fixture-account-A/);
});

test('public static assets remain cacheable', async () => {
  const worker = loadWorker();
  assert.equal((await worker.fetch('/fonts/public.woff2')).status, 200);
  assert.equal(worker.writes.length, 1);
});

test('activation removes old caches that could retain prior account data', async () => {
  const worker = loadWorker();
  await worker.activate();
  assert.deepEqual(worker.removed.sort(), ['aidevix-pages-v3-2026-05-13-push', 'aidevix-runtime-v3-2026-05-13-push']);
});

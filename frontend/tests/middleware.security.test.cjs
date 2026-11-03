'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ts = require('typescript');
const test = require('node:test');
const assert = require('node:assert/strict');

// Execute the real Edge middleware using minimal Next response objects. No
// browser, external server or production traffic is used for these regressions.
function loadMiddleware({ fetch } = {}) {
  const file = path.resolve(__dirname, '../src/middleware.ts');
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exports = {};
  const response = (status, body, headers) => ({ status, body, headers: new Map(Object.entries(headers || {})) });
  vm.runInNewContext(source, {
    exports,
    // Every import resolves to this stub: `@/utils/constants` yields an undefined
    // BACKEND_ORIGIN, which only ever reaches the injected `fetch` below.
    require: () => ({ NextResponse: {
      next: () => response(200),
      json: (body, options) => response(options.status, body, options.headers),
      redirect: (url, status) => response(status, undefined, { location: String(url) }),
    } }),
    // Legacy course redirect needs these; the limiter tests never touch them.
    fetch: fetch || (() => { throw new Error('fetch must not be called'); }),
    AbortController,
    setTimeout,
    clearTimeout,
  });
  return exports;
}

const req = (pathname, ip = '192.0.2.1') => {
  const nextUrl = {
    pathname,
    clone() {
      const copy = { pathname: this.pathname };
      copy.toString = () => `https://aidevix.uz${copy.pathname}`;
      return copy;
    },
  };
  return { nextUrl, headers: new Map([['x-real-ip', ip]]) };
};

const LEGACY_ID = '6a21a8e4e0d70e38830eb334';
const courseApi = (course) => async () => ({ ok: true, json: async () => ({ success: true, data: { course } }) });

test('all three configured backend proxy aliases receive the Edge limiter', () => {
  const { config } = loadMiddleware();
  for (const matcher of ['/api/proxy/:path*', '/api-proxy/:path*', '/api/:path*']) {
    assert.ok(config.matcher.includes(matcher));
  }
});

test('switching aliases and auth endpoint names cannot reset one IP auth quota', () => {
  const { middleware } = loadMiddleware();
  for (let i = 0; i < 20; i += 1) {
    assert.equal(middleware(req('/api/proxy/auth/login')).status, 200);
  }
  assert.equal(middleware(req('/api-proxy/auth/register')).status, 429);
  assert.equal(middleware(req('/api/auth/forgot-password')).status, 429);
  assert.equal(middleware(req('/api/proxy/auth/login', '192.0.2.2')).status, 200);
});

test('arbitrary resource IDs cannot create fresh quota buckets', () => {
  const { middleware } = loadMiddleware();
  for (let i = 0; i < 120; i += 1) {
    assert.equal(middleware(req(`/api-proxy/videos/${i}`)).status, 200);
  }
  assert.equal(middleware(req('/api-proxy/videos/another-id')).status, 429);
});

test('an identity flood cannot evict a live quota or grow memory without a bound', () => {
  const { middleware } = loadMiddleware();
  for (let i = 0; i < 20; i += 1) middleware(req('/api/auth/login', 'existing-client'));
  for (let i = 1; i < 10_000; i += 1) {
    assert.equal(middleware(req('/api/auth/login', `capacity-${i}`)).status, 200);
  }
  assert.equal(middleware(req('/api/auth/login', 'overflow-client')).status, 429);
  assert.equal(middleware(req('/api/auth/login', 'existing-client')).status, 429);
});

test('legacy ObjectId course URLs get a real HTTP 308 to the slug URL', async () => {
  const calls = [];
  const { middleware, config } = loadMiddleware({
    fetch: async (url) => { calls.push(String(url)); return courseApi({ slug: 'no-code-kod-yozmasdan-ilova-yaratish' })(); },
  });
  assert.ok(config.matcher.includes('/courses/:id'));
  const res = await middleware(req(`/courses/${LEGACY_ID}`));
  assert.equal(res.status, 308);
  assert.equal(res.headers.get('location'), 'https://aidevix.uz/courses/no-code-kod-yozmasdan-ilova-yaratish');
  assert.equal(calls.length, 1);
  assert.ok(calls[0].endsWith(`/api/courses/${LEGACY_ID}`));
});

test('slug and category course URLs pass through without a backend lookup', async () => {
  const { middleware } = loadMiddleware();
  assert.equal((await middleware(req('/courses/no-code-kod-yozmasdan-ilova-yaratish'))).status, 200);
  assert.equal((await middleware(req('/courses/category/ai'))).status, 200);
});

test('backend failure, timeout or a bad slug never blocks the course page', async () => {
  const cases = [
    () => { throw new Error('network'); },
    async () => ({ ok: false, json: async () => ({}) }),
    courseApi({ slug: '../etc/passwd' }),
    courseApi({ slug: LEGACY_ID }),
    courseApi({}),
  ];
  for (const fetch of cases) {
    const { middleware } = loadMiddleware({ fetch });
    assert.equal((await middleware(req(`/courses/${LEGACY_ID}`))).status, 200);
  }
});

test('course document routes bypass the API quota and API quota ignores course routes', async () => {
  const { middleware } = loadMiddleware({ fetch: courseApi({ slug: 'x-y' }) });
  for (let i = 0; i < 130; i += 1) assert.equal((await middleware(req(`/courses/${LEGACY_ID}`))).status, 308);
  assert.equal(middleware(req('/api/proxy/courses')).status, 200);
});

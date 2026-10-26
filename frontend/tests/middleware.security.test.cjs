'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ts = require('typescript');
const test = require('node:test');
const assert = require('node:assert/strict');

// Execute the real Edge middleware using minimal Next response objects. No
// browser, external server or production traffic is used for these regressions.
function loadMiddleware() {
  const file = path.resolve(__dirname, '../src/middleware.ts');
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exports = {};
  const response = (status, body, headers) => ({ status, body, headers: new Map(Object.entries(headers || {})) });
  vm.runInNewContext(source, {
    exports,
    require: () => ({ NextResponse: {
      next: () => response(200),
      json: (body, options) => response(options.status, body, options.headers),
    } }),
  });
  return exports;
}

const req = (pathname, ip = '192.0.2.1') => ({ nextUrl: { pathname }, headers: new Map([['x-real-ip', ip]]) });

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

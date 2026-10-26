'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

// Run after `npm run build`. Inspect only route metadata; manifests also contain
// generated credentials that must not be printed or added to test diagnostics.
test('production build includes middleware and every API proxy matcher', () => {
  const manifest = require(path.resolve(__dirname, '../.next/server/middleware-manifest.json'));
  const route = manifest.middleware['/'];
  assert.ok(route, 'API middleware is absent from the production build');
  const sources = route.matchers.map((matcher) => matcher.originalSource);
  for (const source of ['/api/proxy/:path*', '/api-proxy/:path*', '/api/:path*']) {
    assert.ok(sources.includes(source), `Missing proxy matcher: ${source}`);
  }
});

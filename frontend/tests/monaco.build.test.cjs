'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('browser editor bundle contains the audited sanitizer instead of Monaco bundled vulnerable copy', () => {
  const directory = path.resolve(__dirname, '../.next/static/chunks');
  const scripts = fs.readdirSync(directory, { recursive: true })
    .filter((name) => name.endsWith('.js'))
    .map((name) => fs.readFileSync(path.join(directory, name), 'utf8'));
  assert.ok(scripts.some((source) => source.includes('3.4.17')), 'Patched DOMPurify is absent from the deployed browser chunks');
  assert.ok(scripts.every((source) => !source.includes('3.4.15')), 'Vulnerable DOMPurify copy remains in a browser chunk');
});

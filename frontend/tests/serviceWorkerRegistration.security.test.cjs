'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function registrationHarness(initialController) {
  const windowEvents = {};
  const workerEvents = {};
  let reloads = 0;
  const serviceWorker = {
    controller: initialController,
    register: () => Promise.resolve({ addEventListener() {}, update: () => Promise.resolve() }),
    addEventListener: (type, listener) => { workerEvents[type] = listener; },
  };
  vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, '../public/register-sw.js'), 'utf8'), {
    window: {
      location: { hostname: 'aidevix.example', reload: () => { reloads += 1; } },
      addEventListener: (type, listener) => { windowEvents[type] = listener; },
      dispatchEvent() {},
    },
    navigator: { serviceWorker },
    setInterval() {},
    CustomEvent: class {},
  });
  windowEvents.load();
  return {
    replaceController() { serviceWorker.controller = {}; workerEvents.controllerchange(); },
    reloadCount: () => reloads,
  };
}

test('first service worker claim preserves the current page and editor state', () => {
  const harness = registrationHarness(null);
  harness.replaceController();
  assert.equal(harness.reloadCount(), 0, 'Initial installation must not reload an already interactive page');
});

test('a replacement controller on an already controlled page refreshes exactly once', () => {
  const harness = registrationHarness({});
  harness.replaceController();
  harness.replaceController();
  assert.equal(harness.reloadCount(), 1);
});

test('later updates still refresh a page that initially had no controller', () => {
  const harness = registrationHarness(null);
  harness.replaceController();
  assert.equal(harness.reloadCount(), 0);
  harness.replaceController();
  harness.replaceController();
  assert.equal(harness.reloadCount(), 1);
});

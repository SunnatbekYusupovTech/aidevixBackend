/**
 * Aidevix Service Worker v3
 *
 * Strategiya:
 *   - HTML navigation → network-first, offline fallback /offline
 *   - Static assets (/_next/static, fonts, images) → stale-while-revalidate
 *   - API (/api/) → bypass (har doim freshness)
 *   - Bunny.net video URL — bypass (signed URL TTL bor)
 *
 * Versiya bumpi yangi versiya deploy bo'lganda barcha eski cache'ni o'chiradi.
 */

const VERSION = 'v3-2026-05-13-push';
const STATIC_CACHE = `aidevix-static-${VERSION}`;
const PAGES_CACHE = `aidevix-pages-${VERSION}`;
const RUNTIME_CACHE = `aidevix-runtime-${VERSION}`;
const OFFLINE_URL = '/offline';

const PRECACHE = ['/', '/offline', '/manifest.json', '/Logo.jpg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Navigation preload yoqamiz — birinchi navigation tez bo'lishi uchun
      if ('navigationPreload' in self.registration) {
        try { await self.registration.navigationPreload.enable(); } catch (_) {}
      }
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => ![STATIC_CACHE, PAGES_CACHE, RUNTIME_CACHE].includes(k))
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// Page reload triggered by client (yangi versiya o'rnatildi)
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

const isBypass = (url) => {
  return (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('iframe.mediadelivery.net') ||
    url.hostname.includes('vz-') ||
    url.hostname.endsWith('b-cdn.net') ||
    url.pathname.startsWith('/socket.io')
  );
};

const isStaticAsset = (url) =>
  url.pathname.startsWith('/_next/static') ||
  url.pathname.startsWith('/fonts/') ||
  /\.(woff2?|ttf|otf|css|js|svg|png|jpg|jpeg|webp|avif|ico)$/i.test(url.pathname);

/** Har doim Response — bo'sh qiymat Service Worker da TypeError beradi */
function offlineFallbackResponse() {
  return new Response(
    '<!DOCTYPE html><html lang="uz"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline</title></head><body style="font-family:system-ui;padding:24px;text-align:center"><p>Sayt vaqtincha mavjud emas. Internet ulanishini tekshiring yoki sahifani yangilang.</p></body></html>',
    { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

// stale-while-revalidate — eski cache darhol qaytariladi, fonda yangilanadi
async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  let networkRes = null;
  try {
    networkRes = await fetch(req);
    if (networkRes && networkRes.ok && networkRes.status !== 206) {
      try {
        await cache.put(req, networkRes.clone());
      } catch (_) {}
    }
  } catch (_) {
    // tarmoq xatosi — cache yoki sintetik javob
  }
  if (networkRes instanceof Response) return networkRes;
  if (cached) return cached;
  return new Response('', {
    status: 504,
    statusText: 'Network Unavailable',
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

// Network-first with offline fallback (HTML navigation uchun)
async function networkFirstNavigate(event) {
  try {
    const preload = await event.preloadResponse;
    if (preload instanceof Response) {
      const cache = await caches.open(PAGES_CACHE);
      try {
        await cache.put(event.request, preload.clone());
      } catch (_) {}
      return preload;
    }
    const network = await fetch(event.request);
    if (network && network.ok) {
      const cache = await caches.open(PAGES_CACHE);
      try {
        await cache.put(event.request, network.clone());
      } catch (_) {}
    }
    if (network instanceof Response) return network;
  } catch (_) {
    const cache = await caches.open(PAGES_CACHE);
    const cached = await cache.match(event.request);
    if (cached) return cached;
    const offline = await caches.match(OFFLINE_URL);
    if (offline) return offline;
  }
  return offlineFallbackResponse();
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Boshqa domain (CDN, Bunny, API) — bypass
  if (url.origin !== self.location.origin || isBypass(url)) return;

  // HTML navigation
  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirstNavigate(event));
    return;
  }

  // Static assets — stale-while-revalidate
  if (isStaticAsset(url)) {
    event.respondWith(staleWhileRevalidate(event.request, STATIC_CACHE));
    return;
  }

  // Boshqa same-origin GETs — runtime cache (stale-while-revalidate)
  event.respondWith(staleWhileRevalidate(event.request, RUNTIME_CACHE));
});

// ── Web Push ──────────────────────────────────────────────────────────
// Backend `sendPushToUser` JSON payload yuboradi: {title, body, url, tag}
self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_) {
    payload = { title: 'Aidevix', body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'Aidevix';
  const options = {
    body: payload.body || '',
    icon: '/Logo.jpg',
    badge: '/Logo.jpg',
    tag: payload.tag || 'aidevix',
    data: { url: payload.url || '/' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Bildirishnoma bosilganda — mavjud tabni fokuslaymiz yoki yangisini ochamiz
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of allClients) {
        try {
          const clientUrl = new URL(client.url);
          if (clientUrl.origin === self.location.origin && 'focus' in client) {
            await client.focus();
            if ('navigate' in client && targetUrl) {
              try { await client.navigate(targetUrl); } catch (_) {}
            }
            return;
          }
        } catch (_) {}
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })()
  );
});

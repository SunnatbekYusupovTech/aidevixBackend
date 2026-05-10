/**
 * Aidevix Service Worker v2
 *
 * Strategiya:
 *   - HTML navigation → network-first, offline fallback /offline
 *   - Static assets (/_next/static, fonts, images) → stale-while-revalidate
 *   - API (/api/) → bypass (har doim freshness)
 *   - Bunny.net video URL — bypass (signed URL TTL bor)
 *
 * Versiya bumpi yangi versiya deploy bo'lganda barcha eski cache'ni o'chiradi.
 */

const VERSION = 'v3-2026-05-11';
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

// stale-while-revalidate — eski cache darhol qaytariladi, fonda yangilanadi
async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const fetchPromise = fetch(req)
    .then((res) => {
      if (res && res.ok && res.status !== 206) cache.put(req, res.clone());
      return res;
    })
    .catch(() => cached);
  return cached || fetchPromise;
}

// Network-first with offline fallback (HTML navigation uchun)
async function networkFirstNavigate(event) {
  try {
    const preload = await event.preloadResponse;
    if (preload) {
      const cache = await caches.open(PAGES_CACHE);
      cache.put(event.request, preload.clone());
      return preload;
    }
    const network = await fetch(event.request);
    if (network && network.ok) {
      const cache = await caches.open(PAGES_CACHE);
      cache.put(event.request, network.clone());
    }
    return network;
  } catch (_) {
    const cache = await caches.open(PAGES_CACHE);
    const cached = await cache.match(event.request);
    if (cached) return cached;
    return caches.match(OFFLINE_URL);
  }
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

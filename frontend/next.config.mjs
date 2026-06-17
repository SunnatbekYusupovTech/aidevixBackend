/** Vercel env da ba'zida `.../api` qo‘shib yuboriladi — rewrite allaqachon `/api` qo‘shadi, shuning uchun 404. */
const normalizeBackendOrigin = (raw) => {
  if (!raw) return raw;
  let u = String(raw).trim().replace(/\/+$/, '');
  if (u.toLowerCase().endsWith('/api')) u = u.slice(0, -4);
  return u;
};

const backendBaseUrl = (() => {
  const configuredUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_ORIGIN;

  if (configuredUrl) {
    return normalizeBackendOrigin(configuredUrl);
  }

  return process.env.NODE_ENV === 'production'
    ? 'https://aidevix-backend-production.up.railway.app'
    : 'http://127.0.0.1:5000';
})();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  experimental: {
    optimizePackageImports: [
      'react-icons',
      'framer-motion',
      '@reduxjs/toolkit',
      'react-redux',
      'swiper',
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
          { key: 'Cross-Origin-Resource-Policy', value: 'same-site' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          {
            // 'unsafe-eval' olib tashlandi — `new Function()`/`eval` ga ruxsat berilmaydi.
            // 'unsafe-inline' Next.js hydration scriptlari uchun zarur (nonce/hash bilan
            // tugatish kelgusi PR'ga qoldi). Hozir Report-Only — buzilishi monitoring uchun.
            // 'wasm-unsafe-eval' Pyodide va boshqa WASM modullarini ishlashga ruxsat beradi.
            key: 'Content-Security-Policy-Report-Only',
            value:
              // `upgrade-insecure-requests` is a no-op inside a Report-Only
              // policy and only generates a console warning — keep the
              // directive in the eventual enforcing CSP, drop it here.
              "default-src 'self'; img-src 'self' https: data: blob:; media-src 'self' https: blob:; font-src 'self' https: data:; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; connect-src 'self' https: wss:; worker-src 'self' blob:; frame-src 'self' https:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // canonical `https://aidevix.uz` ga ishora qiladi, lekin sayt `www`'da ham
      // ochiladi → SEO'da duplicate. www → non-www 301 (host=www bo'lgandagina,
      // loop yo'q). Canonical bilan moslashtiradi.
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.aidevix.uz' }],
        destination: 'https://aidevix.uz/:path*',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/proxy/:path*',
        destination: `${backendBaseUrl}/api/:path*`,
      },
      {
        source: '/api-proxy/:path*',
        destination: `${backendBaseUrl}/api/:path*`,
      },
      // Agar Vercel env da `NEXT_PUBLIC_API_BASE_URL=/api` (noto'g'ri) bo'lib qolsa ham
      // `POST /api/auth/2fa/setup` kabi so'rovlar Next 404 emas, backendga tushadi.
      {
        source: '/api/auth/:path*',
        destination: `${backendBaseUrl}/api/auth/:path*`,
      },
    ];
  },
  images: {
    // [SEO-008] Wildcard hostname '**' open image-proxy/SSRF xavfini keltiradi.
    // Faqat kodda haqiqatan ishlatiladigan rasm hostlari oq ro'yxatga olingan:
    //   - res.cloudinary.com : yuklangan avatar / thumbnail / sertifikat rasmlari
    //   - ui-avatars.com     : avatar yo'q bo'lganda fallback initial avatar
    //   - images.unsplash.com: homep, dekorativ avatarlar
    //   - t.me               : Telegram Mini App user photo_url (avatar sifatida)
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com', pathname: '/**' },
      { protocol: 'https', hostname: 'ui-avatars.com', pathname: '/**' },
      { protocol: 'https', hostname: 'images.unsplash.com', pathname: '/**' },
      { protocol: 'https', hostname: 't.me', pathname: '/**' },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [360, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    unoptimized: process.env.NODE_ENV === 'development',
  },
};

export default nextConfig;

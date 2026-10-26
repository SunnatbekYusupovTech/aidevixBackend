import { NextRequest, NextResponse } from 'next/server';

// Keep beside src/app: Next.js discovers middleware in the app directory's
// parent. A middleware.ts at frontend/ is ignored when this project uses src/app.

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 60_000;
const AUTH_LIMIT = 20;
const COACH_LIMIT = 30;
const API_LIMIT = 120;
const MAX_BUCKETS = 10_000;
let nextCleanupAt = 0;

// The site runs on Vercel (not behind Cloudflare), so `cf-connecting-ip` is
// client-controlled and must not be trusted. Vercel sets x-real-ip /
// x-forwarded-for itself and overwrites client-supplied values.
function getClientIp(req: NextRequest): string {
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp;

  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();

  return 'unknown';
}

function getQuota(pathname: string): { group: string; limit: number } {
  // All next.config rewrite aliases share one quota. IDs, query strings and
  // endpoint names must never let a caller create a new bucket per request.
  const path = pathname.replace(/^\/(?:api\/proxy|api-proxy|api)(?=\/|$)/i, '').toLowerCase();
  if (path === '/auth' || path.startsWith('/auth/')) return { group: 'auth', limit: AUTH_LIMIT };
  if (path === '/coach' || path.startsWith('/coach/')) return { group: 'coach', limit: COACH_LIMIT };
  return { group: 'api', limit: API_LIMIT };
}

function takeToken(key: string, limit: number, now: number): { ok: boolean; remaining: number; retryAfterSec: number } {
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    // A stream of unique identities cannot grow this Edge isolate indefinitely.
    // Existing live buckets are retained so capacity pressure cannot reset quotas.
    if (!current && buckets.size >= MAX_BUCKETS) {
      return { ok: false, remaining: 0, retryAfterSec: Math.ceil(WINDOW_MS / 1000) };
    }
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true, remaining: limit - 1, retryAfterSec: Math.ceil(WINDOW_MS / 1000) };
  }

  if (current.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    };
  }

  current.count += 1;
  buckets.set(key, current);
  return {
    ok: true,
    remaining: Math.max(0, limit - current.count),
    retryAfterSec: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
  };
}

function cleanupBuckets(now: number): void {
  if (buckets.size < 1000 || now < nextCleanupAt) return;
  nextCleanupAt = now + 1000;
  for (const [key, value] of buckets.entries()) {
    if (value.resetAt <= now) buckets.delete(key);
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const now = Date.now();
  cleanupBuckets(now);

  const ip = getClientIp(req);
  const { group, limit } = getQuota(pathname);
  const key = `${ip}:${group}`;
  const check = takeToken(key, limit, now);

  if (!check.ok) {
    return NextResponse.json(
      { success: false, message: 'Too many requests. Please retry later.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(check.retryAfterSec),
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': '0',
          'Cache-Control': 'private, no-store',
        },
      },
    );
  }

  const res = NextResponse.next();
  res.headers.set('X-RateLimit-Limit', String(limit));
  res.headers.set('X-RateLimit-Remaining', String(check.remaining));
  return res;
}

export const config = {
  matcher: ['/api/proxy/:path*', '/api-proxy/:path*', '/api/:path*'],
};

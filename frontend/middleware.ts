import { NextRequest, NextResponse } from 'next/server';

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 60_000;
const AUTH_LIMIT = 20;
const COACH_LIMIT = 30;
const API_LIMIT = 120;

// The site runs on Vercel (not behind Cloudflare), so `cf-connecting-ip` is
// client-controlled and must not be trusted. Vercel sets req.ip / x-real-ip /
// x-forwarded-for itself and overwrites client-supplied values.
function getClientIp(req: NextRequest): string {
  if (req.ip) return req.ip;

  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp;

  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();

  return 'unknown';
}

function getLimitForPath(pathname: string): number {
  if (pathname.startsWith('/api/proxy/auth/') || pathname.startsWith('/api/auth/')) {
    return AUTH_LIMIT;
  }
  if (pathname.startsWith('/api/coach')) {
    return COACH_LIMIT;
  }
  return API_LIMIT;
}

function takeToken(key: string, limit: number, now: number): { ok: boolean; remaining: number; retryAfterSec: number } {
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
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
  if (buckets.size < 1000) return;
  for (const [key, value] of buckets.entries()) {
    if (value.resetAt <= now) buckets.delete(key);
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const now = Date.now();
  cleanupBuckets(now);

  const ip = getClientIp(req);
  const limit = getLimitForPath(pathname);
  const key = `${ip}:${pathname.split('/').slice(0, 4).join('/')}`;
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
  matcher: ['/api/proxy/:path*', '/api/auth/:path*', '/api/coach'],
};

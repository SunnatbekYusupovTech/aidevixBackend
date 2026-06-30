// Sentry browser-side init. Runs in the user's browser.
// No-op unless NEXT_PUBLIC_SENTRY_DSN is set — init() with an empty DSN is disabled.
import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,
    // Sample a fraction of transactions for performance; full in dev.
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    // Session Replay — only on errors in prod to stay within quota.
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0,
    sendDefaultPii: false,
  });
}

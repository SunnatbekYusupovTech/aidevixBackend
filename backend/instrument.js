// Sentry initialization — MUST be required before any other module in index.js
// so the SDK can instrument http/express/mongoose at load time.
//
// Fully env-gated: with no SENTRY_DSN set, init() is skipped entirely and the
// app behaves exactly as before (zero overhead, no network calls). This keeps
// local dev and any environment without the secret completely unaffected.
const Sentry = require('@sentry/node');

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    // Releases let you tie an error to a deploy. Railway exposes the commit SHA.
    release: process.env.RAILWAY_GIT_COMMIT_SHA || undefined,
    // Performance tracing is sampled — 10% in prod keeps quota sane, full in dev.
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    // Never ship PII to Sentry; scrub common sensitive request data.
    sendDefaultPii: false,
    beforeSend(event) {
      if (event.request?.cookies) delete event.request.cookies;
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }
      return event;
    },
  });
  console.log('🛰️  Sentry error monitoring enabled');
}

module.exports = Sentry;

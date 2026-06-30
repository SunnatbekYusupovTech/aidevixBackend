// Next.js instrumentation hook — loads the correct Sentry config per runtime.
// Requires `experimental.instrumentationHook: true` on Next 14 (see next.config.mjs).
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

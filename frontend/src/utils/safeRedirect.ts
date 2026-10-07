/**
 * Validates a user-controlled redirect target (`?next=`, `?returnUrl=`, ...).
 *
 * Only same-origin, root-relative paths are accepted ("/courses", "/videos/1?t=2").
 * Everything else — absolute URLs, protocol-relative ("//evil"), backslash tricks
 * ("/\evil"), `javascript:` / `data:` schemes, control characters — returns `fallback`.
 * Keep in sync with .audit/service/fixes/frontend/safeRedirect.test.mjs.
 */
const PROBE_ORIGIN = 'https://x.invalid';

export function safeRedirectPath(value: unknown, fallback = '/'): string {
  if (typeof value !== 'string') return fallback;
  if (value.length === 0 || value.length > 2048) return fallback;
  // Control chars (incl. tab/newline, which URL parsers strip) and backslashes.
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return fallback;
  if (value[0] !== '/' || value[1] === '/') return fallback;
  try {
    const url = new URL(value, PROBE_ORIGIN);
    if (url.origin !== PROBE_ORIGIN) return fallback;
    const result = url.pathname + url.search + url.hash;
    // Dot-segment normalisation can turn "/..//evil.com" into "//evil.com".
    if (result[0] !== '/' || result[1] === '/' || result[1] === '\\') return fallback;
    return result;
  } catch {
    return fallback;
  }
}

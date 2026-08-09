/**
 * Watch-progress arithmetic.
 *
 * The client reports its CURRENT POSITION in the video; the server derives
 * how much new time that represents. The previous contract had the client
 * send a cumulative total which the server then added to a running sum, so
 * five minutes of watching was recorded as 4650 seconds.
 */

// A report arrives roughly every 10 seconds, so no honest report can advance
// by more than this. The cap is what stops a forward seek — or a replayed
// request — from adding hours to a user's totals.
const MAX_DELTA_SECONDS = 120;

/**
 * Coerces arbitrary request input into a valid watch-position value.
 * Non-numeric, non-finite (e.g. NaN from `Number("abc")`), or negative
 * input becomes 0 — the same rule the delta math already relies on, now
 * exported so callers can sanitize a value BEFORE storing it, not just
 * before feeding it to computeWatchDelta. A value that fails Mongoose's
 * cast (NaN) or that violates the "furthest position" invariant (negative)
 * must never reach the database in the first place.
 *
 * @param {*} value raw client input
 * @returns {number} a finite, non-negative number of seconds
 */
const sanitizePosition = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

/**
 * @param {number} previousPosition furthest position recorded so far
 * @param {number} currentPosition  position reported now
 * @returns {number} seconds to credit — never negative, never above the cap
 */
const computeWatchDelta = (previousPosition, currentPosition) => {
  const prev = sanitizePosition(previousPosition);
  const now = sanitizePosition(currentPosition);
  return Math.max(0, Math.min(now - prev, MAX_DELTA_SECONDS));
};

module.exports = { computeWatchDelta, sanitizePosition, MAX_DELTA_SECONDS };

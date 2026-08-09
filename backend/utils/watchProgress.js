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

const toSeconds = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

/**
 * @param {number} previousPosition furthest position recorded so far
 * @param {number} currentPosition  position reported now
 * @returns {number} seconds to credit — never negative, never above the cap
 */
const computeWatchDelta = (previousPosition, currentPosition) => {
  const prev = toSeconds(previousPosition);
  const now = toSeconds(currentPosition);
  return Math.max(0, Math.min(now - prev, MAX_DELTA_SECONDS));
};

module.exports = { computeWatchDelta, MAX_DELTA_SECONDS };

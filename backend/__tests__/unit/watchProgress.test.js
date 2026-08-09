const { computeWatchDelta, sanitizePosition, MAX_DELTA_SECONDS } = require('../../utils/watchProgress');

describe('computeWatchDelta', () => {
  it('credits the gap between two positions', () => {
    expect(computeWatchDelta(10, 20)).toBe(10);
    expect(computeWatchDelta(0, 10)).toBe(10);
  });

  it('credits nothing when the viewer seeks backwards', () => {
    expect(computeWatchDelta(300, 120)).toBe(0);
  });

  it('credits nothing when the position has not moved', () => {
    expect(computeWatchDelta(300, 300)).toBe(0);
  });

  it('caps a forward jump so seeking cannot manufacture watch time', () => {
    // A 10s reporting interval cannot legitimately advance by an hour.
    expect(computeWatchDelta(10, 3600)).toBe(MAX_DELTA_SECONDS);
  });

  it('caps the very first report too', () => {
    expect(computeWatchDelta(0, 5000)).toBe(MAX_DELTA_SECONDS);
  });

  it('treats missing or nonsense input as no progress', () => {
    expect(computeWatchDelta(undefined, undefined)).toBe(0);
    expect(computeWatchDelta(null, NaN)).toBe(0);
    expect(computeWatchDelta(0, -50)).toBe(0);
    expect(computeWatchDelta(0, 'abc')).toBe(0);
  });

  it('treats a negative stored previous position as zero, not as a negative offset', () => {
    // A negative previousPosition should never have been stored, but if it
    // somehow was, the delta must still be the honest gap to `now` (10),
    // not now - (-50) = 60. This isolates the guard on the PREVIOUS side —
    // a negative CURRENT position is already clipped to 0 by the outer
    // Math.max(0, ...) regardless of whether this inner guard works, so it
    // doesn't exercise the same code path.
    expect(computeWatchDelta(-50, 10)).toBe(10);
  });
});

describe('sanitizePosition', () => {
  it('passes through valid non-negative numbers', () => {
    expect(sanitizePosition(0)).toBe(0);
    expect(sanitizePosition(42)).toBe(42);
    expect(sanitizePosition('30')).toBe(30);
  });

  it('rejects negative values back to zero', () => {
    expect(sanitizePosition(-50)).toBe(0);
    expect(sanitizePosition(-1)).toBe(0);
  });

  it('rejects non-finite or non-numeric values back to zero', () => {
    expect(sanitizePosition('abc')).toBe(0);
    expect(sanitizePosition(NaN)).toBe(0);
    expect(sanitizePosition(Infinity)).toBe(0);
    expect(sanitizePosition(undefined)).toBe(0);
    expect(sanitizePosition(null)).toBe(0);
    expect(sanitizePosition({})).toBe(0);
  });
});

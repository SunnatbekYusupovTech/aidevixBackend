const { computeWatchDelta, MAX_DELTA_SECONDS } = require('../../utils/watchProgress');

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
});

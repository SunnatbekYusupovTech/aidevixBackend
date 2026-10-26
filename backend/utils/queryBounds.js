'use strict';

// MongoDB treats negative limits as abs(limit) with a single batch. Clamp BOTH
// ends, and bound page depth so a tiny HTTP request cannot request a huge skip.
const boundedLimit = (value, fallback = 20, max = 100) =>
  Math.min(max, Math.max(1, Number.parseInt(value, 10) || fallback));

const boundedPage = (value, max = 1000) =>
  Math.min(max, Math.max(1, Number.parseInt(value, 10) || 1));

module.exports = { boundedLimit, boundedPage };

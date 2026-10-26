'use strict';

// API responses can contain credentials, private profiles or paid content.
// Redis's explicit public catalog cache still works; browser/shared HTTP caches
// must never replay a previous user's response after logout or account switching.
module.exports = (_req, res, next) => {
  res.set('Cache-Control', 'private, no-store');
  next();
};

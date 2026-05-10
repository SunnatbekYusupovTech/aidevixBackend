const mongoose = require('mongoose');

/**
 * Active session — one document per (user, refresh-token-family).
 *
 * `refreshTokenHash` is rotated on every refresh; `absoluteExpiresAt` is the hard cap
 * set on first login and never extended by rotation (NIST 800-63B sliding-cap guidance).
 * `deviceHash` is the coarse SHA-256(UA + /24 IP) used for "is this a known device?"
 *
 * On logout / detected reuse, the document is deleted; the user can also revoke
 * an individual session from /api/sessions/:id.
 */
const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    refreshTokenHash: {
      type: String,
      required: true,
      select: false, // tasodifiy log/serializatsiyaga tushmasligi uchun
    },
    deviceHash: {
      type: String,
      default: null,
      index: true,
    },
    ip: { type: String, default: null },
    ua: { type: String, default: null },
    lastUsedAt: {
      type: Date,
      default: () => new Date(),
    },
    absoluteExpiresAt: {
      type: Date,
      required: true,
      // TTL index — Mongo evicts the doc once absolute cap passes.
      // Removes the need for a manual cleanup job.
      expires: 0,
    },
  },
  { timestamps: true }
);

sessionSchema.index({ userId: 1, lastUsedAt: -1 });

module.exports = mongoose.model('Session', sessionSchema);

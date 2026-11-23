/**
 * GDPR right-to-erasure — soft delete + PII anonymization.
 *
 * Soft delete: User document remains (FK integrity for courses/payments/etc.) but is anonymized.
 * Active sessions are revoked. Personal references (avatar, telegram link) cleared.
 * `deletedAt` set; downstream queries should filter out deleted accounts.
 *
 * Hard delete (full document removal) is reserved for admin tools and runs after 30 days.
 */
const crypto = require('crypto');
const User = require('../models/User');
const Session = require('../models/Session');
const MetodikaAccess = require('../models/MetodikaAccess');

const ANON_DOMAIN = 'deleted.aidevix.local';

const buildAnonEmail = (userId) =>
  `deleted-${String(userId)}-${crypto.randomBytes(4).toString('hex')}@${ANON_DOMAIN}`;

const buildAnonUsername = (userId) =>
  `deleted_${String(userId).slice(-8)}_${crypto.randomBytes(2).toString('hex')}`;

/**
 * Soft-delete + anonymize. Returns the updated (anonymized) user doc.
 *
 * @param {string} userId
 * @param {'self' | 'admin' | string} requestedBy
 */
const softDeleteUser = async (userId, requestedBy = 'self') => {
  const anonEmail = buildAnonEmail(userId);
  const anonUsername = buildAnonUsername(userId);

  const updated = await User.findByIdAndUpdate(
    userId,
    {
      $set: {
        email: anonEmail,
        username: anonUsername,
        firstName: null,
        lastName: null,
        avatar: null,
        googleId: null,
        telegramUserId: null,
        telegramChatId: null,
        socialSubscriptions: {
          instagram: { subscribed: false, username: null, verifiedAt: null },
          telegram: { subscribed: false, username: null, telegramUserId: null, verifiedAt: null },
        },
        password: null,
        refreshToken: null,
        passwordHistory: [],
        emailVerificationCode: null,
        emailVerificationExpire: null,
        resetPasswordCode: null,
        resetPasswordExpire: null,
        resetTokenHash: null,
        resetTokenExpire: null,
        totpSecret: null,
        totpPendingSecret: null,
        totpBackupCodes: [],
        totpEnabled: false,
        knownDevices: [],
        lastLoginIp: null,
        lastLoginUa: null,
        isActive: false,
        deletedAt: new Date(),
        deletedBy: String(requestedBy),
      },
      // Bump tokenVersion so any in-flight tokens are immediately invalidated.
      $inc: { tokenVersion: 1 },
    },
    { new: true }
  );

  // Revoke all sessions
  await Session.deleteMany({ userId });
  // Maxfiy metodika ruxsati akkaunt bilan birga yo'qoladi.
  await MetodikaAccess.deleteMany({ user: userId });

  return updated;
};

module.exports = { softDeleteUser };

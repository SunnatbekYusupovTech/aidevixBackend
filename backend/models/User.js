const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [50, 'Username cannot exceed 50 characters'],
  },
  firstName: {
    type: String,
    default: null,
    maxlength: [64, 'First name cannot exceed 64 characters'],
    trim: true,
  },
  lastName: {
    type: String,
    default: null,
    maxlength: [64, 'Last name cannot exceed 64 characters'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email'],
  },
  googleId: {
    type: String,
    default: null,
    index: true,
    sparse: true,
  },
  password: {
    type: String,
    required: function () { return !this.googleId; },
    minlength: [8, 'Password must be at least 8 characters'],
    select: false,
  },
  refreshToken: {
    type: String,
    select: false,
  },
  // Last N bcrypt hashes — newest first. ASVS V2.1.10 (no reuse).
  passwordHistory: {
    type: [String],
    default: [],
    select: false,
  },
  tokenVersion: {
    type: Number,
    default: 0,
    select: false,
  },
  passwordChangedAt: {
    type: Date,
    default: null,
    select: false,
  },
  failedLoginAttempts: {
    type: Number,
    default: 0,
    select: false,
  },
  lockUntil: {
    type: Date,
    default: null,
    select: false,
  },
  // Anomaly detection — coarse device fingerprint hashes (SHA-256 of UA + /24 IP).
  knownDevices: {
    type: [String],
    default: [],
    select: false,
  },
  lastLoginIp: {
    type: String,
    default: null,
    select: false,
  },
  lastLoginUa: {
    type: String,
    default: null,
    select: false,
  },
  // GDPR right-to-erasure — soft-delete + anonymization
  deletedAt: {
    type: Date,
    default: null,
    select: false,
    index: true,
  },
  deletedBy: {
    type: String,
    default: null,
    select: false,
  },
  emailVerificationAttempts: {
    type: Number,
    default: 0,
    select: false,
  },
  resetPasswordAttempts: {
    type: Number,
    default: 0,
    select: false,
  },
  socialSubscriptions: {
    instagram: {
      subscribed: {
        type: Boolean,
        default: false,
      },
      username: {
        type: String,
        default: null,
      },
      verifiedAt: {
        type: Date,
        default: null,
      },
    },
    telegram: {
      subscribed: {
        type: Boolean,
        default: false,
      },
      username: {
        type: String,
        default: null,
      },
      telegramUserId: {
        type: String,
        default: null,
      },
      verifiedAt: {
        type: Date,
        default: null,
      },
    },
  },
  // Global AI Pro access (separate from course enrollments)
  proSubscription: {
    active: {
      type: Boolean,
      default: false,
    },
    plan: {
      type: String,
      default: 'ai_pro',
    },
    amount: {
      type: Number,
      default: 0,
      min: 0,
    },
    purchasedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    sourcePaymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      default: null,
    },
  },
  // Instructor profili uchun (Course Details sahifasida ko'rsatiladi)
  jobTitle: {
    type: String,
    default: null,
    maxlength: 100,
  },
  position: {
    type: String,
    default: null,
    maxlength: 150,
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  // Telegram bot bildirishnomalar uchun
  telegramUserId: {
    type: String,
    default: null,
  },
  telegramChatId: {
    type: String,
    default: null,
  },
  // Email verification
  emailVerified: {
    type: Boolean,
    default: false,
  },
  emailVerificationCode: {
    type: String,
    default: null,
    select: false,
  },
  emailVerificationExpire: {
    type: Date,
    default: null,
    select: false,
  },
  resetPasswordCode: {
    type: String,
    default: null,
    select: false,
  },
  resetPasswordExpire: {
    type: Date,
    default: null,
    select: false,
  },
  resetTokenHash: {
    type: String,
    default: null,
    select: false,
  },
  resetTokenExpire: {
    type: Date,
    default: null,
    select: false,
  },
  // TOTP 2FA — REQUIRED for admins, optional for users
  totpEnabled: {
    type: Boolean,
    default: false,
  },
  totpSecret: {
    type: String,
    default: null,
    select: false,
  },
  // Pending secret during enrollment (before user verifies first code)
  totpPendingSecret: {
    type: String,
    default: null,
    select: false,
  },
  // SHA-256 hashes of single-use backup codes (10 codes generated on enable)
  totpBackupCodes: {
    type: [String],
    default: [],
    select: false,
  },
  // Avatar rasm URL
  avatar: {
    type: String,
    default: null,
  },
  lastLogin: {
    type: Date,
    default: null,
  },
  lastClaimedDaily: {
    type: Date,
    default: null,
  },
  // --- GAMIFICATION & REFERRAL ---
  xp: {
    type: Number,
    default: 0,
  },
  streak: {
    type: Number,
    default: 0,
  },
  rankTitle: {
    type: String,
    enum: ['AMATEUR', 'CANDIDATE', 'JUNIOR', 'MIDDLE', 'SENIOR', 'MASTER', 'LEGEND'],
    default: 'AMATEUR',
  },
  referralCode: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  referralsCount: {
    type: Number,
    default: 0,
  },
  // Set to true the first time the referral bonus pays out (after email verify),
  // so we never double-pay the inviter if verifyEmailPublic runs more than once.
  referralRewarded: {
    type: Boolean,
    default: false,
  },
  // --- AI TOOLS STACK ---
  aiStack: [{
    type: String,
    enum: ['Claude Code', 'Cursor', 'GitHub Copilot', 'ChatGPT', 'Gemini', 'Windsurf', 'Devin', 'Replit AI', 'Codeium', 'Other'],
  }],
}, {
  timestamps: true,
});

userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ isActive: 1 });
userSchema.index({ email: 1, isActive: 1 });
userSchema.index({ xp: -1 });
userSchema.index({ telegramUserId: 1 }, { sparse: true });
// userSchema.index({ referralCode: 1 }, { sparse: true }); // Duplicate index removed

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  // Safety guard — without `+tokenVersion` selected the field is undefined here,
  // and the increment below would reset it to 1, breaking session invalidation.
  // New documents (register) start at default 0, so they're allowed.
  if (!this.isNew && this.tokenVersion === undefined) {
    return next(new Error(
      'tokenVersion must be loaded before changing password — use .select("+tokenVersion")'
    ));
  }
  try {
    // Capture old bcrypt hash into passwordHistory before overwriting.
    // Skipped for new docs (no prior hash) and when password is being cleared (e.g., GDPR delete).
    if (!this.isNew && this.password) {
      const existing = await this.constructor
        .findById(this._id)
        .select('+password +passwordHistory');
      if (existing?.password) {
        const next5 = [existing.password, ...(existing.passwordHistory || [])].slice(0, 5);
        this.passwordHistory = next5;
      }
    }

    this.password = await bcrypt.hash(this.password, 14);
    this.passwordChangedAt = new Date();
    this.tokenVersion = (this.tokenVersion || 0) + 1;
    this.failedLoginAttempts = 0;
    this.lockUntil = null;
    next();
  } catch (err) {
    next(err);
  }
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.isLocked = function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

userSchema.methods.registerFailedLogin = async function () {
  const MAX_ATTEMPTS = 5;
  const LOCK_DURATION_MS = 15 * 60 * 1000;
  if (this.lockUntil && this.lockUntil < Date.now()) {
    this.failedLoginAttempts = 1;
    this.lockUntil = null;
  } else {
    this.failedLoginAttempts = (this.failedLoginAttempts || 0) + 1;
    if (this.failedLoginAttempts >= MAX_ATTEMPTS) {
      this.lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
    }
  }
  await this.save({ validateModifiedOnly: true });
};

userSchema.methods.resetLoginAttempts = async function () {
  if (this.failedLoginAttempts === 0 && !this.lockUntil) return;
  this.failedLoginAttempts = 0;
  this.lockUntil = null;
  await this.save({ validateModifiedOnly: true });
};

// Check if user has all required subscriptions
userSchema.methods.hasAllSubscriptions = function () {
  return this.socialSubscriptions.instagram.subscribed &&
         this.socialSubscriptions.telegram.subscribed;
};

userSchema.methods.hasActivePro = function () {
  if (!this.proSubscription?.active) return false;
  if (!this.proSubscription?.expiresAt) return true;
  return this.proSubscription.expiresAt.getTime() > Date.now();
};

module.exports = mongoose.model('User', userSchema);

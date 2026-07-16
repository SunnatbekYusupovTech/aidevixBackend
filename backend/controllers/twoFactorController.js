const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const asyncHandler = require('../middleware/asyncHandler');
const ErrorResponse = require('../utils/errorResponse');
const securityLogger = require('../utils/securityLogger');
const { hashToken, safeEqual } = require('../utils/authSecurity');
const { encryptSecret, decryptSecret } = require('../utils/totpCrypto');

const ISSUER = 'Aidevix';
const BACKUP_CODE_COUNT = 10;
const BACKUP_CODE_BYTES = 5; // 5 bytes → 10 hex chars

const generateBackupCodes = () => {
  const codes = [];
  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    codes.push(crypto.randomBytes(BACKUP_CODE_BYTES).toString('hex').toUpperCase());
  }
  return codes;
};

// Secret DB'da shifrlangan bo'lishi mumkin (enc:v1:...) — avval decrypt qilamiz.
// Legacy plaintext secret'lar o'zgarishsiz o'tadi (decryptSecret prefiksni tekshiradi).
const verifyTotpCode = (secret, code) => {
  const plain = decryptSecret(secret);
  if (!plain) return false;
  return speakeasy.totp.verify({
    secret: plain,
    encoding: 'base32',
    token: String(code).replace(/\s+/g, ''),
    window: 1, // ±30s clock drift
  });
};

// @desc    Begin 2FA enrollment — generate secret + QR code (NOT yet enabled)
const setup2FA = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id).select('+totpEnabled +totpPendingSecret');
  if (!user) return next(new ErrorResponse('User not found', 404));

  if (user.totpEnabled) {
    return next(new ErrorResponse('2FA allaqachon yoqilgan. Avval o\'chiring.', 400));
  }

  const secret = speakeasy.generateSecret({
    name: `${ISSUER} (${user.email})`,
    issuer: ISSUER,
    length: 20,
  });

  // At-rest shifrlash (TOTP_ENC_KEY bor bo'lsa). Client'ga qaytariladigan secret.base32
  // plaintext qoladi (QR/manual entry uchun) — faqat DB'dagi nusxa shifrlanadi.
  await User.updateOne(
    { _id: user._id },
    { $set: { totpPendingSecret: encryptSecret(secret.base32) } }
  );

  const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url);

  securityLogger.suspicious(req, '2fa_setup_started', { userId: String(user._id) });

  res.json({
    success: true,
    data: {
      secret: secret.base32, // for manual entry
      otpauthUrl: secret.otpauth_url,
      qrCodeDataUrl,
    },
  });
});

// @desc    Confirm enrollment — verify first code, enable 2FA, issue backup codes
const enable2FA = asyncHandler(async (req, res, next) => {
  const { code } = req.body;
  if (!code) return next(new ErrorResponse('TOTP kodi majburiy', 400));

  const user = await User.findById(req.user._id).select(
    '+totpEnabled +totpPendingSecret +totpSecret +totpBackupCodes'
  );
  if (!user) return next(new ErrorResponse('User not found', 404));

  if (user.totpEnabled) {
    return next(new ErrorResponse('2FA allaqachon yoqilgan', 400));
  }
  if (!user.totpPendingSecret) {
    return next(new ErrorResponse('Avval /2fa/setup chaqiring', 400));
  }

  const ok = verifyTotpCode(user.totpPendingSecret, code);
  if (!ok) {
    securityLogger.suspicious(req, '2fa_enable_wrong_code', { userId: String(user._id) });
    return next(new ErrorResponse('TOTP kodi noto\'g\'ri', 400));
  }

  const backupCodes = generateBackupCodes();
  const hashedBackupCodes = backupCodes.map(hashToken);

  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        totpEnabled: true,
        totpSecret: user.totpPendingSecret,
        totpPendingSecret: null,
        totpBackupCodes: hashedBackupCodes,
      },
    }
  );

  securityLogger.suspicious(req, '2fa_enabled', { userId: String(user._id) });

  res.json({
    success: true,
    message: '2FA muvaffaqiyatli yoqildi. Backup kodlarni xavfsiz joyda saqlang — qaytarib ko\'rsatilmaydi.',
    data: { backupCodes },
  });
});

// @desc    Disable 2FA — requires current password + valid TOTP/backup code
const disable2FA = asyncHandler(async (req, res, next) => {
  const { password, code } = req.body;
  if (!password || !code) {
    return next(new ErrorResponse('Parol va TOTP kodi majburiy', 400));
  }

  const user = await User.findById(req.user._id).select(
    '+password +totpEnabled +totpSecret +totpBackupCodes'
  );
  if (!user) return next(new ErrorResponse('User not found', 404));
  if (!user.totpEnabled) return next(new ErrorResponse('2FA yoqilmagan', 400));

  const passOk = user.password ? await bcrypt.compare(password, user.password) : false;
  if (!passOk) {
    securityLogger.suspicious(req, '2fa_disable_wrong_password', { userId: String(user._id) });
    return next(new ErrorResponse('Parol noto\'g\'ri', 401));
  }

  const totpOk = verifyTotpCode(user.totpSecret, code);
  let backupOk = false;
  if (!totpOk) {
    const codeHash = hashToken(String(code).toUpperCase().replace(/\s+/g, ''));
    backupOk = (user.totpBackupCodes || []).some((h) => safeEqual(h, codeHash));
  }
  if (!totpOk && !backupOk) {
    securityLogger.suspicious(req, '2fa_disable_wrong_code', { userId: String(user._id) });
    return next(new ErrorResponse('TOTP kodi noto\'g\'ri', 401));
  }

  // Admin role-based hard requirement: prevent disabling for admins via this endpoint
  if (user.role === 'admin') {
    return next(new ErrorResponse('Admin hisoblar uchun 2FA majburiy. O\'chirib bo\'lmaydi.', 403));
  }

  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        totpEnabled: false,
        totpSecret: null,
        totpPendingSecret: null,
        totpBackupCodes: [],
      },
    }
  );

  securityLogger.suspicious(req, '2fa_disabled', { userId: String(user._id) });

  res.json({ success: true, message: '2FA o\'chirildi' });
});

// @desc    Regenerate backup codes — invalidates old ones
const regenerateBackupCodes = asyncHandler(async (req, res, next) => {
  const { code } = req.body;
  if (!code) return next(new ErrorResponse('TOTP kodi majburiy', 400));

  const user = await User.findById(req.user._id).select('+totpEnabled +totpSecret +totpBackupCodes');
  if (!user || !user.totpEnabled) {
    return next(new ErrorResponse('2FA yoqilmagan', 400));
  }

  const ok = verifyTotpCode(user.totpSecret, code);
  if (!ok) return next(new ErrorResponse('TOTP kodi noto\'g\'ri', 401));

  const backupCodes = generateBackupCodes();
  const hashedBackupCodes = backupCodes.map(hashToken);
  await User.updateOne(
    { _id: user._id },
    { $set: { totpBackupCodes: hashedBackupCodes } }
  );

  securityLogger.suspicious(req, '2fa_backup_regenerated', { userId: String(user._id) });

  res.json({
    success: true,
    message: 'Backup kodlar yangilandi. Eskilari endi ishlamaydi.',
    data: { backupCodes },
  });
});

module.exports = {
  setup2FA,
  enable2FA,
  disable2FA,
  regenerateBackupCodes,
  // exported helpers for login flow
  verifyTotpCode,
  generateBackupCodes,
};

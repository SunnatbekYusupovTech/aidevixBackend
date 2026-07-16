const crypto = require('crypto');

/**
 * TOTP secret'larni at-rest shifrlash (AES-256-GCM).
 *
 * Sabab: totpSecret DB'da base32 plaintext saqlansa, DB dump/backup leak bo'lsa
 * hujumchi barcha 2FA foydalanuvchilar uchun joriy kodlarni generatsiya qila oladi
 * → 2FA butunlay bekor bo'ladi.
 *
 * Backward-compatible LAZY migration:
 *   - TOTP_ENC_KEY o'rnatilmagan  → plaintext qaytariladi (dev / eski xatti-harakat).
 *   - Shifrlangan qiymat "enc:v1:" bilan boshlanadi; decrypt uni taniydi.
 *   - Eski plaintext secret "enc:v1:" bilan boshlanmaydi → o'sha holicha o'qiladi.
 * Shuning uchun mavjud secret'lar buzilmaydi; yangilari (key bor bo'lsa) shifrlanadi.
 *
 * TOTP_ENC_KEY = 64 hex belgi (32 bayt). Generatsiya:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */

const PREFIX = 'enc:v1:';

const getKey = () => {
  const hex = process.env.TOTP_ENC_KEY;
  if (!hex) return null;
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    console.warn('⚠️  TOTP_ENC_KEY yaroqsiz (64 hex belgi bo\'lishi kerak) — shifrlash o\'chirildi.');
    return null;
  }
  return Buffer.from(hex, 'hex');
};

const encryptSecret = (plain) => {
  const key = getKey();
  if (!key || !plain) return plain; // key yo'q → backward-compatible plaintext
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
};

const decryptSecret = (stored) => {
  if (!stored || !String(stored).startsWith(PREFIX)) return stored; // legacy plaintext
  const key = getKey();
  if (!key) {
    // Shifrlangan, lekin key yo'q — o'qib bo'lmaydi. Signal qaytaramiz.
    console.error('[totpCrypto] Shifrlangan TOTP secret, lekin TOTP_ENC_KEY yo\'q.');
    return null;
  }
  try {
    // PREFIX ('enc:v1:') ichida ikki nuqta bor — avval uni olib tashlaymiz,
    // keyin iv:tag:ct bo'yicha bo'lamiz.
    const [ivHex, tagHex, ctHex] = String(stored).slice(PREFIX.length).split(':');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    return Buffer.concat([decipher.update(Buffer.from(ctHex, 'hex')), decipher.final()]).toString('utf8');
  } catch (e) {
    console.error('[totpCrypto] decrypt xatosi:', e.message);
    return null;
  }
};

module.exports = { encryptSecret, decryptSecret };

const User = require('../models/User');
const VerifyToken = require('../models/VerifyToken');
const crypto = require('crypto');
const { verifyInstagramSubscription, verifyTelegramSubscription, checkTelegramSubscription } = require('../utils/socialVerification');
const { invalidate: invalidateCache } = require('../utils/subscriptionCache');
const { validateInitData } = require('../utils/telegramWebAppAuth');

// Verify Instagram subscription
const verifyInstagram = async (req, res) => {
  try {
    const { username } = req.body;
    const userId = req.user._id;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Instagram username is required.',
      });
    }

    // Verify subscription
    const verification = await verifyInstagramSubscription(username, userId);

    // Update user's Instagram subscription status
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    // PAY-02: Instagram'ni API bilan tekshirib bo'lmaydi — 'self_reported' deb belgilanadi.
    user.socialSubscriptions.instagram = {
      subscribed: verification.subscribed,
      username: verification.username,
      verifiedAt: verification.verifiedAt,
      verificationSource: verification.verificationSource || null,
    };
    await user.save();
    invalidateCache(userId); // Cache tozalash — keyingi checkda yangi holat yuklanadi

    // Telegram admin bildirishnoma
    if (verification.subscribed) {
      try {
        const { getBot } = require('../utils/telegramBot');
        const bot = getBot();
        if (bot) bot.notifySubscriptionVerified(user, 'instagram');
      } catch (_) {}
    }

    res.json({
      success: true,
      message: verification.subscribed
        ? 'Instagram subscription verified successfully.'
        : 'Instagram subscription verification failed.',
      data: {
        subscriptions: user.socialSubscriptions,
        instagram: user.socialSubscriptions.instagram,
        telegram: user.socialSubscriptions.telegram,
        hasAllSubscriptions: user.hasAllSubscriptions(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error verifying Instagram subscription.',
      error: error.message,
    });
  }
};

// Boshqa akkauntlardagi ISBOTSIZ (faqat socialSubscriptions'da, top-level telegramUserId'siz)
// da'volarni bekor qiladi — haqiqiy egasi (bot / initData bilan isbotlagan) ulanayotganda.
// Tarixan verify-telegram client yuborgan istalgan ID'ni shu maydonga yozgan.
const releaseUnprovenTelegramClaims = async (tgId, exceptUserId) => {
  const result = await User.updateMany(
    {
      _id: { $ne: exceptUserId },
      'socialSubscriptions.telegram.telegramUserId': tgId,
      telegramUserId: { $ne: tgId },
    },
    {
      $set: {
        'socialSubscriptions.telegram.telegramUserId': null,
        'socialSubscriptions.telegram.subscribed': false,
        'socialSubscriptions.telegram.verifiedAt': null,
      },
    }
  );
  if (result && result.modifiedCount > 0) {
    console.warn(`[telegram-link] ${result.modifiedCount} ta isbotsiz Telegram da'vosi bekor qilindi`);
  }
};

// AUTH-05 / PAY-02 / D27: Telegram ID faqat egalik isboti bilan qabul qilinadi.
// Isbot manbalari: (1) HMAC bilan tekshirilgan Mini App initData (body.initData),
// (2) bot deep-link token oqimi (linkTelegramByToken) orqali allaqachon bog'langan
// top-level user.telegramUserId. Client yuborgan xom `telegramUserId` HECH QACHON ishonilmaydi.
// Qaytaradi: { telegramUserId, username } | { error: {status, message} }
const resolveProvenTelegramIdentity = async (req, user) => {
  const { initData } = req.body || {};
  if (initData) {
    if (typeof initData !== 'string' || initData.length > 8000) {
      return { error: { status: 400, message: 'initData yaroqsiz' } };
    }
    const result = validateInitData(initData);
    if (!result.valid) {
      return { error: { status: 401, message: `Telegram tasdiqlash rad etildi (${result.reason})` } };
    }
    const tgId = String(result.user.id);
    if (user.telegramUserId && user.telegramUserId !== tgId) {
      // Mavjud boshqa link ustidan yozilmaydi — avval eski link olib tashlanishi kerak.
      return { error: { status: 409, message: 'Hisobingizga boshqa Telegram hisob allaqachon ulangan.' } };
    }
    const taken = await User.findOne({ _id: { $ne: user._id }, telegramUserId: tgId }).select('_id').lean();
    if (taken) {
      return { error: { status: 409, message: 'Bu Telegram hisob allaqachon boshqa foydalanuvchiga bog\'langan' } };
    }
    await releaseUnprovenTelegramClaims(tgId, user._id);
    return { telegramUserId: tgId, username: result.user.username || null, fromInitData: true };
  }
  if (user.telegramUserId) {
    return { telegramUserId: String(user.telegramUserId), username: null, fromInitData: false };
  }
  return {
    error: {
      status: 400,
      message: 'Telegram hisobingizni avval bot orqali ulang (GET /api/subscriptions/generate-token) yoki Telegram Mini App ichidan tasdiqlang.',
    },
  };
};

// Verify Telegram subscription
const verifyTelegram = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const proof = await resolveProvenTelegramIdentity(req, user);
    if (proof.error) {
      return res.status(proof.error.status).json({ success: false, message: proof.error.message });
    }
    const telegramUserId = proof.telegramUserId;
    // Username: tasdiqlangan manba (initData / bot link) ustun; aks holda body'dagi qiymat
    // faqat ko'rsatish uchun (ID allaqachon isbotlangan akkauntga tegishli).
    const bodyUsername = String(req.body?.username || '').trim().replace(/^@/, '').toLowerCase().slice(0, 64) || null;
    const username = (proof.username && String(proof.username).toLowerCase())
      || user.socialSubscriptions?.telegram?.username
      || bodyUsername;

    const channelUsername = process.env.TELEGRAM_CHANNEL_USERNAME;

    // Verify subscription
    const verification = await verifyTelegramSubscription(username, telegramUserId, channelUsername);

    // Update user's Telegram subscription status
    if (proof.fromInitData && !user.telegramUserId) {
      user.telegramUserId = telegramUserId;
      user.telegramChatId = telegramUserId;
    }
    user.socialSubscriptions.telegram = {
      subscribed: verification.subscribed,
      username: verification.username,
      telegramUserId: telegramUserId,
      verifiedAt: verification.verifiedAt,
    };
    await user.save();
    invalidateCache(userId); // Cache tozalash

    // Telegram admin bildirishnoma
    if (verification.subscribed) {
      try {
        const { getBot } = require('../utils/telegramBot');
        const bot = getBot();
        if (bot) bot.notifySubscriptionVerified(user, 'telegram');
      } catch (_) {}
    }

    res.json({
      success: true,
      message: verification.subscribed
        ? 'Telegram subscription verified successfully.'
        : 'Telegram subscription verification failed.',
      data: {
        subscriptions: user.socialSubscriptions,
        instagram: user.socialSubscriptions.instagram,
        telegram: user.socialSubscriptions.telegram,
        hasAllSubscriptions: user.hasAllSubscriptions(),
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('[verifyTelegram]', error);
    }
    res.status(500).json({
      success: false,
      message: 'Error verifying Telegram subscription.',
    });
  }
};

// Get subscription status (with real-time Telegram re-check)
const getSubscriptionStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const telegramData = user.socialSubscriptions?.telegram;
    // PAY-02: faqat isbot bilan bog'langan top-level ID (socialSubscriptions ID tarixan client da'vosi)
    const telegramId = user.telegramUserId || null;

    // Telegram ID mavjud bo'lsa, har doim real-time tekshiramiz
    if (telegramId) {
      const result = await checkTelegramSubscription(telegramId);
      if (result.checked) {
        const wasSubscribed = telegramData?.subscribed;
        if (wasSubscribed && !result.subscribed) {
          // Obuna bekor qilingan — DB ni yangilash
          user.socialSubscriptions.telegram.subscribed = false;
          user.socialSubscriptions.telegram.verifiedAt = null;
          await user.save();
          invalidateCache(user._id);
        } else if (!wasSubscribed && result.subscribed) {
          // Qayta obuna bo'lgan — DB ni yangilash
          user.socialSubscriptions.telegram.subscribed = true;
          user.socialSubscriptions.telegram.verifiedAt = new Date();
          await user.save();
          invalidateCache(user._id);
        }
      }
    }

    res.json({
      success: true,
      data: {
        subscriptions: user.socialSubscriptions,
        instagram: user.socialSubscriptions.instagram,
        telegram: user.socialSubscriptions.telegram,
        hasAllSubscriptions: user.hasAllSubscriptions(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching subscription status.',
      error: error.message,
    });
  }
};

// Telegram ID saqlash — AUTH-05/D27: faqat HMAC bilan tekshirilgan Mini App initData orqali.
// Xom `telegramUserId` (egalik isbotisiz) endi qabul qilinmaydi.
const setTelegramId = async (req, res) => {
  try {
    if (!req.body?.initData) {
      return res.status(400).json({
        success: false,
        message: 'Telegram ID faqat tasdiqlangan holda ulanadi: bot havolasi (generate-token) yoki Telegram Mini App initData orqali.',
      });
    }
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const proof = await resolveProvenTelegramIdentity(req, user);
    if (proof.error) {
      return res.status(proof.error.status).json({ success: false, message: proof.error.message });
    }
    const tgId = proof.telegramUserId;
    await User.updateOne(
      { _id: req.user._id, $or: [{ telegramUserId: null }, { telegramUserId: tgId }] },
      { $set: { telegramUserId: tgId, telegramChatId: tgId } }
    );
    invalidateCache(req.user._id);
    res.json({ success: true, message: 'Telegram ID saqlandi' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server xatosi' });
  }
};

// Real-time obuna holati
const getRealtimeStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    // PAY-02: faqat isbot bilan bog'langan top-level ID
    const telegramId = user.telegramUserId || null;
    const instagramOk = user.socialSubscriptions?.instagram?.subscribed || false;

    if (!telegramId) {
      return res.json({
        success: true,
        data: { telegram: false, linked: false, instagram: instagramOk, telegramUserId: null },
      });
    }

    const result = await checkTelegramSubscription(telegramId);
    res.json({
      success: true,
      data: {
        telegram: result.subscribed,
        linked: true,
        instagram: instagramOk,
        telegramUserId: telegramId,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server xatosi' });
  }
};

// ═══════════════════════════════════════════════════════════════
// Avtomatik Telegram bog'lash uchun token yaratish (MongoDB persistent)
// ═══════════════════════════════════════════════════════════════
const generateVerifyToken = async (req, res) => {
  try {
    const userId = req.user._id;

    // Avvalgi tokenlarni o'chirish (shu user uchun)
    await VerifyToken.deleteMany({ userId });

    // Yangi token yaratish
    const token = crypto.randomBytes(16).toString('hex');
    await VerifyToken.create({ token, userId });

    res.json({
      success: true,
      data: { token, botUsername: process.env.TELEGRAM_BOT_USERNAME || 'aidevix_bot' },
    });
  } catch (err) {
    console.error('generateVerifyToken error:', err.message);
    res.status(500).json({ success: false, message: 'Token yaratishda xato' });
  }
};

// Bot tomonidan chaqiriladigan — tokenni Telegram ID bilan bog'lash
const linkTelegramByToken = async (token, telegramUserId, telegramUsername) => {
  try {
    const entry = await VerifyToken.findOne({ token });
    if (!entry) return false;

    const user = await User.findById(entry.userId);
    if (!user) return false;

    // Bu Telegram ID allaqachon boshqa accountga (isbot bilan, top-level) bog'liq bo'lmasligi kerak.
    // Bot update'idagi `from.id` Telegram tomonidan tasdiqlangan — bu egalik isboti.
    const existing = await User.findOne({
      _id: { $ne: user._id },
      telegramUserId: String(telegramUserId),
    }).select('_id').lean();
    if (existing) {
      console.warn('[linkTelegramByToken] Telegram ID allaqachon boshqa userga bog\'liq');
      return false;
    }
    // Isbotsiz eski da'volar (faqat socialSubscriptions'da) haqiqiy egani bloklamasligi kerak.
    await releaseUnprovenTelegramClaims(String(telegramUserId), user._id);

    // Telegram ID ni saqlash
    user.telegramUserId = String(telegramUserId);
    user.telegramChatId = String(telegramUserId);
    user.socialSubscriptions.telegram.telegramUserId = String(telegramUserId);
    user.socialSubscriptions.telegram.username = telegramUsername || 'telegram_user';

    // Kanalga obuna bormi darhol tekshirish
    const subResult = await checkTelegramSubscription(String(telegramUserId));
    if (subResult.subscribed) {
      user.socialSubscriptions.telegram.subscribed = true;
      user.socialSubscriptions.telegram.verifiedAt = new Date();

      // Admin bildirishnoma
      try {
        const { getBot } = require('../utils/telegramBot');
        const bot = getBot();
        if (bot) bot.notifySubscriptionVerified(user, 'telegram');
      } catch (_) {}
    }

    await user.save();
    invalidateCache(user._id);

    // Tokenni "linked" qilib belgilash (polling uchun)
    entry.linked = true;
    entry.telegramUserId = String(telegramUserId);
    entry.telegramUsername = telegramUsername;
    await entry.save();

    return true;
  } catch (err) {
    console.error('linkTelegramByToken error:', err.message);
    return false;
  }
};

// Frontend polling uchun — token bog'landimi va kanal obunasi bormi
const checkVerifyToken = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    // PAY-02: faqat isbot bilan bog'langan top-level ID
    const telegramId = user.telegramUserId || null;

    if (!telegramId) {
      // Token linked bo'lganini tekshirish (DB dan)
      const pendingToken = await VerifyToken.findOne({ userId: user._id, linked: true });
      if (pendingToken) {
        // Token linked, lekin user hali saqlanmagan (race condition)
        return res.json({ success: true, data: { linked: true, subscribed: false } });
      }
      return res.json({ success: true, data: { linked: false, subscribed: false } });
    }

    // Telegram kanalga obuna bormi tekshirish
    const subResult = await checkTelegramSubscription(telegramId);

    // Agar obuna bo'lsa DB ni yangilash
    if (subResult.checked && subResult.subscribed && !user.socialSubscriptions.telegram.subscribed) {
      user.socialSubscriptions.telegram.subscribed = true;
      user.socialSubscriptions.telegram.verifiedAt = new Date();
      await user.save();
      invalidateCache(user._id);

      // Admin bildirishnoma
      try {
        const { getBot } = require('../utils/telegramBot');
        const bot = getBot();
        if (bot) bot.notifySubscriptionVerified(user, 'telegram');
      } catch (_) {}
    }

    // API xato bo'lsa (checked=false) — DB dagi qiymatni qaytarish
    const isSubscribed = subResult.checked
      ? subResult.subscribed
      : user.socialSubscriptions.telegram.subscribed;

    res.json({
      success: true,
      data: {
        linked: true,
        subscribed: isSubscribed,
        /** Telegram API javob berdimi (false bo‘lsa, tarmoq xatosi — DB holatiga tayanamiz) */
        telegramApiChecked: subResult.checked,
        telegram: user.socialSubscriptions.telegram,
      },
    });
  } catch (err) {
    console.error('checkVerifyToken error:', err.message);
    res.status(500).json({ success: false, message: 'Tekshirishda xato' });
  }
};

module.exports = {
  verifyInstagram,
  verifyTelegram,
  getSubscriptionStatus,
  setTelegramId,
  getRealtimeStatus,
  generateVerifyToken,
  linkTelegramByToken,
  checkVerifyToken,
};

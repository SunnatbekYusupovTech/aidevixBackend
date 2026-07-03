const User = require('../models/User');
const VerifyToken = require('../models/VerifyToken');
const crypto = require('crypto');
const { verifyInstagramSubscription, verifyTelegramSubscription, checkTelegramSubscription } = require('../utils/socialVerification');
const { invalidate: invalidateCache } = require('../utils/subscriptionCache');

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
    user.socialSubscriptions.instagram = {
      subscribed: verification.subscribed,
      username: verification.username,
      verifiedAt: verification.verifiedAt,
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

// Verify Telegram subscription
const verifyTelegram = async (req, res) => {
  try {
    const { username, telegramUserId } = req.body;
    const userId = req.user._id;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Telegram username is required.',
      });
    }

    if (!telegramUserId) {
      return res.status(400).json({
        success: false,
        message: 'Telegram User ID is required for real-time verification.',
      });
    }

    // Telegram user IDs are positive integers only
    if (!/^\d{5,15}$/.test(String(telegramUserId))) {
      return res.status(400).json({
        success: false,
        message: 'Noto\'g\'ri Telegram ID formati.',
      });
    }

    const channelUsername = process.env.TELEGRAM_CHANNEL_USERNAME;

    // Verify subscription
    const verification = await verifyTelegramSubscription(username, telegramUserId, channelUsername);

    // Update user's Telegram subscription status
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
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
    const telegramId = user.telegramUserId || telegramData?.telegramUserId;

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

// Telegram ID saqlash
const setTelegramId = async (req, res) => {
  try {
    const { telegramUserId } = req.body;
    if (!telegramUserId) return res.status(400).json({ success: false, message: 'Telegram ID kiritilmadi' });
    const tgId = String(telegramUserId);
    // IDOR himoyasi: bu Telegram ID allaqachon boshqa userga bog'langan bo'lsa rad etamiz
    const taken = await User.findOne({ _id: { $ne: req.user._id }, telegramUserId: tgId }).select('_id').lean();
    if (taken) {
      return res.status(409).json({ success: false, message: 'Bu Telegram hisob allaqachon boshqa foydalanuvchiga bog\'langan' });
    }
    await User.findByIdAndUpdate(req.user._id, { telegramUserId: tgId });
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
    const telegramId = user.telegramUserId || user.socialSubscriptions?.telegram?.telegramUserId;
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

    // Bu Telegram ID allaqachon boshqa accountga bog'liq bo'lmasligi kerak
    const existing = await User.findOne({
      _id: { $ne: user._id },
      $or: [
        { telegramUserId: String(telegramUserId) },
        { 'socialSubscriptions.telegram.telegramUserId': String(telegramUserId) },
      ],
    });
    if (existing) {
      console.warn(`[linkTelegramByToken] Telegram ID ${telegramUserId} allaqachon boshqa userga bog'liq`);
      return false;
    }

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
    const telegramId = user.telegramUserId || user.socialSubscriptions?.telegram?.telegramUserId;

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

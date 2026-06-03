const User = require('../models/User');
const { performSubscriptionCheck } = require('../utils/checkSubscriptions');

/**
 * Promptlar matnini ko'rish — faqat kirgan va Telegram kanal obunasi tasdiqlangan foydalanuvchilar.
 * Oldindan `authenticate` ishlatilishi kerak.
 */
const requireTelegramForPromptsRead = async (req, res, next) => {
  try {
    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        code: 'AUTH_REQUIRED',
        message: 'Promptlarni ko\'rish uchun tizimga kiring.',
      });
    }

    if (req.user.role === 'admin') {
      return next();
    }

    const user = await User.findById(req.user._id).select('socialSubscriptions role');
    if (!user) {
      return res.status(401).json({
        success: false,
        code: 'AUTH_REQUIRED',
        message: 'Tizimga kiring.',
      });
    }
    const { instagramSubscribed, telegramSubscribed, changed } = await performSubscriptionCheck(user);
    if (changed) await user.save();

    if (!instagramSubscribed || !telegramSubscribed) {
      return res.status(403).json({
        success: false,
        code: 'SOCIAL_SUBSCRIPTION_REQUIRED',
        isSubscriptionError: true,
        message: 'Promptlarni ko\'rish uchun Telegram va Instagram obunasi talab qilinadi.',
        subscriptions: {
          instagram: instagramSubscribed,
          telegram: telegramSubscribed,
        },
      });
    }

    next();
  } catch (err) {
    console.error('[prompt-sub-check]', err);
    return res.status(500).json({ success: false, message: 'Server xatosi' });
  }
};

module.exports = requireTelegramForPromptsRead;

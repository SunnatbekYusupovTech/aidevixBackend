const User = require('../models/User');
const { performSubscriptionCheck } = require('../utils/checkSubscriptions');

/**
 * Middleware to check if user has subscribed to required social media platforms
 * This performs a real-time check to ensure user is currently subscribed
 */
const checkSubscriptions = async (req, res, next) => {
  try {
    // P-B06: authenticate allaqachon to'liq (hydrated) User hujjatini yuklagan — qayta so'rov yo'q.
    const user = typeof req.user?.save === 'function' ? req.user : await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    // Try real-time verification with Failsafe
    try {
      const { instagramSubscribed, telegramSubscribed, changed } = await performSubscriptionCheck(user);

      if (changed) {
        await user.save();
      }

      if (!instagramSubscribed || !telegramSubscribed) {
        const missingSubscriptions = [];
        if (!instagramSubscribed) missingSubscriptions.push('Instagram');
        if (!telegramSubscribed) missingSubscriptions.push('Telegram');

        return res.status(403).json({
          success: false,
          isSubscriptionError: true,
          message: `Darsni davom ettirish uchun ijtimoiy tarmoqlarga obuna bo'lishingiz kerak.`,
          subscriptions: {
            instagram: instagramSubscribed,
            telegram: telegramSubscribed,
          },
          missingSubscriptions,
        });
      }

      req.user = user;
      next();
    } catch (checkError) {
      console.error('CRITICAL: Subscription Check Failed:', checkError.message);
      return res.status(503).json({
        success: false,
        isSubscriptionError: true,
        message: 'Subscription verification service is temporarily unavailable. Please try again shortly.',
      });
    }
  } catch (error) {
    console.error('Global Subscription Middleware Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server xatosi (Subscription check).',
    });
  }
};

module.exports = {
  checkSubscriptions,
};

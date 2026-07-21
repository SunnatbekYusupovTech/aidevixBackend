const PushSubscription = require('../models/PushSubscription');

const isProd = process.env.NODE_ENV === 'production';

/** @desc  VAPID public key | @route GET /api/push/vapid-public-key | @access Public */
const getVapidKey = (req, res) => {
  const publicKey = process.env.VAPID_PUBLIC_KEY || null;
  res.json({ success: true, data: { publicKey } });
};

/** @desc  Push obunasini saqlash | @route POST /api/push/subscribe | @access Private */
const subscribe = async (req, res) => {
  try {
    const { endpoint, keys } = req.body || {};

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({ success: false, message: 'Yaroqsiz obuna ma\'lumoti' });
    }

    const userAgent = String(req.headers['user-agent'] || '').slice(0, 300);

    await PushSubscription.findOneAndUpdate(
      { endpoint },
      {
        $set: {
          userId: req.user._id,
          endpoint,
          keys: { p256dh: keys.p256dh, auth: keys.auth },
          userAgent,
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, message: 'Bildirishnomalar yoqildi' });
  } catch (err) {
    res.status(500).json({ success: false, message: isProd ? 'Server xatosi' : err.message });
  }
};

/** @desc  Push obunasini o'chirish | @route POST /api/push/unsubscribe | @access Private */
const unsubscribe = async (req, res) => {
  try {
    const { endpoint } = req.body || {};
    if (!endpoint) {
      return res.status(400).json({ success: false, message: 'Endpoint majburiy' });
    }

    await PushSubscription.deleteOne({ endpoint, userId: req.user._id });

    res.json({ success: true, message: 'Bildirishnomalar o\'chirildi' });
  } catch (err) {
    res.status(500).json({ success: false, message: isProd ? 'Server xatosi' : err.message });
  }
};

module.exports = { getVapidKey, subscribe, unsubscribe };

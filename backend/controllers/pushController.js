const PushSubscription = require('../models/PushSubscription');
const { isAllowedPushEndpoint, MAX_SUBS_PER_USER } = require('../utils/pushService');

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
    // COM-10: faqat https + ma'lum push servis host'lari (blind SSRF himoyasi)
    if (!isAllowedPushEndpoint(endpoint)) {
      return res.status(400).json({ success: false, message: 'Push endpoint qo\'llab-quvvatlanmaydi' });
    }
    if (typeof keys.p256dh !== 'string' || typeof keys.auth !== 'string'
      || keys.p256dh.length > 200 || keys.auth.length > 100) {
      return res.status(400).json({ success: false, message: 'Yaroqsiz obuna kalitlari' });
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

    // COM-10: user boshiga ko'pi bilan MAX_SUBS_PER_USER ta obuna (eng eskilari o'chiriladi)
    const extra = await PushSubscription.find({ userId: req.user._id })
      .sort({ updatedAt: -1, createdAt: -1 })
      .skip(MAX_SUBS_PER_USER)
      .select('_id')
      .lean();
    if (extra.length) {
      await PushSubscription.deleteMany({ _id: { $in: extra.map((s) => s._id) } });
    }

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

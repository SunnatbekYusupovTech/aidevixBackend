const { DailyChallenge, UserChallengeProgress } = require('../models/DailyChallenge');
const { addXp } = require('../utils/awardXp');
const { dayKey } = require('../utils/tashkentDate');

// D19: kunlik vazifa sanasi Asia/Tashkent kalendari bo'yicha (scheduler ham shu kalitni ishlatishi kerak)
const todayStr = () => dayKey();

/** @desc  Bugungi challenge | @route GET /api/challenges/today | @access Private */
const getTodayChallenge = async (req, res) => {
  try {
    const challenge = await DailyChallenge.findOne({ date: todayStr(), isActive: true }).lean();
    if (!challenge)
      return res.json({ success: true, data: { challenge: null, message: 'Bugun uchun vazifa yo\'q' } });

    const progress = await UserChallengeProgress.findOne({ userId: req.user._id, challengeId: challenge._id }).lean();

    res.json({
      success: true,
      data: {
        challenge,
        progress: progress || { currentCount: 0, isCompleted: false },
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: process.env.NODE_ENV !== 'production' ? err.message : 'Server xatosi' });
  }
};

/** @desc  Challenge progressini yangilash | @route POST /api/challenges/progress | @access Private */
const updateChallengeProgress = async (req, res) => {
  try {
    const challenge = await DailyChallenge.findOne({ date: todayStr(), isActive: true }).lean();
    if (!challenge)
      return res.status(404).json({ success: false, message: 'Bugun uchun vazifa yo\'q' });

    // D14/COM-11: har so'rov faqat +1 qadam, atomik (faqat tugallanmagan progressga); XP bitta so'rovda
    const key = { userId: req.user._id, challengeId: challenge._id };
    const target = Math.max(1, challenge.targetCount || 1);
    const alreadyDone = (progress) =>
      res.json({ success: true, message: 'Siz bu vazifani allaqachon bajardingiz', data: { progress } });
    const incOnce = () => UserChallengeProgress.findOneAndUpdate(
      { ...key, isCompleted: false },
      { $inc: { currentCount: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    let progress;
    try {
      progress = await incOnce();
    } catch (e) {
      if (!e || e.code !== 11000) throw e;
      // Upsert to'qnashdi: hujjat allaqachon tugallangan yoki parallel birinchi insert
      const existing = await UserChallengeProgress.findOne(key).lean();
      if (existing && existing.isCompleted) return alreadyDone(existing);
      progress = await incOnce();
    }

    if (progress.currentCount >= target) {
      // Shartli o'tish isCompleted:false -> true; faqat g'olib so'rov XP beradi
      const completed = await UserChallengeProgress.findOneAndUpdate(
        { _id: progress._id, isCompleted: false },
        { $set: { isCompleted: true, completedAt: new Date(), xpEarned: challenge.xpReward, currentCount: target } },
        { new: true }
      );
      if (!completed) return alreadyDone(await UserChallengeProgress.findOne(key).lean());
      await addXp(req.user._id, challenge.xpReward); // D32: level/rankTitle/User mirror bilan
      progress = completed;
    }

    res.json({
      success: true,
      message: progress.isCompleted ? `Vazifa bajarildi! +${challenge.xpReward} XP` : 'Progress yangilandi',
      data: { progress },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: process.env.NODE_ENV !== 'production' ? err.message : 'Server xatosi' });
  }
};

/** @desc  Challenge yaratish (Admin) | @route POST /api/challenges/admin | @access Admin */
const createChallenge = async (req, res) => {
  try {
    const { title, description, type, targetCount, xpReward, date } = req.body;
    if (!title || !type || !date)
      return res.status(400).json({ success: false, message: 'title, type va date majburiy' });

    const challenge = await DailyChallenge.create({ title, description, type, targetCount, xpReward, date });
    res.status(201).json({ success: true, message: 'Vazifa yaratildi', data: { challenge } });
  } catch (err) {
    if (err.code === 11000)
      return res.status(400).json({ success: false, message: 'Bu sana uchun vazifa allaqachon mavjud' });
    console.error(err);
    res.status(500).json({ success: false, message: process.env.NODE_ENV !== 'production' ? err.message : 'Server xatosi' });
  }
};

module.exports = { getTodayChallenge, updateChallengeProgress, createChallenge };

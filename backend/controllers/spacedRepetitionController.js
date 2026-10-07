const SpacedRepetitionCard = require('../models/SpacedRepetitionCard');
const Quiz = require('../models/Quiz');
const { addXp } = require('../utils/awardXp');

const XP_PER_REVIEW = 5; // to'g'ri takrorlash uchun kichik mukofot (good/easy)
const MAX_INTERVAL_DAYS = 365; // D09: interval cheksiz o'smasin

/**
 * @desc  Bugun takrorlash kerak bo'lgan kartalar (savol matni bilan)
 * @route GET /api/spaced-repetition/due
 * @access Private
 */
const getDueCards = async (req, res) => {
  try {
    const cards = await SpacedRepetitionCard.find({
      userId: req.user._id,
      dueAt: { $lte: new Date() },
    })
      .sort({ dueAt: 1 })
      .limit(50)
      .lean();

    if (cards.length === 0) {
      return res.json({ success: true, data: { cards: [], total: 0 } });
    }

    // Har karta uchun quizId + questionKey (savol indeksi) → savol matnini biriktiramiz.
    const quizIds = [...new Set(cards.map((c) => String(c.quizId)))];
    const quizzes = await Quiz.find({ _id: { $in: quizIds } })
      .select('questions title')
      .lean();
    const quizMap = new Map(quizzes.map((q) => [String(q._id), q]));

    const enriched = cards
      .map((c) => {
        const quiz = quizMap.get(String(c.quizId));
        const q = quiz && Array.isArray(quiz.questions)
          ? quiz.questions[Number(c.questionKey)]
          : null;
        if (!q) return null; // orphan karta (quiz/savol o'chirilgan) — tashlab yuboramiz
        return {
          _id: c._id,
          quizId: c.quizId,
          intervalDays: c.intervalDays,
          repetitions: c.repetitions,
          dueAt: c.dueAt,
          quizTitle: quiz.title,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
        };
      })
      .filter(Boolean);

    return res.json({ success: true, data: { cards: enriched, total: enriched.length } });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'production' ? 'Server xatosi' : err.message,
    });
  }
};

/**
 * @desc  Kartani baholash (SM-2) — interval/ease yangilanadi, XP beriladi
 * @route POST /api/spaced-repetition/:cardId/grade
 * @access Private
 */
const gradeCard = async (req, res) => {
  try {
    const { cardId } = req.params;
    const { result } = req.body;
    const card = await SpacedRepetitionCard.findOne({ _id: cardId, userId: req.user._id }).lean();
    if (!card) return res.status(404).json({ success: false, message: 'Card topilmadi' });

    // D09: muddati kelmagan karta — takrorlashga ruxsat, lekin jadval o'zgarmaydi va XP yo'q
    const now = new Date();
    if (card.dueAt && new Date(card.dueAt) > now) {
      return res.json({
        success: true,
        data: { card: { _id: card._id, dueAt: card.dueAt, intervalDays: card.intervalDays }, xpEarned: 0, notDue: true },
      });
    }

    const qualityMap = { again: 1, hard: 3, good: 4, easy: 5 };
    const q = qualityMap[result] || 1;
    let { repetitions = 0, intervalDays = 1, easeFactor = 2.5 } = card;
    if (q < 3) {
      repetitions = 0;
      intervalDays = 1;
    } else {
      repetitions += 1;
      if (repetitions === 1) intervalDays = 1;
      else if (repetitions === 2) intervalDays = 3;
      else intervalDays = Math.min(MAX_INTERVAL_DAYS, Math.round(intervalDays * easeFactor));
      easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
    }
    const dueAt = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);

    // Atomik: faqat hali muddati o'tgan holatda yangilanadi — parallel takror baholash ikki marta XP olmaydi
    const upd = await SpacedRepetitionCard.updateOne(
      { _id: card._id, userId: req.user._id, dueAt: { $lte: now } },
      { $set: { repetitions, intervalDays, easeFactor, lastResult: result, dueAt } },
    );
    const applied = upd && upd.modifiedCount === 1;

    // XP mukofoti: faqat to'g'ri eslaganlarda (good/easy); level/streak/User mirror umumiy helper orqali (D32/D20).
    let xpEarned = 0;
    if (applied && q >= 4) {
      xpEarned = XP_PER_REVIEW;
      await addXp(req.user._id, XP_PER_REVIEW, { streak: true });
    }

    return res.json({
      success: true,
      data: { card: { _id: card._id, dueAt: applied ? dueAt : card.dueAt, intervalDays: applied ? intervalDays : card.intervalDays }, xpEarned },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'production' ? 'Server xatosi' : err.message,
    });
  }
};

module.exports = { getDueCards, gradeCard };

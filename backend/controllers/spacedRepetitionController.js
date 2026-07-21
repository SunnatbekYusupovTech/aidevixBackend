const SpacedRepetitionCard = require('../models/SpacedRepetitionCard');
const Quiz = require('../models/Quiz');
const UserStats = require('../models/UserStats');

const XP_PER_REVIEW = 5; // to'g'ri takrorlash uchun kichik mukofot (good/easy)

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
    const card = await SpacedRepetitionCard.findOne({ _id: cardId, userId: req.user._id });
    if (!card) return res.status(404).json({ success: false, message: 'Card topilmadi' });

    const qualityMap = { again: 1, hard: 3, good: 4, easy: 5 };
    const q = qualityMap[result] || 1;
    if (q < 3) {
      card.repetitions = 0;
      card.intervalDays = 1;
    } else {
      card.repetitions += 1;
      if (card.repetitions === 1) card.intervalDays = 1;
      else if (card.repetitions === 2) card.intervalDays = 3;
      else card.intervalDays = Math.round(card.intervalDays * card.easeFactor);
      card.easeFactor = Math.max(1.3, card.easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
    }
    card.lastResult = result;
    card.dueAt = new Date(Date.now() + card.intervalDays * 24 * 60 * 60 * 1000);
    await card.save();

    // XP mukofoti: faqat to'g'ri eslaganlarda (good/easy), streak/faollik uchun.
    let xpEarned = 0;
    if (q >= 4) {
      xpEarned = XP_PER_REVIEW;
      UserStats.updateOne(
        { userId: req.user._id },
        { $inc: { xp: XP_PER_REVIEW, weeklyXp: XP_PER_REVIEW }, $set: { lastActivityDate: new Date() } },
      ).catch(() => {});
    }

    return res.json({
      success: true,
      data: { card: { _id: card._id, dueAt: card.dueAt, intervalDays: card.intervalDays }, xpEarned },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'production' ? 'Server xatosi' : err.message,
    });
  }
};

module.exports = { getDueCards, gradeCard };

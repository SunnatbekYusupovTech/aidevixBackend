const SpacedRepetitionCard = require('../models/SpacedRepetitionCard');

const getDueCards = async (req, res) => {
  try {
    const cards = await SpacedRepetitionCard.find({
      userId: req.user._id,
      dueAt: { $lte: new Date() },
    })
      .sort({ dueAt: 1 })
      .limit(50);
    return res.json({ success: true, data: { cards } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

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
    return res.json({ success: true, data: { card } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getDueCards, gradeCard };

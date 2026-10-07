const UserStats = require('../models/UserStats');
const Enrollment = require('../models/Enrollment');
const QuizResult = require('../models/QuizResult');

/**
 * Badge shartlari va avtomatik berish tizimi
 */
const BADGE_RULES = [
  { name: 'Birinchi qadam',    icon: '👶', condition: (s) => s.videosWatched >= 1    },
  { name: 'Video maniac',      icon: '🎬', condition: (s) => s.videosWatched >= 10   },
  { name: 'Video ustasi',      icon: '🎥', condition: (s) => s.videosWatched >= 50   },
  { name: 'Quiz boshlangich',  icon: '📝', condition: (s) => s.quizzesCompleted >= 1  },
  { name: 'Quiz chempioni',    icon: '🏆', condition: (s) => s.quizzesCompleted >= 20 },
  { name: 'Streak 7',          icon: '🔥', condition: (s) => s.streak >= 7           },
  { name: 'Streak 30',         icon: '💪', condition: (s) => s.streak >= 30          },
  { name: 'Streak 100',        icon: '⚡', condition: (s) => s.streak >= 100         },
  { name: 'XP 500',            icon: '⭐', condition: (s) => s.xp >= 500             },
  { name: 'XP 1000',           icon: '⭐', condition: (s) => s.xp >= 1000            },
  { name: 'XP 5000',           icon: '🌟', condition: (s) => s.xp >= 5000            },
  { name: 'XP 10000',          icon: '🌟', condition: (s) => s.xp >= 10000           },
  { name: 'XP 50000',          icon: '💎', condition: (s) => s.xp >= 50000           },
  { name: 'Level 10',          icon: '🎯', condition: (s) => s.level >= 10           },
  { name: 'Level 50',          icon: '🚀', condition: (s) => s.level >= 50           },
  { name: 'Level 99',          icon: '👑', condition: (s) => s.level >= 99           },
  // D25: bu hisoblagichlar UserStats'da yo'q — awardBadges ularni Enrollment/QuizResult'dan hosil qiladi
  { name: 'Kurs tugallandi',   icon: '🎓', derived: 'coursesCompleted', condition: (s) => (s.coursesCompleted || 0) >= 1 },
  { name: 'Quiz ustasi',       icon: '🧠', derived: 'highScoreQuizzes', condition: (s) => (s.highScoreQuizzes || 0) >= 10 },
  { name: 'Mukammal natija',   icon: '💯', derived: 'perfectScores',    condition: (s) => (s.perfectScores || 0) >= 1   },
];

// Hosila hisoblagichlar (highScore = ball >= 90)
const DERIVED_COUNTERS = {
  coursesCompleted: (userId) => Enrollment.countDocuments({ userId, isCompleted: true }),
  highScoreQuizzes: (userId) => QuizResult.countDocuments({ userId, score: { $gte: 90 } }),
  perfectScores:    (userId) => QuizResult.countDocuments({ userId, score: 100 }),
};

/**
 * Foydalanuvchi statistikasiga qarab yangi badge'larni avtomatik berish
 * @returns {Array} - Yangi berilgan badge'lar
 */
const awardBadges = async (userId) => {
  // P-B15: faqat kerakli maydonlar, lean; yozish atomik $push bilan
  const stats = await UserStats.findOne({ userId })
    .select('xp level streak videosWatched quizzesCompleted badges.name')
    .lean();
  if (!stats) return [];

  const existingBadgeNames = (stats.badges || []).map((b) => b.name);
  const newBadges = [];

  // Hosila hisoblagichlarni faqat hali olinmagan badge'lar uchun so'raymiz
  const needed = [...new Set(BADGE_RULES
    .filter((r) => r.derived && !existingBadgeNames.includes(r.name))
    .map((r) => r.derived))];
  const counts = await Promise.all(needed.map((k) => DERIVED_COUNTERS[k](userId)));
  needed.forEach((k, i) => { stats[k] = counts[i]; });

  for (const rule of BADGE_RULES) {
    if (!existingBadgeNames.includes(rule.name) && rule.condition(stats)) {
      newBadges.push({ name: rule.name, icon: rule.icon, earnedAt: new Date() });
    }
  }

  if (newBadges.length > 0) {
    // Parallel chaqiruvda dublikat badge yozilmasligi uchun shartli $push
    const r = await UserStats.updateOne(
      { userId, 'badges.name': { $nin: newBadges.map((b) => b.name) } },
      { $push: { badges: { $each: newBadges } } }
    );
    if (!r || r.modifiedCount === 0) return [];
  }

  return newBadges;
};

module.exports = { awardBadges, BADGE_RULES };

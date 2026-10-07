const User = require('../models/User');
const UserStats = require('../models/UserStats');
const calculateRank = require('./calculateRank');
const { daysBetween } = require('./tashkentDate');

const levelForXp = (xp) => Math.floor((xp || 0) / 1000) + 1;

/**
 * Streak qoidasi — yagona manba (video, quiz, SR, check-in hammasi shu orqali).
 * Kunlar Asia/Tashkent kalendari bo'yicha. `stats` ni joyida o'zgartiradi.
 * @returns {{ increased: boolean, freezeUsed: boolean, sameDay: boolean }}
 */
function applyStreak(stats, now = new Date()) {
  let increased = false;
  let freezeUsed = false;
  let sameDay = false;

  if (stats.lastActivityDate) {
    const diffDays = daysBetween(stats.lastActivityDate, now);
    if (diffDays <= 0) {
      sameDay = true;
      // Eski ma'lumot: faollik bor, lekin streak hech qachon boshlanmagan
      if (!(stats.streak > 0)) { stats.streak = 1; increased = true; }
    } else if (diffDays === 1) {
      stats.streak = (stats.streak || 0) + 1;
      increased = true;
    } else if ((stats.streakFreezes || 0) > 0 && diffDays === 2) {
      stats.streakFreezes -= 1;
      stats.streakFreezeUsedAt = now;
      freezeUsed = true; // streak saqlanadi
    } else {
      stats.streak = 1; // Streak uzildi
      increased = true;
    }
  } else {
    stats.streak = 1;
    increased = true;
  }

  stats.lastActivityDate = now;
  return { increased, freezeUsed, sameDay };
}

/**
 * Atomik XP berish (UserStats + User mirror). Read-modify-write yo'q: xp/weeklyXp $inc,
 * level $max bilan (parallel so'rovlar levelni pasaytira olmaydi), rankTitle yangilanadi.
 * @param {*} userId
 * @param {number} amount
 * @param {{ extraInc?: object, streak?: boolean, now?: Date }} [opts]
 *   extraInc — qo'shimcha hisoblagichlar (masalan { videosWatched: 1 });
 *   streak   — true bo'lsa faollik sifatida streak yangilanadi.
 */
async function addXp(userId, amount, { extraInc = {}, streak = false, now = new Date() } = {}) {
  const stats = await UserStats.findOneAndUpdate(
    { userId },
    { $inc: { xp: amount, weeklyXp: amount, ...extraInc } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  let streakInfo = null;
  if (streak) {
    streakInfo = applyStreak(stats, now);
    await stats.save(); // faqat streak/lastActivityDate/streakFreezes yo'llari $set qilinadi
  }

  const level = levelForXp(stats.xp);
  if (level > (stats.level || 1)) {
    await UserStats.updateOne({ userId }, { $max: { level } });
  }
  stats.level = Math.max(level, stats.level || 1);

  const userUpdate = { $inc: { xp: amount }, $set: { rankTitle: calculateRank(stats.xp) } };
  if (streak) userUpdate.$set.streak = stats.streak;
  const user = await User.findByIdAndUpdate(userId, userUpdate, { new: true });

  return { stats, streakInfo, userXp: user ? user.xp : null, level: stats.level };
}

/**
 * User va UserStats da XP qo'shadi (admin mukofoti, bug report va h.k.).
 * Streakni o'zgartirmaydi — bu o'quv faolligi emas.
 * @param {import('mongoose').Types.ObjectId} userId
 * @param {number} amount
 */
async function awardXp(userId, amount) {
  if (!(await User.exists({ _id: userId }))) throw new Error('User not found');
  const r = await addXp(userId, amount);
  return { xp: r.userXp, level: r.level };
}

module.exports = { awardXp, addXp, applyStreak, levelForXp, calculateRank };

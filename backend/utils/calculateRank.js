/**
 * Calculate user rank based on XP — single source of truth.
 * Shared between authController, xpController, and any future XP-awarding code.
 *
 * @param {number} xp - Current XP value
 * @returns {string} Rank title
 */
const calculateRank = (xp) => {
  if (xp >= 50000) return 'LEGEND';
  if (xp >= 20000) return 'MASTER';
  if (xp >= 10000) return 'SENIOR';
  if (xp >= 5000) return 'MIDDLE';
  if (xp >= 2000) return 'JUNIOR';
  if (xp >= 500) return 'CANDIDATE';
  return 'AMATEUR';
};

module.exports = calculateRank;

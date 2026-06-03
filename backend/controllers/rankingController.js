const Course = require('../models/Course');
const UserStats = require('../models/UserStats');
const User = require('../models/User');

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Level asosida rank unvonini hisoblash
 * Figma leaderboard da ko'rsatiladigan unvonlar: GRANDMASTER, VICE-ADMIRAL, COMMANDER...
 */
const getRankTitle = (level) => {
  if (level >= 90) return 'GRANDMASTER';
  if (level >= 75) return 'VICE-ADMIRAL';
  if (level >= 60) return 'COMMANDER';
  if (level >= 45) return 'CAPTAIN';
  if (level >= 30) return 'LIEUTENANT';
  if (level >= 15) return 'SERGEANT';
  if (level >= 5)  return 'CORPORAL';
  return 'RECRUIT';
};

/**
 * @desc  Eng ko'p ko'rilgan kurslar reytingi (Numton uchun)
 * @route GET /api/ranking/courses
 * @access Public
 */
const getTopCourses = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const category = req.query.category || null;

    const filter = { isActive: true };
    if (category) filter.category = category;

    const courses = await Course.find(filter)
      .populate('instructor', 'username email')
      .sort({ viewCount: -1, rating: -1 })
      .limit(limit)
      .select('title description thumbnail price category viewCount rating ratingCount instructor videos createdAt')
      .lean();

    res.json({
      success: true,
      data: {
        courses,
        total: courses.length,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @desc  Eng yuqori XP to'plagan foydalanuvchilar reytingi (Suhrob uchun)
 * @route GET /api/ranking/users
 * @access Public
 */
const getTopUsers = async (req, res) => {
  try {
    const limit    = parseInt(req.query.limit) || 20;
    const page     = parseInt(req.query.page)  || 1;
    const category = req.query.category || null; // e.g. javascript, react, python
    const skip     = (page - 1) * limit;

    // Category filter: UserStats.skills array ichida qidiruv
    const filter = category
      ? { skills: { $regex: new RegExp(escapeRegex(category), 'i') } }
      : {};

    const [total, topUsers] = await Promise.all([
      UserStats.countDocuments(filter),
      UserStats.find(filter)
        .sort({ xp: -1, level: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'username email createdAt avatar aiStack firstName lastName jobTitle')
        .select('userId xp level streak badges videosWatched quizzesCompleted avatar bio skills')
        .lean(),
    ]);

    // Rank raqami va unvon qo'shish
    const rankedUsers = topUsers.map((u, index) => ({
      rank:             skip + index + 1,
      rankTitle:        getRankTitle(u.level),
      user:             u.userId,
      xp:               u.xp,
      level:            u.level,
      streak:           u.streak,
      badges:           u.badges,
      videosWatched:    u.videosWatched,
      quizzesCompleted: u.quizzesCompleted,
      avatar:           u.avatar,
      bio:              u.bio,
      skills:           u.skills,
      aiStack:          u.userId?.aiStack || [],
    }));

    res.json({
      success: true,
      data: {
        users: rankedUsers,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @desc  Bitta foydalanuvchining reyting pozitsiyasi
 * @route GET /api/ranking/users/:userId/position
 * @access Private
 */
const getUserPosition = async (req, res) => {
  try {
    const { userId } = req.params;

    const userStats = await UserStats.findOne({ userId }).lean();
    if (!userStats) {
      return res.status(404).json({ success: false, message: 'User stats not found' });
    }

    // Bu userdan yuqori XP'ga ega foydalanuvchilar soni = rank - 1
    const [higherCount, total] = await Promise.all([
      UserStats.countDocuments({ xp: { $gt: userStats.xp } }),
      UserStats.countDocuments(),
    ]);
    const rank = higherCount + 1;

    res.json({
      success: true,
      data: {
        rank,
        total,
        xp:         userStats.xp,
        level:      userStats.level,
        rankTitle:  getRankTitle(userStats.level),
        topPercent: total > 0 ? Math.round((rank / total) * 100) : 100,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @desc  Haftalik leaderboard (weeklyXp bo'yicha)
 * @route GET /api/ranking/weekly
 * @access Private
 */
const getWeeklyLeaderboard = async (req, res) => {
  try {
    const top = await UserStats.find({ weeklyXp: { $gt: 0 } })
      .sort({ weeklyXp: -1 })
      .limit(10)
      .populate('userId', 'username firstName lastName avatar')
      .lean();

    const rankedUsers = top.map((u, i) => ({
      rank: i + 1,
      user: u.userId,
      weeklyXp: u.weeklyXp || 0,
      level: u.level,
      streak: u.streak,
    }));

    // Joriy foydalanuvchi pozitsiyasi
    let myRank = null;
    let myWeeklyXp = 0;
    if (req.user) {
      const myStats = await UserStats.findOne({ userId: req.user.id }).lean();
      if (myStats) {
        myWeeklyXp = myStats.weeklyXp || 0;
        myRank = await UserStats.countDocuments({ weeklyXp: { $gt: myWeeklyXp } }) + 1;
      }
    }

    res.json({ success: true, data: { leaderboard: rankedUsers, myRank, myWeeklyXp } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @desc  Haftalik turnir mukofotlari va countdown
 * @route GET /api/ranking/weekly/prizes
 * @access Public
 */
const getWeeklyPrizes = async (req, res) => {
  try {
    const now = new Date();
    const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
    const nextReset = new Date(now);
    nextReset.setDate(now.getDate() + daysUntilSunday);
    nextReset.setHours(19, 0, 0, 0); // Yakshanba 00:00 Toshkent = 19:00 UTC

    const prizes = [
      { rank: 1, xp: 500, badge: '🥇 Hafta Chempioni',   color: 'gold'   },
      { rank: 2, xp: 300, badge: '🥈 Kumush O\'rin',     color: 'silver' },
      { rank: 3, xp: 150, badge: '🥉 Bronza O\'rin',     color: 'bronze' },
    ];

    const top = await UserStats.find({ weeklyXp: { $gt: 0 } })
      .sort({ weeklyXp: -1 })
      .limit(10)
      .populate('userId', 'username firstName lastName avatar aiStack')
      .lean();

    const leaderboard = top.map((u, i) => ({
      rank:     i + 1,
      user:     u.userId,
      weeklyXp: u.weeklyXp || 0,
      level:    u.level,
      avatar:   u.avatar,
    }));

    res.json({
      success: true,
      data: {
        prizes,
        leaderboard,
        nextReset: nextReset.toISOString(),
        msUntilReset: nextReset.getTime() - Date.now(),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getTopCourses, getTopUsers, getUserPosition, getWeeklyLeaderboard, getWeeklyPrizes };

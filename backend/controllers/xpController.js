const UserStats = require('../models/UserStats');
const User = require('../models/User');
const Quiz = require('../models/Quiz');
const QuizResult = require('../models/QuizResult');
const { awardBadges } = require('../utils/badgeService');

// Rank hisoblash (authController.js dagi bilan bir xil bo'lishi kerak)
const calculateRank = (xp) => {
  if (xp >= 50000) return 'LEGEND';
  if (xp >= 20000) return 'MASTER';
  if (xp >= 10000) return 'SENIOR';
  if (xp >= 5000) return 'MIDDLE';
  if (xp >= 2000) return 'JUNIOR';
  if (xp >= 500) return 'CANDIDATE';
  return 'AMATEUR';
};

/**
 * @desc  Foydalanuvchi statsini olish
 * @route GET /api/xp/stats
 * @access Private
 */
const getUserStats = async (req, res) => {
  try {
    let stats = await UserStats.findOne({ userId: req.user.id });

    // Agar stats mavjud bo'lmasa, yangi yaratamiz
    if (!stats) {
      stats = await UserStats.create({ userId: req.user.id });
    }

    const levelProgress = stats.getLevelProgress();
    const currentLevel = stats.calculateLevel();

    // Level yangilash (agar o'zgargan bo'lsa)
    if (stats.level !== currentLevel) {
      stats.level = currentLevel;
      await stats.save();
    }

    // Mirroring check: User modeldagi XP ni Stats bilan bir xil qilamiz
    const user = await User.findById(req.user.id);
    if (user && (user.xp !== stats.xp || user.streak !== stats.streak)) {
      // Eng yuqori qiymatni asosiq qilib olamiz (yo'qolmasligi uchun)
      const maxXP = Math.max(user.xp || 0, stats.xp || 0);
      const maxStreak = Math.max(user.streak || 0, stats.streak || 0);
      
      let changed = false;
      if (stats.xp < maxXP) { 
        const diff = maxXP - stats.xp;
        stats.xp = maxXP; 
        stats.weeklyXp = (stats.weeklyXp || 0) + diff; 
        changed = true; 
      }
      if (stats.streak < maxStreak) { stats.streak = maxStreak; changed = true; }
      if (changed) await stats.save();

      if (user.xp < maxXP || user.streak < maxStreak) {
        user.xp = maxXP;
        user.streak = maxStreak;
        user.rankTitle = calculateRank(user.xp);
        await user.save();
      }
    }

    res.json({
      success: true,
      data: {
        xp: stats.xp,
        level: stats.level,
        levelTitle: stats.getLevelTitle(),
        levelProgress,
        xpToNextLevel: 1000 - (stats.xp % 1000),
        streak: stats.streak,
        weeklyXp: stats.weeklyXp || 0,
        lastActivityDate: stats.lastActivityDate,
        badges: stats.badges,
        videosWatched: stats.videosWatched,
        quizzesCompleted: stats.quizzesCompleted,
        bio: stats.bio,
        skills: stats.skills,
        avatar: stats.avatar,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @desc  Video ko'rishda XP berish (video tugaganda chaqiriladi)
 * @route POST /api/xp/video-watched/:videoId
 * @access Private
 */
const addVideoWatchXP = async (req, res) => {
  try {
    const XP_FOR_VIDEO = 50;

    let stats = await UserStats.findOne({ userId: req.user.id });
    if (!stats) {
      stats = await UserStats.create({ userId: req.user.id });
    }

    stats.xp += XP_FOR_VIDEO;
    stats.weeklyXp = (stats.weeklyXp || 0) + XP_FOR_VIDEO;
    stats.videosWatched += 1;
    stats.level = stats.calculateLevel();

    // Streak yangilash
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (stats.lastActivityDate) {
      const last = new Date(stats.lastActivityDate);
      last.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((today - last) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        stats.streak += 1; // Ketma-ket kun
      } else if (diffDays > 1) {
        // Streak freeze tekshiruvi
        if ((stats.streakFreezes || 0) > 0 && diffDays === 2) {
          stats.streakFreezes -= 1;
          stats.streakFreezeUsedAt = new Date();
          // streak saqlanadi
        } else {
          stats.streak = 1; // Streak uzildi
        }
      }
      // diffDays === 0 bo'lsa — bugun allaqachon faol bo'lgan, streak o'zgarmaydi
    } else {
      stats.streak = 1;
    }

    stats.lastActivityDate = new Date();
    await stats.save();

    // 2. User modelini sinxronlash (Navbar va Auth uchun)
    const user = await User.findById(req.user.id);
    if (user) {
      user.xp = stats.xp; 
      user.streak = stats.streak;
      user.rankTitle = calculateRank(user.xp);
      await user.save();
    }

    // Badge auto-award
    awardBadges(req.user.id).catch(() => {});

    res.json({
      success: true,
      data: {
        xpEarned: XP_FOR_VIDEO,
        totalXp: stats.xp,
        level: stats.level,
        streak: stats.streak,
        levelProgress: stats.getLevelProgress(),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @desc  Quiz natijasini saqlash va XP berish
 * @route POST /api/xp/quiz/:quizId
 * @access Private
 */
const submitQuiz = async (req, res) => {
  try {
    const { quizId } = req.params;
    const { answers } = req.body; // [{questionIndex, selectedOption}]

    const quiz = await Quiz.findById(quizId);
    if (!quiz) {
      return res.status(404).json({ success: false, message: 'Quiz topilmadi' });
    }

    // Oldindan yechildimi?
    const existing = await QuizResult.findOne({ userId: req.user.id, quizId });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Bu quizni allaqachon yechgansiz',
        data: { score: existing.score, xpEarned: existing.xpEarned },
      });
    }

    // Javoblarni tekshirish
    let correctCount = 0;
    let totalXP = 0;
    const resultAnswers = answers.map((a) => {
      const question = quiz.questions[a.questionIndex];
      const isCorrect = question && question.correctAnswer === a.selectedOption;
      if (isCorrect) {
        correctCount++;
        totalXP += question.xpReward || 10;
      }
      return {
        questionIndex: a.questionIndex,
        selectedOption: a.selectedOption,
        isCorrect: !!isCorrect,
      };
    });

    const score = quiz.questions.length > 0
      ? Math.round((correctCount / quiz.questions.length) * 100)
      : 0;
    const passed = score >= quiz.passingScore;

    // Bonus XP: o'tsa qo'shimcha 100 XP
    if (passed) totalXP += 100;

    // QuizResult saqlash
    const result = await QuizResult.create({
      userId: req.user.id,
      quizId,
      videoId: quiz.videoId,
      courseId: quiz.courseId,
      score,
      xpEarned: totalXP,
      passed,
      answers: resultAnswers,
    });

    // UserStats yangilash
    let stats = await UserStats.findOne({ userId: req.user.id });
    if (!stats) {
      stats = await UserStats.create({ userId: req.user.id });
    }

    stats.xp += totalXP;
    stats.weeklyXp = (stats.weeklyXp || 0) + totalXP;
    stats.quizzesCompleted += 1;
    stats.level = stats.calculateLevel();
    stats.lastActivityDate = new Date();
    await stats.save();

    // 2. User modelini sinxronlash
    const user = await User.findById(req.user.id);
    if (user) {
      user.xp = stats.xp;
      user.streak = stats.streak;
      user.rankTitle = calculateRank(user.xp);
      await user.save();
    }

    // Badge auto-award
    awardBadges(req.user.id).catch(() => {});

    res.json({
      success: true,
      data: {
        score,
        passed,
        correctCount,
        totalQuestions: quiz.questions.length,
        xpEarned: totalXP,
        totalXp: stats.xp,
        level: stats.level,
        levelProgress: stats.getLevelProgress(),
        answers: resultAnswers,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @desc  Video uchun quizni olish
 * @route GET /api/xp/quiz/video/:videoId
 * @access Private
 */
const getQuizByVideo = async (req, res) => {
  try {
    const quiz = await Quiz.findOne({ videoId: req.params.videoId, isActive: true })
      .select('-questions.correctAnswer'); // To'g'ri javobni bermaymiz

    if (!quiz) {
      return res.json({ success: true, data: null, message: 'Bu video uchun quiz mavjud emas' });
    }

    // Yechilganmi tekshirish
    const solved = await QuizResult.findOne({ userId: req.user.id, quizId: quiz._id });

    res.json({
      success: true,
      data: {
        quiz,
        alreadySolved: !!solved,
        previousScore: solved ? solved.score : null,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @desc  Foydalanuvchi profilini yangilash (bio, skills, avatar)
 * @route PUT /api/xp/profile
 * @access Private
 */
const updateProfile = async (req, res) => {
  try {
    const { bio, skills, avatar, ism, familiya, kasb } = req.body;
    const userId = req.user._id || req.user.id;

    // 1. UserStats ni yangilash
    let stats = await UserStats.findOne({ userId });
    if (!stats) {
      stats = await UserStats.create({ userId });
    }

    if (bio !== undefined) stats.bio = bio;
    if (skills !== undefined) stats.skills = skills;
    if (avatar !== undefined) stats.avatar = avatar;

    await stats.save();

    // 2. User modelini (ism, familiya, kasb) yangilash
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi' });
    }

    let userUpdated = false;
    if (ism !== undefined) { user.firstName = ism; userUpdated = true; }
    if (familiya !== undefined) { user.lastName = familiya; userUpdated = true; }
    if (kasb !== undefined) { user.jobTitle = kasb; userUpdated = true; }
    if (req.body.aiStack !== undefined) { user.aiStack = req.body.aiStack; userUpdated = true; }

    if (userUpdated) {
      await user.save();
    }

    // Yangilangan ma'lumotlarni qaytarish
    res.json({
      success: true,
      message: 'Profil muvaffaqiyatli yangilandi',
      data: {
        bio: stats.bio,
        skills: stats.skills,
        avatar: stats.avatar,
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          jobTitle: user.jobTitle,
          username: user.username,
          email: user.email,
          role: user.role,
        }
      },
    });
  } catch (err) {
    console.error('UPDATE_PROFILE_ERROR:', err);
    res.status(500).json({ success: false, message: 'Profilni yangilashda xatolik: ' + err.message });
  }
};

/**
 * @desc  Streak freeze ishlatish (1 ta freeze sarflaydi)
 * @route POST /api/xp/streak-freeze
 * @access Private
 */
const useStreakFreeze = async (req, res) => {
  try {
    let stats = await UserStats.findOne({ userId: req.user.id });
    if (!stats) {
      return res.status(404).json({ success: false, message: 'Stats topilmadi' });
    }

    if ((stats.streakFreezes || 0) <= 0) {
      return res.status(400).json({ success: false, message: 'Streak freeze qolmadi (max 5 ta)' });
    }

    stats.streakFreezes -= 1;
    stats.streakFreezeUsedAt = new Date();
    await stats.save();

    res.json({
      success: true,
      message: 'Streak freeze ishlatildi',
      data: { streakFreezes: stats.streakFreezes, streak: stats.streak },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @desc  Streak freeze qo'shish (Admin yoki sovg'a sifatida)
 * @route POST /api/xp/streak-freeze/add
 * @access Private
 */
const addStreakFreeze = async (req, res) => {
  try {
    const { userId } = req.body;
    const targetId = userId || req.user.id;

    let stats = await UserStats.findOne({ userId: targetId });
    if (!stats) {
      stats = await UserStats.create({ userId: targetId });
    }

    const MAX_FREEZES = 5;
    if ((stats.streakFreezes || 0) >= MAX_FREEZES) {
      return res.status(400).json({ success: false, message: `Maksimal ${MAX_FREEZES} ta streak freeze bo'lishi mumkin` });
    }

    stats.streakFreezes = (stats.streakFreezes || 0) + 1;
    await stats.save();

    res.json({
      success: true,
      message: 'Streak freeze qo\'shildi',
      data: { streakFreezes: stats.streakFreezes },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @desc  Haftalik liderlar jadvali (weeklyXp bo'yicha)
 * @route GET /api/xp/weekly-leaderboard
 * @access Public
 */
const getWeeklyLeaderboard = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);

    const leaders = await UserStats.find({ weeklyXp: { $gt: 0 } })
      .sort({ weeklyXp: -1 })
      .limit(limit)
      .populate('userId', 'username');

    res.json({
      success: true,
      data: {
        leaderboard: leaders.map((s, i) => ({
          rank: i + 1,
          user: s.userId,
          weeklyXp: s.weeklyXp || 0,
          level: s.level,
          streak: s.streak,
        })),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @desc  XP tarixi (so'nggi 50 ta)
 * @route GET /api/xp/history
 * @access Private
 */
const getXPHistory = async (req, res) => {
  try {
    // XPTransaction model was deleted, returning empty history for now
    const history = [];
    res.json({ success: true, data: { history } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @desc  Streak holati va qolgan vaqt
 * @route GET /api/xp/streak-status
 * @access Private
 */
const getStreakStatus = async (req, res) => {
  try {
    const stats = await UserStats.findOne({ userId: req.user.id }).lean();
    if (!stats) return res.json({ success: true, data: { streak: 0, atRisk: false, hoursRemaining: 24 } });

    const lastActivity = stats.lastActivityDate ? new Date(stats.lastActivityDate) : null;
    const hoursAgo = lastActivity ? (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60) : 999;

    res.json({
      success: true,
      data: {
        streak: stats.streak || 0,
        lastActivity: stats.lastActivityDate,
        atRisk: hoursAgo > 20,
        hoursRemaining: Math.max(0, Math.round(24 - hoursAgo)),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * @desc  Kunlik check-in — ilovaga kirgani uchun streakni oshiradi (XP bermaydi)
 * @route POST /api/xp/check-in
 * @access Private
 *
 * Mantiq addVideoWatchXP (109-135) dagi streak hisoblashning aynan nusxasi,
 * lekin XP/video sanog'isiz. Server vaqtidan foydalanadi (anti-cheat).
 */
const checkIn = async (req, res) => {
  try {
    let stats = await UserStats.findOne({ userId: req.user.id });
    if (!stats) {
      stats = await UserStats.create({ userId: req.user.id });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let increased = false;
    let freezeUsed = false;
    let alreadyCheckedToday = false;

    if (stats.lastActivityDate) {
      const last = new Date(stats.lastActivityDate);
      last.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((today - last) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        // Bugun allaqachon faol bo'lgan (check-in yoki video/quiz) — qayta oshmaydi
        alreadyCheckedToday = true;
      } else if (diffDays === 1) {
        stats.streak += 1; // Ketma-ket kun
        increased = true;
      } else if (diffDays > 1) {
        // Streak freeze tekshiruvi (addVideoWatchXP bilan bir xil qoida)
        if ((stats.streakFreezes || 0) > 0 && diffDays === 2) {
          stats.streakFreezes -= 1;
          stats.streakFreezeUsedAt = new Date();
          freezeUsed = true;
          // streak saqlanadi
        } else {
          stats.streak = 1; // Streak uzildi — yangidan boshlandi
          increased = true;
        }
      }
    } else {
      stats.streak = 1; // Birinchi marta
      increased = true;
    }

    // Faqat haqiqiy o'zgarish bo'lganda saqlaymiz (keraksiz yozuv yo'q)
    if (!alreadyCheckedToday) {
      stats.lastActivityDate = new Date();
      await stats.save();

      // User modelini sinxronlash (Navbar va Auth uchun)
      const user = await User.findById(req.user.id);
      if (user && user.streak !== stats.streak) {
        user.streak = stats.streak;
        await user.save();
      }
    }

    res.json({
      success: true,
      data: {
        streak: stats.streak,
        increased,
        freezeUsed,
        alreadyCheckedToday,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getUserStats,
  addVideoWatchXP,
  submitQuiz,
  getQuizByVideo,
  updateProfile,
  useStreakFreeze,
  addStreakFreeze,
  getWeeklyLeaderboard,
  getXPHistory,
  getStreakStatus,
  checkIn,
};

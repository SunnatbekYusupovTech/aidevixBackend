const UserStats = require('../models/UserStats');
const User = require('../models/User');
const VideoXpAward = require('../models/VideoXpAward');
const Quiz = require('../models/Quiz');
const QuizResult = require('../models/QuizResult');
const SpacedRepetitionCard = require('../models/SpacedRepetitionCard');
const Video = require('../models/Video');
const Enrollment = require('../models/Enrollment');
const { awardBadges } = require('../utils/badgeService');
const { addXp, applyStreak } = require('../utils/awardXp');

// Rank hisoblash (shared utility — single source of truth)
const calculateRank = require('../utils/calculateRank');

/**
 * D04: video uchun XP faqat mavjud, faol video va unga ruxsati bor foydalanuvchiga.
 * Ruxsat qoidasi videoController.getVideo bilan bir xil: AI kategoriyasi — faol Pro;
 * boshqa kurslar — bepul kurs yoki to'langan/bepul enrollment.
 */
const canEarnVideoXp = async (userId, videoId) => {
  const video = await Video.findOne({ _id: videoId, isActive: true })
    .select('course')
    .populate('course', 'isActive isFree price category')
    .lean();
  const course = video && video.course;
  if (!course || course.isActive === false) return { ok: false, status: 404, message: 'Video topilmadi' };

  if (course.category === 'ai') {
    const user = await User.findById(userId).select('proSubscription').lean();
    const pro = user && user.proSubscription;
    const hasPro = Boolean(pro && pro.active) &&
      (!pro.expiresAt || new Date(pro.expiresAt).getTime() > Date.now());
    return hasPro ? { ok: true } : { ok: false, status: 403, message: 'Bu video uchun Pro obuna kerak' };
  }

  if (course.isFree || !(course.price > 0)) return { ok: true };
  const enrolled = await Enrollment.exists({ userId, courseId: course._id, paymentStatus: { $in: ['free', 'paid'] } });
  return enrolled ? { ok: true } : { ok: false, status: 403, message: 'Siz bu kursga yozilmagansiz' };
};

/**
 * D05: quiz javoblarini baholash — har savol uchun faqat BIRINCHI javob hisoblanadi,
 * indeks 0..N-1 butun son bo'lishi shart; score 0..100.
 */
const gradeQuizAnswers = (questions, answers) => {
  const total = questions.length;
  const firstAnswer = new Map();
  for (const a of answers) {
    const qi = a ? Number(a.questionIndex) : NaN;
    if (!Number.isInteger(qi) || qi < 0 || qi >= total || firstAnswer.has(qi)) continue;
    firstAnswer.set(qi, a.selectedOption);
  }

  let correctCount = 0;
  let totalXP = 0;
  const resultAnswers = [];
  for (const [qi, selectedOption] of firstAnswer) {
    const question = questions[qi];
    const isCorrect = question.correctAnswer === selectedOption;
    if (isCorrect) {
      correctCount++;
      totalXP += question.xpReward || 10;
    }
    resultAnswers.push({ questionIndex: qi, selectedOption, isCorrect });
  }

  const score = total > 0 ? Math.min(100, Math.round((correctCount / total) * 100)) : 0;
  return { correctCount, totalXP, resultAnswers, score };
};

/**
 * @desc  Foydalanuvchi statsini olish
 * @route GET /api/xp/stats
 * @access Private
 */
const getUserStats = async (req, res) => {
  try {
    // PB-015: parallelize independent reads (User fetch is independent of stats)
    const [statsRaw, user] = await Promise.all([
      UserStats.findOne({ userId: req.user.id }),
      User.findById(req.user.id).select('xp streak').lean(),
    ]);
    let stats = statsRaw;

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

    // Mirroring check: User va UserStats XP'ni atomic $max bilan moslaymiz
    // (read-modify-write save race va weeklyXp inflatsiyasi olib tashlandi)
    if (user && (user.xp !== stats.xp || user.streak !== stats.streak)) {
      const maxXP = Math.max(user.xp || 0, stats.xp || 0);
      const maxStreak = Math.max(user.streak || 0, stats.streak || 0);

      if ((stats.xp || 0) !== maxXP || (stats.streak || 0) !== maxStreak) {
        await UserStats.updateOne({ userId: req.user.id }, { $max: { xp: maxXP, streak: maxStreak } });
        stats.xp = maxXP;
        stats.streak = maxStreak;
      }
      if ((user.xp || 0) !== maxXP || (user.streak || 0) !== maxStreak) {
        await User.updateOne(
          { _id: req.user.id },
          { $max: { xp: maxXP, streak: maxStreak }, $set: { rankTitle: calculateRank(maxXP) } }
        );
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
    res.status(500).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Server xatosi' : err.message });
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
    const { videoId } = req.params;

    // IDEMPOTENTLIK (PERF-001): XP faqat shu video uchun BIRINCHI marta beriladi.
    // Ilgari UserStats.xpAwardedVideos[] embedded massivi cheksiz o'sardi. Endi
    // alohida VideoXpAward kolleksiyasi + UNIQUE (userId,videoId) index dedupe qiladi.

    // Yordamchi: "allaqachon berilgan" javobini qaytaradi (joriy holat bilan).
    const respondAlreadyAwarded = async () => {
      const existing = await UserStats.findOne({ userId: req.user.id });
      const data = existing
        ? {
            totalXp: existing.xp,
            level: existing.level,
            streak: existing.streak,
            levelProgress: existing.getLevelProgress(),
          }
        : { totalXp: 0, level: 1, streak: 0, levelProgress: 0 };
      return res.json({ success: true, data: { xpEarned: 0, alreadyAwarded: true, ...data } });
    };

    // D04: video mavjudligi va ruxsatni tekshirish (tasodifiy ObjectId'ga XP yo'q)
    const access = await canEarnVideoXp(req.user.id, videoId);
    if (!access.ok) {
      return res.status(access.status).json({ success: false, message: access.message });
    }

    // Backward-compat: eski xpAwardedVideos massivida bo'lsa — qayta bermaymiz
    // (o'tish davri; massiv endi o'stirilmaydi/yozilmaydi). P-B15: massivni yuklamasdan exists().
    if (await UserStats.exists({ userId: req.user.id, xpAwardedVideos: videoId })) {
      return respondAlreadyAwarded();
    }

    // Atomik idempotentlik: award yozuvini birinchi bo'lib yaratamiz.
    // Duplicate-key (11000) → allaqachon berilgan (takror/parallel so'rov).
    try {
      await VideoXpAward.create({ userId: req.user.id, videoId });
    } catch (dupErr) {
      if (dupErr && dupErr.code === 11000) {
        return respondAlreadyAwarded();
      }
      throw dupErr;
    }

    // Award yozildi — XP beramiz (atomik $inc + level + Toshkent kuni bo'yicha streak + User mirror).
    const { stats } = await addXp(req.user.id, XP_FOR_VIDEO, { extraInc: { videosWatched: 1 }, streak: true });

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
    res.status(500).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Server xatosi' : err.message });
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

    if (!Array.isArray(answers)) {
      return res.status(400).json({ success: false, message: 'answers massiv bo\'lishi kerak' });
    }

    const quiz = await Quiz.findById(quizId);
    if (!quiz || quiz.isActive === false) {
      return res.status(404).json({ success: false, message: 'Quiz topilmadi' });
    }
    if (answers.length > quiz.questions.length) {
      return res.status(400).json({ success: false, message: 'Javoblar soni savollar sonidan ko\'p' });
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

    // Javoblarni tekshirish (D05: questionIndex bo'yicha dedupe + diapazon tekshiruvi)
    const graded = gradeQuizAnswers(quiz.questions, answers);
    const { correctCount, resultAnswers, score } = graded;
    let totalXP = graded.totalXP;
    const passed = score >= quiz.passingScore;

    // Bonus XP: o'tsa qo'shimcha 100 XP
    if (passed) totalXP += 100;

    // QuizResult saqlash — unique index {userId,quizId} concurrent double-submit'ni bloklaydi
    try {
      await QuizResult.create({
        userId: req.user.id,
        quizId,
        videoId: quiz.videoId,
        courseId: quiz.courseId,
        score,
        xpEarned: totalXP,
        passed,
        answers: resultAnswers,
      });
    } catch (e) {
      if (e && e.code === 11000) {
        return res.status(400).json({ success: false, message: 'Bu quizni allaqachon yechgansiz' });
      }
      throw e;
    }

    // UserStats + User — atomik $inc, level, streak (D20: quiz ham streakni yangilaydi)
    const { stats } = await addXp(req.user.id, totalXP, { extraInc: { quizzesCompleted: 1 }, streak: true });

    // Badge auto-award
    awardBadges(req.user.id).catch(() => {});

    // FEAT-2 (Spaced Repetition): xato javob berilgan savollardan takrorlash kartasi
    // yaratamiz. Upsert — mavjud karta progressini (interval/easeFactor) qayta
    // tiklamaydi; faqat yangi savol uchun karta ochiladi. Fire-and-forget.
    const wrongIdx = resultAnswers.filter((a) => !a.isCorrect).map((a) => a.questionIndex);
    if (wrongIdx.length > 0) {
      const ops = wrongIdx.map((qi) => ({
        updateOne: {
          filter: { userId: req.user.id, quizId, questionKey: String(qi) },
          update: {
            $setOnInsert: {
              userId: req.user.id,
              quizId,
              questionKey: String(qi),
              dueAt: new Date(),
            },
          },
          upsert: true,
        },
      }));
      SpacedRepetitionCard.bulkWrite(ops, { ordered: false }).catch(() => {});
    }

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
    res.status(500).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Server xatosi' : err.message });
  }
};

/**
 * @desc  Video uchun quizni olish
 * @route GET /api/xp/quiz/video/:videoId
 * @access Private
 */
const getQuizByVideo = async (req, res) => {
  try {
    // PB-007: add .lean() — read-only path, no instance methods or save() used on quiz
    const quiz = await Quiz.findOne({ videoId: req.params.videoId, isActive: true })
      .select('-questions.correctAnswer')
      .lean();

    if (!quiz) {
      return res.json({ success: true, data: null, message: 'Bu video uchun quiz mavjud emas' });
    }

    // Yechilganmi tekshirish — read-only, .lean() safe
    const solved = await QuizResult.findOne({ userId: req.user.id, quizId: quiz._id }).lean();

    res.json({
      success: true,
      data: {
        quiz,
        alreadySolved: !!solved,
        previousScore: solved ? solved.score : null,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Server xatosi' : err.message });
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

    if (skills !== undefined && (!Array.isArray(skills) || skills.length > 50 ||
        skills.some((s) => typeof s !== 'string' || s.length > 40))) {
      return res.status(400).json({ success: false, message: 'skills must be array of max 50 strings (<= 40 chars)' });
    }
    // COM-15: avatar faqat https URL (yoki tozalash uchun bo'sh/null)
    if (avatar !== undefined && avatar !== null && avatar !== '' &&
        (typeof avatar !== 'string' || avatar.length > 500 || !/^https:\/\/[^\s]+$/i.test(avatar))) {
      return res.status(400).json({ success: false, message: 'avatar must be an https URL' });
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
    if (req.body.aiStack !== undefined) {
      const VALID_TOOLS = ['Claude Code','Cursor','GitHub Copilot','ChatGPT','Gemini','Windsurf','Devin','Replit AI','Codeium','Other'];
      if (Array.isArray(req.body.aiStack)) { user.aiStack = req.body.aiStack.filter(t => VALID_TOOLS.includes(t)); userUpdated = true; }
    }

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
    res.status(500).json({ success: false, message: 'Profilni yangilashda xatolik.' });
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
    res.status(500).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Server xatosi' : err.message });
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
    // IDOR himoyasi: boshqa userga freeze qo'shish faqat admin uchun
    if (userId && String(userId) !== String(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Ruxsat yo\'q' });
    }
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
    res.status(500).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Server xatosi' : err.message });
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
      .populate('userId', 'username')
      .lean();

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
    res.status(500).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Server xatosi' : err.message });
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
    res.status(500).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Server xatosi' : err.message });
  }
};

/**
 * @desc  Kunlik check-in — streak heartbeat (XP bermaydi, faqat streakni yangilaydi).
 *        Mobil ilova kuniga bir marta chaqiradi (useDailyCheckIn).
 * @route POST /api/xp/check-in
 * @access Private
 */
const dailyCheckIn = async (req, res) => {
  try {
    let stats = await UserStats.findOne({ userId: req.user.id });
    if (!stats) {
      stats = await UserStats.create({ userId: req.user.id });
    }

    // Yagona streak qoidasi (Toshkent kalendar kuni) — utils/awardXp.applyStreak
    const { increased, freezeUsed, sameDay } = applyStreak(stats);
    if (sameDay && !increased) {
      // Bugun allaqachon faol bo'lgan — o'zgarish yo'q.
      return res.json({
        success: true,
        data: { streak: stats.streak || 0, increased: false, freezeUsed: false },
      });
    }
    await stats.save();

    // User modelini sinxronlash (Navbar/Auth streak ko'rsatishi uchun)
    await User.findByIdAndUpdate(req.user.id, { $set: { streak: stats.streak } });

    res.json({
      success: true,
      data: { streak: stats.streak, increased, freezeUsed },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Server xatosi' : err.message });
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
    res.status(500).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Server xatosi' : err.message });
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
  dailyCheckIn,
  gradeQuizAnswers,
};

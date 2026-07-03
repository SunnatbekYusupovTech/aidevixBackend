const User = require('../models/User');
const UserStats = require('../models/UserStats');
const Course = require('../models/Course');
const Video = require('../models/Video');
const Certificate = require('../models/Certificate');
const Prompt = require('../models/Prompt');
const Follow = require('../models/Follow');
const Enrollment = require('../models/Enrollment');
const QuizResult = require('../models/QuizResult');
const ActivityLog = require('../models/ActivityLog');

/**
 * @desc  Home sahifa uchun ochiq statistika
 * @route GET /api/users/home-stats
 * @access Public
 */
// Home stats cache — public homepage endpoint, 8 ta aggregation har yuklanishda
// MongoDB'ni ortiqcha yuklamasligi uchun 5 daqiqalik in-memory cache.
let _homeStatsCache = null;
let _homeStatsCacheAt = 0;
const HOME_STATS_TTL = 5 * 60 * 1000;

const getHomeStats = async (_req, res) => {
  try {
    if (_homeStatsCache && Date.now() - _homeStatsCacheAt < HOME_STATS_TTL) {
      return res.json({ success: true, data: _homeStatsCache });
    }

    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - 7);
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfPast24Hours = new Date();
    startOfPast24Hours.setHours(startOfPast24Hours.getHours() - 24);

    // ActivityLog mavjudligini tez tekshirish (kolleksiya metadata, skan yo'q)
    const useActivityLog = (await ActivityLog.estimatedDocumentCount()) > 0;

    // weeklyVideos va hourlyVideos: ActivityLog bor bo'lsa — tez yo'l (PB-001 fix)
    // Aks holda — eski Enrollment $unwind aggregation (transition fallback)
    const weeklyVideosQuery = useActivityLog
      ? ActivityLog.aggregate([
          { $match: { watchedAt: { $gte: startOfWeek } } },
          { $group: { _id: { $dayOfWeek: '$watchedAt' }, count: { $sum: 1 } } },
        ])
      : Enrollment.aggregate([
          { $unwind: '$watchedVideos' },
          { $match: { 'watchedVideos.watchedAt': { $gte: startOfWeek } } },
          { $group: { _id: { $dayOfWeek: '$watchedVideos.watchedAt' }, count: { $sum: 1 } } },
        ]);

    const hourlyVideosQuery = useActivityLog
      ? ActivityLog.aggregate([
          { $match: { watchedAt: { $gte: startOfPast24Hours } } },
          { $group: { _id: { $hour: '$watchedAt' }, count: { $sum: 1 } } },
        ])
      : Enrollment.aggregate([
          { $unwind: '$watchedVideos' },
          { $match: { 'watchedVideos.watchedAt': { $gte: startOfPast24Hours } } },
          { $group: { _id: { $hour: '$watchedVideos.watchedAt' }, count: { $sum: 1 } } },
        ]);

    const [
      students,
      videos,
      mentorsAgg,
      ratingAgg,
      weeklyVideos,
      weeklyQuizzes,
      hourlyVideos,
      hourlyQuizzes
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      Video.countDocuments({ isActive: true }),
      Course.aggregate([
        { $match: { isActive: true, instructor: { $ne: null } } },
        { $group: { _id: '$instructor' } },
        { $count: 'total' },
      ]),
      Course.aggregate([
        { $match: { isActive: true, rating: { $gt: 0 } } },
        { $group: { _id: null, avg: { $avg: '$rating' } } },
      ]),
      weeklyVideosQuery,
      QuizResult.aggregate([
        { $match: { completedAt: { $gte: startOfWeek } } },
        {
          $group: {
            _id: { $dayOfWeek: '$completedAt' },
            xp: { $sum: '$xpEarned' },
          }
        }
      ]),
      hourlyVideosQuery,
      QuizResult.aggregate([
        { $match: { completedAt: { $gte: startOfPast24Hours } } },
        {
          $group: {
            _id: { $hour: '$completedAt' },
            count: { $sum: 1 },
          }
        }
      ])
    ]);

    const mentors = mentorsAgg[0]?.total || 0;
    const rating = Number((ratingAgg[0]?.avg || 0).toFixed(1));

    const daysMap = {
      2: 'Mon',
      3: 'Tue',
      4: 'Wed',
      5: 'Thu',
      6: 'Fri',
      7: 'Sat',
      1: 'Sun'
    };

    const skillGrowth = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(dayName => {
      const videoMatch = weeklyVideos.find(v => daysMap[v._id] === dayName);
      const quizMatch = weeklyQuizzes.find(q => daysMap[q._id] === dayName);
      
      const videoXp = videoMatch ? videoMatch.count * 50 : 0;
      const quizXp = quizMatch ? quizMatch.xp : 0;
      
      return {
        day: dayName,
        xp: videoXp + quizXp
      };
    });

    const activityTelemetry = Array.from({ length: 24 }).map((_, hourOffset) => {
      const targetHour = (new Date().getHours() - (23 - hourOffset) + 24) % 24;
      const videoMatch = hourlyVideos.find(v => v._id === targetHour);
      const quizMatch = hourlyQuizzes.find(q => q._id === targetHour);
      
      const videoCount = videoMatch ? videoMatch.count : 0;
      const quizCount = quizMatch ? quizMatch.count : 0;
      
      return videoCount + quizCount;
    });

    _homeStatsCache = { students, videos, mentors, rating, skillGrowth, activityTelemetry };
    _homeStatsCacheAt = Date.now();

    return res.json({ success: true, data: _homeStatsCache });
  } catch (err) {
    return res.status(500).json({ success: false, message: process.env.NODE_ENV === 'production' ? 'Server xatosi' : err.message });
  }
};

/**
 * @desc  Foydalanuvchining ochiq profili (achievement showcase)
 * @route GET /api/users/:username/public
 * @access Public
 */
const getPublicProfile = async (req, res) => {
  try {
    const { username } = req.params;

    const user = await User.findOne({ username, isActive: true })
      .select('username firstName lastName avatar aiStack createdAt role jobTitle')
      .lean();

    if (!user) {
      return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi' });
    }

    // PB-006: run stats + totalUsers in parallel (independent queries)
    const [stats, totalUsers] = await Promise.all([
      UserStats.findOne({ userId: user._id })
        .select('xp level streak badges bio skills weeklyXp')
        .lean(),
      UserStats.countDocuments(),
    ]);

    // PB-006: merge rank query into the main Promise.all to cut one sequential await
    // Sertifikatlar, promptlar, follow statistikasi — bitta Promise.all bilan
    const [
      rank,
      certCount, topCerts, promptCount, topPrompts,
      followersCount, followingCount, completedCourses,
    ] = await Promise.all([
      stats
        ? UserStats.countDocuments({ xp: { $gt: stats.xp || 0 } }).then(c => c + 1)
        : Promise.resolve(totalUsers),
      Certificate.countDocuments({ userId: user._id }),
      Certificate.find({ userId: user._id })
        .sort({ createdAt: -1 })
        .limit(3)
        .select('courseName certificateCode createdAt')
        .lean(),
      Prompt.countDocuments({ author: user._id }),
      Prompt.find({ author: user._id, isPublic: true })
        .sort({ likesCount: -1, viewsCount: -1 })
        .limit(3)
        .select('title category tool likesCount viewsCount')
        .lean(),
      Follow.countDocuments({ followingId: user._id }),
      Follow.countDocuments({ followerId: user._id }),
      Enrollment.countDocuments({ userId: user._id, isCompleted: true }),
    ]);

    const getRankTitle = (level = 1) => {
      if (level >= 90) return 'GRANDMASTER';
      if (level >= 75) return 'VICE-ADMIRAL';
      if (level >= 60) return 'COMMANDER';
      if (level >= 45) return 'CAPTAIN';
      if (level >= 30) return 'LIEUTENANT';
      if (level >= 15) return 'SERGEANT';
      if (level >= 5)  return 'CORPORAL';
      return 'RECRUIT';
    };

    res.json({
      success: true,
      data: {
        user: {
          username:  user.username,
          firstName: user.firstName,
          lastName:  user.lastName,
          avatar:    user.avatar,
          aiStack:   user.aiStack || [],
          jobTitle:  user.jobTitle,
          joinedAt:  user.createdAt,
        },
        stats: {
          xp:               stats?.xp || 0,
          level:            stats?.level || 1,
          streak:           stats?.streak || 0,
          weeklyXp:         stats?.weeklyXp || 0,
          badges:           stats?.badges || [],
          bio:              stats?.bio || '',
          skills:           stats?.skills || [],
        },
        ranking: {
          rank,
          total:      totalUsers,
          rankTitle:  getRankTitle(stats?.level || 1),
          topPercent: totalUsers > 0 ? Math.round((rank / totalUsers) * 100) : 100,
        },
        social: {
          followers: followersCount,
          following: followingCount,
        },
        achievements: {
          certificatesCount: certCount,
          completedCourses,
          topCertificates: topCerts,
          promptsCount: promptCount,
          topPrompts,
        },
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: process.env.NODE_ENV !== 'production' ? err.message : 'Server xatosi' });
  }
};

module.exports = { getPublicProfile, getHomeStats };

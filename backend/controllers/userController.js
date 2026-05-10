const User = require('../models/User');
const UserStats = require('../models/UserStats');
const Course = require('../models/Course');
const Video = require('../models/Video');
const Certificate = require('../models/Certificate');
const Prompt = require('../models/Prompt');
const Follow = require('../models/Follow');
const Enrollment = require('../models/Enrollment');

/**
 * @desc  Home sahifa uchun ochiq statistika
 * @route GET /api/users/home-stats
 * @access Public
 */
const getHomeStats = async (_req, res) => {
  try {
    const [students, videos, mentorsAgg, ratingAgg] = await Promise.all([
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
    ]);

    const mentors = mentorsAgg[0]?.total || 0;
    const rating = Number((ratingAgg[0]?.avg || 0).toFixed(1));

    return res.json({
      success: true,
      data: {
        students,
        videos,
        mentors,
        rating,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
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

    const stats = await UserStats.findOne({ userId: user._id })
      .select('xp level streak badges bio skills weeklyXp')
      .lean();

    const totalUsers = await UserStats.countDocuments();
    const rank = stats
      ? (await UserStats.countDocuments({ xp: { $gt: stats.xp || 0 } })) + 1
      : totalUsers;

    // Sertifikatlar, promptlar, follow statistikasi — bitta Promise.all bilan
    const [certCount, topCerts, promptCount, topPrompts, followersCount, followingCount, completedCourses] =
      await Promise.all([
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
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getPublicProfile, getHomeStats };

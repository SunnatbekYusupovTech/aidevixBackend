const Follow    = require('../models/Follow');
const UserStats = require('../models/UserStats');

// COM-02: boshqa foydalanuvchilarning email'i qaytarilmaydi. P-B14: lean + limit.
const PEER_USER_FIELDS = 'username firstName lastName avatar jobTitle';
const listLimit = (q) => Math.min(Math.max(parseInt(q.limit) || 100, 1), 200);

/** @desc  Foydalanuvchiga obuna bo'lish | @route POST /api/follow/:userId | @access Private */
const followUser = async (req, res) => {
  try {
    const followingId = req.params.userId;
    const followerId  = req.user._id;

    if (followerId.toString() === followingId)
      return res.status(400).json({ success: false, message: 'O\'zingizga obuna bo\'lolmaysiz' });

    await Follow.create({ followerId, followingId });
    res.json({ success: true, message: 'Obuna bo\'ldingiz' });
  } catch (err) {
    if (err.code === 11000)
      return res.status(400).json({ success: false, message: 'Siz bu foydalanuvchiga allaqachon obuna bo\'lgansiz' });
    res.status(500).json({ success: false, message: err.message });
  }
};

/** @desc  Obunani bekor qilish | @route DELETE /api/follow/:userId | @access Private */
const unfollowUser = async (req, res) => {
  try {
    await Follow.findOneAndDelete({ followerId: req.user._id, followingId: req.params.userId });
    res.json({ success: true, message: 'Obuna bekor qilindi' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** @desc  Followers va following | @route GET /api/follow/:userId/stats | @access Public */
const getFollowStats = async (req, res) => {
  try {
    const userId = req.params.userId;
    const [followers, following] = await Promise.all([
      Follow.countDocuments({ followingId: userId }),
      Follow.countDocuments({ followerId: userId }),
    ]);

    let isFollowing = false;
    if (req.user) {
      isFollowing = !!(await Follow.findOne({ followerId: req.user._id, followingId: userId }));
    }

    res.json({ success: true, data: { followers, following, isFollowing } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** @desc  Mening followerlarim | @route GET /api/follow/my/followers | @access Private */
const getMyFollowers = async (req, res) => {
  try {
    const follows = await Follow.find({ followingId: req.user._id })
      .populate('followerId', PEER_USER_FIELDS)
      .sort({ createdAt: -1 })
      .limit(listLimit(req.query))
      .lean();

    res.json({ success: true, data: { followers: follows.map(f => f.followerId) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/** @desc  Men kuzatayotganlar | @route GET /api/follow/my/following | @access Private */
const getMyFollowing = async (req, res) => {
  try {
    const follows = await Follow.find({ followerId: req.user._id })
      .populate('followingId', PEER_USER_FIELDS)
      .sort({ createdAt: -1 })
      .limit(listLimit(req.query))
      .lean();

    res.json({ success: true, data: { following: follows.map(f => f.followingId) } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { followUser, unfollowUser, getFollowStats, getMyFollowers, getMyFollowing };

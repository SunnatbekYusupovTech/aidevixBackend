const mongoose = require('mongoose');
const UserStats = require('../models/UserStats');
const Course = require('../models/Course');
const User = require('../models/User');
const { putToBlob } = require('../middleware/uploadMiddleware');

/** @desc  Avatar yuklash | @route POST /api/upload/avatar | @access Private */
const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Rasm tanlanmadi yoki turi noto\'g\'ri' });

    const avatarUrl = await putToBlob(req.file, 'avatars');
    const userId = req.user._id || req.user.id;

    // 1. UserStats modelini yangilash
    await UserStats.findOneAndUpdate(
      { userId },
      { avatar: avatarUrl },
      { upsert: true, new: true }
    );

    // 2. Asosiy User modelini ham yangilash (sinxron bo'lishi uchun)
    await User.findByIdAndUpdate(userId, { avatar: avatarUrl });

    res.json({ 
      success: true, 
      message: 'Avatar muvaffaqiyatli yangilandi', 
      data: { avatarUrl } 
    });
  } catch (err) {
    console.error('❌ AVATAR UPLOAD ERROR:', err);
    res.status(500).json({
      success: false,
      message: 'Avatar yuklashda xatolik yuz berdi'
    });
  }
};

/** @desc  Kurs thumbnail yuklash (Admin) | @route POST /api/upload/thumbnail/:courseId | @access Admin */
const uploadThumbnail = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.courseId)) {
      return res.status(400).json({ success: false, message: 'Yaroqsiz ID' });
    }

    if (!req.file) return res.status(400).json({ success: false, message: 'Rasm tanlanmadi' });

    const thumbnailUrl = await putToBlob(req.file, 'thumbnails');
    const course = await Course.findByIdAndUpdate(
      req.params.courseId,
      { thumbnail: thumbnailUrl },
      { new: true },
    );

    if (!course) return res.status(404).json({ success: false, message: 'Kurs topilmadi' });

    res.json({ success: true, message: 'Thumbnail yangilandi', data: { thumbnailUrl } });
  } catch (err) {
    console.error('❌ THUMBNAIL UPLOAD ERROR:', err);
    res.status(500).json({ success: false, message: 'Thumbnail yuklashda xatolik yuz berdi' });
  }
};

module.exports = { uploadAvatar, uploadThumbnail };

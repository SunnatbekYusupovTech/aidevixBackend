const Video = require('../models/Video');
const Course = require('../models/Course');
const VideoLink = require('../models/VideoLink');
const VideoQuestion = require('../models/VideoQuestion');
const { performSubscriptionCheck } = require('../utils/checkSubscriptions');
const User = require('../models/User');
const {
  createBunnyVideo,
  deleteBunnyVideo,
  getBunnyVideoInfo,
  generateSignedEmbedUrl,
  getUploadCredentials,
  parseBunnyStatus,
} = require('../utils/bunny');

// Get all videos for a course
const getCourseVideos = async (req, res) => {
  try {
    const { courseId } = req.params;

    const videos = await Video.find({
      course: courseId,
      isActive: true
    }).sort({ order: 1 }).lean();

    res.json({
      success: true,
      data: {
        videos,
        count: videos.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching videos.',
    });
  }
};

// Get single video (requires subscription check)
const getVideo = async (req, res) => {
  try {
    const { id } = req.params;

    const video = await Video.findById(id).populate('course').lean();

    if (!video || !video.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Video not found.',
      });
    }

    // User subscription status is already verified by checkSubscriptions middleware
    const isAiVideo = video.course?.category === 'ai';
    if (isAiVideo) {
      const user = await User.findById(req.user._id).select('proSubscription');
      const hasPro =
        Boolean(user?.proSubscription?.active) &&
        (!user?.proSubscription?.expiresAt || new Date(user.proSubscription.expiresAt).getTime() > Date.now());

      if (!hasPro) {
        return res.status(402).json({
          success: false,
          code: 'PRO_REQUIRED',
          message: 'Bu AI dars Pro obuna uchun ochiq. Davom etish uchun Pro sotib oling.',
          data: {
            requiresPro: true,
            price: Number(process.env.PRO_SUBSCRIPTION_PRICE_UZS || 99000),
            currency: 'UZS',
          },
        });
      }
    }

    // Video Bunny.net da mavjudmi va tayyor holatdami?
    let embedUrl = null;
    let expiresAt = null;

    if (!video.bunnyVideoId) {
      // Bunny ID yo'q — video hali yuklanmagan (dev mode da davom etamiz)
      console.warn(`[Video ${id}] bunnyVideoId yo'q — video player ko'rinmaydi`);
    } else if (video.bunnyStatus !== 'ready') {
      // Bunny da hali qayta ishlanmoqda
      console.warn(`[Video ${id}] bunnyStatus: ${video.bunnyStatus} — hali tayyor emas`);
    } else {
      // 2 soatlik muddatli signed embed URL yaratish
      const signed = generateSignedEmbedUrl(video.bunnyVideoId);
      embedUrl = signed.embedUrl;
      expiresAt = signed.expiresAt;
    }

    // Ko'rishlar sonini oshirish (background)
    Video.findByIdAndUpdate(id, { $inc: { viewCount: 1 } })
      .exec()
      .catch((e) => console.error('[video] viewCount inc:', e.message));

    res.json({
      success: true,
      data: {
        video: {
          _id: video._id,
          title: video.title,
          description: video.description,
          duration: video.duration,
          order: video.order,
          thumbnail: video.thumbnail,
          materials: video.materials,
          course: video.course,
          views: video.viewCount,
          rating: video.rating,
        },
        player: embedUrl ? { embedUrl, expiresAt } : null,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching video.',
    });
  }
};


// Use video link (mark as used when accessed)
// This function checks subscription status in real-time before allowing access
const useVideoLink = async (req, res) => {
  try {
    const { linkId } = req.params;

    const videoLink = await VideoLink.findById(linkId).populate('user').populate({
      path: 'video',
      populate: { path: 'course', select: 'category title' },
    });

    if (!videoLink) {
      return res.status(404).json({
        success: false,
        message: 'Video link not found.',
      });
    }

    // Check if link belongs to user
    if (videoLink.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to use this link.',
      });
    }

    // Check if already used
    if (videoLink.isUsed) {
      return res.status(400).json({
        success: false,
        message: 'This video link has already been used.',
      });
    }

    // Check expiration
    if (videoLink.expiresAt && new Date() > videoLink.expiresAt) {
      return res.status(400).json({
        success: false,
        message: 'This video link has expired.',
      });
    }

    // IMPORTANT: Real-time subscription check before allowing video access
    const user = await User.findById(req.user._id);
    const { instagramSubscribed, telegramSubscribed, changed } = await performSubscriptionCheck(user);

    if (changed) {
      await user.save();
    }

    if (!instagramSubscribed || !telegramSubscribed) {
      const missingSubscriptions = [];
      if (!instagramSubscribed) missingSubscriptions.push('Instagram');
      if (!telegramSubscribed) missingSubscriptions.push('Telegram');

      return res.status(403).json({
        success: false,
        message: `Siz obuna bekor qildingiz. Video ko'ra olmaysiz. Iltimos, ${missingSubscriptions.join(' va ')} ga qayta obuna bo'ling.`,
        subscriptions: {
          instagram: instagramSubscribed,
          telegram: telegramSubscribed,
        },
        missingSubscriptions,
      });
    }

    const isAiVideo = videoLink.video?.course?.category === 'ai';
    if (isAiVideo) {
      const hasPro =
        Boolean(user?.proSubscription?.active) &&
        (!user?.proSubscription?.expiresAt || new Date(user.proSubscription.expiresAt).getTime() > Date.now());
      if (!hasPro) {
        return res.status(402).json({
          success: false,
          code: 'PRO_REQUIRED',
          message: 'AI kontent uchun Pro obuna talab qilinadi.',
          data: {
            requiresPro: true,
            price: Number(process.env.PRO_SUBSCRIPTION_PRICE_UZS || 99000),
            currency: 'UZS',
          },
        });
      }
    }

    // All checks passed - mark link as used
    videoLink.isUsed = true;
    videoLink.usedAt = new Date();
    await videoLink.save();

    res.json({
      success: true,
      message: 'Video link used successfully.',
      data: {
        videoLink,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error using video link.',
    });
  }
};

// Create video (Admin only)
// 2-qadam:
//   1. POST /api/videos       → video yaratiladi (DB + Bunny slot)
//   2. GET  /api/videos/:id/upload-credentials → admin to'g'ridan-to'g'ri Bunny ga yuklaydi
const createVideo = async (req, res) => {
  try {
    const { title, description, courseId, order, duration, thumbnail } = req.body;

    if (!title || !courseId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title and courseId.',
      });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found.',
      });
    }

    // Bunny Stream da video slot yaratish
    let bunnyVideoId = null;
    if (process.env.BUNNY_STREAM_API_KEY && process.env.BUNNY_LIBRARY_ID) {
      const bunnyVideo = await createBunnyVideo(title);
      bunnyVideoId = bunnyVideo.guid;
    }

    const video = await Video.create({
      title,
      description,
      course: courseId,
      order: order || 0,
      duration: duration || 0,
      thumbnail,
      bunnyVideoId,
      bunnyStatus: 'pending',
    });

    // Kursga video qo'shish
    course.videos.push(video._id);
    await course.save();

    // Upload credentials ni darhol qaytaramiz (admin shu yerdan yuklaydi)
    const uploadInfo = bunnyVideoId
      ? getUploadCredentials(bunnyVideoId)
      : null;

    res.status(201).json({
      success: true,
      message: 'Video created successfully.',
      data: {
        video,
        upload: uploadInfo, // admin shu ma'lumot bilan Bunny ga yuklaydi
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating video.',
    });
  }
};

// Update video (Admin only)
const updateVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, order, duration, thumbnail, isActive } = req.body;

    const video = await Video.findById(id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found.',
      });
    }

    // Update fields
    if (title !== undefined) video.title = title;
    if (description !== undefined) video.description = description;
    if (order !== undefined) video.order = order;
    if (duration !== undefined) video.duration = duration;
    if (thumbnail) video.thumbnail = thumbnail;
    if (isActive !== undefined) video.isActive = isActive;

    await video.save();

    res.json({
      success: true,
      message: 'Video updated successfully.',
      data: {
        video,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating video.',
    });
  }
};

// Delete video (Admin only)
const deleteVideo = async (req, res) => {
  try {
    const { id } = req.params;

    const video = await Video.findById(id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'Video not found.',
      });
    }

    // Bunny Stream dan ham o'chirish (xato bo'lsa ham davom etamiz)
    if (video.bunnyVideoId) {
      try {
        await deleteBunnyVideo(video.bunnyVideoId);
      } catch (bunnyErr) {
        console.error('Bunny delete error:', bunnyErr.message);
      }
    }

    await video.deleteOne();

    res.json({
      success: true,
      message: 'Video deleted successfully.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting video.',
    });
  }
};

// Ask a question about a video
const askQuestion = async (req, res) => {
  try {
    const { id: videoId } = req.params;
    const { question, parentId = null, mentions = [] } = req.body;

    if (!question || question.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Savol matni kiritilishi shart' });
    }
    if (question.trim().length > 2000) {
      return res.status(400).json({ success: false, message: 'Savol 2000 belgidan oshmasligi kerak' });
    }

    const video = await Video.findById(videoId);
    if (!video || !video.isActive) {
      return res.status(404).json({ success: false, message: 'Video topilmadi' });
    }

    const qa = await VideoQuestion.create({
      videoId,
      courseId: video.course,
      userId: req.user._id,
      question: question.trim(),
      parentId: parentId || null,
      mentions: Array.isArray(mentions) ? mentions.slice(0, 8) : [],
    });

    await qa.populate('userId', 'username');

    res.status(201).json({ success: true, data: { question: qa } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all questions for a video
const getVideoQuestions = async (req, res) => {
  try {
    const { id: videoId } = req.params;
    const page  = parseInt(req.query.page)  || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip  = (page - 1) * limit;

    const [questions, total] = await Promise.all([
      VideoQuestion.find({ videoId })
        .populate('userId', 'username')
        .populate('answeredBy', 'username')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      VideoQuestion.countDocuments({ videoId }),
    ]);

    const roots = questions.filter((q) => !q.parentId);
    const repliesMap = {};
    questions.forEach((q) => {
      if (q.parentId) {
        const key = q.parentId.toString();
        if (!repliesMap[key]) repliesMap[key] = [];
        repliesMap[key].push(q);
      }
    });
    const threaded = roots.map((q) => ({
      ...q.toObject(),
      upvotesCount: q.upvotes?.length || 0,
      replies: (repliesMap[q._id.toString()] || []).map((r) => ({
        ...r.toObject(),
        upvotesCount: r.upvotes?.length || 0,
      })),
    }));

    res.json({
      success: true,
      data: { questions: threaded, total, page, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Answer a question (Admin only)
const answerQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    const { answer } = req.body;

    if (!answer || answer.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Javob matni kiritilishi shart' });
    }
    if (answer.trim().length > 5000) {
      return res.status(400).json({ success: false, message: 'Javob 5000 belgidan oshmasligi kerak' });
    }

    const qa = await VideoQuestion.findById(questionId);
    if (!qa) {
      return res.status(404).json({ success: false, message: 'Savol topilmadi' });
    }

    qa.answer     = answer.trim();
    qa.answeredBy = req.user._id;
    qa.answeredAt = new Date();
    qa.isAnswered = true;
    await qa.save();

    await qa.populate(['userId', 'answeredBy']);

    res.json({ success: true, message: 'Savol javoblandi', data: { question: qa } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const upvoteQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    const qa = await VideoQuestion.findById(questionId);
    if (!qa) return res.status(404).json({ success: false, message: 'Savol topilmadi' });
    const userId = req.user._id.toString();
    const exists = qa.upvotes.some((id) => id.toString() === userId);
    if (exists) {
      qa.upvotes = qa.upvotes.filter((id) => id.toString() !== userId);
    } else {
      qa.upvotes.push(req.user._id);
    }
    await qa.save();
    return res.json({
      success: true,
      data: { upvoted: !exists, upvotesCount: qa.upvotes.length },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const markBestAnswer = async (req, res) => {
  try {
    const { questionId } = req.params;
    const target = await VideoQuestion.findById(questionId);
    if (!target) return res.status(404).json({ success: false, message: 'Javob topilmadi' });
    if (!target.parentId) {
      return res.status(400).json({ success: false, message: 'Best answer faqat reply uchun' });
    }
    await VideoQuestion.updateMany({ parentId: target.parentId }, { $set: { isBestAnswer: false } });
    target.isBestAnswer = true;
    await target.save();
    return res.json({ success: true, message: 'Best answer belgilandi' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Bunny.net specific endpoints ────────────────────────────────────────────

// Upload credentials olish (Admin only)
// Admin shu ma'lumot bilan video faylni to'g'ridan-to'g'ri Bunny ga yuklaydi
const getUploadCredentialsForVideo = async (req, res) => {
  try {
    const { id } = req.params;

    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found.' });
    }

    if (!video.bunnyVideoId) {
      return res.status(400).json({
        success: false,
        message: 'Bu video Bunny.net ga ulangan emas.',
      });
    }

    const uploadInfo = getUploadCredentials(video.bunnyVideoId);

    res.json({
      success: true,
      data: {
        videoId: video._id,
        bunnyVideoId: video.bunnyVideoId,
        ...uploadInfo,
        note: 'uploadUrl ga PUT so\'rov yuboring, body = video fayl binary, header = AccessKey',
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching upload credentials.' });
  }
};

// Video holati tekshirish — Bunny processing tugadimi? (Admin only)
const checkVideoStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found.' });
    }

    if (!video.bunnyVideoId) {
      return res.status(400).json({
        success: false,
        message: 'Bu video Bunny.net ga ulangan emas.',
      });
    }

    const bunnyInfo = await getBunnyVideoInfo(video.bunnyVideoId);
    const newStatus = parseBunnyStatus(bunnyInfo.status);

    // DB ni yangilash (agar o'zgangan bo'lsa)
    if (video.bunnyStatus !== newStatus) {
      video.bunnyStatus = newStatus;
      // Bunny dan haqiqiy davomiylikni olamiz
      if (bunnyInfo.length) video.duration = bunnyInfo.length;
      await video.save();
    }

    res.json({
      success: true,
      data: {
        videoId: video._id,
        bunnyStatus: newStatus,
        isReady: newStatus === 'ready',
        duration: bunnyInfo.length || video.duration,
        bunnyRaw: {
          status: bunnyInfo.status,
          availableResolutions: bunnyInfo.availableResolutions,
          encodeProgress: bunnyInfo.encodeProgress,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error checking video status.' });
  }
};

// Video ni Bunny ga qayta ulash (eski videolar uchun — Admin only)
const linkToBunny = async (req, res) => {
  try {
    const { id } = req.params;
    const { bunnyVideoId } = req.body;

    if (!bunnyVideoId) {
      return res.status(400).json({ success: false, message: 'bunnyVideoId majburiy.' });
    }

    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found.' });
    }

    // Bunny da mavjudligini tekshirish
    const bunnyInfo = await getBunnyVideoInfo(bunnyVideoId);
    const status = parseBunnyStatus(bunnyInfo.status);

    video.bunnyVideoId = bunnyVideoId;
    video.bunnyStatus = status;
    if (bunnyInfo.length) video.duration = bunnyInfo.length;
    await video.save();

    res.json({
      success: true,
      message: 'Video Bunny.net ga ulandi.',
      data: { video },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error linking video to Bunny.' });
  }
};

// Search videos by title
const searchVideos = async (req, res) => {
  try {
    const { q = '', courseId, page = 1, limit = 20 } = req.query;
    const lim = Math.min(Math.max(1, parseInt(limit) || 20), 100);
    const pg = Math.max(1, parseInt(page) || 1);
    const skip = (pg - 1) * lim;

    const filter = { isActive: true };
    if (q.trim()) {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.title = { $regex: escaped, $options: 'i' };
    }
    if (courseId) filter.course = courseId;

    const [videos, total] = await Promise.all([
      Video.find(filter)
        .select('title description order duration thumbnail course bunnyStatus')
        .populate('course', 'title category')
        .sort({ course: 1, order: 1 })
        .skip(skip)
        .limit(lim)
        .lean(),
      Video.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        videos,
        pagination: {
          total,
          page: pg,
          limit: lim,
          pages: Math.ceil(total / lim),
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get top viewed videos
 * GET /api/videos/top?limit=10
 */
const getTopVideos = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);

    const videos = await Video.find({ isActive: true })
      .sort({ viewCount: -1 })
      .limit(limit)
      .populate('course', 'title category')
      .lean();

    res.json({
      success: true,
      data: {
        videos,
        count: videos.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching top videos.',
      error: error.message
    });
  }
};

module.exports = {
  getCourseVideos,
  getVideo,
  getTopVideos,
  useVideoLink,
  createVideo,
  updateVideo,
  deleteVideo,
  searchVideos,
  askQuestion,
  getVideoQuestions,
  answerQuestion,
  upvoteQuestion,
  markBestAnswer,
  getUploadCredentialsForVideo,
  checkVideoStatus,
  linkToBunny,
};

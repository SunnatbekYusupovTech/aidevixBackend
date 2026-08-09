const mongoose = require('mongoose');
const Video = require('../models/Video');
const Course = require('../models/Course');
const VideoLink = require('../models/VideoLink');
const VideoQuestion = require('../models/VideoQuestion');
const { performSubscriptionCheck } = require('../utils/checkSubscriptions');
const User = require('../models/User');
const mkhls = require('../utils/mkhls');
const {
  createBunnyVideo,
  deleteBunnyVideo,
  getBunnyVideoInfo,
  generateSignedEmbedUrl,
  streamUploadToBunny,
  parseBunnyStatus,
} = require('../utils/bunny');

// Admin video yuklash uchun same-origin proxy ma'lumoti (AccessKey FRONTENDGA chiqmaydi).
// Frontend bu URL'ga PUT qiladi (cookie auth), backend Bunny'ga oqizadi.
const buildProxyUploadInfo = (videoDbId) => ({
  uploadUrl: `videos/${videoDbId}/upload-proxy`,
  method: 'PUT',
  headers: { 'Content-Type': 'application/octet-stream' },
});

// Get all videos for a course
const getCourseVideos = async (req, res) => {
  try {
    const { courseId } = req.params;

    // PB-008: faqat kerakli fieldlar — questions (embedded massiv) va materials chiqariladi
    // streamPath is deliberately absent: this endpoint is unauthenticated
    // and a storage path is a provider identifier (spec §10.4). Only the
    // coarse status ships, which the admin list needs.
    const videos = await Video.find({
      course: courseId,
      isActive: true
    })
      .select('_id title description order duration thumbnail viewCount sectionId course streamStatus')
      .sort({ order: 1 })
      .lean();

    res.json({
      success: true,
      data: {
        videos,
        count: videos.length,
      },
    });
  } catch (error) {
    console.error('[videoController] getCourseVideos:', error.message);
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
    console.error('[videoController] getVideo:', error.message);
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

    // mkhls needs no slot to be created up front — the storage path is
    // derived from the document id and the file arrives later via the
    // upload proxy. Pre-generating the id keeps this to one write.
    const _id = new mongoose.Types.ObjectId();
    const streamPath = mkhls.buildStreamPath(_id.toString());

    const video = await Video.create({
      _id,
      title,
      description,
      course: courseId,
      order: order || 0,
      duration: duration || 0,
      thumbnail,
      streamPath,
      streamStatus: 'pending',
    });

    // Kursga video qo'shish (atomic — race'da VersionError oldini oladi)
    await Course.updateOne({ _id: courseId }, { $push: { videos: video._id } });

    res.status(201).json({
      success: true,
      message: 'Video created successfully.',
      data: {
        video,
        // Always present now: unlike Bunny, mkhls needs no pre-created slot,
        // so there is no configuration under which upload is unavailable.
        upload: buildProxyUploadInfo(video._id),
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
    console.error('[videoController] askQuestion:', error.message);
    res.status(500).json({ success: false, message: 'Savolni yuborishda xatolik.' });
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
        .limit(limit)
        .lean(),
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
      ...q,
      upvotesCount: q.upvotes?.length || 0,
      replies: (repliesMap[q._id.toString()] || []).map((r) => ({
        ...r,
        upvotesCount: r.upvotes?.length || 0,
      })),
    }));

    res.json({
      success: true,
      data: { questions: threaded, total, page, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('[videoController] getVideoQuestions:', error.message);
    res.status(500).json({ success: false, message: 'Savollarni olishda xatolik.' });
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
    console.error('[videoController] answerQuestion:', error.message);
    res.status(500).json({ success: false, message: 'Javob berishda xatolik.' });
  }
};

const upvoteQuestion = async (req, res) => {
  try {
    const { questionId } = req.params;
    const userId = req.user._id;

    // Atomic toggle: avval pull, modifiedCount=0 bo'lsa addToSet
    const pulled = await VideoQuestion.updateOne(
      { _id: questionId, upvotes: userId },
      { $pull: { upvotes: userId } }
    );
    let upvoted = false;
    if (pulled.modifiedCount === 0) {
      const added = await VideoQuestion.updateOne(
        { _id: questionId },
        { $addToSet: { upvotes: userId } }
      );
      if (added.matchedCount === 0) {
        return res.status(404).json({ success: false, message: 'Savol topilmadi' });
      }
      upvoted = true;
    }

    const qa = await VideoQuestion.findById(questionId).select('upvotes').lean();
    if (!qa) return res.status(404).json({ success: false, message: 'Savol topilmadi' });
    return res.json({
      success: true,
      data: { upvoted, upvotesCount: qa.upvotes.length },
    });
  } catch (error) {
    console.error('[videoController] upvoteQuestion:', error.message);
    return res.status(500).json({ success: false, message: 'Ovoz berishda xatolik.' });
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
    console.error('[videoController] markBestAnswer:', error.message);
    return res.status(500).json({ success: false, message: 'Best answer belgilashda xatolik.' });
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

    if (!video.streamPath) {
      return res.status(400).json({
        success: false,
        message: 'Bu video mkhls ga ulangan emas.',
      });
    }

    const uploadInfo = buildProxyUploadInfo(video._id);

    res.json({
      success: true,
      data: {
        videoId: video._id,
        streamPath: video.streamPath,
        ...uploadInfo,
        note: 'uploadUrl ga (backend proxy) PUT so\'rov yuboring, body = video fayl binary. mkhls admin paroli backend\'da qoladi.',
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching upload credentials.' });
  }
};

// Admin video binary'ni backend orqali mkhls'ga oqizadi.
// req — octet-stream (body-parser tegmaydi), to'g'ridan-to'g'ri pipe qilinadi:
// fayl backend diskiga hech qachon tushmaydi (Railway diski efemer).
const uploadVideoProxy = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id).select('streamPath streamStatus');
    if (!video) return res.status(404).json({ success: false, message: 'Video not found.' });
    if (!video.streamPath) {
      return res.status(400).json({ success: false, message: 'Bu video mkhls ga ulangan emas.' });
    }

    const contentLength = req.headers['content-length'];
    if (!contentLength) {
      // Without a length the multipart body cannot be framed without
      // buffering the whole file first — see utils/mkhls.js uploadVideo.
      return res.status(411).json({
        success: false,
        message: 'Content-Length majburiy (chunked upload qo\'llab-quvvatlanmaydi).',
      });
    }

    try {
      await mkhls.uploadVideo(video.streamPath, req, contentLength);
    } catch (err) {
      console.error('[video] upload proxy:', err.code, err.message);
      video.streamStatus = 'failed';
      await video.save();
      return res.status(502).json({ success: false, message: 'mkhls ga yuklashda xato.' });
    }

    video.streamStatus = 'processing';
    await video.save();

    // Exactly one side queues the job. When mkhls has transcode_on_upload
    // enabled it already did; calling again could start a duplicate if that
    // first job happened to finish in between (mkhls's guard only blocks
    // jobs that are still pending or running).
    if (process.env.MKHLS_TRANSCODE_ON_UPLOAD !== 'true') {
      try {
        await mkhls.startTranscode(video.streamPath);
      } catch (err) {
        // The bytes are safely in mkhls; report the upload as the success it
        // was and let the admin retry transcoding rather than lose the file.
        console.error('[video] startTranscode after upload:', err.code, err.message);
      }
    }

    res.json({
      success: true,
      message: 'Video mkhls ga yuklandi.',
      data: { videoId: video._id, streamStatus: video.streamStatus },
    });
  } catch (error) {
    console.error('[video] upload proxy xato:', error.message);
    res.status(502).json({ success: false, message: 'mkhls ga yuklashda xato.' });
  }
};

// Video holati — transcode tugadimi? (Admin only)
const checkVideoStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found.' });
    }
    if (!video.streamPath) {
      return res.status(400).json({ success: false, message: 'Bu video mkhls ga ulangan emas.' });
    }

    let info;
    try {
      info = await mkhls.getVideoInfo(video.streamPath);
    } catch (err) {
      if (err.code === 'NOT_FOUND') {
        // Yaratilgan, lekin hali yuklanmagan — bu xato emas, kutilgan holat.
        return res.json({
          success: true,
          data: {
            videoId: video._id,
            streamStatus: video.streamStatus,
            bunnyStatus: video.streamStatus, // DEPRECATED — Plan 3 gacha admin panel uchun
            isReady: false,
            duration: video.duration,
            transcode: null,
          },
        });
      }
      console.error('[video] checkVideoStatus mkhls:', err.code, err.message);
      return res.status(502).json({ success: false, message: 'mkhls bilan bog\'lanib bo\'lmadi.' });
    }

    if (video.streamStatus !== info.status || (info.duration && video.duration !== info.duration)) {
      video.streamStatus = info.status;
      if (info.duration) video.duration = info.duration;
      await video.save();
    }

    res.json({
      success: true,
      data: {
        videoId: video._id,
        streamStatus: info.status,
        // DEPRECATED mirror: the admin panel reads bunnyStatus until Plan 3
        // renames it, and that panel is how this plan gets verified by hand.
        bunnyStatus: info.status,
        isReady: info.status === 'ready',
        duration: info.duration || video.duration,
        // progress_percent is deliberately absent — mkhls never advances it.
        transcode: info.transcode,
      },
    });
  } catch (error) {
    console.error('[videoController] checkVideoStatus:', error.message);
    res.status(500).json({ success: false, message: 'Error checking video status.' });
  }
};

// Mavjud mkhls yo'liga qo'lda bog'lash (Admin only).
// Eski yoki qo'lda yuklangan videolar uchun: fayl mkhls'da allaqachon bor.
const linkToStream = async (req, res) => {
  try {
    const { id } = req.params;
    const { streamPath } = req.body;

    if (!streamPath || typeof streamPath !== 'string') {
      return res.status(400).json({ success: false, message: 'streamPath majburiy.' });
    }

    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found.' });
    }

    // mkhls'da haqiqatan bor-yo'qligini tekshiramiz — bo'lmagan yo'lni
    // bog'lash video'ni jimgina buzuq holatga olib keladi.
    let info;
    try {
      info = await mkhls.getVideoInfo(streamPath);
    } catch (err) {
      if (err.code === 'NOT_FOUND') {
        return res.status(404).json({
          success: false,
          message: `mkhls'da bunday video yo'q: ${streamPath}`,
        });
      }
      console.error('[video] linkToStream mkhls:', err.code, err.message);
      return res.status(502).json({ success: false, message: 'mkhls bilan bog\'lanib bo\'lmadi.' });
    }

    video.streamPath = streamPath;
    video.streamStatus = info.status;
    if (info.duration) video.duration = info.duration;
    await video.save();

    res.json({ success: true, message: 'Video mkhls ga ulandi.', data: { video } });
  } catch (error) {
    console.error('[videoController] linkToStream:', error.message);
    res.status(500).json({ success: false, message: 'Error linking video to stream.' });
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
      // PERF-005: text index ({ title:'text' }) — index-backed $text search.
      // courseId equality filter top-level'da birga ishlaydi.
      filter.$text = { $search: q.trim() };
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
    console.error('[videoController] searchVideos:', error.message);
    res.status(500).json({ success: false, message: 'Qidiruvda xatolik.' });
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
    console.error('[videoController] getTopVideos:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching top videos.',
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
  uploadVideoProxy,
  checkVideoStatus,
  linkToStream,
};

const mongoose = require('mongoose');
const Video = require('../models/Video');
const Course = require('../models/Course');
const VideoLink = require('../models/VideoLink');
const VideoQuestion = require('../models/VideoQuestion');
const Enrollment = require('../models/Enrollment');
const { performSubscriptionCheck } = require('../utils/checkSubscriptions');
const User = require('../models/User');
const mkhls = require('../utils/mkhls');

// Upload ceiling for the admin proxy. A 40-60 minute 1080p lesson source is
// typically 2-4 GB, so this leaves headroom while still refusing an
// accidental uncompressed export before it fills the disk. Express's own
// body limits do not apply here: this route pipes raw octet-stream.
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB

// Admin video yuklash uchun same-origin proxy ma'lumoti (AccessKey FRONTENDGA chiqmaydi).
// Frontend bu URL'ga PUT qiladi (cookie auth), backend mkhls'ga oqizadi.
const buildProxyUploadInfo = (videoDbId) => ({
  uploadUrl: `videos/${videoDbId}/upload-proxy`,
  method: 'PUT',
  headers: { 'Content-Type': 'application/octet-stream' },
});

// ─── Preparing-video status reconciliation ───────────────────────────────────
//
// checkVideoStatus is the only other code that re-reads mkhls and writes
// streamStatus back, and its route is admin-only. The frontend's 30s poll
// (spec §11) hits GET /api/videos/:id, so without this a transcode that
// finishes after the admin closes the panel never lands in Mongo: the video
// stays 'processing' and every student polls forever.
//
// The throttle keeps a burst of viewers on one preparing lesson from becoming
// a burst of mkhls admin calls. It is deliberately in-process and dependency
// free — a shared cache or a scheduler is a bigger change than this earns,
// and per-instance throttling is already enough to bound the call rate.
const STATUS_REFRESH_COOLDOWN_MS = Number(process.env.MKHLS_STATUS_REFRESH_COOLDOWN_MS || 15000);
const STATUS_REFRESH_MAX_ENTRIES = 5000;
const lastStatusRefresh = new Map(); // videoId → ms since epoch

// Videos leave this map's interest as soon as they turn ready, so entries are
// pruned by age rather than removed on a lifecycle event.
const pruneStatusRefreshCache = (now) => {
  if (lastStatusRefresh.size <= STATUS_REFRESH_MAX_ENTRIES) return;
  for (const [key, at] of lastStatusRefresh) {
    if (now - at > STATUS_REFRESH_COOLDOWN_MS) lastStatusRefresh.delete(key);
  }
};

/**
 * Re-reads mkhls for a video that is still preparing and persists what it
 * finds. Returns the status to use for this response.
 *
 * Never throws: an unreachable mkhls means "we still don't know", which is
 * exactly what the stored status already says. A preparing video is not a
 * 503 case — that branch belongs to a ready video whose token cannot be
 * minted, where claiming "tayyorlanmoqda" would be a lie.
 */
const refreshPreparingStatus = async (video) => {
  const stored = video.streamStatus;
  if (!video.streamPath) return stored;
  if (stored !== 'pending' && stored !== 'processing') return stored;

  const key = String(video._id);
  const now = Date.now();
  const last = lastStatusRefresh.get(key);
  if (last !== undefined && now - last < STATUS_REFRESH_COOLDOWN_MS) return stored;

  // Claim the cooldown *before* awaiting, so concurrent viewers arriving in
  // the same tick collapse into one mkhls call rather than all racing past a
  // check that only closes once the first response lands.
  lastStatusRefresh.set(key, now);
  pruneStatusRefreshCache(now);

  try {
    const info = await mkhls.getVideoInfo(video.streamPath);
    const nextDuration = info.duration || video.duration;
    if (info.status !== stored || nextDuration !== video.duration) {
      await Video.updateOne(
        { _id: video._id },
        { $set: { streamStatus: info.status, duration: nextDuration } }
      );
      // The caller holds a lean() copy — keep it consistent with what was
      // just written so this same response can serve the player.
      video.duration = nextDuration;
    }
    return info.status;
  } catch (err) {
    console.error('[video] status refresh:', err.code, err.message);
    return stored;
  }
};

const _resetStatusRefreshCache = () => lastStatusRefresh.clear();

// Get all videos for a course
const getCourseVideos = async (req, res) => {
  try {
    const { courseId } = req.params;

    // SEO-007 dagi kurs konvensiyasi: parametr ObjectId ham, slug ham bo'lishi
    // mumkin. `getCourseById` buni allaqachon qo'llab-quvvatlaydi, bu endpoint esa
    // yo'q edi — natijada kurs sahifasi (`/courses/<slug>`) kursning o'zini topib,
    // darslarini so'raganda Mongoose slug'ni ObjectId'ga cast qilolmay 500 berardi
    // va sahifa darslarsiz ochilardi.
    const resolvedCourseId = /^[0-9a-f]{24}$/.test(courseId)
      ? courseId
      : (await Course.findOne({ slug: courseId }).select('_id').lean())?._id;

    if (!resolvedCourseId) {
      return res.status(404).json({ success: false, message: 'Kurs topilmadi.' });
    }

    // PB-008: faqat kerakli fieldlar — questions (embedded massiv) va materials chiqariladi
    // streamPath is deliberately absent: this endpoint is unauthenticated
    // and a storage path is a provider identifier (spec §10.4). Only the
    // coarse status ships, which the admin list needs.
    const videos = await Video.find({
      course: resolvedCourseId,
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

    // Projection is not optional here: without it the whole Course document
    // goes out to every subscribed user. These three fields are what the
    // frontend type declares (frontend/src/types/video.ts) and all this
    // controller reads — course.category for the Pro gate, course._id below.
    const video = await Video.findById(id).populate('course', '_id title category').lean();

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

    // ─── Player ──────────────────────────────────────────────────────────────
    // player === null bo'lsa frontend "tayyorlanmoqda" ekranini ko'rsatadi —
    // bu shartnoma o'zgarmadi.
    let player = null;

    // A still-preparing video is reconciled against mkhls here, because this
    // is the endpoint the student's poll actually reaches.
    const streamStatus = await refreshPreparingStatus(video);

    if (!video.streamPath) {
      console.warn(`[Video ${id}] streamPath yo'q — video hali yuklanmagan`);
    } else if (streamStatus !== 'ready') {
      console.warn(`[Video ${id}] streamStatus: ${streamStatus} — hali tayyor emas`);
    } else {
      try {
        const { token, expiresAt } = await mkhls.generateStreamToken(video.streamPath);
        player = {
          type: 'hls',
          hlsUrl: mkhls.buildHlsUrl(video.streamPath, token),
          expiresAt,
        };
      } catch (err) {
        console.error('[video] stream token:', err.code, err.message);
        // mkhls o'chgan bo'lsa video haqiqatan ham ko'rsatib bo'lmaydi —
        // 200 + player:null "tayyorlanmoqda" deb yolg'on aytardi (spec §11).
        return res.status(503).json({
          success: false,
          message: 'Video vaqtincha mavjud emas. Birozdan keyin urinib ko\'ring.',
        });
      }
    }

    // ─── Resume pozitsiyasi ──────────────────────────────────────────────────
    let progress = null;
    const enrollment = await Enrollment.findOne({
      userId: req.user._id,
      courseId: video.course?._id || video.course,
    })
      .select('watchedVideos')
      .lean();

    const watched = enrollment?.watchedVideos?.find(
      (w) => String(w.videoId) === String(video._id)
    );
    if (watched) {
      progress = { lastPositionSeconds: watched.watchedSeconds || 0 };
    }

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
          // `rating` olib tashlandi: models/Video.js da bunday field yo'q,
          // ya'ni u har doim undefined qaytardi.
        },
        player,
        progress,
        // Frontend "tayyorlanmoqda" ekranida nimani pollinq qilishni bilishi uchun.
        streamStatus,
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

    // Both populates are projected. The response below serialises the whole
    // videoLink document, so an unprojected populate ships every field of the
    // joined document with it — and this route is `authenticate` only, no
    // requireAdmin. `video` therefore leaked streamPath (a provider identifier,
    // spec §10.4) to any logged-in user from the moment the mkhls migration
    // added the field, and `user` shipped the entire account document.
    //
    // The fields kept are exactly the ones this handler or its response needs:
    // video.course.category drives the Pro gate, user._id drives the ownership
    // check, and the rest is what the caller displays.
    const videoLink = await VideoLink.findById(linkId)
      .populate('user', '_id username')
      .populate({
        path: 'video',
        select: '_id title description duration order thumbnail course streamStatus',
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
//   1. POST /api/videos       → video yaratiladi (DB + mkhls streamPath)
//   2. PUT  /api/videos/:id/upload-proxy → admin faylni backend proxy orqali yuklaydi
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

    // mkhls'dan ham o'chiramiz. Xato bo'lsa ham davom etamiz: DB yozuvini
    // qoldirish foydalanuvchiga o'chirilgan darsni ko'rsatib turishdan yomonroq.
    if (video.streamPath) {
      try {
        const removed = await mkhls.deleteVideo(video.streamPath);
        if (!removed) {
          console.warn(`[video] mkhls'da yozuv topilmadi: ${video.streamPath}`);
        }
      } catch (err) {
        console.error('[video] mkhls delete:', err.code, err.message);
      }
    }

    // Course.videos is written by createVideo and, until this line existed, never
    // repaired. Nothing reads it any more — markVideoWatched derives progress
    // from Video.find({course, isActive:true}) — but leaving a knowingly wrong
    // array in the database misleads the next reader, and anything that starts
    // reading it later would be silently wrong. This cleanup is best-effort only:
    // failing to tidy the array is strictly less bad than leaving a video row
    // whose stream asset is already gone.
    if (video.course) {
      try {
        await Course.updateOne({ _id: video.course }, { $pull: { videos: video._id } });
      } catch (err) {
        console.error('[video] Course.videos cleanup:', err.code, err.message);
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

// ─── mkhls endpoints ─────────────────────────────────────────────────────────

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

    // A non-positive length is rejected here as well as a missing one. "0" is
    // a truthy string, so it used to slip past this guard and fail inside
    // mkhls.uploadVideo with INVALID_LENGTH — before a single byte left the
    // process, yet still writing streamStatus='failed' below.
    const contentLength = Number(req.headers['content-length']);
    if (!Number.isFinite(contentLength) || contentLength <= 0) {
      // Without a length the multipart body cannot be framed without
      // buffering the whole file first — see utils/mkhls.js uploadVideo.
      return res.status(411).json({
        success: false,
        message: 'Content-Length majburiy va noldan katta bo\'lishi kerak (chunked upload qo\'llab-quvvatlanmaydi).',
      });
    }

    if (contentLength > MAX_UPLOAD_BYTES) {
      return res.status(413).json({
        success: false,
        message: `Fayl juda katta. Maksimal hajm — ${MAX_UPLOAD_BYTES / (1024 * 1024 * 1024)} GB.`,
      });
    }

    // A client that hangs up mid-transfer is not a failure of the video: the
    // bytes never arrived, so nothing about the stored video changed.
    let clientAborted = false;
    req.on('aborted', () => { clientAborted = true; });

    const previousStatus = video.streamStatus;

    try {
      await mkhls.uploadVideo(video.streamPath, req, contentLength);
    } catch (err) {
      console.error('[video] upload proxy:', err.code, err.message);

      // Only mkhls's own rejection of bytes it received says anything about
      // the stored video. A pre-flight validation error never reached mkhls,
      // and an aborted client never finished sending — in both cases the
      // video in mkhls is exactly whatever it was before this request.
      //
      // req.readableEnded is checked alongside the 'aborted' event because
      // that event does not fire for every hangup shape: an abrupt client
      // destroy mid-body surfaces as a server-level 'clientError' and the
      // request stream sees nothing at all (verified against Node v22.13.1).
      const clientGoneEarly = clientAborted || (req.destroyed && !req.readableEnded);
      const neverReachedMkhls =
        clientGoneEarly || err.code === 'INVALID_LENGTH' || err.code === 'INVALID_PATH';

      // And a video that was already playable stays playable regardless: its
      // renditions are still in mkhls, so downgrading it here would take a
      // live lesson offline for every student until an admin happened to poll
      // the admin-only status endpoint.
      if (!neverReachedMkhls && previousStatus !== 'ready') {
        video.streamStatus = 'failed';
        await video.save();
      }

      return res.status(502).json({
        success: false,
        message: 'mkhls ga yuklashda xato.',
        data: { videoId: video._id, streamStatus: video.streamStatus },
      });
    }

    video.streamStatus = 'processing';
    await video.save();

    // Transcoding is queued unconditionally — the MKHLS_TRANSCODE_ON_UPLOAD
    // gate that used to wrap this is gone.
    //
    // The gate implemented an "exactly one side queues" rule guarding against
    // a duplicate job, which needs mkhls's own job to *finish* between its
    // queueing and this call landing — impossible for a real lesson, and
    // startTranscode already treats mkhls's 409 as the success it is. The
    // rule's other failure mode is real and was observed live: when the two
    // config values drift apart, *neither* side queues, mkhls keeps the
    // upload stamped 'ready' for JIT streaming, and the student gets a 404
    // behind a valid-looking player URL.
    try {
      await mkhls.startTranscode(video.streamPath);
    } catch (err) {
      // Not recoverable by waiting. Both shipped mkhls configs set
      // vod.transcode_on_upload=false, so mkhls stamps a fresh upload 'ready'
      // immediately and nothing else will ever move it off that. Reporting
      // this upload as a success would let the next status poll copy that
      // 'ready' into Mongo and hand students a token for a video with no
      // renditions behind it — permanently, and with nothing to detect.
      console.error('[video] startTranscode after upload:', err.code, err.message);
      video.streamStatus = 'failed';
      await video.save();
      return res.status(502).json({
        success: false,
        message: 'Video yuklandi, lekin transcode boshlanmadi — qayta yuklang.',
        data: { videoId: video._id, streamStatus: video.streamStatus },
      });
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
      if (err.code === 'NOT_FOUND' && video.streamStatus === 'pending') {
        // Yaratilgan, lekin hali yuklanmagan — bu xato emas, kutilgan holat.
        // Faqat 'pending' uchun: agar avval processing/ready bo'lgan video
        // mkhls'da topilmasa, bu anomaliya (masalan tashqi o'chirish), yolg'on
        // 'ready' qaytarish o'rniga pastdagi 502 orqali xato sifatida ko'rsatiladi.
        return res.json({
          success: true,
          data: {
            videoId: video._id,
            streamStatus: video.streamStatus,
            isReady: video.streamStatus === 'ready',
            duration: video.duration,
            transcode: null,
          },
        });
      }
      if (err.code === 'NOT_FOUND') {
        console.error('[video] checkVideoStatus: mkhls record missing for non-pending video', video._id.toString(), video.streamStatus);
        return res.status(502).json({ success: false, message: 'Video mkhls da endi mavjud emas.' });
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
        .select('title description order duration thumbnail course streamStatus')
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

    // streamPath is deliberately absent: like getCourseVideos, this endpoint
    // is unauthenticated and a storage path is a provider identifier (spec
    // §10.4). Schema fields added for mkhls leak through an unfiltered
    // .lean() otherwise — this route predates the migration and was never
    // touched by it, so it kept returning every field, streamPath included.
    const videos = await Video.find({ isActive: true })
      .select('_id title description order duration thumbnail viewCount sectionId course streamStatus')
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
  uploadVideoProxy,
  checkVideoStatus,
  linkToStream,
  // Test seam: the refresh cooldown is module state, so a suite exercising
  // several getVideo cases against one id would otherwise have the first
  // case's cooldown suppress every later refresh.
  _resetStatusRefreshCache,
};

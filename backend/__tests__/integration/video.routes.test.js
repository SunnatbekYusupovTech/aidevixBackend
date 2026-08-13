'use strict';

const express = require('express');
const request = require('supertest');

// Variables referenced inside a jest.mock factory must be prefixed `mock`.
const mockUserId = '507f1f77bcf86cd799439011';

jest.mock('../../models/Video');
jest.mock('../../models/Course');
jest.mock('../../models/Enrollment');
jest.mock('../../models/User');
jest.mock('../../models/VideoLink');
jest.mock('../../models/VideoQuestion');
jest.mock('../../utils/mkhls');
jest.mock('../../utils/checkSubscriptions', () => ({
  performSubscriptionCheck: jest.fn().mockResolvedValue({
    instagramSubscribed: true,
    telegramSubscribed: true,
    changed: false,
  }),
}));
jest.mock('../../middleware/auth', () => ({
  authenticate: (req, res, next) => {
    req.user = { _id: mockUserId };
    next();
  },
  requireAdmin: (req, res, next) => next(),
}));
jest.mock('../../middleware/subscriptionCheck', () => ({
  checkSubscriptions: (req, res, next) => next(),
}));

const Video = require('../../models/Video');
const Enrollment = require('../../models/Enrollment');
const VideoLink = require('../../models/VideoLink');
const User = require('../../models/User');
const mkhls = require('../../utils/mkhls');

const VIDEO_ID = '68f00112233445566778899a';
const COURSE_ID = '68f00112233445566778899b';

const app = express();
app.use(express.json());
app.use('/api/videos', require('../../routes/videoRoutes'));

// getVideo does Video.findById(id).populate('course').lean()
const mockVideo = (overrides) => {
  Video.findById.mockReturnValue({
    populate: () => ({
      lean: async () => ({
        _id: VIDEO_ID,
        title: 'Dars 1',
        description: 'test',
        duration: 120,
        order: 1,
        thumbnail: null,
        materials: [],
        viewCount: 7,
        isActive: true,
        // Deliberately defined (no schema field backs this): if the response
        // were to bring `rating` back via `rating: video.rating`, a defined
        // source value shows up in the JSON. `undefined` would not — JSON.stringify
        // drops undefined keys, so an always-undefined source can't tell "the
        // field was removed" apart from "the field exists but is empty" (spec §12).
        rating: 4.5,
        course: { _id: COURSE_ID, category: 'general', title: 'Kurs' },
        streamPath: `aidevix/${VIDEO_ID}.mp4`,
        streamStatus: 'ready',
        ...overrides,
      }),
    }),
  });
};

// getVideo does Enrollment.findOne(...).select(...).lean()
const mockEnrollment = (watchedVideos) => {
  Enrollment.findOne.mockReturnValue({
    select: () => ({ lean: async () => (watchedVideos ? { watchedVideos } : null) }),
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  mockEnrollment(null);
  // getVideo's mkhls refresh is throttled by module-level state keyed on the
  // video id, and every case here uses the same id — without this reset the
  // first case's cooldown would silently suppress the refresh in all the rest,
  // and the refresh tests would pass for the wrong reason.
  require('../../controllers/videoController')._resetStatusRefreshCache();
  mkhls.buildHlsUrl.mockImplementation(
    (streamPath, token) => `https://stream.test/vod/${streamPath}/master.m3u8?token=${token}`
  );
  // Default: mkhls still says "preparing". Cases that care override this.
  mkhls.getVideoInfo.mockResolvedValue({
    status: 'processing',
    mkhlsStatus: 'processing',
    duration: 0,
    transcode: null,
  });
});

describe('GET /api/videos/:id', () => {
  it('returns an hls player when the video is ready', async () => {
    mockVideo();
    const expiresAt = new Date(Date.now() + 14400000);
    mkhls.generateStreamToken.mockResolvedValue({ token: 'tok-1', expiresAt });

    const res = await request(app).get(`/api/videos/${VIDEO_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.data.player).toEqual({
      type: 'hls',
      hlsUrl: `https://stream.test/vod/aidevix/${VIDEO_ID}.mp4/master.m3u8?token=tok-1`,
      expiresAt: expiresAt.toISOString(),
    });
    expect(mkhls.generateStreamToken).toHaveBeenCalledWith(`aidevix/${VIDEO_ID}.mp4`);
  });

  it('returns the resume position when the user has watched before', async () => {
    mockVideo();
    mkhls.generateStreamToken.mockResolvedValue({ token: 'tok-1', expiresAt: new Date() });
    mockEnrollment([{ videoId: VIDEO_ID, watchedSeconds: 734 }]);

    const res = await request(app).get(`/api/videos/${VIDEO_ID}`);

    expect(res.body.data.progress).toEqual({ lastPositionSeconds: 734 });
  });

  it('returns a null player while the video is still processing', async () => {
    mockVideo({ streamStatus: 'processing' });

    const res = await request(app).get(`/api/videos/${VIDEO_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.data.player).toBeNull();
    expect(res.body.data.streamStatus).toBe('processing');
    expect(mkhls.generateStreamToken).not.toHaveBeenCalled();
  });

  it('returns a null player when transcoding failed', async () => {
    mockVideo({ streamStatus: 'failed' });

    const res = await request(app).get(`/api/videos/${VIDEO_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.data.player).toBeNull();
    expect(res.body.data.streamStatus).toBe('failed');
  });

  it('returns a null player when the video was never uploaded', async () => {
    mockVideo({ streamPath: null, streamStatus: 'pending' });

    const res = await request(app).get(`/api/videos/${VIDEO_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.data.player).toBeNull();
  });

  it('returns 503 when mkhls is unreachable, not a 200 claiming it is processing', async () => {
    mockVideo();
    const err = new Error('mkhls unreachable');
    err.code = 'UNREACHABLE';
    mkhls.generateStreamToken.mockRejectedValue(err);

    const res = await request(app).get(`/api/videos/${VIDEO_ID}`);

    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
  });

  it('does not expose a rating field that no schema backs', async () => {
    mockVideo();
    mkhls.generateStreamToken.mockResolvedValue({ token: 'tok-1', expiresAt: new Date() });

    const res = await request(app).get(`/api/videos/${VIDEO_ID}`);

    expect(res.body.data.video).not.toHaveProperty('rating');
  });

  it('does not increment viewCount on a page load', async () => {
    mockVideo();
    mkhls.generateStreamToken.mockResolvedValue({ token: 'tok-1', expiresAt: new Date() });

    const res = await request(app).get(`/api/videos/${VIDEO_ID}`);

    // Without this, the assertion below would also pass on a 404 that never
    // reached the controller — findByIdAndUpdate is uncalled either way.
    expect(res.status).toBe(200);
    expect(Video.findByIdAndUpdate).not.toHaveBeenCalled();
  });
});

// A video that is still preparing is reconciled against mkhls inside getVideo,
// because GET /api/videos/:id is the endpoint the student's 30s poll reaches.
// checkVideoStatus is admin-only, so without this a transcode that finishes
// after the admin closes the panel never lands in Mongo.
describe('GET /api/videos/:id — mkhls status reconciliation', () => {
  it('serves the player in the same response when the refresh reveals ready', async () => {
    mockVideo({ streamStatus: 'processing' });
    mkhls.getVideoInfo.mockResolvedValue({
      status: 'ready',
      mkhlsStatus: 'ready',
      duration: 305,
      transcode: null,
    });
    const expiresAt = new Date(Date.now() + 14400000);
    mkhls.generateStreamToken.mockResolvedValue({ token: 'tok-fresh', expiresAt });

    const res = await request(app).get(`/api/videos/${VIDEO_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.data.streamStatus).toBe('ready');
    expect(res.body.data.player).not.toBeNull();
    expect(res.body.data.player.hlsUrl).toContain('tok-fresh');
    // ...and it is persisted, or the next request would rediscover it.
    expect(Video.updateOne).toHaveBeenCalledWith(
      { _id: VIDEO_ID },
      { $set: { streamStatus: 'ready', duration: 305 } }
    );
  });

  it('falls back to the stored status and still returns 200 when mkhls is unreachable', async () => {
    mockVideo({ streamStatus: 'processing' });
    const err = new Error('mkhls unreachable');
    err.code = 'UNREACHABLE';
    mkhls.getVideoInfo.mockRejectedValue(err);

    const res = await request(app).get(`/api/videos/${VIDEO_ID}`);

    // A preparing video is not a 503 case — that branch belongs to a *ready*
    // video whose token cannot be minted.
    expect(res.status).toBe(200);
    expect(res.body.data.streamStatus).toBe('processing');
    expect(res.body.data.player).toBeNull();
    expect(Video.updateOne).not.toHaveBeenCalled();
  });

  it('throttles the refresh so a burst of viewers is not a burst of mkhls calls', async () => {
    mockVideo({ streamStatus: 'processing' });

    await request(app).get(`/api/videos/${VIDEO_ID}`);
    await request(app).get(`/api/videos/${VIDEO_ID}`);
    await request(app).get(`/api/videos/${VIDEO_ID}`);

    expect(mkhls.getVideoInfo).toHaveBeenCalledTimes(1);
  });

  it('never refreshes a video that is already ready', async () => {
    mockVideo({ streamStatus: 'ready' });
    mkhls.generateStreamToken.mockResolvedValue({ token: 't', expiresAt: new Date() });

    await request(app).get(`/api/videos/${VIDEO_ID}`);

    expect(mkhls.getVideoInfo).not.toHaveBeenCalled();
  });

  it('never refreshes a video that was never uploaded', async () => {
    mockVideo({ streamPath: null, streamStatus: 'pending' });

    await request(app).get(`/api/videos/${VIDEO_ID}`);

    expect(mkhls.getVideoInfo).not.toHaveBeenCalled();
  });
});

// The upload proxy's state machine. The rule these all serve: streamStatus is
// only ever written from something that actually happened to the bytes.
describe('PUT /api/videos/:id/upload-proxy', () => {
  const mockUploadTarget = (streamStatus) => {
    const doc = {
      _id: VIDEO_ID,
      streamPath: `aidevix/${VIDEO_ID}.mp4`,
      streamStatus,
      save: jest.fn().mockResolvedValue(undefined),
    };
    Video.findById.mockReturnValue({ select: () => doc });
    return doc;
  };

  it('rejects Content-Length: 0 with 411 and leaves a ready video ready', async () => {
    const doc = mockUploadTarget('ready');

    const res = await request(app)
      .put(`/api/videos/${VIDEO_ID}/upload-proxy`)
      .set('Content-Type', 'application/octet-stream')
      .set('Content-Length', '0')
      .send();

    expect(res.status).toBe(411);
    // "0" is a truthy string: it used to slip past the guard and fail inside
    // mkhls.uploadVideo with INVALID_LENGTH, which then wrote 'failed' and
    // took a live lesson offline for every student.
    expect(mkhls.uploadVideo).not.toHaveBeenCalled();
    expect(doc.streamStatus).toBe('ready');
    expect(doc.save).not.toHaveBeenCalled();
  });

  it('does not downgrade an already-ready video when the upload fails', async () => {
    const doc = mockUploadTarget('ready');
    const err = new Error('mkhls exploded');
    err.code = 'REQUEST_FAILED';
    mkhls.uploadVideo.mockRejectedValue(err);

    const res = await request(app)
      .put(`/api/videos/${VIDEO_ID}/upload-proxy`)
      .set('Content-Type', 'application/octet-stream')
      .send(Buffer.alloc(64));

    expect(res.status).toBe(502);
    // Its renditions are still in mkhls, so it is still playable.
    expect(doc.streamStatus).toBe('ready');
  });

  it('does not write failed when the request never reached mkhls', async () => {
    const doc = mockUploadTarget('processing');
    const err = new Error('bad length');
    err.code = 'INVALID_LENGTH';
    mkhls.uploadVideo.mockRejectedValue(err);

    await request(app)
      .put(`/api/videos/${VIDEO_ID}/upload-proxy`)
      .set('Content-Type', 'application/octet-stream')
      .send(Buffer.alloc(64));

    expect(doc.streamStatus).toBe('processing');
  });

  it('queues the transcode even when MKHLS_TRANSCODE_ON_UPLOAD is true', async () => {
    const previous = process.env.MKHLS_TRANSCODE_ON_UPLOAD;
    process.env.MKHLS_TRANSCODE_ON_UPLOAD = 'true';
    try {
      mockUploadTarget('pending');
      mkhls.uploadVideo.mockResolvedValue(undefined);
      mkhls.startTranscode.mockResolvedValue({ queued: true, alreadyRunning: false });

      const res = await request(app)
        .put(`/api/videos/${VIDEO_ID}/upload-proxy`)
        .set('Content-Type', 'application/octet-stream')
        .send(Buffer.alloc(64));

      expect(res.status).toBe(200);
      // The gate is gone: when the two config values drifted apart, *neither*
      // side queued and the student got a 404 behind a valid player URL.
      expect(mkhls.startTranscode).toHaveBeenCalledWith(`aidevix/${VIDEO_ID}.mp4`);
    } finally {
      if (previous === undefined) delete process.env.MKHLS_TRANSCODE_ON_UPLOAD;
      else process.env.MKHLS_TRANSCODE_ON_UPLOAD = previous;
    }
  });

  it('treats alreadyRunning as the success it is', async () => {
    const doc = mockUploadTarget('pending');
    mkhls.uploadVideo.mockResolvedValue(undefined);
    mkhls.startTranscode.mockResolvedValue({ queued: false, alreadyRunning: true });

    const res = await request(app)
      .put(`/api/videos/${VIDEO_ID}/upload-proxy`)
      .set('Content-Type', 'application/octet-stream')
      .send(Buffer.alloc(64));

    expect(res.status).toBe(200);
    expect(doc.streamStatus).toBe('processing');
  });

  it('lands in failed, not a false ready, when startTranscode throws', async () => {
    const doc = mockUploadTarget('pending');
    mkhls.uploadVideo.mockResolvedValue(undefined);
    const err = new Error('no transcoder available');
    err.code = 'SERVICE_UNAVAILABLE';
    mkhls.startTranscode.mockRejectedValue(err);

    const res = await request(app)
      .put(`/api/videos/${VIDEO_ID}/upload-proxy`)
      .set('Content-Type', 'application/octet-stream')
      .send(Buffer.alloc(64));

    // mkhls stamps a fresh upload 'ready' for JIT streaming, so swallowing
    // this behind a 200 would let the next poll copy that 'ready' into Mongo
    // and hand students a token for a video with no renditions.
    expect(res.status).toBe(502);
    expect(res.body.success).toBe(false);
    expect(res.body.data.streamStatus).toBe('failed');
    expect(doc.streamStatus).toBe('failed');
  });
});

describe('POST /api/videos/link/:linkId/use', () => {
  it('projects both populates so streamPath never reaches a non-admin caller', async () => {
    const populateArgs = [];
    const videoLink = {
      _id: 'link-1',
      user: { _id: mockUserId, username: 'student' },
      video: { _id: VIDEO_ID, title: 'Dars 1', course: { category: 'general', title: 'Kurs' } },
      isUsed: false,
      expiresAt: null,
      save: jest.fn().mockResolvedValue(undefined),
    };
    const chain = {
      populate: (...args) => { populateArgs.push(args); return chain; },
      then: (resolve) => resolve(videoLink),
    };
    VideoLink.findById.mockReturnValue(chain);
    User.findById.mockResolvedValue({ _id: mockUserId, proSubscription: null, save: jest.fn() });

    const res = await request(app).post('/api/videos/link/link-1/use');

    expect(res.status).toBe(200);
    // This route is `authenticate` only — no requireAdmin. An unprojected
    // populate ships every field of the joined document, so streamPath began
    // leaking to any logged-in user the moment the schema gained it.
    expect(JSON.stringify(res.body)).not.toMatch(/streamPath/);

    const [userPopulate, videoPopulate] = populateArgs;
    expect(userPopulate).toEqual(['user', '_id username']);
    expect(videoPopulate[0].select).toBeDefined();
    expect(videoPopulate[0].select).not.toMatch(/streamPath/);
  });
});

describe('GET /api/videos/course/:courseId', () => {
  it('never projects the storage path on the unauthenticated listing', async () => {
    let projection = '';
    Video.find.mockReturnValue({
      select: (fields) => {
        projection = fields;
        return { sort: () => ({ lean: async () => [] }) };
      },
    });

    await request(app).get(`/api/videos/course/${COURSE_ID}`);

    expect(projection).not.toMatch(/streamPath/);
    expect(projection).not.toMatch(/bunnyVideoId/);
    expect(projection).toMatch(/streamStatus/);
  });
});

describe('GET /api/videos/:id/upload-credentials — olib tashlangan', () => {
  it('endi umuman route sifatida mavjud emas', async () => {
    const res = await request(app).get(`/api/videos/${VIDEO_ID}/upload-credentials`);

    // Diqqat: faqat 404 statusni tekshirish YETARLI EMAS. Route hali
    // turganda ham controller "Video not found" bilan 404 qaytaradi
    // (Video.findById avtomatik mock, undefined qaytaradi) — ya'ni status
    // bo'yicha test olib tashlashdan OLDIN ham yashil bo'lardi. Express'ning
    // o'z 404'i HTML matn qaytaradi, controller esa JSON — farq shunda.
    expect(res.status).toBe(404);
    expect(res.text).toMatch(/Cannot GET/);
  });

  it("haqiqiy yuklash yo'li — upload-proxy — joyida qoladi", async () => {
    // Self-contained: uploadVideoProxy does Video.findById(id).select(...)
    // before its own Content-Length guard, so this describe block must supply
    // its own mock rather than lean on state a different describe block
    // happens to leave behind — see the `PUT /api/videos/:id/upload-proxy`
    // block above for the same pattern.
    Video.findById.mockReturnValue({
      select: () => ({ _id: VIDEO_ID, streamPath: `aidevix/${VIDEO_ID}.mp4`, streamStatus: 'ready' }),
    });

    const res = await request(app).put(`/api/videos/${VIDEO_ID}/upload-proxy`);

    // Content-Length yo'q → 411. Muhimi: bu express 404 EMAS, ya'ni route bor.
    expect(res.status).toBe(411);
  });
});

describe("GET /api/videos/:id/status — bunnyStatus ko'zgusi olib tashlandi", () => {
  const mockStatusVideo = (overrides) => {
    Video.findById.mockResolvedValue({
      _id: VIDEO_ID,
      streamPath: `aidevix/${VIDEO_ID}.mp4`,
      streamStatus: 'processing',
      duration: 120,
      save: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    });
  };

  it('mkhls javob berganda bunnyStatus qaytarmaydi', async () => {
    mockStatusVideo();
    mkhls.getVideoInfo.mockResolvedValue({
      status: 'ready',
      mkhlsStatus: 'ready',
      duration: 305,
      transcode: { presetsDone: ['480p', '720p'], presetsTotal: 2 },
    });

    const res = await request(app).get(`/api/videos/${VIDEO_ID}/status`);

    expect(res.status).toBe(200);
    expect(res.body.data.streamStatus).toBe('ready');
    expect(res.body.data).not.toHaveProperty('bunnyStatus');
  });

  it('hali yuklanmagan (pending) filialda ham bunnyStatus qaytarmaydi', async () => {
    mockStatusVideo({ streamStatus: 'pending' });
    const err = new Error('topilmadi');
    err.code = 'NOT_FOUND';
    mkhls.getVideoInfo.mockRejectedValue(err);

    const res = await request(app).get(`/api/videos/${VIDEO_ID}/status`);

    expect(res.status).toBe(200);
    expect(res.body.data.streamStatus).toBe('pending');
    expect(res.body.data).not.toHaveProperty('bunnyStatus');
  });
});

describe('GET /api/videos/:id — course proyeksiyasi', () => {
  it('faqat _id, title va category qaytaradi', async () => {
    // mockVideo's course object deliberately carries a field no client needs.
    // Before the projection it reached the response verbatim; the assertion
    // below is what proves it no longer does.
    Video.findById.mockReturnValue({
      populate: (path, projection) => {
        expect(path).toBe('course');
        expect(projection).toBe('_id title category');
        return {
          lean: async () => ({
            _id: VIDEO_ID,
            title: 'Dars 1',
            description: 'test',
            duration: 120,
            order: 1,
            thumbnail: null,
            materials: [],
            viewCount: 7,
            isActive: true,
            course: { _id: COURSE_ID, title: 'Kurs', category: 'general' },
            streamPath: `aidevix/${VIDEO_ID}.mp4`,
            streamStatus: 'ready',
          }),
        };
      },
    });
    mkhls.generateStreamToken.mockResolvedValue({ token: 'tok-1', expiresAt: new Date() });

    const res = await request(app).get(`/api/videos/${VIDEO_ID}`);

    expect(res.status).toBe(200);
    expect(Object.keys(res.body.data.video.course).sort()).toEqual(['_id', 'category', 'title']);
  });
});

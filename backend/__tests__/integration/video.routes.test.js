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
jest.mock('../../utils/bunny');
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
  mkhls.buildHlsUrl.mockImplementation(
    (streamPath, token) => `https://stream.test/vod/${streamPath}/master.m3u8?token=${token}`
  );
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

    await request(app).get(`/api/videos/${VIDEO_ID}`);

    expect(Video.findByIdAndUpdate).not.toHaveBeenCalled();
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

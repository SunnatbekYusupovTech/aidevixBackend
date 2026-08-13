'use strict';

const express = require('express');
const request = require('supertest');

const mockUserId = '507f1f77bcf86cd799439011';

jest.mock('../../models/Enrollment');
jest.mock('../../models/Course');
jest.mock('../../models/Video');
jest.mock('../../models/UserStats');
jest.mock('../../models/Certificate');
jest.mock('../../models/ActivityLog');
jest.mock('../../utils/badgeService');
jest.mock('../../utils/emailService');
jest.mock('../../middleware/auth', () => ({
  authenticate: (req, res, next) => {
    req.user = { _id: mockUserId, email: 't@t.t', name: 'T' };
    next();
  },
  requireAdmin: (req, res, next) => next(),
}));

const Enrollment = require('../../models/Enrollment');
const Course = require('../../models/Course');
const Video = require('../../models/Video');
const Certificate = require('../../models/Certificate');
const ActivityLog = require('../../models/ActivityLog');

const COURSE_ID = '68f00112233445566778899b';
const OWN_VIDEO_ID = '68f00112233445566778899a';
const FOREIGN_VIDEO_ID = '68f00112233445566778899c';

const app = express();
app.use(express.json());
app.use('/api/enrollments', require('../../routes/enrollmentRoutes'));

// The enrollment document is a Mongoose doc in production; the controller
// mutates watchedVideos and calls save(). A plain object with a jest save()
// is enough, and lets each test read back what the controller pushed.
const mockEnrollment = () => {
  const doc = {
    _id: '68f00112233445566778899d',
    userId: mockUserId,
    courseId: COURSE_ID,
    watchedVideos: [],
    totalWatchedSeconds: 0,
    progressPercent: 0,
    isCompleted: false,
    save: jest.fn().mockResolvedValue(undefined),
  };
  Enrollment.findOne.mockResolvedValue(doc);
  return doc;
};

// Course carries exactly one video, so a single accepted write would take
// progressPercent to 100 and mint a certificate. That makes the foreign-id
// case unambiguous: if the guard fails, the test sees a certificate.
const mockCourse = () => {
  Course.findById.mockImplementation((id) => ({
    select: jest.fn((fields) => {
      if (fields === 'videos') {
        return { lean: async () => ({ _id: COURSE_ID, videos: [OWN_VIDEO_ID] }) };
      }
      if (fields === 'title') {
        return Promise.resolve({ _id: COURSE_ID, title: 'Test Course' });
      }
      return {};
    }),
  }));
};

beforeEach(() => {
  jest.clearAllMocks();
  mockCourse();
  Video.updateOne.mockReturnValue({
    exec: jest.fn().mockResolvedValue({}),
  });
  Certificate.create.mockResolvedValue({});
  ActivityLog.create.mockResolvedValue({});
});

describe('POST /api/enrollments/:courseId/watch/:videoId', () => {
  it('rejects a videoId that does not belong to the course', async () => {
    const doc = mockEnrollment();

    const res = await request(app)
      .post(`/api/enrollments/${COURSE_ID}/watch/${FOREIGN_VIDEO_ID}`)
      .send({ positionSeconds: 30 });

    expect(res.status).toBe(404);
    // Nothing about the enrollment may change.
    expect(doc.watchedVideos).toHaveLength(0);
    expect(doc.progressPercent).toBe(0);
    expect(doc.save).not.toHaveBeenCalled();
    // And none of the fire-and-forget side effects may run.
    expect(Video.updateOne).not.toHaveBeenCalled();
    expect(Certificate.create).not.toHaveBeenCalled();
  });

  it('accepts a videoId that does belong to the course', async () => {
    const doc = mockEnrollment();

    const res = await request(app)
      .post(`/api/enrollments/${COURSE_ID}/watch/${OWN_VIDEO_ID}`)
      .send({ positionSeconds: 30 });

    expect(res.status).toBe(200);
    expect(doc.watchedVideos).toHaveLength(1);
    expect(doc.save).toHaveBeenCalled();
  });
});

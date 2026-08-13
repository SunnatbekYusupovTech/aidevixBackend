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
const { sendCertificateEmail } = require('../../utils/emailService');

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

// _issueCertificate still loads the course for its title. markVideoWatched no
// longer reads Course at all — it derives everything from the Video set below.
const mockCourse = () => {
  Course.findById.mockImplementation(() => ({
    select: jest.fn(() => Promise.resolve({ _id: COURSE_ID, title: 'Test Course' })),
  }));
};

// The active-video set is now the single source for membership, the progress
// denominator, and which watched entries still count. Tests pass the ids they
// want Video.find({course, isActive:true}) to return.
const mockActiveVideos = (ids) => {
  Video.find.mockReturnValue({
    select: () => ({ lean: async () => ids.map((id) => ({ _id: id })) }),
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  mockCourse();
  mockActiveVideos([OWN_VIDEO_ID]);
  Video.updateOne.mockReturnValue({
    exec: jest.fn().mockResolvedValue({}),
  });
  Certificate.create.mockResolvedValue({});
  ActivityLog.create.mockResolvedValue({});
  // jest.mock('../../utils/emailService') automocks sendCertificateEmail as a
  // plain jest.fn() that returns undefined by default — but the real function
  // is async and always returns a Promise. _issueCertificate chains
  // `.catch(() => {})` straight off the call, so without this the mock's
  // `undefined` return blows up with "Cannot read properties of undefined
  // (reading 'catch')" on every successful certificate issuance.
  sendCertificateEmail.mockResolvedValue({});
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

describe('POST /api/enrollments/:courseId/watch/:videoId — progress Video to\'plamidan', () => {
  const STALE_ID = '68f00112233445566778899e';

  it('massivda qolgan, lekin endi mavjud bo\'lmagan dars sertifikatni to\'smaydi', async () => {
    const doc = mockEnrollment();
    // The array still lists two lessons, but only one is a live active Video —
    // the other was deleted or deactivated and never pulled. Reading the array
    // would give a denominator of 2, so watching the only real lesson would
    // stop at 50% and the certificate would never issue for this course.
    // This single case covers both stale-deleted and soft-deleted (isActive:false)
    // entries: the mechanism is identical — an id the Video query does not return.
    Course.findById.mockImplementation(() => ({
      select: jest.fn(() => Promise.resolve({ _id: COURSE_ID, title: 'Test Course', videos: [OWN_VIDEO_ID, STALE_ID] })),
    }));
    mockActiveVideos([OWN_VIDEO_ID]);

    const res = await request(app)
      .post(`/api/enrollments/${COURSE_ID}/watch/${OWN_VIDEO_ID}`)
      .send({ positionSeconds: 30 });

    expect(res.status).toBe(200);
    expect(doc.progressPercent).toBe(100);
    expect(doc.isCompleted).toBe(true);
    expect(Certificate.create).toHaveBeenCalled();
  });

  it('ko\'rilgan dars keyin nofaol bo\'lsa progress 100 dan oshmaydi', async () => {
    const doc = mockEnrollment();
    // The user already watched two lessons; one of them is no longer in the
    // active set. Counting raw watchedVideos.length against a denominator of 1
    // would give 200%.
    doc.watchedVideos = [
      { videoId: OWN_VIDEO_ID, watchedSeconds: 10 },
      { videoId: STALE_ID, watchedSeconds: 10 },
    ];
    mockActiveVideos([OWN_VIDEO_ID]);

    const res = await request(app)
      .post(`/api/enrollments/${COURSE_ID}/watch/${OWN_VIDEO_ID}`)
      .send({ positionSeconds: 40 });

    expect(res.status).toBe(200);
    expect(doc.progressPercent).toBe(100);
  });

  it('kursda faol dars bo\'lmasa 404 qaytaradi va hech narsani o\'zgartirmaydi', async () => {
    const doc = mockEnrollment();
    mockActiveVideos([]);

    const res = await request(app)
      .post(`/api/enrollments/${COURSE_ID}/watch/${OWN_VIDEO_ID}`)
      .send({ positionSeconds: 30 });

    expect(res.status).toBe(404);
    expect(doc.save).not.toHaveBeenCalled();
    expect(Video.updateOne).not.toHaveBeenCalled();
  });
});

describe('POST /api/enrollments/:courseId/watch/:videoId — sertifikat chiqmasa isCompleted belgilanmaydi', () => {
  it('Certificate.create duplikat bo\'lmagan xato bilan rad etsa, isCompleted false qoladi', async () => {
    const doc = mockEnrollment();
    mockActiveVideos([OWN_VIDEO_ID]);
    Certificate.create.mockRejectedValueOnce(new Error('Mongo bosh og\'rig\'i'));

    const res = await request(app)
      .post(`/api/enrollments/${COURSE_ID}/watch/${OWN_VIDEO_ID}`)
      .send({ positionSeconds: 30 });

    // The request itself still succeeds — a certificate hiccup is not the
    // caller's problem — but the enrollment must NOT be marked completed,
    // so the next watch on this course retries certificate issuance.
    expect(res.status).toBe(200);
    expect(doc.progressPercent).toBe(100);
    expect(doc.isCompleted).toBe(false);
    expect(doc.completedAt).toBeUndefined();
    expect(doc.save).toHaveBeenCalled();
  });

  it('Certificate.create duplikat-kalit (11000) bilan rad etsa, isCompleted baribir true bo\'ladi', async () => {
    const doc = mockEnrollment();
    mockActiveVideos([OWN_VIDEO_ID]);
    const dupErr = new Error('E11000 duplicate key');
    dupErr.code = 11000;
    Certificate.create.mockRejectedValueOnce(dupErr);

    const res = await request(app)
      .post(`/api/enrollments/${COURSE_ID}/watch/${OWN_VIDEO_ID}`)
      .send({ positionSeconds: 30 });

    // A duplicate certificate means one already exists for this enrollment —
    // that is success from the caller's point of view, not a failure.
    expect(res.status).toBe(200);
    expect(doc.progressPercent).toBe(100);
    expect(doc.isCompleted).toBe(true);
    expect(doc.completedAt).toBeInstanceOf(Date);
  });

  it('kurs allaqachon o\'chirilgan bo\'lsa (Course topilmasa) yiqilmaydi va tugallanmaydi', async () => {
    const doc = mockEnrollment();
    mockActiveVideos([OWN_VIDEO_ID]);
    // deleteCourse has no cascade — Videos and Enrollments can outlive their
    // Course, so _issueCertificate's Course.findById(...).select('title')
    // can legitimately resolve null here.
    Course.findById.mockImplementation(() => ({
      select: jest.fn(() => Promise.resolve(null)),
    }));

    const res = await request(app)
      .post(`/api/enrollments/${COURSE_ID}/watch/${OWN_VIDEO_ID}`)
      .send({ positionSeconds: 30 });

    expect(res.status).toBe(200);
    expect(doc.progressPercent).toBe(100);
    expect(doc.isCompleted).toBe(false);
    expect(Certificate.create).not.toHaveBeenCalled();
  });
});

describe('POST /api/enrollments/:courseId/watch/:videoId — progress 100 dan oshmaydi (takroriy yozuv)', () => {
  it('watchedVideos da bir xil videoId ikki marta bo\'lsa ham progressPercent 100 dan oshmaydi', async () => {
    const doc = mockEnrollment();
    // Simulates two concurrent first-watch POSTs for the same videoId: each
    // request hydrates its own document, each finds no existing entry, each
    // pushes. watchedActive must count DISTINCT ids, not raw entries — else
    // 2 entries / 1 active video = 200%, which the schema's max:100 validator
    // would reject with a ValidationError (a 500 in production).
    doc.watchedVideos = [
      { videoId: OWN_VIDEO_ID, watchedSeconds: 5 },
      { videoId: OWN_VIDEO_ID, watchedSeconds: 5 },
    ];
    mockActiveVideos([OWN_VIDEO_ID]);

    const res = await request(app)
      .post(`/api/enrollments/${COURSE_ID}/watch/${OWN_VIDEO_ID}`)
      .send({ positionSeconds: 40 });

    expect(res.status).toBe(200);
    expect(doc.progressPercent).toBeLessThanOrEqual(100);
    expect(doc.progressPercent).toBe(100);
  });
});

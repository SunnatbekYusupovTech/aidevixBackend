'use strict';

// ADM-01 regression: GET /api/videos/:id must not issue a signed Bunny URL for paid/AI courses
// without enrollment / Pro. Offline (models and bunny mocked).

const chain = (result) => {
  const q = {
    select: jest.fn(() => q),
    populate: jest.fn(() => q),
    lean: jest.fn(() => q),
    then: (res, rej) => Promise.resolve(result).then(res, rej),
  };
  return q;
};

const mockVideo = {
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(() => ({ exec: () => Promise.resolve() })),
};
const mockEnrollment = { exists: jest.fn() };

jest.mock('../../models/Video', () => mockVideo);
jest.mock('../../models/Enrollment', () => mockEnrollment);
jest.mock('../../models/Course', () => ({}));
jest.mock('../../models/VideoLink', () => ({}));
jest.mock('../../models/VideoQuestion', () => ({}));
jest.mock('../../models/User', () => ({}));
jest.mock('../../utils/checkSubscriptions', () => ({ performSubscriptionCheck: jest.fn() }));
jest.mock('../../utils/bunny', () => ({
  generateSignedEmbedUrl: jest.fn(() => ({ embedUrl: 'https://iframe.example/embed/signed', expiresAt: 1 })),
}));

const { getVideo } = require('../../controllers/videoController');

const mockRes = () => ({
  statusCode: 200,
  body: null,
  status(c) { this.statusCode = c; return this; },
  json(b) { this.body = b; return this; },
});

const makeVideo = (course) => ({
  _id: 'v1', title: 'L1', isActive: true, bunnyVideoId: 'guid-1', bunnyStatus: 'ready', materials: [{ url: 'm' }], course,
});
const PAID = { _id: 'c1', category: 'web', isFree: false, price: 100000, isActive: true };
const FREE = { _id: 'c2', category: 'web', isFree: true, price: 0, isActive: true };
const AI = { _id: 'c3', category: 'ai', isFree: false, price: 99000, isActive: true };

const run = async (course, user = { _id: 'u1', role: 'user' }) => {
  mockVideo.findById.mockImplementation(() => chain(makeVideo(course)));
  const res = mockRes();
  await getVideo({ params: { id: 'v1' }, user }, res);
  return res;
};

beforeEach(() => jest.clearAllMocks());

test('paid course, not enrolled → 402 without player or bunny id', async () => {
  mockEnrollment.exists.mockResolvedValue(null);
  const res = await run(PAID);
  expect(res.statusCode).toBe(402);
  expect(res.body.code).toBe('ENROLLMENT_REQUIRED');
  expect(JSON.stringify(res.body)).not.toMatch(/signed|guid-1/);
  expect(res.body.data.video.materials).toBeUndefined();
});

test('paid course, enrolled (paid) → player returned', async () => {
  mockEnrollment.exists.mockResolvedValue({ _id: 'e1' });
  const res = await run(PAID);
  expect(res.statusCode).toBe(200);
  expect(res.body.data.player.embedUrl).toMatch(/signed/);
  expect(mockEnrollment.exists.mock.calls[0][0].paymentStatus.$in).toContain('paid');
});

test('free course → player without enrollment lookup', async () => {
  const res = await run(FREE);
  expect(res.statusCode).toBe(200);
  expect(res.body.data.player).not.toBeNull();
  expect(mockEnrollment.exists).not.toHaveBeenCalled();
});

test('AI course with active Pro → allowed', async () => {
  const res = await run(AI, { _id: 'u1', role: 'user', proSubscription: { active: true, expiresAt: null } });
  expect(res.statusCode).toBe(200);
});

test('AI course without Pro/paid enrollment → 402 PRO_REQUIRED', async () => {
  mockEnrollment.exists.mockResolvedValue(null);
  const res = await run(AI);
  expect(res.statusCode).toBe(402);
  expect(res.body.code).toBe('PRO_REQUIRED');
  expect(res.body.data.player).toBeNull();
});

test('inactive course → 404 for non-admin', async () => {
  const res = await run({ ...FREE, isActive: false });
  expect(res.statusCode).toBe(404);
});

test('admin bypasses the gate', async () => {
  const res = await run(PAID, { _id: 'a1', role: 'admin' });
  expect(res.statusCode).toBe(200);
  expect(mockEnrollment.exists).not.toHaveBeenCalled();
});

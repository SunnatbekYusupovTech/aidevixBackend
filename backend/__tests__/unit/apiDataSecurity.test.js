'use strict';

const query = (value) => {
  const q = { then: (resolve, reject) => Promise.resolve(value).then(resolve, reject) };
  for (const name of ['select', 'populate', 'sort', 'skip', 'limit', 'lean']) q[name] = jest.fn(() => q);
  return q;
};
const mockCourse = { find: jest.fn(), findById: jest.fn(), countDocuments: jest.fn() };
const mockVideo = { find: jest.fn() };
const mockStats = { find: jest.fn(), countDocuments: jest.fn() };
const mockQuestions = { find: jest.fn(), countDocuments: jest.fn() };
const mockPrompt = { find: jest.fn(), findOne: jest.fn(), countDocuments: jest.fn() };
const mockSaved = { aggregate: jest.fn() };
const mockUser = { findById: jest.fn() };
const mockEnrollment = { find: jest.fn() };
const mockPayment = { find: jest.fn(), countDocuments: jest.fn() };
const mockPromo = { find: jest.fn(), countDocuments: jest.fn() };
const mockForumQuestion = { find: jest.fn(), findById: jest.fn(), countDocuments: jest.fn(), updateOne: jest.fn() };
const mockAnswer = { find: jest.fn() };
const mockCheckSubscriptions = jest.fn();

jest.mock('../../models/Course', () => mockCourse);
jest.mock('../../models/CourseRating', () => ({}));
jest.mock('../../models/Video', () => mockVideo);
jest.mock('../../models/UserStats', () => mockStats);
jest.mock('../../models/VideoQuestion', () => mockQuestions);
jest.mock('../../models/VideoLink', () => ({}));
jest.mock('../../models/Prompt', () => mockPrompt);
jest.mock('../../models/SavedPrompt', () => mockSaved);
jest.mock('../../models/User', () => mockUser);
jest.mock('../../models/Enrollment', () => mockEnrollment);
jest.mock('../../models/Payment', () => mockPayment);
jest.mock('../../models/PromoCode', () => mockPromo);
jest.mock('../../models/Question', () => mockForumQuestion);
jest.mock('../../models/Answer', () => mockAnswer);
jest.mock('../../models/VideoXpAward', () => ({}));
jest.mock('../../models/Quiz', () => ({}));
jest.mock('../../models/QuizResult', () => ({}));
jest.mock('../../models/SpacedRepetitionCard', () => ({}));
jest.mock('../../utils/badgeService', () => ({}));
jest.mock('../../utils/checkSubscriptions', () => ({ performSubscriptionCheck: mockCheckSubscriptions }));
jest.mock('../../utils/bunny', () => ({}));
jest.mock('../../utils/awardXp', () => ({ addXp: jest.fn() }));
jest.mock('../../middleware/auth', () => ({
  authenticate: (req, _res, next) => { req.user = { _id: 'self', role: 'user' }; next(); },
  requireAdmin: (_req, _res, next) => next(),
}));

const course = require('../../controllers/courseController');
const video = require('../../controllers/videoController');
const ranking = require('../../controllers/rankingController');
const prompts = require('../../controllers/promptController');
const xp = require('../../controllers/xpController');
const payments = require('../../controllers/paymentController');
const promos = require('../../controllers/promoController');
const forum = require('../../controllers/forumController');
const express = require('express');
const request = require('supertest');
const promptRoutes = require('../../routes/promptRoutes');

const response = () => ({
  statusCode: 200,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

beforeEach(() => {
  jest.clearAllMocks();
  mockCourse.countDocuments.mockResolvedValue(0);
  mockStats.countDocuments.mockResolvedValue(0);
  mockQuestions.countDocuments.mockResolvedValue(0);
  mockPrompt.countDocuments.mockResolvedValue(0);
  mockPayment.countDocuments.mockResolvedValue(0);
  mockPromo.countDocuments.mockResolvedValue(0);
  mockForumQuestion.countDocuments.mockResolvedValue(0);
  mockSaved.aggregate.mockResolvedValue([{ data: [], totalCount: [] }]);
});

describe('API result caps cannot be bypassed by negative MongoDB limits', () => {
  test.each([
    ['course top', course.getTopCourses, mockCourse, 20],
    ['ranking courses', ranking.getTopCourses, mockCourse, 50],
    ['ranking users', ranking.getTopUsers, mockStats, 100],
    ['top videos', video.getTopVideos, mockVideo, 50],
    ['video questions', video.getVideoQuestions, mockQuestions, 100],
    ['XP weekly', xp.getWeeklyLeaderboard, mockStats, 100],
    ['personal payments', payments.getMyPayments, mockPayment, 100],
    ['admin promos', promos.listPromoCodes, mockPromo, 100],
  ])('%s enforces positive bounded limit and bounded skip', async (_name, handler, model, max) => {
    const q = query([]);
    model.find.mockReturnValue(q);
    const res = response();
    await handler({ query: { limit: '-100000', page: '999999999999' }, params: { id: 'v1' }, user: { _id: 'self' } }, res);
    expect(res.statusCode).toBe(200);
    expect(q.limit.mock.calls[0][0]).toBeGreaterThanOrEqual(1);
    expect(q.limit.mock.calls[0][0]).toBeLessThanOrEqual(max);
    if (q.skip.mock.calls.length) expect(q.skip.mock.calls[0][0]).toBeLessThanOrEqual(max * 1000);
  });

  test.each(['0', '10', '999999', '-1', 'garbage', '9'.repeat(350)])('course limit %s stays bounded', async (limit) => {
    const q = query([]);
    mockCourse.find.mockReturnValue(q);
    await course.getTopCourses({ query: { limit } }, response());
    const passed = q.limit.mock.calls[0][0];
    expect(Number.isSafeInteger(passed)).toBe(true);
    expect(passed).toBeGreaterThanOrEqual(1);
    expect(passed).toBeLessThanOrEqual(20);
    if (limit === '10') expect(passed).toBe(10);
  });

  test('course catalog prevents arbitrarily deep skips', async () => {
    const q = query([]);
    mockCourse.find.mockReturnValue(q);
    const res = response();
    await course.getAllCourses({ query: { limit: '50', page: '999999999999' } }, res);
    expect(res.statusCode).toBe(200);
    expect(q.skip.mock.calls[0][0]).toBeLessThanOrEqual(50000);
  });

  test('related course recommendations also clamp a negative limit', async () => {
    mockCourse.findById.mockReturnValue(query({ _id: 'course1', category: 'ai' }));
    const q = query([]);
    mockCourse.find.mockReturnValue(q);
    const res = response();
    await course.getRecommendedCourses({ query: { limit: '-99999' }, params: { id: 'a'.repeat(24) } }, res);
    expect(res.statusCode).toBe(200);
    expect(q.limit.mock.calls[0][0]).toBe(1);
  });

  test('personalized course recommendations never request an oversized fill', async () => {
    mockUser.findById.mockReturnValue(query({ aiStack: [] }));
    mockEnrollment.find.mockReturnValue(query([]));
    const q = query([]);
    mockCourse.find.mockReturnValue(q);
    const res = response();
    await course.getUserRecommendedCourses({ query: { limit: '-99999' }, user: { _id: 'self' } }, res);
    expect(res.statusCode).toBe(200);
    expect(q.limit.mock.calls[0][0]).toBe(1);
  });
});

describe('saved prompt content uses the same subscription gate as other prompt reads', () => {
  const app = express();
  app.use('/api/prompts', promptRoutes);

  test('unsubscribed user cannot read saved prompt content', async () => {
    mockUser.findById.mockReturnValue(query({ socialSubscriptions: {}, role: 'user' }));
    mockCheckSubscriptions.mockResolvedValue({ instagramSubscribed: true, telegramSubscribed: false, changed: false });
    const res = await request(app).get('/api/prompts/saved/me');
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('SOCIAL_SUBSCRIPTION_REQUIRED');
    expect(mockSaved.aggregate).not.toHaveBeenCalled();
  });

  test('subscribed user can still read saved prompt content', async () => {
    mockUser.findById.mockReturnValue(query({ socialSubscriptions: {}, role: 'user' }));
    mockCheckSubscriptions.mockResolvedValue({ instagramSubscribed: true, telegramSubscribed: true, changed: false });
    const res = await request(app).get('/api/prompts/saved/me');
    expect(res.status).toBe(200);
    expect(mockSaved.aggregate).toHaveBeenCalledTimes(1);
  });
});

describe('engagement reads do not expose other users membership IDs', () => {
  const sample = { _id: 'prompt1', title: 'Public', content: 'Text', likesCount: 3, likes: ['other1', 'self', 'other2'] };

  test.each([
    ['list', prompts.getPrompts, 'find', (res) => res.body.data.prompts[0]],
    ['featured', prompts.getFeaturedPrompts, 'find', (res) => res.body.data[0]],
    ['detail', prompts.getPrompt, 'findOne', (res) => res.body.data],
  ])('prompt %s only reveals the requesting user like state', async (_name, handler, method, result) => {
    mockPrompt[method].mockReturnValue(query(method === 'findOne' ? sample : [sample]));
    const res = response();
    await handler({ user: { _id: 'self' }, query: {}, params: { id: 'prompt1' } }, res);
    expect(res.statusCode).toBe(200);
    expect(result(res).likes).toEqual(['self']);
    expect(result(res).likesCount).toBe(3);
    expect(result(res).content).toBe('Text');
  });

  test('saved prompt likes are also limited to self', async () => {
    mockSaved.aggregate.mockResolvedValue([{ data: [sample], totalCount: [{ c: 1 }] }]);
    const res = response();
    await prompts.getSavedPrompts({ user: { _id: 'self' }, query: {} }, res);
    expect(res.body.data.prompts[0].likes).toEqual(['self']);
    expect(res.body.data.prompts[0].likesCount).toBe(3);
  });

  test('non-voters receive an empty compatible likes array', async () => {
    mockPrompt.findOne.mockReturnValue(query(sample));
    const res = response();
    await prompts.getPrompt({ user: { _id: 'not-a-voter' }, params: { id: 'prompt1' } }, res);
    expect(res.body.data.likes).toEqual([]);
    expect(res.body.data.likesCount).toBe(3);
    expect(sample.likes).toEqual(['other1', 'self', 'other2']);
  });

  test('public video Q&A exposes vote counts without voter lists, including replies', async () => {
    mockQuestions.find.mockReturnValue(query([
      { _id: 'q1', question: 'Question', upvotes: ['other1', 'other2'], parentId: null },
      { _id: 'q2', question: 'Reply', upvotes: ['other2'], parentId: 'q1' },
    ]));
    const res = response();
    await video.getVideoQuestions({ query: {}, params: { id: 'v1' } }, res);
    const q = res.body.data.questions[0];
    expect(q.upvotesCount).toBe(2);
    expect(q.upvotes).toBeUndefined();
    expect(q.replies[0].upvotesCount).toBe(1);
    expect(q.replies[0].upvotes).toBeUndefined();
  });

  test('public forum lists expose vote scores without voter lists', async () => {
    const q = query([{ _id: 'q1', title: 'Question', upvotes: ['other1', 'other2'], downvotes: ['other3'] }]);
    mockForumQuestion.find.mockReturnValue(q);
    const res = response();
    await forum.getQuestions({ query: { page: '9999999999' } }, res);
    const item = res.body.data.questions[0];
    expect(item.score).toBe(1);
    expect(item.upvotes).toBeUndefined();
    expect(item.downvotes).toBeUndefined();
    expect(q.skip.mock.calls[0][0]).toBeLessThanOrEqual(50000);
  });

  test('public forum detail and answers do not disclose voter IDs', async () => {
    mockForumQuestion.findById.mockReturnValue(query({ _id: 'q1', upvotes: ['other1'], downvotes: [] }));
    mockForumQuestion.updateOne.mockResolvedValue({});
    mockAnswer.find.mockReturnValue(query([{ _id: 'a1', upvotes: ['other2'], downvotes: ['other3'] }]));
    const res = response();
    await forum.getQuestionById({ params: { id: 'q1' } }, res);
    expect(res.body.data.question.score).toBe(1);
    expect(res.body.data.question.upvotes).toBeUndefined();
    expect(res.body.data.answers[0].score).toBe(0);
    expect(res.body.data.answers[0].upvotes).toBeUndefined();
    expect(res.body.data.answers[0].downvotes).toBeUndefined();
  });
});

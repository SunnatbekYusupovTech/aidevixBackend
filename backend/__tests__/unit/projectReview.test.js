'use strict';

// COM-08 / COM-09 / LLM-02/03/04/09 regression: project review LLM surface (offline, no DB).
process.env.GROQ_API_KEY = 'test-not-a-real-key';

const chain = (result) => {
  const q = {
    select: jest.fn(() => q),
    populate: jest.fn(() => q),
    sort: jest.fn(() => q),
    lean: jest.fn(() => q),
    then: (res, rej) => Promise.resolve(result).then(res, rej),
  };
  return q;
};

const mockProject = {
  findById: jest.fn(),
  find: jest.fn(),
  updateOne: jest.fn(async () => ({ modifiedCount: 1 })),
};
jest.mock('../../models/Project', () => mockProject);
jest.mock('../../models/UserStats', () => ({}));

const pc = require('../../controllers/projectController');

const mockRes = () => ({
  statusCode: 200,
  body: null,
  status(c) { this.statusCode = c; return this; },
  json(b) { this.body = b; return this; },
});

const PROJECT = { _id: 'p1', title: 'Todo', description: 'd', isActive: true };
let fetchCalls;
let nextContent;

beforeEach(() => {
  jest.clearAllMocks();
  fetchCalls = [];
  nextContent = JSON.stringify({ score: 80, summary: 'ok', strengths: ['a'], improvements: ['b'] });
  global.fetch = jest.fn(async (url, opts) => {
    fetchCalls.push({ url, body: JSON.parse(opts.body), signal: opts.signal });
    return { ok: true, json: async () => ({ choices: [{ message: { content: nextContent } }], usage: {} }) };
  });
  mockProject.findById.mockImplementation(() => chain(PROJECT));
});

describe('public project reads', () => {
  test('getProject never returns reviews/completedBy (projection excludes them)', async () => {
    const res = mockRes();
    await pc.getProject({ params: { id: 'p1' } }, res);
    const q = mockProject.findById.mock.results[0].value;
    const projection = q.select.mock.calls[0][0];
    expect(projection.reviews).toBeUndefined();
    expect(projection.completedBy).toBeUndefined();
    expect(res.body.data.project.reviews).toBeUndefined();
  });

  test('owner gets only own review via $elemMatch', async () => {
    mockProject.findById.mockImplementation(() => chain({ ...PROJECT, reviews: [{ userId: 'u1', score: 70 }], completedBy: [] }));
    const res = mockRes();
    await pc.getProject({ params: { id: 'p1' }, user: { _id: 'u1' } }, res);
    const projection = mockProject.findById.mock.results[0].value.select.mock.calls[0][0];
    expect(projection.reviews).toEqual({ $elemMatch: { userId: 'u1' } });
    expect(res.body.data.project.myReview.score).toBe(70);
    expect(res.body.data.project.reviews).toBeUndefined();
  });
});

describe('reviewProject', () => {
  const call = async (body) => {
    const res = mockRes();
    await pc.reviewProject({ params: { id: 'p1' }, body, user: { _id: 'u1' } }, res);
    return res;
  };

  test('githubUrl only → refused, no LLM call (no hallucinated grade)', async () => {
    const res = await call({ githubUrl: 'https://github.com/x/y' });
    expect(res.statusCode).toBe(400);
    expect(fetchCalls).toHaveLength(0);
  });

  test('non-string codeSnippet → 400, no internal error text', async () => {
    const res = await call({ codeSnippet: 123 });
    expect(res.statusCode).toBe(400);
    expect(res.body.message).not.toMatch(/trim/);
  });

  test('LLM call has max_tokens and timeout signal', async () => {
    await call({ codeSnippet: 'const a = 1; console.log(a);' });
    expect(fetchCalls[0].body.max_tokens).toBeGreaterThan(0);
    expect(fetchCalls[0].signal).toBeDefined();
  });

  test('LLM output is validated (score clamped, non-strings dropped)', async () => {
    nextContent = JSON.stringify({ score: 150, summary: 'x', strengths: [{ a: 1 }, 'good'], improvements: [] });
    const res = await call({ codeSnippet: 'const a = 1; console.log(a);' });
    expect(res.statusCode).toBe(201);
    expect(res.body.data.review.score).toBe(100);
    expect(res.body.data.review.strengths).toEqual(['good']);
  });

  test('reviews are stored bounded ($pull own + $push/$slice)', async () => {
    await call({ codeSnippet: 'const a = 1; console.log(a);' });
    const updates = mockProject.updateOne.mock.calls.map((c) => c[1]);
    expect(updates[0].$pull.reviews.userId).toBe('u1');
    expect(updates[1].$push.reviews.$slice).toBeLessThan(0);
  });
});

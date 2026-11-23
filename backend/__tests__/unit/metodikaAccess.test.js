'use strict';

// Maxfiy metodika: ikkinchi bosqich ruxsati, egalik va kiritilgan ma'lumotni tozalash.
// Offline — MetodikaAccess va jurnal mock qilingan.

const bcrypt = require('bcryptjs');

const mockAccess = { findOne: jest.fn() };
jest.mock('../../models/MetodikaAccess', () => mockAccess);
jest.mock('../../models/MetodikaAuditLog', () => ({ create: jest.fn(() => Promise.resolve()), ACTIONS: [] }));

const {
  METODIKA_COOKIE_NAME, signMetodikaSession, isMetodikaOwner, sanitizeLesson,
} = require('../../utils/metodika');
const { generateAccessToken } = require('../../utils/jwt');
const { requireMetodikaAccess, requireMetodikaOwner } = require('../../middleware/metodikaAccess');
const { unlock } = require('../../controllers/metodikaController');
const { sniffImage } = require('../../controllers/metodikaAdminController');

const USER_ID = 'a'.repeat(24);
const OTHER_ID = 'b'.repeat(24);
const SID = 'c'.repeat(24);

const mockRes = () => {
  const headers = {};
  return {
    statusCode: 200,
    body: null,
    headers,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    getHeader: (name) => headers[name],
    setHeader: (name, value) => { headers[name] = value; },
  };
};

const makeReq = ({ userId = USER_ID, role = 'user', sid = SID, cookie, body } = {}) => ({
  user: { _id: userId, role, username: 'tester' },
  authSessionId: sid,
  headers: { cookie: cookie ? `${METODIKA_COOKIE_NAME}=${cookie}` : '' },
  body,
  ip: '127.0.0.1',
});

const grant = (overrides = {}) => ({ _id: 'g1', isActive: true, expiresAt: null, sessionVersion: 0, ...overrides });
const lean = (value) => ({ lean: () => Promise.resolve(value) });
const sessionCookie = (payload = {}) => signMetodikaSession({ userId: USER_ID, sid: SID, av: 0, ...payload });

const runGate = async (req) => {
  const res = mockRes();
  const next = jest.fn();
  await requireMetodikaAccess(req, res, next);
  return { res, next };
};

afterEach(() => {
  delete process.env.METODIKA_OWNER_IDS;
  jest.clearAllMocks();
});

describe('isMetodikaOwner', () => {
  test('oddiy foydalanuvchi hech qachon egasi emas', () => {
    expect(isMetodikaOwner({ _id: USER_ID, role: 'user' })).toBe(false);
  });

  test('METODIKA_OWNER_IDS berilmasa — har qanday admin', () => {
    expect(isMetodikaOwner({ _id: USER_ID, role: 'admin' })).toBe(true);
  });

  test("METODIKA_OWNER_IDS berilsa — faqat ro'yxatdagi admin", () => {
    process.env.METODIKA_OWNER_IDS = `${OTHER_ID}, not-an-id`;
    expect(isMetodikaOwner({ _id: USER_ID, role: 'admin' })).toBe(false);
    expect(isMetodikaOwner({ _id: OTHER_ID, role: 'admin' })).toBe(true);
    expect(isMetodikaOwner({ _id: OTHER_ID, role: 'user' })).toBe(false);
  });
});

describe('requireMetodikaAccess', () => {
  test("cookie yo'q → 403 METODIKA_LOCKED, DB'ga murojaat yo'q", async () => {
    const { res, next } = await runGate(makeReq());
    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('METODIKA_LOCKED');
    expect(next).not.toHaveBeenCalled();
    expect(mockAccess.findOne).not.toHaveBeenCalled();
  });

  test("to'g'ri cookie + faol ruxsat → o'tadi", async () => {
    mockAccess.findOne.mockReturnValue(lean(grant()));
    const { next } = await runGate(makeReq({ cookie: sessionCookie() }));
    expect(next).toHaveBeenCalledWith();
  });

  test("boshqa foydalanuvchining cookie'si rad etiladi", async () => {
    const { res, next } = await runGate(makeReq({ userId: OTHER_ID, cookie: sessionCookie() }));
    expect(res.body.code).toBe('METODIKA_LOCKED');
    expect(next).not.toHaveBeenCalled();
  });

  test("boshqa login sessiyasiga (sid) ko'chirilgan cookie rad etiladi", async () => {
    const { res } = await runGate(makeReq({ sid: 'd'.repeat(24), cookie: sessionCookie() }));
    expect(res.body.code).toBe('METODIKA_LOCKED');
  });

  test('access tokeni metodika cookie sifatida qabul qilinmaydi (audience ajratilgan)', async () => {
    const accessToken = generateAccessToken({ userId: USER_ID, sid: SID, av: 0 });
    const { res } = await runGate(makeReq({ cookie: accessToken }));
    expect(res.body.code).toBe('METODIKA_LOCKED');
  });

  test.each([
    ["to'xtatilgan", grant({ isActive: false })],
    ['muddati tugagan', grant({ expiresAt: new Date(Date.now() - 1000) })],
    ['parol almashtirilgan (sessionVersion oshgan)', grant({ sessionVersion: 1 })],
    ["o'chirilgan", null],
  ])("ruxsat %s bo'lsa — ochiq sessiya darhol yopiladi", async (_name, access) => {
    mockAccess.findOne.mockReturnValue(lean(access));
    const { res, next } = await runGate(makeReq({ cookie: sessionCookie() }));
    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  test("egasi cookie'siz o'tadi", async () => {
    const { next } = await runGate(makeReq({ role: 'admin' }));
    expect(next).toHaveBeenCalledWith();
  });
});

describe('requireMetodikaOwner', () => {
  test("ro'yxatda bo'lmagan admin tahrirlay olmaydi", () => {
    process.env.METODIKA_OWNER_IDS = OTHER_ID;
    const res = mockRes();
    const next = jest.fn();
    requireMetodikaOwner({ ...makeReq({ role: 'admin' }), originalUrl: '/api/metodika/admin/lessons', method: 'POST' }, res, next);
    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });
});

describe('unlock', () => {
  let passwordHash;
  beforeAll(async () => { passwordHash = await bcrypt.hash('correct-horse-battery', 4); });

  const stored = (overrides = {}) => ({
    ...grant(), login: 'mentor-01', passwordHash, failedAttempts: 0, lockUntil: null,
    save: jest.fn(() => Promise.resolve()),
    ...overrides,
  });
  const select = (value) => ({ select: () => Promise.resolve(value) });

  const run = async (access, body, reqOverrides) => {
    mockAccess.findOne.mockReturnValue(select(access));
    const res = mockRes();
    await unlock(makeReq({ body, ...reqOverrides }), res);
    return res;
  };

  test("to'g'ri login/parol → httpOnly sessiya cookie", async () => {
    const access = stored();
    const res = await run(access, { login: 'Mentor-01', password: 'correct-horse-battery' });
    expect(res.statusCode).toBe(200);
    expect(String(res.headers['Set-Cookie'])).toMatch(new RegExp(`^${METODIKA_COOKIE_NAME}=.+HttpOnly`));
    expect(access.lastLoginAt).toBeInstanceOf(Date);
  });

  test("noto'g'ri parol → 403, cookie yo'q, urinish sanaladi", async () => {
    const access = stored();
    const res = await run(access, { login: 'mentor-01', password: 'wrong-password' });
    expect(res.statusCode).toBe(403);
    expect(res.body.code).toBe('METODIKA_INVALID');
    expect(res.headers['Set-Cookie']).toBeUndefined();
    expect(access.failedAttempts).toBe(1);
  });

  test("5-noto'g'ri urinish 15 daqiqaga bloklaydi; blok paytida to'g'ri parol ham o'tmaydi", async () => {
    const access = stored({ failedAttempts: 4 });
    await run(access, { login: 'mentor-01', password: 'wrong-password' });
    expect(access.lockUntil.getTime()).toBeGreaterThan(Date.now());

    const res = await run(access, { login: 'mentor-01', password: 'correct-horse-battery' });
    expect(res.body.code).toBe('METODIKA_TEMP_LOCKED');
    expect(res.headers['Set-Cookie']).toBeUndefined();
  });

  test("ruxsat berilmagan akkaunt: boshqa odamning to'g'ri login/paroli ham ishlamaydi", async () => {
    const res = await run(null, { login: 'mentor-01', password: 'correct-horse-battery' }, { userId: OTHER_ID });
    expect(res.body.code).toBe('METODIKA_INVALID');
    expect(mockAccess.findOne).toHaveBeenCalledWith({ user: OTHER_ID });
  });

  test("to'xtatilgan ruxsat to'g'ri parol bilan ham ochilmaydi", async () => {
    const res = await run(stored({ isActive: false }), { login: 'mentor-01', password: 'correct-horse-battery' });
    expect(res.body.code).toBe('METODIKA_INVALID');
  });

  test("login sessiyasi (sid) bo'lmasa — qayta kirish talab qilinadi", async () => {
    const res = await run(stored(), { login: 'mentor-01', password: 'correct-horse-battery' }, { sid: null });
    expect(res.body.code).toBe('METODIKA_RELOGIN');
  });

  test("obyekt ko'rinishidagi login/parol (NoSQL injection) rad etiladi", async () => {
    const res = await run(stored(), { login: { $ne: null }, password: { $ne: null } });
    expect(res.statusCode).toBe(400);
    expect(mockAccess.findOne).not.toHaveBeenCalled();
  });
});

describe('sanitizeLesson', () => {
  test("noma'lum maydonlar va images tashlab yuboriladi (mass assignment)", () => {
    const clean = sanitizeLesson({ title: ' Dars ', module: 'x', images: [{ asset: 'x' }], _id: 'x', __v: 9, isAdmin: true });
    expect(clean).toEqual({ title: 'Dars' });
  });

  test('faqat http(s) havolalar saqlanadi', () => {
    const { links } = sanitizeLesson({
      links: [
        { title: 'Yaxshi', url: 'https://docs.n8n.io/' },
        { title: 'XSS', url: 'javascript:alert(1)' },
        { title: 'Data', url: 'data:text/html,<script>1</script>' },
        { title: 'Nisbiy', url: '/admin' },
      ],
    });
    expect(links.map((l) => l.url)).toEqual(['https://docs.n8n.io/']);
  });

  test("ro'yxatlar: satr bo'lmagan elementlar olinmaydi, uzunlik cheklanadi", () => {
    const { keyPoints } = sanitizeLesson({ keyPoints: ['a', { $gt: '' }, 5, '  ', 'x'.repeat(5000)] });
    expect(keyPoints).toHaveLength(2);
    expect(keyPoints[1]).toHaveLength(1500);
  });

  test("noma'lum sxema turi 'flow'ga tushadi, bo'sh sxema tashlanadi", () => {
    const { diagrams } = sanitizeLesson({
      diagrams: [
        { type: '<script>', items: [{ label: 'A' }] },
        { type: 'compare', items: [] },
      ],
    });
    expect(diagrams).toHaveLength(1);
    expect(diagrams[0].type).toBe('flow');
  });
});

describe('sniffImage', () => {
  test('haqiqiy PNG/JPEG/WEBP imzosi taniladi', () => {
    expect(sniffImage(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]))).toBe('image/png');
    expect(sniffImage(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe('image/jpeg');
    expect(sniffImage(Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP')]))).toBe('image/webp');
  });

  test('rasm deb nomlangan HTML/SVG rad etiladi', () => {
    expect(sniffImage(Buffer.from('<svg onload=alert(1)></svg>'))).toBeNull();
    expect(sniffImage(Buffer.from('<html><script>1</script></html>'))).toBeNull();
  });
});

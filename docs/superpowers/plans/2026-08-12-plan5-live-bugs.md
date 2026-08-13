# Plan 5 — beshta jonli xato Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** mkhls migratsiyasidan keyin qolgan beshta jonli xatoni yopish — sertifikat/`viewCount` suiiste'moli, `Course` hujjatining sizishi, chegarasiz yuklash, bosh sahifa yiqilishi va o'ynatilmaydigan kengaytmalar.

**Architecture:** Beshta xato bir-biridan mustaqil. To'rttasi `aidevixBackend` da (Task 1-4), bittasi `mkhls-streamer` da (Task 5). Tartib: eng jiddiy xavfsizlik bandi birinchi, keyin qolgan backend bandlari, so'ng frontend, oxirida boshqa repo — shunday qilib repo almashish bir marta bo'ladi.

**Tech Stack:** Node.js/Express + Mongoose, Jest + supertest; Next.js + framer-motion, Playwright; Go 1.24.

**Spec:** `docs/superpowers/specs/2026-08-12-plan5-live-bugs-design.md`

## Global Constraints

Bu bandlar HAR bir taskka tegishli.

- **Ikkita repo.** Task 1-4 → `C:\Users\ASUS\Documents\MyPros\AiDeVix\aidevixBackend`. Task 5 → `C:\Users\ASUS\Documents\MyPros\AiDeVix\mkhls-streamer`. Taskning o'z bo'limi qaysi repo ekanini aytadi.
- **`mkhls-streamer` da `git push` QILMANG.** Uning push URL'i ataylab qo'yilgan sentinel (`PUSH-DISABLED--fork-qiling-spec-5-bolim`), noto'g'ri sozlama emas.
- **DB migratsiyasi YO'Q.** Eski `enrollment.watchedVideos` yozuvlarida begona `videoId` bo'lishi mumkin — ularni tozalash bu rejaga KIRMAYDI (spec §5.3).
- **`.flv`/`.wmv`/`.m4v` ni ishlaydigan qilish YO'Q.** Foydalanuvchi ularni yuklashdan rad etishni tanladi (spec §2.2).
- **Frontend `npm run typecheck` va `npm run build` tur xatosini USHLAMAYDI** — `frontend/tsconfig.json` da `noCheck: true`. Yashil build faqat bundling isboti.
- **e2e testlar HAR DOIM spec-boshiga ishga tushiriladi**, hech qachon bitta to'liq to'plam yugurishi emas — to'liq to'plam worker'larni `STATUS_DLL_INIT_FAILED` (0xC0000142) bilan qulatadi, bu Windows resurs tugashi. Har yugurishdan oldin `taskkill //IM chrome.exe //F`.
- Har commit `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>` trailer bilan. Xabar **heredoc** orqali yoziladi (`git commit -F - <<'EOF' ... EOF`), `-m "...\n..."` EMAS — bash qo'sh tirnoq ichida `\n` ni kengaytirmaydi va trailer buziladi.

---

## Fayl tuzilishi

**Yaratiladigan:**
- `backend/__tests__/integration/enrollment.routes.test.js` — Task 1

**O'zgartiriladigan:**
- `backend/controllers/enrollmentController.js` (Task 1)
- `backend/controllers/videoController.js` (Task 2 va Task 3)
- `backend/__tests__/integration/video.routes.test.js` (Task 2 va Task 3)
- `frontend/src/components/home/ContinueWatching.tsx`, `RecommendedForYou.tsx` (Task 4)
- `frontend/e2e/homepage.spec.ts` (Task 4)
- `mkhls-streamer/internal/interfaces/http/handler/admin_handler.go` (Task 5)
- `mkhls-streamer/internal/application/app.go` (Task 5)
- `mkhls-streamer/internal/interfaces/http/handler/admin_handler_test.go` (Task 5)

---

### Task 1: `markVideoWatched` a'zolik tekshiruvi

Beshtasining eng jiddiysi. Obuna bo'lgan foydalanuvchi ixtiyoriy `videoId` bilan `progressPercent` ni 100% ga yetkazib **sertifikat oladi**, va ixtiyoriy videoning `viewCount` ini oshiradi — bosh sahifa videolarni aynan shu bo'yicha saralaydi.

**Repo:** `aidevixBackend`

**Files:**
- Create: `backend/__tests__/integration/enrollment.routes.test.js`
- Modify: `backend/controllers/enrollmentController.js`

**Interfaces:**
- Consumes: hech narsa
- Produces: `POST /api/enrollments/:courseId/watch/:videoId` endi kursga tegishli bo'lmagan `videoId` uchun 404 qaytaradi

**Mexanizm (kod bo'yicha tasdiqlangan):**

| Qator | Nima |
|---|---|
| `:73-76` | `course` `Course.findById(courseId).select('videos').lean()` bilan yuklanadi |
| `:80` | `videoId` `watchedVideos` ichidan qidiriladi |
| `:86` | topilmasa **shartsiz** `enrollment.watchedVideos.push({ videoId, ... })` |
| `:93-95` | `progressPercent = watchedVideos.length / course.videos.length` |
| `:100-104` | `progressPercent >= 100` → `_issueCertificate` |
| `:116` | `Video.updateOne({ _id: videoId }, { $inc: { viewCount: 1 } })` |

`videoId` ning `courseId` ga tegishli ekani hech qayerda tekshirilmaydi. Kerakli ma'lumot — `course.videos` — allaqachon qo'lda, qo'shimcha so'rov kerak emas.

- [ ] **Step 1: Yiqiladigan testni yozing**

Yangi fayl `backend/__tests__/integration/enrollment.routes.test.js`:

```js
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
  Course.findById.mockReturnValue({
    select: () => ({ lean: async () => ({ _id: COURSE_ID, videos: [OWN_VIDEO_ID] }) }),
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  mockCourse();
  Video.updateOne.mockResolvedValue({});
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
```

- [ ] **Step 2: Testni ishga tushirib yiqilishini ko'ring**

```bash
cd aidevixBackend/backend && npx jest __tests__/integration/enrollment.routes.test.js
```

Expected: **birinchi test FAIL**. Hozirgi kod begona ID'ni qabul qiladi, ya'ni status 200 bo'ladi (404 emas) va `watchedVideos` uzunligi 1 bo'ladi. Ikkinchi test o'tishi kerak.

**Agar birinchi test o'tsa — TO'XTANG va xabar bering.** Bu test hech narsani isbotlamayotganini bildiradi.

- [ ] **Step 3: A'zolik tekshiruvini qo'shing**

`backend/controllers/enrollmentController.js`, `:78` dagi `if (!enrollment)` blokidan **keyin** va `:80` dagi `alreadyWatched` qatoridan **oldin** quyidagini qo'shing:

```js
    // The videoId must actually belong to this course. Without this, any
    // enrolled user could POST arbitrary video ids: progressPercent is
    // watchedVideos.length / course.videos.length, so N fake ids drive it to
    // 100 and _issueCertificate fires below — and the viewCount $inc at the
    // end of this handler is what orders videos on the home page.
    //
    // course.videos is already loaded above, so this costs no extra query.
    // 404 rather than 403: "not part of this course" and "does not exist"
    // are the same thing from the caller's side, and the neighbouring
    // "not enrolled" response above is a 404 too.
    const belongsToCourse = course
      && Array.isArray(course.videos)
      && course.videos.some(v => v && v.toString() === videoId);
    if (!belongsToCourse) {
      return res.status(404).json({ success: false, message: 'Bu dars ushbu kursga tegishli emas' });
    }
```

- [ ] **Step 4: Testni ishga tushirib o'tishini ko'ring**

```bash
cd aidevixBackend/backend && npx jest __tests__/integration/enrollment.routes.test.js
```

Expected: **PASS**, ikkala test ham.

- [ ] **Step 5: Butun backend to'plamini ishga tushiring**

```bash
cd aidevixBackend/backend && npm test
```

Expected: barcha to'plamlar yashil. Baseline: 9 to'plam / 159 test / 0 xato — bu task 1 to'plam va 2 test qo'shadi.

- [ ] **Step 6: Commit**

```bash
cd aidevixBackend
git add backend/controllers/enrollmentController.js backend/__tests__/integration/enrollment.routes.test.js
git commit -F - <<'EOF'
fix(enrollment): reject a videoId that is not part of the course

markVideoWatched never checked that the video belongs to the course it is
being recorded against. progressPercent is watchedVideos.length divided by
course.videos.length, and nothing stopped an enrolled user from posting
arbitrary ids - enough of them drove progress to 100 and had a certificate
issued. The same handler also increments that video's viewCount, which is
what orders videos on the home page.

The check costs nothing: course.videos is already loaded a few lines above
for the progress calculation.

404 rather than 403, matching the "not enrolled" response beside it - from
the caller's side, a lesson that is not in this course and a lesson that
does not exist are the same answer.

Old enrollments may already carry foreign ids from before this fix. Cleaning
those is a migration and is deliberately out of scope.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 2: `getVideo` proyeksiyasi

`GET /api/videos/:id` butun `Course` hujjatini har qanday obuna bo'lgan foydalanuvchiga qaytaradi.

**Repo:** `aidevixBackend`

**Files:**
- Modify: `backend/controllers/videoController.js:141`
- Modify: `backend/__tests__/integration/video.routes.test.js`

**Interfaces:**
- Consumes: hech narsa
- Produces: `data.video.course` endi faqat `_id`, `title`, `category` ni tashiydi

**Qaysi maydonlar kerakligi taxmin qilinmaydi.** Frontend'ning o'z tipi aytadi (`frontend/src/types/video.ts:10-14`): `_id`, `title`, `category?`. Ichki iste'molchilar ham shulardan nariga chiqmaydi — `video.course?.category` (Pro darvozasi, `videoController.js:151`) va `video.course?._id` (`:208`).

- [ ] **Step 1: Boshqa iste'molchi yo'qligini tasdiqlang**

```bash
cd aidevixBackend/backend && grep -n "video\.course\|\.course\." controllers/videoController.js
```

Expected: faqat `category` va `_id` ga murojaat. Agar boshqa maydon (masalan `video.course.price`, `video.course.description`) chiqsa — **TO'XTANG va xabar bering**, proyeksiya ro'yxati kengayishi kerak.

- [ ] **Step 2: Yiqiladigan testni yozing**

`backend/__tests__/integration/video.routes.test.js` faylining OXIRIGA qo'shing:

```js
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
```

- [ ] **Step 3: Testni ishga tushirib yiqilishini ko'ring**

```bash
cd aidevixBackend/backend && npx jest __tests__/integration/video.routes.test.js -t "course proyeksiyasi"
```

Expected: **FAIL**. Hozirgi kod `.populate('course')` ni proyeksiyasiz chaqiradi, ya'ni testdagi `expect(projection).toBe('_id title category')` `undefined` topib yiqiladi.

- [ ] **Step 4: Proyeksiyani qo'shing**

`backend/controllers/videoController.js:141` — hozirgi qator:

```js
    const video = await Video.findById(id).populate('course').lean();
```

Buni quyidagi bilan almashtiring:

```js
    // Projection is not optional here: without it the whole Course document
    // goes out to every subscribed user. These three fields are what the
    // frontend type declares (frontend/src/types/video.ts) and all this
    // controller reads — course.category for the Pro gate, course._id below.
    const video = await Video.findById(id).populate('course', '_id title category').lean();
```

- [ ] **Step 5: Testni ishga tushirib o'tishini ko'ring**

```bash
cd aidevixBackend/backend && npx jest __tests__/integration/video.routes.test.js
```

Expected: **PASS** — butun fayl yashil, jumladan yangi test.

- [ ] **Step 6: Commit**

```bash
cd aidevixBackend
git add backend/controllers/videoController.js backend/__tests__/integration/video.routes.test.js
git commit -F - <<'EOF'
fix(video): project the populated course instead of sending all of it

GET /api/videos/:id populated course with no projection and put the result
straight into the response, so the entire Course document reached every
subscribed user.

The three fields kept are not a guess: frontend/src/types/video.ts declares
exactly _id, title and category, and this controller reads only
course.category for the Pro gate and course._id for the response.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 3: Yuklash hajmi chegarasi

`upload-proxy` `Content-Length` ni o'qiydi va musbat emasligini tekshiradi, lekin yuqori chegara yo'q. Express'ning `STRICT_JSON_LIMIT`/`FORM_LIMIT` (`backend/index.js:226,231`) bu yo'lga tegishli emas — `upload-proxy` xom `octet-stream` ni to'g'ridan-to'g'ri pipe qiladi.

**Repo:** `aidevixBackend`

**Files:**
- Modify: `backend/controllers/videoController.js` (`uploadVideoProxy` ichidagi Content-Length bloki)
- Modify: `backend/__tests__/integration/video.routes.test.js`

**Interfaces:**
- Consumes: hech narsa
- Produces: `PUT /api/videos/:id/upload-proxy` 5 GB dan katta `Content-Length` uchun 413 qaytaradi

- [ ] **Step 1: Yiqiladigan testni yozing**

`backend/__tests__/integration/video.routes.test.js` faylining OXIRIGA qo'shing:

```js
describe('PUT /api/videos/:id/upload-proxy — hajm chegarasi', () => {
  const FIVE_GB = 5 * 1024 * 1024 * 1024;

  const mockReadyTarget = () => {
    Video.findById.mockReturnValue({
      select: () => ({
        _id: VIDEO_ID,
        streamPath: `aidevix/${VIDEO_ID}.mp4`,
        streamStatus: 'ready',
      }),
    });
  };

  it('rejects a body larger than the limit with 413', async () => {
    mockReadyTarget();

    const res = await request(app)
      .put(`/api/videos/${VIDEO_ID}/upload-proxy`)
      .set('Content-Type', 'application/octet-stream')
      .set('Content-Length', String(FIVE_GB + 1))
      .send();

    expect(res.status).toBe(413);
    // The upload must be refused before anything is streamed to mkhls.
    expect(mkhls.uploadVideo).not.toHaveBeenCalled();
  });

  it('accepts a body exactly at the limit', async () => {
    mockReadyTarget();
    mkhls.uploadVideo.mockResolvedValue({});

    const res = await request(app)
      .put(`/api/videos/${VIDEO_ID}/upload-proxy`)
      .set('Content-Type', 'application/octet-stream')
      .set('Content-Length', String(FIVE_GB))
      .send();

    // Any status other than 413 proves the guard let it through; the request
    // itself may still fail further down on mocked plumbing, which is fine.
    expect(res.status).not.toBe(413);
  });
});
```

- [ ] **Step 2: Testni ishga tushirib yiqilishini ko'ring**

```bash
cd aidevixBackend/backend && npx jest __tests__/integration/video.routes.test.js -t "hajm chegarasi"
```

Expected: **birinchi test FAIL** — hozir chegara yo'q, shuning uchun 413 qaytmaydi. Ikkinchi test o'tishi kerak.

- [ ] **Step 3: Chegarani qo'shing**

`backend/controllers/videoController.js` — fayl boshidagi konstantalar yoniga (mavjud `buildProxyUploadInfo` dan oldin) qo'shing:

```js
// Upload ceiling for the admin proxy. A 40-60 minute 1080p lesson source is
// typically 2-4 GB, so this leaves headroom while still refusing an
// accidental uncompressed export before it fills the disk. Express's own
// body limits do not apply here: this route pipes raw octet-stream.
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB
```

So'ng `uploadVideoProxy` ichidagi `411` blokidan **keyin** qo'shing:

```js
    if (contentLength > MAX_UPLOAD_BYTES) {
      return res.status(413).json({
        success: false,
        message: `Fayl juda katta. Maksimal hajm — ${MAX_UPLOAD_BYTES / (1024 * 1024 * 1024)} GB.`,
      });
    }
```

- [ ] **Step 4: Testni ishga tushirib o'tishini ko'ring**

```bash
cd aidevixBackend/backend && npm test
```

Expected: **PASS** — butun to'plam yashil.

- [ ] **Step 5: Commit**

```bash
cd aidevixBackend
git add backend/controllers/videoController.js backend/__tests__/integration/video.routes.test.js
git commit -F - <<'EOF'
feat(video): cap the admin upload proxy at 5 GB

The proxy checked that Content-Length was present and positive but had no
upper bound, and Express's json/form limits do not reach this route - it
pipes raw octet-stream straight through.

5 GB leaves room for a 40-60 minute 1080p source, which usually lands
between 2 and 4 GB, while refusing an accidental uncompressed export before
it fills the disk.

mkhls has no limit of its own either. The app only reaches it through this
proxy, so that gap is documented rather than fixed.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 4: Bosh sahifa yiqilishi

`ContinueWatching` va `RecommendedForYou` `motion` import qiladi va `<LazyMotion strict>` ichida render bo'ladi. `strict` rejimi aynan buni taqiqlaydi.

**Repo:** `aidevixBackend` (frontend papkasi)

**Files:**
- Modify: `frontend/src/components/home/ContinueWatching.tsx`
- Modify: `frontend/src/components/home/RecommendedForYou.tsx`
- Modify: `frontend/e2e/homepage.spec.ts`

**Interfaces:**
- Consumes: hech narsa
- Produces: hech narsa (ichki refactor)

**KRITIK — test yolg'on yashil bo'lishi mumkin.** Ikkala komponent ham logout holatida `null` qaytaradi:

- `ContinueWatching.tsx:52` — `if (!isLoggedIn || loading || !data || !data.course || !data.nextVideo) return null;`
- `RecommendedForYou.tsx:45` — `if (!isLoggedIn || (!loading && courses.length === 0)) return null;`

`homepage.spec.ts` ning mavjud `beforeEach` i `auth/me` ni **401** qilib mock qiladi. Ya'ni standart holatda birorta `motion.` element render bo'lmaydi va crash **umuman takrorlanmaydi**. Yangi test login holatini VA ma'lumotni mock qilishi SHART.

Ular chaqiradigan endpointlar:
- `ContinueWatching` → `userApi.getContinueLearning()` → `GET enrollments/continue`
- `RecommendedForYou` → `courseApi.getForUser(limit)` → `GET courses/recommended`

- [ ] **Step 1: Yiqiladigan testni yozing**

`frontend/e2e/homepage.spec.ts` da, mavjud `test.describe('Homepage', ...)` blokidan **keyin** yangi describe qo'shing (fayl oxiriga):

```ts
// These two blocks render inside <LazyMotion strict> in HomeClient, which
// forbids the `motion` export and throws when it sees one. Both components
// return null when logged out, and the suite above mocks auth/me as 401 —
// so this case needs its own logged-in setup or it proves nothing.
test.describe('Homepage — logged-in sections render without a motion error', () => {
  test.beforeEach(async ({ page }) => {
    const json = (route: any, body: unknown) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

    await page.route('**/api/**/auth/me*', (route) => json(route, { success: true, data: MOCK_USER }));
    await page.route('**/api/**/auth/csrf*', (route) => json(route, { success: true, data: { token: 'test-csrf' } }));
    await page.route('**/api/**/courses/top*', (route) => json(route, MOCK_TOP_COURSES));
    await page.route('**/api/**/videos/top*', (route) => json(route, MOCK_TOP_VIDEOS));

    // ContinueWatching bails out unless course AND nextVideo are both present.
    await page.route('**/api/**/enrollments/continue*', (route) =>
      json(route, {
        success: true,
        data: {
          course: { _id: 'c1', title: 'Test kurs', thumbnail: null },
          nextVideo: { _id: 'v1', title: 'Dars 1', duration: 120 },
          progressPercent: 40,
        },
      }),
    );

    // RecommendedForYou bails out when the list comes back empty.
    await page.route('**/api/**/courses/recommended*', (route) =>
      json(route, {
        success: true,
        data: { courses: [{ _id: 'c1', title: 'Test kurs', category: 'javascript' }], meta: { basedOn: [] } },
      }),
    );
  });

  test('bosh sahifada framer-motion strict xatosi yo\'q', async ({ page }) => {
    const errors = collectConsoleErrors(page);

    await page.goto(ROUTES.home);
    await waitForPageReady(page);
    // Both blocks fetch after mount; give their render a beat to land.
    await page.waitForTimeout(1000);

    const motionErrors = errors.filter((e) => /motion|LazyMotion|strict/i.test(e));
    expect(motionErrors, `framer-motion xatolari:\n${motionErrors.join('\n')}`).toHaveLength(0);
  });
});
```

**Diqqat:** `MOCK_USER` ni import ro'yxatiga qo'shing. Fayl boshida `MOCK_TOP_COURSES, MOCK_TOP_VIDEOS` allaqachon `./fixtures/mock-data` dan import qilinadi — `MOCK_USER` ni o'sha qatorga qo'shing. `collectConsoleErrors`, `waitForPageReady` va `ROUTES` ham allaqachon import qilingan.

- [ ] **Step 2: Testni ishga tushirib yiqilishini ko'ring**

```bash
taskkill //IM chrome.exe //F
cd aidevixBackend/frontend && npx playwright test e2e/homepage.spec.ts -g "framer-motion strict"
```

Expected: **FAIL** — konsolda `motion` / `LazyMotion` / `strict` haqida xato bo'ladi.

**Agar test o'tsa — TO'XTANG va xabar bering.** Bu login yoki ma'lumot mock'i ishlamayotganini, ya'ni komponentlar hamon `null` qaytarayotganini bildiradi va test hech narsa isbotlamaydi.

- [ ] **Step 3: `ContinueWatching.tsx` ni tuzating**

`frontend/src/components/home/ContinueWatching.tsx:6` — import:

```ts
import { m } from 'framer-motion';
```

So'ng uchta ishlatishni almashtiring: `:57` `<motion.section` → `<m.section`, `:124` `<motion.div` → `<m.div`, `:135` `</motion.section>` → `</m.section>`.

`:124` dagi `<motion.div` ning yopuvchi tegini ham toping va almashtiring — fayl ichida `grep -n "motion\." ` bilan tekshiring, hech qanday `motion.` qolmasligi kerak.

- [ ] **Step 4: `RecommendedForYou.tsx` ni tuzating**

`frontend/src/components/home/RecommendedForYou.tsx:5` — import:

```ts
import { m } from 'framer-motion';
```

So'ng `:71` `<motion.div` → `<m.div` va `:79` `</motion.div>` → `</m.div>`.

- [ ] **Step 5: Hech qanday `motion.` qolmaganini tasdiqlang**

```bash
cd aidevixBackend/frontend && grep -n "motion\.\|from 'framer-motion'" src/components/home/ContinueWatching.tsx src/components/home/RecommendedForYou.tsx
```

Expected: faqat ikkita `import { m } from 'framer-motion';` qatori. Birorta `motion.` bo'lmasligi kerak.

- [ ] **Step 6: Testni ishga tushirib o'tishini ko'ring**

```bash
taskkill //IM chrome.exe //F
cd aidevixBackend/frontend && npx playwright test e2e/homepage.spec.ts
```

Expected: **PASS** — butun spec yashil, jumladan yangi test.

- [ ] **Step 7: Build o'tishini tasdiqlang**

```bash
cd aidevixBackend/frontend && npm run build
```

Expected: build tugaydi. **Eslatma:** `noCheck: true` tufayli bu tur to'g'riligini isbotlamaydi — 6-qadamdagi e2e yagona ishonchli tekshiruv.

- [ ] **Step 8: Commit**

```bash
cd aidevixBackend
git add frontend/src/components/home/ContinueWatching.tsx frontend/src/components/home/RecommendedForYou.tsx frontend/e2e/homepage.spec.ts
git commit -F - <<'EOF'
fix(home): use the m export inside LazyMotion strict

ContinueWatching and RecommendedForYou imported `motion` and both render
inside HomeClient's <LazyMotion features={domAnimation} strict> block.
Strict mode exists to forbid exactly that and throws when it sees it, so
the home page broke for logged-in users.

The regression test needed its own logged-in setup. Both components return
null when logged out, and the existing homepage suite mocks auth/me as 401 -
under that fixture no motion element renders at all and the test would have
passed against the broken code.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 5: Kengaytmalar ro'yxatini config'dan olish

**Repo:** `mkhls-streamer` — boshqa repo. Bu yerda **`git push` QILMANG**.

Yuklash sakkizta kengaytmani qabul qiladi, config beshtasini o'ynatadi. `.flv`, `.wmv`, `.m4v` yuklanadi-yu doimiy 404 bo'ladi.

**Files:**
- Modify: `internal/interfaces/http/handler/admin_handler.go` (struct `:50-62`, konstruktor `:67-97`, validatsiya `:790-796`)
- Modify: `internal/application/app.go:641-655`
- Modify: `internal/interfaces/http/handler/admin_handler_test.go`

**Interfaces:**
- Consumes: hech narsa
- Produces: `NewAdminHandler` yangi `allowedExtensions []string` parametrini oladi

**Nima uchun config'dan, qattiq ro'yxatdan emas:** qattiq yozilgan mapni tahrirlash aynan shu ajralishni qaytadan yaratadi — ikki ro'yxat mustaqil ravishda yana ajraladi. `config.VOD.AllowedExtensions` `app.go:244` va `:257` da `NewLocalVideoSource`/`NewS3VideoSource` ga allaqachon uzatiladi; handler ham o'shani olsa, yagona haqiqat manbai bo'ladi.

- [ ] **Step 1: Yiqiladigan testni yozing**

Faylda kerakli yordamchilar **allaqachon bor** — yangisini yozmang:

- `performUploadRequest(h *AdminHandler, fileName, formPath string, content []byte) *httptest.ResponseRecorder` (`:312`) — haqiqiy multipart body bilan `UploadVideo` ni chaqiradi.
- Handler struct literal bilan quriladi, konstruktor orqali emas — `TestUploadVideo_TranscodeOnUpload_Queues` (`:354-364`) naqshi: `&AdminHandler{videoRepo: repo, videoRootPath: root, logger: &logger.NopLogger{}}`.
- `newMockVideoRepo()` va `logger.NopLogger{}` ham mavjud.

Fayl oxiriga qo'shing:

```go
// TestUploadVideo_ExtensionsComeFromConfig pins two things at once: that the
// upload gate reads the configured list rather than a hardcoded one, and that
// it no longer accepts formats the VOD source cannot find.
//
// Accepting an extension the config does not list is not a cosmetic mismatch:
// LocalVideoSource.findVideoFile skips its direct-stat branch for an unlisted
// extension, tries x.flv.mp4 and friends, finds nothing, and the video is a
// permanent 404 — with no self-healing, because the re-transcode only fires
// when the JIT lookup succeeded.
func TestUploadVideo_ExtensionsComeFromConfig(t *testing.T) {
	// A deliberately narrow list. ".mkv" is in the old hardcoded map but not
	// here, so it is the case that proves the map is no longer consulted.
	newHandler := func(root string) *AdminHandler {
		return &AdminHandler{
			videoRepo:         newMockVideoRepo(),
			videoRootPath:     root,
			allowedExtensions: []string{".mp4"},
			logger:            &logger.NopLogger{},
		}
	}

	t.Run("rejects an extension the config does not list", func(t *testing.T) {
		h := newHandler(t.TempDir())
		w := performUploadRequest(h, "lesson.flv", "ns/lesson.flv", []byte("bytes"))
		if w.Code != http.StatusBadRequest {
			t.Errorf("status = %d, want %d for an unlisted extension; body = %s",
				w.Code, http.StatusBadRequest, w.Body.String())
		}
	})

	t.Run("rejects an extension that only the old hardcoded map allowed", func(t *testing.T) {
		h := newHandler(t.TempDir())
		w := performUploadRequest(h, "lesson.mkv", "ns/lesson.mkv", []byte("bytes"))
		if w.Code != http.StatusBadRequest {
			t.Errorf("status = %d, want %d — the hardcoded map must not be consulted; body = %s",
				w.Code, http.StatusBadRequest, w.Body.String())
		}
	})

	t.Run("accepts an extension the config does list", func(t *testing.T) {
		root := t.TempDir()
		h := newHandler(root)
		w := performUploadRequest(h, "lesson.mp4", "ns/lesson.mp4", []byte("bytes"))
		if w.Code != http.StatusCreated {
			t.Errorf("status = %d, want %d for a listed extension; body = %s",
				w.Code, http.StatusCreated, w.Body.String())
		}
	})
}
```

- [ ] **Step 2: Testni ishga tushirib yiqilishini ko'ring**

```bash
cd mkhls-streamer && go test ./internal/interfaces/http/handler/ -run TestUploadVideo_ExtensionsComeFromConfig -v
```

Expected: **kompilyatsiya xatosi** — `AdminHandler` da hali `allowedExtensions` maydoni yo'q (`unknown field allowedExtensions`). Bu RED hisoblanadi va kutilgan.

3-qadamdan keyin qayta yugurtirsangiz, kompilyatsiya o'tadi lekin dastlabki ikki subtest **yiqiladi** (`.flv` va `.mkv` hamon qabul qilinadi, chunki validatsiya hali qattiq mapdan o'qiydi). Bu esa haqiqiy xatti-harakat RED'i — 5-qadam uni yopadi.

- [ ] **Step 3: Struct'ga maydon qo'shing**

`internal/interfaces/http/handler/admin_handler.go`, `:50-62` dagi struct'ga, `videoRootPath` yoniga:

```go
	allowedExtensions []string
```

- [ ] **Step 4: Konstruktorni yangilang**

`:67-81` dagi parametrlar ro'yxatiga, `videoRootPath string` dan **keyin** qo'shing:

```go
	allowedExtensions []string,
```

va `:82-96` dagi struct literal'ga:

```go
		allowedExtensions: allowedExtensions,
```

- [ ] **Step 5: Validatsiyani config'dan quring**

`internal/interfaces/http/handler/admin_handler.go:790-796` — hozirgi kod:

```go
	// Validate file extension
	ext := strings.ToLower(filepath.Ext(header.Filename))
	validExtensions := map[string]bool{
		".mp4": true, ".mkv": true, ".avi": true, ".mov": true,
		".webm": true, ".flv": true, ".wmv": true, ".m4v": true,
	}
	if !validExtensions[ext] {
		response.JSONError(c, http.StatusBadRequest, "INVALID_FILE", "Invalid video format. Supported: mp4, mkv, avi, mov, webm, flv, wmv, m4v")
```

Buni quyidagi bilan almashtiring:

```go
	// Validate file extension against the SAME list the VOD source will search.
	// These used to be two independent lists and they drifted: upload accepted
	// .flv/.wmv/.m4v, vod.allowed_extensions did not list them, and
	// LocalVideoSource.findVideoFile could never find such a file — a permanent
	// 404 with no self-healing. One source of truth prevents that recurring.
	ext := strings.ToLower(filepath.Ext(header.Filename))
	allowed := false
	for _, supported := range h.allowedExtensions {
		if ext == strings.ToLower(supported) {
			allowed = true
			break
		}
	}
	if !allowed {
		response.JSONError(c, http.StatusBadRequest, "INVALID_FILE",
			fmt.Sprintf("Invalid video format. Supported: %s", strings.Join(h.allowedExtensions, ", ")))
```

**Import kerak emas:** `fmt` allaqachon `admin_handler.go:7` da import qilingan, `strings` esa `:14` da. Import blokiga tegmang.

- [ ] **Step 6: `app.go` da uzating**

`internal/application/app.go:641-655` dagi `handler.NewAdminHandler(...)` chaqiruvida, `a.config.VOD.RootPath` dan **keyin** qo'shing:

```go
		a.config.VOD.AllowedExtensions,
```

Bu aynan `app.go:244` va `:257` da `NewLocalVideoSource`/`NewS3VideoSource` ga uzatilayotgan qiymat.

- [ ] **Step 7: Testni ishga tushirib o'tishini ko'ring**

```bash
cd mkhls-streamer && go test ./internal/interfaces/http/handler/ -run TestUploadVideo_ExtensionsComeFromConfig -v
```

Expected: **PASS**, uchala subtest ham.

- [ ] **Step 8: Butun build va to'plamni tekshiring**

```bash
cd mkhls-streamer && go build ./... && go test ./...
```

Expected: build xatosiz, barcha testlar yashil.

- [ ] **Step 9: Commit**

```bash
cd mkhls-streamer
git add internal/interfaces/http/handler/admin_handler.go internal/interfaces/http/handler/admin_handler_test.go internal/application/app.go
git commit -F - <<'EOF'
fix(admin): gate uploads on the configured extension list

The upload handler carried its own hardcoded map of eight extensions while
vod.allowed_extensions listed five. .flv, .wmv and .m4v uploaded fine and
were then unreachable: findVideoFile skips its direct-stat branch for an
unlisted extension, tries x.flv.mp4 and friends, and finds nothing. A
permanent 404, with no self-healing, since the re-transcode only fires when
the JIT lookup succeeded.

Editing the map would have left two lists free to drift again, so the
handler now reads the same slice app.go already passes to the video source.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
```

---

## Bosqich tugagandan keyin

Bu reja HANDOFF'ni yangilashni o'z ichiga olmaydi. Bosqich tugagach yozing:

1. **Beshta jonli xato yopildi** — qaysi commitlar, qaysi repo.
2. **Ochiq qoldi: eski `enrollment.watchedVideos` yozuvlarida begona `videoId`** bo'lishi mumkin va ular progress'ni bugun ham shishirib turibdi. Tozalash migratsiya bo'ladi, ataylab qilinmadi.
3. **Ochiq qoldi: mkhls'ning o'z admin API'sida yuklash hajmi chegarasi yo'q.** Ilova unga faqat backend proxy orqali boradi.
4. **Naqsh:** Task 4 testi login mock'isiz yolg'on yashil bo'lardi — komponentlar logout holatida `null` qaytaradi. Kelajakda bosh sahifa komponentlarini sinaganda buni eslang.

# Plan 6 — `Course.videos` drift'i Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `markVideoWatched` ni `Course.videos` massivini o'qishdan voz kechtirib, progress va a'zolikni `Video` to'plamidan hisoblash — shu bilan sertifikatning abadiy bo'g'ilishini, nofaol darsning maxrajni shishirishini va progressning 100 dan oshishini bir vaqtda yopish.

**Architecture:** Ikkita mustaqil task. Task 1 — asosiy tuzatish: `markVideoWatched` dagi `Course` yuklamasi `Video.find({course, isActive:true}).select('_id')` ga almashadi va shu bitta so'rov a'zolik, maxraj va suratni beradi. Task 2 — ma'lumot gigienasi: `deleteVideo` endi `Course.videos` dan `$pull` qiladi. Tartib ahamiyatsiz, lekin Task 1 xatolarni yopgani uchun birinchi turadi.

**Tech Stack:** Node.js/Express, Mongoose, Jest + supertest.

**Spec:** `docs/superpowers/specs/2026-08-12-plan6-course-videos-drift-design.md`

## Global Constraints

- **Yagona repo:** `C:\Users\ASUS\Documents\MyPros\AiDeVix\aidevixBackend`.
- **DB migratsiyasi YO'Q.** Mavjud kurslardagi eskirgan `Course.videos` yozuvlari tozalanmaydi. Ular Task 1 dan keyin hech narsaga ta'sir qilmaydi, chunki `markVideoWatched` massivni o'qimaydi.
- **`Course.videos` schema'dan OLIB TASHLANMAYDI.** Massiv saqlanadi (foydalanuvchi qarori); Task 2 faqat uni halol qiladi.
- **`_issueCertificate` ning `Course.findById(courseId).select('title')` chaqiruvi SAQLANADI.** Task 1 faqat `.select('videos')` yo'lini olib tashlaydi — ikkalasini adashtirmang.
- **Plan 5 qo'shgan ikkita mavjud test SAQLANADI va o'tishda davom etishi SHART:** "rejects a videoId that does not belong to the course" va "accepts a videoId that does belong to the course". Ular mock almashuvida jimgina buzilmasligi kerak.
- **Ataylab qabul qilingan xatti-harakat o'zgarishi:** ko'rilgan video keyin `isActive:false` qilinsa yoki o'chirilsa, foydalanuvchi u uchun kreditni yo'qotadi — surat ham, maxraj ham bir xil to'plam bo'yicha hisoblanadi. Aks holda progress 100 dan oshib ketadi.
- Har commit `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>` trailer bilan, **heredoc** orqali (`git commit -F - <<'EOF' ... EOF`). `-m "...\n..."` ISHLATMANG — bash qo'sh tirnoq ichida `\n` ni kengaytirmaydi va trailer buziladi.

---

## Fayl tuzilishi

**O'zgartiriladigan:**
- `backend/controllers/enrollmentController.js` — `markVideoWatched` (Task 1)
- `backend/__tests__/integration/enrollment.routes.test.js` — mock migratsiyasi + 3 yangi test (Task 1), `$pull` testi (Task 2)
- `backend/controllers/videoController.js` — `deleteVideo` (Task 2)

Yangi fayl yaratilmaydi.

---

### Task 1: `markVideoWatched` ni `Video` to'plamidan hisoblashga o'tkazish

**Files:**
- Modify: `backend/controllers/enrollmentController.js` (`markVideoWatched`: `:73-76` yuklama, `:90-95` guard, `:110-113` progress)
- Modify: `backend/__tests__/integration/enrollment.routes.test.js`

**Interfaces:**
- Consumes: hech narsa
- Produces: `markVideoWatched` endi `Course.videos` ni o'qimaydi; `Video.find({course, isActive:true})` ishlatadi

**Mexanizm.** Hozir `course` hujjati faqat ikki narsa uchun yuklanadi — guard va maxraj. `_issueCertificate(req.user, courseId, enrollment._id)` (`:120`) `courseId` **satrini** oladi, hujjatni emas. Shuning uchun `Course` so'rovi `Video` so'roviga to'liq almashadi va so'rovlar soni o'zgarmaydi. `models/Video.js:81` dagi `{ course: 1, isActive: 1 }` indeksi buni qoplaydi.

- [ ] **Step 1: Mock yordamchisini qo'shing va mavjudini toraytiring**

`backend/__tests__/integration/enrollment.routes.test.js` da `mockCourse` hozir ikkita `select` yo'lini qamraydi. `'videos'` yo'li endi kerak emas, `'title'` yo'li `_issueCertificate` uchun **kerak**. `mockCourse` ni quyidagi bilan almashtiring:

```js
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
```

So'ng `beforeEach` ga `mockActiveVideos([OWN_VIDEO_ID]);` qatorini `mockCourse();` dan keyin qo'shing — shunda Plan 5 ning ikkita mavjud testi o'zgarishsiz ishlashda davom etadi (kursda bitta faol video).

- [ ] **Step 2: Uchta yangi testni yozing**

Xuddi shu faylning oxiriga, mavjud `describe` blokidan **keyin** qo'shing:

```js
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
```

- [ ] **Step 3: Testlarni ishga tushirib yiqilishini ko'ring**

```bash
cd aidevixBackend/backend && npx jest __tests__/integration/enrollment.routes.test.js
```

Expected: **FAIL**. Hozirgi kod `Course.findById(...).select('videos')` ni chaqiradi, yangi mock esa `select` uchun Promise qaytaradi — ya'ni `course.videos` `undefined` bo'ladi va guard hamma narsani rad etadi. Kutilgan manzara: yangi uchta testdan kamida ikkitasi yiqiladi, va Plan 5 ning "accepts a videoId that does belong" testi ham yiqiladi.

**Agar hammasi o'tsa — TO'XTANG va xabar bering.** Bu testlar hech narsani isbotlamayotganini bildiradi.

- [ ] **Step 4: Yuklamani almashtiring**

`backend/controllers/enrollmentController.js`, `:73-76` dagi `Promise.all` blokini toping:

```js
    const [enrollment, course] = await Promise.all([
      Enrollment.findOne({ userId: req.user._id, courseId }),
      Course.findById(courseId).select('videos').lean(),
    ]);
```

Buni quyidagi bilan almashtiring:

```js
    // The active Video set replaces Course.videos as the source of truth here.
    // That array is written by createVideo but never repaired: deleteVideo does
    // not pull from it and updateVideo can set isActive:false without touching
    // it. One stale entry made progressPercent unable to reach 100, so the
    // certificate could never issue for that course again.
    //
    // This is the same query getCourseVideos runs, so progress is now computed
    // over exactly the lessons the student can actually see. It replaces the
    // Course load rather than adding to it — the course document was used for
    // nothing else here, and _issueCertificate takes the courseId string.
    // Covered by the { course: 1, isActive: 1 } index on Video.
    const [enrollment, activeVideos] = await Promise.all([
      Enrollment.findOne({ userId: req.user._id, courseId }),
      Video.find({ course: courseId, isActive: true }).select('_id').lean(),
    ]);
```

**`Video` allaqachon import qilingan** (`enrollmentController.js:6`) — import blokiga tegmang.

- [ ] **Step 5: Guard'ni almashtiring**

`:90-95` dagi a'zolik tekshiruvi blokini (Plan 5 qo'shgan `belongsToCourse` va uning `if` i) quyidagi bilan almashtiring. Ustidagi uzun izohni saqlang, faqat oxirgi ikki jumlasini yangi manbaga moslang:

```js
    const activeVideoIds = new Set((activeVideos || []).map((v) => v._id.toString()));
    if (!activeVideoIds.has(videoId)) {
      return res.status(404).json({ success: false, message: 'Bu dars ushbu kursga tegishli emas' });
    }
```

Javob kodi va matni **o'zgarmaydi** — Plan 5 dagidek 404, chunki "bu kursga tegishli emas" va "mavjud emas" chaqiruvchi uchun bir xil.

- [ ] **Step 6: Progress hisobini almashtiring**

`:110-113` dagi blokni toping:

```js
    const totalVideos = course ? course.videos.length : 0;
    enrollment.progressPercent = totalVideos > 0
      ? Math.round((enrollment.watchedVideos.length / totalVideos) * 100)
      : 0;
```

Buni quyidagi bilan almashtiring:

```js
    // Numerator and denominator come from the same set, so progress cannot
    // exceed 100 when a watched lesson is later deactivated or deleted. The
    // user loses credit for such a lesson — deliberate: the alternative is a
    // numerator that outgrows its denominator.
    const totalVideos = activeVideoIds.size;
    const watchedActive = enrollment.watchedVideos.filter(
      (w) => activeVideoIds.has(w.videoId.toString())
    ).length;
    enrollment.progressPercent = totalVideos > 0
      ? Math.round((watchedActive / totalVideos) * 100)
      : 0;
```

- [ ] **Step 7: Testlarni ishga tushirib o'tishini ko'ring**

```bash
cd aidevixBackend/backend && npx jest __tests__/integration/enrollment.routes.test.js
```

Expected: **PASS** — beshala test ham (Plan 5 ning ikkitasi + yangi uchtasi).

- [ ] **Step 8: Butun to'plamni ishga tushiring**

```bash
cd aidevixBackend/backend && npm test
```

Expected: barcha to'plamlar yashil. Baseline: 10 to'plam / 164 test — bu task 3 test qo'shadi.

- [ ] **Step 9: `Course.videos` boshqa hech qayerda o'qilmasligini tasdiqlang**

```bash
cd aidevixBackend/backend && grep -rn "course\.videos\|\.videos\.length\|\.videos\.some" --include=*.js controllers/ utils/ | grep -v watchedVideos
```

Expected: hech qanday chiqish yo'q. Agar biror joy chiqsa — xabar bering; spec massivning yagona o'quvchisi shu funksiya deb da'vo qilgan.

**TUZATISH (final whole-branch review, 2026-08-13): bu qadam hech narsani
isbotlamagan edi.** Grep naqshi (`course\.videos\|\.videos\.length\|\.videos\.some`)
massivga aynan shu uch shaklda murojaat qilingan joylarni topadi, xolos. U quyidagi
uchta haqiqiy o'quvchini **tuta olmaydi** — hech biri shu naqshlarga mos kelmaydi:

- `.populate({ path: 'videos', ... })` — `courseController.js:155-160`dagi `getCourse`
- `.select('... videos ...')` — `rankingController.js:46`dagi `getTopCourses`
- proyeksiyasiz `Course.find(...).lean()` — `courseController.js:58`dagi
  `getAllCourses`, bu yerda `videos` so'zi hech qayerda satr sifatida yozilmagan,
  chunki hech narsa chiqarib tashlanmagan

Natijada bu uchta joy Step 9'dan yashiringan holda o'tib ketdi, va
`frontend/src/components/courses/CourseCard.tsx:90` orqali foydalanuvchiga
ko'rinadigan dars-soni xatosi (`course.videos?.length ?? course.videoCount ?? 0`,
`videoCount` fallback'i hech qachon ishga tushmaydi) shu review'gacha topilmay
qoldi.

To'g'ri tekshiruv `videos` so'zining o'zini (nafaqat yuqoridagi uchta aniq naqshni)
qidirar edi, masalan:

```bash
grep -rn "\bvideos\b" --include=*.js controllers/ utils/ | grep -v watchedVideos
```

— so'ng har bir topilgan qatorni qo'lda ko'rib, `.select`/`.populate`/proyeksiyasiz
`.find()`+`.lean()` orqali xom massiv chiqib ketayotganini alohida baholash kerak
edi. Grep yagona qadam bo'la olmaydi — u faqat nomzodlar ro'yxatini beradi,
xulosani emas.

- [ ] **Step 10: Commit**

```bash
cd aidevixBackend
git add backend/controllers/enrollmentController.js backend/__tests__/integration/enrollment.routes.test.js
git commit -F - <<'EOF'
fix(enrollment): compute progress from the active videos, not Course.videos

The membership guard added last plan made Course.videos authoritative - both
the guard's source and the progress denominator. That array was never
trustworthy: createVideo pushes to it, deleteVideo never pulls, and
updateVideo can set isActive:false without touching it.

So one stale entry meant progressPercent could not reach 100 and the
certificate never issued again for that course. The arbitrary-id hole used
to hide this, because a user could top up with junk ids.

markVideoWatched now derives membership, the denominator and the numerator
from Video.find({course, isActive:true}) - the same query getCourseVideos
runs, so progress matches what the student actually sees. It replaces the
Course load rather than adding a query: the course document was used for
nothing else here, and _issueCertificate takes the courseId string.

Filtering the numerator to the same set is what stops progress exceeding 100
when a watched lesson is later deactivated. The user loses credit for that
lesson, which is the deliberate trade - the alternative is a numerator that
outgrows its denominator.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
```

---

### Task 2: `deleteVideo` massivdan `$pull` qilsin

Task 1 dan keyin `Course.videos` ni hech kim o'qimaydi. Massiv saqlanadi (foydalanuvchi qarori), lekin bazada bilib turib noto'g'ri ma'lumot qoldirish keyingi kishini chalg'itadi — va agar kimdir ertaga uni o'qisa, jimgina xato qiladi.

**Files:**
- Modify: `backend/controllers/videoController.js` (`deleteVideo`, `:509` atrofida)
- Modify: `backend/__tests__/integration/video.routes.test.js`

**Interfaces:**
- Consumes: hech narsa
- Produces: hech narsa

**Tekshirilgan holat (qayta aniqlashtirmang):** `video.routes.test.js` da `deleteVideo` uchun test **yo'q** — yangi `describe` fayl oxiriga qo'shiladi. Fayl `jest.mock('../../models/Course')` ni `:10` da bajaradi, lekin `Course` **o'zgaruvchisini import qilmaydi** — uni qo'shish kerak.

- [ ] **Step 1: `Course` importini qo'shing**

`backend/__tests__/integration/video.routes.test.js` da boshqa model importlari yoniga (`const Video = require('../../models/Video');` atrofida) qo'shing:

```js
const Course = require('../../models/Course');
```

`jest.mock('../../models/Course')` `:10` da allaqachon bor — mock qatorini takrorlamang.

- [ ] **Step 2: Yiqiladigan testni yozing**

```js
describe('DELETE /api/videos/:id — Course.videos tozalanadi', () => {
  it('o\'chirilgan videoni kursning videos massividan chiqaradi', async () => {
    const COURSE = '68f00112233445566778899b';
    Video.findById.mockResolvedValue({
      _id: VIDEO_ID,
      course: COURSE,
      streamPath: null,
      bunnyVideoId: null,
      deleteOne: jest.fn().mockResolvedValue(undefined),
    });
    Course.updateOne.mockResolvedValue({});

    const res = await request(app).delete(`/api/videos/${VIDEO_ID}`);

    expect(res.status).toBe(200);
    expect(Course.updateOne).toHaveBeenCalledWith(
      { _id: COURSE },
      { $pull: { videos: VIDEO_ID } }
    );
  });
});
```

**Diqqat:** bu `describe` fayl oxirida turadi, ya'ni undan oldingi testlar o'rnatgan mock implementatsiyalarini meros qiladi — `jest.clearAllMocks()` chaqiruvlarni tozalaydi, implementatsiyalarni emas. Shuning uchun test `Video.findById` va `Course.updateOne` ni **o'zi** o'rnatadi, yuqoridagi kod aynan shunday qiladi.

- [ ] **Step 3: Testni ishga tushirib yiqilishini ko'ring**

```bash
cd aidevixBackend/backend && npx jest __tests__/integration/video.routes.test.js -t "Course.videos tozalanadi"
```

Expected: **FAIL** — `Course.updateOne` chaqirilmaydi, chunki hozirgi `deleteVideo` massivga tegmaydi.

- [ ] **Step 4: `$pull` ni qo'shing**

`backend/controllers/videoController.js`, `deleteVideo` ichida `await video.deleteOne();` (`:509`) qatoridan **oldin** qo'shing:

```js
    // Course.videos is written by createVideo and, until this line existed, never
    // repaired. Nothing reads it any more — markVideoWatched derives progress
    // from Video.find({course, isActive:true}) — but leaving a knowingly wrong
    // array in the database misleads the next reader, and anything that starts
    // reading it later would be silently wrong.
    if (video.course) {
      await Course.updateOne({ _id: video.course }, { $pull: { videos: video._id } });
    }
```

**`Course` allaqachon import qilingan** (`videoController.js:3`) — import blokiga tegmang.

- [ ] **Step 5: Testni ishga tushirib o'tishini ko'ring**

```bash
cd aidevixBackend/backend && npx jest __tests__/integration/video.routes.test.js
```

Expected: **PASS** — butun fayl yashil.

- [ ] **Step 6: Butun to'plamni ishga tushiring**

```bash
cd aidevixBackend/backend && npm test
```

Expected: barcha to'plamlar yashil.

- [ ] **Step 7: Commit**

```bash
cd aidevixBackend
git add backend/controllers/videoController.js backend/__tests__/integration/video.routes.test.js
git commit -F - <<'EOF'
fix(video): pull the deleted video out of Course.videos

createVideo pushes the id into the array and nothing ever removed it, so the
array accumulated entries for videos that no longer exist.

After the previous commit nothing reads that array, so this changes no
behaviour. It is here because a database that knowingly holds wrong data
misleads whoever reads it next, and anything that starts reading it later
would be silently wrong.

Existing stale entries are left alone - no migration, consistent with the
rest of this work.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
```

---

## Bosqich tugagandan keyin

Bu reja HANDOFF'ni yangilashni o'z ichiga olmaydi. Bosqich tugagach yozing:

1. **`Course.videos` endi vakolatli emas** — `markVideoWatched` progressni `Video.find({course, isActive:true})` dan hisoblaydi. Massiv saqlanadi va `deleteVideo` uni tozalaydi, lekin uni **hech kim o'qimaydi**. Kimdir uni qayta o'qiy boshlasa, avval eskirgan yozuvlar masalasini hal qilsin.
2. **Mavjud kurslardagi eskirgan massiv yozuvlari tozalanmagan** — migratsiya qilinmadi. Ular endi zararsiz.
3. **Xatti-harakat o'zgarishi:** ko'rilgan dars keyin `isActive:false` qilinsa yoki o'chirilsa, foydalanuvchi u uchun kreditni yo'qotadi. Bu ataylab — surat va maxraj bir xil to'plamdan.
4. **Endi tugallanadigan kurslar.** Bo'g'ilgan kurslarda foydalanuvchilar 100% ga yetishi va sertifikat olishi mumkin bo'ladi. Bu kutilgan natija, lekin deploydan keyin sertifikat chiqishi ko'payishi mumkin.

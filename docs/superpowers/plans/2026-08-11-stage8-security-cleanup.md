# Bosqich 8 — Xavfsizlik tozalash (Bunny) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bunny.net'ning barcha qoldiqlarini — kod, model maydonlari, endpointlar, API hujjati, qattiq yozilgan kalitli debug fayli — repo'dan olib tashlash va uni qaytib kirishidan doimiy test bilan himoyalash.

**Architecture:** Bu sof olib tashlash ishi. Ijro yo'li allaqachon mkhls'da, shuning uchun foydalanuvchiga ko'rinadigan xatti-harakat o'zgarmaydi (yagona istisno: Task 4 dagi yetim yozuv). Olib tashlash bog'liqlik tartibida boradi — avval `utils/bunny.js` ni iste'mol qiluvchilar (Task 2, 3), keyin modulning o'zi (Task 4), keyin model (Task 5), keyin hujjat va matn (Task 6, 7). Oxirida repo bo'ylab skanlaydigan doimiy qo'riqchi test qo'shiladi (Task 8).

**Tech Stack:** Node.js/Express backend, Mongoose, Jest + supertest; Next.js frontend, Playwright e2e.

**Spec:** `docs/superpowers/specs/2026-08-11-stage8-security-cleanup-design.md`

## Global Constraints

Bu bandlar HAR bir taskga tegishli. Ular spec'dan so'zma-so'z olingan.

- **DB migratsiyasi YO'Q.** MongoDB'ga umuman tegilmaydi. `bunnyVideoId`/`bunnyStatus` ma'lumoti va `bunnyStatus_1` indeksi bazada qoladi — bu ataylab qilingan qaror.
- **Git tarixi qayta yozilMAYDI.** `filter-repo`, `rebase -i`, force-push — hech biri yo'q.
- **`test-gemini.js` ga TEGILMAYDI.** Ildizda ikkita Google Gemini kaliti bilan turibdi. Foydalanuvchi uni o'zi keyin hal qiladi. Uni o'chirmang, tahrirlamang, `.gitignore`ga qo'shmang.
- **Ildizdagi `add-git-instructions.js`, `fix-routers.js`, `migrate-frontend.js`, `test_logic.js` ga TEGILMAYDI.** Qamrovdan tashqari.
- **`team/page.tsx` va i18n matnlarida vendor nomi ALMASHTIRILMAYDI, faqat OLIB TASHLANADI.** "Bunny.net" o'rniga "mkhls" yozish mkhls ishini noto'g'ri odamga yozib qo'ygan bo'lardi — u Plan 1-3'da qilingan. Hissa tavsifi saqlanadi, vendor nomi chiqariladi.
- **Frontend `npm run typecheck` va `npm run build` tur xatosini USHLAMAYDI** — `frontend/tsconfig.json` da `noCheck: true` bor. Yagona ishonchli darvoza: `.superpowers/sdd/2026-08-10-plan3-frontend-player-admin/typecheck-gate.sh`.
- **e2e testlar HAR DOIM spec-boshiga ishga tushiriladi**, hech qachon bitta to'liq to'plam yugurishi emas — to'liq to'plam worker'larni `STATUS_DLL_INIT_FAILED` (0xC0000142) bilan qulatadi, bu Windows resurs tugashi, test natijasi emas. Har yugurishdan oldin: `taskkill //IM chrome.exe //F`.
- **Backend `.env` o'zgarsa nodemon ko'rmaydi** (faqat `js/mjs/cjs/json` kuzatadi) — `touch backend/index.js` bilan qayta ishga tushiring.
- Har commit `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>` trailer bilan.

---

## Fayl tuzilishi

**Butunlay o'chiriladigan fayllar:**
- `fetch_bunny.html` (repo ildizi — qattiq yozilgan Bunny API kaliti)
- `list-bunny-videos.js` (repo ildizi)
- `backend/check_bunny_video.js`
- `backend/list_bunny_videos_final.js`
- `backend/scripts/link-bunny.js`
- `backend/utils/bunny.js`

**Yaratiladigan fayllar:**
- `backend/__tests__/integration/admin.routes.test.js` — `bulk-link` yo'qligini qulflaydi (Task 2)
- `backend/__tests__/no-bunny.test.js` — repo bo'ylab doimiy qo'riqchi (Task 8)

**O'zgartiriladigan fayllar:** `backend/controllers/{videoController,adminController}.js`, `backend/routes/{videoRoutes,adminRoutes}.js`, `backend/models/Video.js`, `backend/config/swagger.js`, `backend/.env.example`, `backend/__tests__/integration/video.routes.test.js`, `frontend/src/api/adminApi.ts`, `frontend/src/app/admin/courses/[id]/page.tsx`, `frontend/src/app/admin/settings/page.tsx`, `frontend/public/sw.js`, `frontend/src/app/team/page.tsx`, `frontend/src/utils/i18n/{uz,ru,en}.ts`.

---

### Task 1: Sizib chiqqan kalitli fayl va bir martalik Bunny skriptlarini o'chirish

Bu task hech qanday kodga import qilinmagan fayllarni o'chiradi, shuning uchun u boshqa tasklardan mustaqil.

**Files:**
- Delete: `fetch_bunny.html`
- Delete: `list-bunny-videos.js`
- Delete: `backend/check_bunny_video.js`
- Delete: `backend/list_bunny_videos_final.js`
- Delete: `backend/scripts/link-bunny.js`
- Delete: `.playwright-cli/page-2026-04-24T14-06-25-253Z.yml`
- Delete: `.playwright-cli/page-2026-04-24T14-25-29-426Z.yml`

**Interfaces:**
- Consumes: hech narsa
- Produces: hech narsa (bu fayllarni hech kim import qilmaydi)

**Nima uchun oxirgi ikkitasi:** `.playwright-cli/` da 2026-04-24 dagi 39 ta Playwright sahifa dumpi bor; aynan shu ikkitasi jamoa sahifasining eski "Bunny.net Stream" matnini va "Bunny.net SDK" chipini tasvirlaydi. Ular Task 8 qo'riqchisini qizartirardi. Qolgan 37 tasi ATAYLAB qoldiriladi — foydalanuvchi qamrovni shunday belgiladi.

- [ ] **Step 1: Hech kim bu fayllarni import qilmasligini tasdiqlang**

```bash
cd aidevixBackend
git ls-files | grep -v '^docs/' | xargs grep -ln "check_bunny_video\|list_bunny_videos_final\|list-bunny-videos\|link-bunny\|fetch_bunny" 2>/dev/null
```

Expected: hech qanday chiqish yo'q (bo'sh). Agar biror fayl chiqsa — TO'XTANG va xabar bering, reja noto'g'ri.

- [ ] **Step 2: Fayllarni o'chiring**

```bash
cd aidevixBackend
git rm fetch_bunny.html list-bunny-videos.js backend/check_bunny_video.js backend/list_bunny_videos_final.js backend/scripts/link-bunny.js
git rm ".playwright-cli/page-2026-04-24T14-06-25-253Z.yml" ".playwright-cli/page-2026-04-24T14-25-29-426Z.yml"
```

**Diqqat:** `.playwright-cli/` papkasining QOLGAN fayllariga tegmang — faqat yuqoridagi ikkitasi o'chiriladi.

- [ ] **Step 3: `test-gemini.js` HALI HAM joyida ekanini tasdiqlang**

```bash
cd aidevixBackend && ls test-gemini.js
```

Expected: `test-gemini.js` — mavjud. Bu fayl ATAYLAB qoldiriladi (Global Constraints). Agar u yo'qolgan bo'lsa, `git checkout test-gemini.js` bilan qaytaring.

- [ ] **Step 4: Backend hali ham ko'tarilishini tasdiqlang**

```bash
cd aidevixBackend/backend && node -e "require('./routes/videoRoutes'); require('./routes/adminRoutes'); console.log('OK')"
```

Expected: oxirgi qatorda `OK`. (Yuqorida `⚠️ ... not set — using development fallback` ogohlantirishlari normal.)

- [ ] **Step 5: Commit**

```bash
cd aidevixBackend
git commit -m "$(cat <<'EOF'
chore: delete the leaked Bunny key file and one-off Bunny scripts

fetch_bunny.html carried a hardcoded Bunny API key and library id in a
public repo. An earlier audit commit already deleted it, but that commit
lives on an unmerged branch, so the file was still here.

The other four are one-off debug scripts nothing imports.

Deleting these does not revoke the key - that is a dashboard action.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: `POST /api/admin/videos/bulk-link` va `bulkLinkBunny` ni olib tashlash

Bu `utils/bunny.js`ning uchta jonli iste'molchisidan ikkitasini (`getBunnyVideoInfo`, `parseBunnyStatus`) yo'q qiladi. Frontendda bu endpoint'ni chaqiruvchi yo'q.

**Files:**
- Create: `backend/__tests__/integration/admin.routes.test.js`
- Modify: `backend/controllers/adminController.js` (365-405 funksiya, 712 eksport)
- Modify: `backend/routes/adminRoutes.js` (7 import, 69 route)

**Interfaces:**
- Consumes: hech narsa
- Produces: `adminController` endi `bulkLinkBunny` eksport qilmaydi; `adminRoutes` da `post /videos/bulk-link` yo'q

- [ ] **Step 1: Yiqiladigan testni yozing**

Yangi fayl `backend/__tests__/integration/admin.routes.test.js`:

```js
'use strict';

// adminRoutes'ni DB'siz require qilish mumkin: mongoose model ta'riflari
// ulanish ochmaydi. Shuning uchun bu yerda hech qanday mock kerak emas.
const adminRouter = require('../../routes/adminRoutes');
const adminController = require('../../controllers/adminController');

const routeSignatures = () =>
  adminRouter.stack
    .filter((layer) => layer.route)
    .map((layer) => `${Object.keys(layer.route.methods)[0]} ${layer.route.path}`);

describe('admin routes — Bunny olib tashlandi', () => {
  it('bulk-link endpointini endi ochmaydi', () => {
    expect(routeSignatures()).not.toContain('post /videos/bulk-link');
  });

  it('bulkLinkBunny ni eksport qilmaydi', () => {
    expect(adminController.bulkLinkBunny).toBeUndefined();
  });

  // Qo'shni route'lar shu tozalashda tasodifan yo'qolmasligi uchun.
  it("qolgan tools route'larini saqlaydi", () => {
    const signatures = routeSignatures();
    expect(signatures).toContain('post /telegram');
    expect(signatures).toContain('put /videos/reorder');
  });
});
```

- [ ] **Step 2: Testni ishga tushirib yiqilishini ko'ring**

```bash
cd aidevixBackend/backend && npx jest __tests__/integration/admin.routes.test.js
```

Expected: FAIL — dastlabki ikki test yiqiladi (`post /videos/bulk-link` topiladi, `bulkLinkBunny` funksiya). Uchinchi test o'tadi.

- [ ] **Step 3: `adminRoutes.js` dan route va importni olib tashlang**

`backend/routes/adminRoutes.js:7` — import qatoridan `bulkLinkBunny,` ni chiqaring:

```js
  sendTelegramMessage, reorderVideos, getCourseEnrollmentStats,
```

`backend/routes/adminRoutes.js:69` — butun qatorni o'chiring:

```js
router.post('/videos/bulk-link',  ...guard, bulkLinkBunny);
```

- [ ] **Step 4: `adminController.js` dan funksiya va eksportni olib tashlang**

364-405 qatorlar — JSDoc kommentidan (`/** @desc  Bulk Bunny GUID ulash ... */`) yopuvchi `};` gacha butun `bulkLinkBunny` funksiyasini o'chiring. Undan keyingi `/** @desc  Videolarni qayta tartiblash ... */` kommenti va `reorderVideos` qoladi.

712-qatordagi eksport ro'yxatidan `bulkLinkBunny,` ni chiqaring:

```js
  sendTelegramMessage, reorderVideos, getCourseEnrollmentStats,
```

- [ ] **Step 5: Testni ishga tushirib o'tishini ko'ring**

```bash
cd aidevixBackend/backend && npx jest __tests__/integration/admin.routes.test.js
```

Expected: PASS, uchala test ham.

- [ ] **Step 6: Commit**

```bash
cd aidevixBackend
git add backend/__tests__/integration/admin.routes.test.js backend/controllers/adminController.js backend/routes/adminRoutes.js
git commit -m "$(cat <<'EOF'
refactor(admin): drop the bulk-link endpoint

POST /api/admin/videos/bulk-link attached Bunny GUIDs to videos. Nothing
in the frontend calls it and Bunny is gone, so it is an admin-only write
path with no purpose.

Removing it also drops two of the three live consumers of utils/bunny.js.

A router-level test locks the route out; it needs no DB because mongoose
model definitions do not connect.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: O'lik `GET /api/videos/:id/upload-credentials` endpointini olib tashlash

Bu endpoint allaqachon mkhls'ga o'tgan (Bunny'ga tegishli emas), lekin frontend uni import qilib hech qachon chaqirmaydi. Haqiqiy yuklash yo'li — `PUT /api/videos/:id/upload-proxy`, unga TEGILMAYDI.

**Files:**
- Modify: `backend/__tests__/integration/video.routes.test.js` (yangi describe bloki)
- Modify: `backend/controllers/videoController.js` (702-742 funksiya, 1051 eksport)
- Modify: `backend/routes/videoRoutes.js` (16 import, 56 route)
- Modify: `frontend/src/api/adminApi.ts:34`
- Modify: `frontend/src/app/admin/courses/[id]/page.tsx:7`

**Interfaces:**
- Consumes: hech narsa
- Produces: `videoController` endi `getUploadCredentialsForVideo` eksport qilmaydi; `adminApi` endi `getUploadCredentials` eksport qilmaydi

- [ ] **Step 1: Yiqiladigan testni yozing**

`backend/__tests__/integration/video.routes.test.js` faylining OXIRIGA, oxirgi `});` dan keyin qo'shing:

```js
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
    const res = await request(app).put(`/api/videos/${VIDEO_ID}/upload-proxy`);

    // Content-Length yo'q → 411. Muhimi: bu express 404 EMAS, ya'ni route bor.
    expect(res.status).toBe(411);
  });
});
```

- [ ] **Step 2: Testni ishga tushirib yiqilishini ko'ring**

```bash
cd aidevixBackend/backend && npx jest __tests__/integration/video.routes.test.js -t "olib tashlangan"
```

Expected: FAIL — birinchi test `res.text` da `Cannot GET` topolmaydi (controller JSON qaytaradi).

- [ ] **Step 3: Backend'dan endpointni olib tashlang**

`backend/routes/videoRoutes.js:16` — import ro'yxatidan `getUploadCredentialsForVideo,` qatorini o'chiring.

`backend/routes/videoRoutes.js:53` — sarlavhani tuzating:

```js
// mkhls endpoints (Admin only)
```

`backend/routes/videoRoutes.js:56` — butun qatorni o'chiring:

```js
router.get('/:id/upload-credentials', validateObjectId(), authenticate, requireAdmin, getUploadCredentialsForVideo);
```

`backend/routes/videoRoutes.js:58` — kommentni tuzating:

```js
// Video binary'ni backend orqali mkhls'ga oqizadi (octet-stream raw body — body-parser tegmaydi)
```

`backend/controllers/videoController.js` — `// ─── Bunny.net specific endpoints ───` sarlavhasi (698), undan keyingi ikki qatorli komment (`// Upload credentials olish (Admin only)` va `// Admin shu ma'lumot bilan ... Bunny ga yuklaydi`) va butun `getUploadCredentialsForVideo` funksiyasini (702-qatordagi `const getUploadCredentialsForVideo = async (req, res) => {` dan uning yopuvchi `};` gacha) o'chiring. O'rniga sarlavha qoldiring:

```js
// ─── mkhls endpoints ─────────────────────────────────────────────────────────
```

`backend/controllers/videoController.js:1051` — eksport ro'yxatidan `getUploadCredentialsForVideo,` qatorini o'chiring.

- [ ] **Step 4: Testni ishga tushirib o'tishini ko'ring**

```bash
cd aidevixBackend/backend && npx jest __tests__/integration/video.routes.test.js
```

Expected: PASS — butun fayl yashil (yangi ikki test ham).

- [ ] **Step 5: Frontend'dan o'lik funksiyani olib tashlang**

`frontend/src/api/adminApi.ts:34` — butun qatorni o'chiring:

```ts
export const getUploadCredentials  = (id)                => axiosInstance.get(`videos/${id}/upload-credentials`)
```

`frontend/src/app/admin/courses/[id]/page.tsx:7` — import ro'yxatidan `getUploadCredentials, ` ni chiqaring, natija:

```tsx
  getVideoStatus, linkVideoToStream,
```

- [ ] **Step 6: Frontendda boshqa chaqiruvchi qolmaganini tasdiqlang**

```bash
cd aidevixBackend/frontend && grep -rn "getUploadCredentials\|upload-credentials" src/ e2e/
```

Expected: hech qanday chiqish yo'q (bo'sh).

- [ ] **Step 7: Frontend build o'tishini tasdiqlang**

```bash
cd aidevixBackend/frontend && npm run build
```

Expected: build muvaffaqiyatli tugaydi (o'chirilgan import tufayli sinmaydi).

- [ ] **Step 8: Commit**

```bash
cd aidevixBackend
git add backend/__tests__/integration/video.routes.test.js backend/controllers/videoController.js backend/routes/videoRoutes.js frontend/src/api/adminApi.ts "frontend/src/app/admin/courses/[id]/page.tsx"
git commit -m "$(cat <<'EOF'
refactor(video): drop the dead upload-credentials endpoint

GET /api/videos/:id/upload-credentials had already moved to mkhls, but
the frontend only imported it - never called it. The real upload path is
PUT /api/videos/:id/upload-proxy, which is untouched.

The test asserts on the response body, not just the 404: with Video
auto-mocked the controller returns its own 404, so a status-only check
would have been green before the removal too.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: `utils/bunny.js` modulini va uning oxirgi izlarini o'chirish

Bu task modulning o'zini o'chiradi. Task 2 va 3 dan KEYIN bajarilishi shart.

**Files:**
- Delete: `backend/utils/bunny.js`
- Modify: `backend/controllers/videoController.js` (10-17 import, 20 komment, 380-381 komment, 507-513 blok, 871 va 897-899 ko'zgu)
- Modify: `backend/__tests__/integration/video.routes.test.js` (16-qator `jest.mock`, yangi test)

**Interfaces:**
- Consumes: Task 2 va 3 `getBunnyVideoInfo`/`parseBunnyStatus` iste'molchilarini yo'q qilgan bo'lishi kerak
- Produces: `utils/bunny` moduli endi mavjud emas; `/status` javobida `bunnyStatus` kaliti yo'q

- [ ] **Step 1: Yiqiladigan testni yozing**

`backend/__tests__/integration/video.routes.test.js` oxiriga qo'shing:

```js
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
```

- [ ] **Step 2: Testni ishga tushirib yiqilishini ko'ring**

```bash
cd aidevixBackend/backend && npx jest __tests__/integration/video.routes.test.js -t "ko'zgusi olib tashlandi"
```

Expected: FAIL — ikkala test ham `bunnyStatus` xossasini topadi.

- [ ] **Step 3: `videoController.js` dan Bunny izlarini olib tashlang**

10-17 qatorlar — butun import blokini o'chiring:

```js
const {
  createBunnyVideo,
  deleteBunnyVideo,
  getBunnyVideoInfo,
  generateSignedEmbedUrl,
  streamUploadToBunny,
  parseBunnyStatus,
} = require('../utils/bunny');
```

20-qator kommenti — Bunny nomini mkhls'ga almashtiring:

```js
// Frontend bu URL'ga PUT qiladi (cookie auth), backend mkhls'ga oqizadi.
```

380-381 qatorlar kommenti:

```js
//   1. POST /api/videos       → video yaratiladi (DB + mkhls streamPath)
//   2. PUT  /api/videos/:id/upload-proxy → admin faylni backend proxy orqali yuklaydi
```

507-513 qatorlar — butun blokni o'chiring:

```js
    // Eski Bunny videolari uchun (DEPRECATED — bir reliz).
    if (video.bunnyVideoId) {
      try {
        await deleteBunnyVideo(video.bunnyVideoId);
      } catch (bunnyErr) {
        console.error('Bunny delete error:', bunnyErr.message);
      }
    }
```

871-qator — ko'zgu qatorini o'chiring:

```js
            bunnyStatus: video.streamStatus, // DEPRECATED — Plan 3 gacha admin panel uchun
```

897-899 qatorlar — izoh va ko'zguni o'chiring:

```js
        // DEPRECATED mirror: the admin panel reads bunnyStatus until Plan 3
        // renames it, and that panel is how this plan gets verified by hand.
        bunnyStatus: info.status,
```

- [ ] **Step 4: Testdagi `jest.mock` ni olib tashlang**

`backend/__tests__/integration/video.routes.test.js:16` — bu qatorni o'chiring:

```js
jest.mock('../../utils/bunny');
```

**Bu qadam majburiy** — modul o'chirilgandan keyin `jest.mock` uni topolmay BUTUN to'plamni qulatadi.

- [ ] **Step 5: Modulni o'chiring**

```bash
cd aidevixBackend && git rm backend/utils/bunny.js
```

- [ ] **Step 6: Butun backend to'plamini ishga tushiring**

```bash
cd aidevixBackend/backend && npm test
```

Expected: PASS — barcha test fayllari yashil (`auth.middleware`, `auth.routes`, `video.routes`, `admin.routes`).

- [ ] **Step 7: Backend haqiqatan ko'tarilishini tasdiqlang**

```bash
cd aidevixBackend/backend && node -e "require('./routes/videoRoutes'); require('./routes/adminRoutes'); require('./controllers/videoController'); console.log('OK')"
```

Expected: oxirgi qatorda `OK` — hech qanday `Cannot find module '../utils/bunny'` xatosi yo'q.

- [ ] **Step 8: Commit**

```bash
cd aidevixBackend
git add -A backend/
git commit -m "$(cat <<'EOF'
refactor(video): delete the Bunny client module

utils/bunny.js exported seven functions; four were already dead and the
other three lost their callers in the previous two commits. The last
trace was deleteVideo's cleanup call for rows still carrying bunnyVideoId.

Behaviour change, deliberate: deleting one of those legacy videos now
leaves an orphan record on Bunny. Bunny has been abandoned, so nobody is
paying attention to that account.

Also drops the bunnyStatus mirror from the status response. The admin
panel reads streamStatus and has done since Plan 3, so the mirror had no
reader.

The jest.mock line had to go with it or the whole suite would fail to
resolve the module.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Model'dan `bunnyVideoId` / `bunnyStatus` maydonlarini va indeksni olib tashlash

**DB'ga TEGILMAYDI** (Global Constraints). Mongoose `strict` rejimi schema'da yo'q maydonlarni o'qishda ham, yozishda ham ko'rmaydi, shuning uchun bazadagi eski ma'lumot zararsiz qoladi.

**Files:**
- Modify: `backend/models/Video.js` (48-60 maydonlar, 96 indeks)

**Interfaces:**
- Consumes: Task 4 `video.bunnyVideoId` ni o'qigan oxirgi joyni olib tashlagan bo'lishi kerak
- Produces: `Video` schemasida `bunnyVideoId`/`bunnyStatus` yo'q

- [ ] **Step 1: Kodda bu maydonlarni o'qiydigan joy qolmaganini tasdiqlang**

```bash
cd aidevixBackend/backend && grep -rn "bunnyVideoId\|bunnyStatus" --include=*.js . | grep -v node_modules | grep -v __tests__
```

Expected: faqat `config/swagger.js` (Task 6 da tozalanadi), `.env.example` (Task 6), va `models/Video.js` ning o'zi. Boshqa `controllers/` yoki `routes/` urishi bo'lmasligi kerak — bo'lsa TO'XTANG.

- [ ] **Step 2: Maydonlarni o'chiring**

`backend/models/Video.js:48-60` — butun blokni o'chiring:

```js
  // ─── Bunny.net (DEPRECATED) ────────────────────────────────────────────────
  // Kept for one release: existing rows still carry these and the admin panel
  // still reads bunnyStatus until Plan 3 renames it. Removed by migration
  // afterwards. New videos never set them.
  bunnyVideoId: {
    type: String,
    default: null,
  },
  bunnyStatus: {
    type: String,
    enum: ['pending', 'processing', 'ready', 'failed'],
    default: 'pending',
  },
```

- [ ] **Step 3: Indeksni o'chiring va nima uchun ekanini yozib qoldiring**

`backend/models/Video.js:96` — bu qatorni o'chiring:

```js
videoSchema.index({ bunnyStatus: 1 });
```

Uning o'rniga, `videoSchema.index({ title: 'text' });` dan keyin quyidagi izohni qo'shing:

```js
// Eslatma: `bunnyStatus_1` indeksi mavjud MongoDB'larda hali turibdi — bu
// qatorni olib tashlash uni tushirmaydi. Migratsiya ataylab qilinmadi
// (spec 2026-08-11 §5); qo'lda tozalash uchun: db.videos.dropIndex('bunnyStatus_1').
```

- [ ] **Step 4: Butun to'plamni ishga tushiring**

```bash
cd aidevixBackend/backend && npm test
```

Expected: PASS — barcha testlar yashil. Xususan `video.routes.test.js:435` dagi `expect(projection).not.toMatch(/bunnyVideoId/)` proyeksiya himoyasi hali ham o'tadi.

- [ ] **Step 5: Model haqiqatan yuklanishini tasdiqlang**

```bash
cd aidevixBackend/backend && node -e "
const V = require('./models/Video');
const paths = Object.keys(V.schema.paths);
console.log('bunnyVideoId bormi:', paths.includes('bunnyVideoId'));
console.log('bunnyStatus bormi:', paths.includes('bunnyStatus'));
console.log('streamPath bormi:', paths.includes('streamPath'));
console.log('streamStatus bormi:', paths.includes('streamStatus'));
"
```

Expected: birinchi ikkitasi `false`, oxirgi ikkitasi `true`.

- [ ] **Step 6: Commit**

```bash
cd aidevixBackend
git add backend/models/Video.js
git commit -m "$(cat <<'EOF'
refactor(model): drop bunnyVideoId and bunnyStatus from the Video schema

Nothing reads them any more. Mongoose strict mode ignores fields absent
from the schema in both directions, so the rows that still carry values
are harmless.

No migration, by decision: the data and the bunnyStatus_1 index stay in
MongoDB. Dropping the index line here does not drop the index there, so
the note next to it says how to do that by hand.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: API hujjati va `.env.example` ni haqiqatga moslash

Swagger hozir yolg'on gapiryapti: `BunnyPlayer` schemasi `embedUrl` va `<iframe>` haqida, haqiqiy javob esa `hlsUrl`.

**Files:**
- Modify: `backend/config/swagger.js` (29-30, 54-55 matn; 526-537 maydonlar; 542-586 schema; 589, 634 havolalar; 605-630 matn)
- Modify: `backend/.env.example` (87-106 Bunny bo'limi)

**Interfaces:**
- Consumes: hech narsa
- Produces: `#/components/schemas/StreamPlayer` (eski `BunnyPlayer` o'rniga)

- [ ] **Step 1: Haqiqiy javob shaklini tasdiqlang**

```bash
cd aidevixBackend/backend && sed -n '194,201p' controllers/videoController.js
```

Expected: `player = { type: 'hls', hlsUrl: mkhls.buildHlsUrl(...), expiresAt }`. Schema aynan shu uch maydonni tasvirlashi kerak.

- [ ] **Step 2: `Video` schemasidan Bunny maydonlarini o'chiring**

`backend/config/swagger.js:526-537` — ikkala maydon ta'rifini o'chiring:

```js
            bunnyVideoId: {
              type: 'string',
              example: 'abc-def-ghi-123',
              description: 'Bunny.net video GUID — admin upload qilgandan keyin to\'ldiriladi / Bunny.net GUID видео',
            },
            bunnyStatus: {
              type: 'string',
              enum: ['processing', 'ready', 'failed', 'unknown'],
              example: 'ready',
              description: 'Bunny.net video holati / Статус видео на Bunny.net: processing=tayyorlanmoqda, ready=tayyor, failed=xato',
            },
```

- [ ] **Step 3: `BunnyPlayer` ni `StreamPlayer` bilan almashtiring**

`backend/config/swagger.js` — `// ─── BUNNY PLAYER (GET /videos/:id → player) ─────────` sarlavhasidan boshlab butun `BunnyPlayer: { ... },` blokini quyidagi bilan almashtiring:

```js
        // ─── STREAM PLAYER (GET /videos/:id → player) ────────
        StreamPlayer: {
          type: 'object',
          description: `
**🇺🇿 mkhls video player ma'lumoti**

\`GET /api/videos/:id\` muvaffaqiyatli bo'lganda \`player\` ob'ekti qaytariladi.
Video hali tayyor bo'lmasa \`player\` — \`null\`.

\`hlsUrl\` — token bilan imzolangan HLS master playlist. Token muddati
\`MKHLS_STREAM_TOKEN_TTL\` bilan belgilanadi (standart 14400 soniya).
Master playlist ichidagi rung playlist'lari va segmentlar ham xuddi shu
tokenni tashiydi.

**Frontend ishlatish:** Vidstack + hls.js. \`<iframe>\` ISHLATILMAYDI —
brauzer playlist va segmentlarni \`fetch()\` bilan to'g'ridan-to'g'ri oladi,
shuning uchun mkhls tomonda CORS sozlanishi shart.

---

**🇷🇺 Данные видеоплеера mkhls**

Объект \`player\` возвращается при успешном \`GET /api/videos/:id\`,
или \`null\`, если видео ещё не готово. \`hlsUrl\` — подписанный HLS
master playlist.
          `,
          properties: {
            type: {
              type: 'string',
              enum: ['hls'],
              example: 'hls',
              description: 'Player turi / Тип плеера',
            },
            hlsUrl: {
              type: 'string',
              example: 'https://stream.aidevix.uz/vod/aidevix/65f1a2b3c4d5e6f7a8b9c0d3.mp4/master.m3u8?token=eyJhbGci',
              description: '🎬 Tokenli HLS master playlist URL / Подписанный URL HLS master playlist',
            },
            expiresAt: {
              type: 'string',
              format: 'date-time',
              example: '2026-03-23T00:00:00.000Z',
              description: 'Token muddati tugash vaqti — shundan keyin yangi so\'rov kerak / Время истечения токена',
            },
          },
        },
```

- [ ] **Step 4: Qolgan `BunnyPlayer` havolalarini yangilang**

`backend/config/swagger.js:589` — `VideoLink` ta'rifidagi havola:

```js
          description: '⚠️ ESKIRGAN (legacy) — Endi ishlatilmaydi. \`StreamPlayer\` dan foydalaning. / ⚠️ УСТАРЕЛО — Больше не используется. Используйте \`StreamPlayer\`.',
```

`backend/config/swagger.js:634` — `VideoResponse` ichidagi `$ref`:

```js
                player: { $ref: '#/components/schemas/StreamPlayer' },
```

`VideoResponse` ning `description` matnida `player.embedUrl` haqidagi ikki qatorni (uz va ru) almashtiring:

```
\`player.hlsUrl\` — mkhls uchun tokenli HLS master playlist URL.
```

va

```
\`player.hlsUrl\` — подписанный URL HLS master playlist mkhls.
```

Shu matndagi `// player.embedUrl — iframe src uchun` kommentini ham `// player.hlsUrl — Vidstack/hls.js uchun` ga o'zgartiring.

- [ ] **Step 5: Yuqoridagi API tavsifi matnini tuzating**

`backend/config/swagger.js:29-32` (uz):

```
### 🎬 Video tizimi (mkhls):
Videolar **o'z serverimizdagi mkhls** orqali uzatiladi.
\`GET /api/videos/:id\` → **tokenli HLS master playlist URL** qaytaradi.
Frontend uni Vidstack + hls.js bilan o'ynatadi — iframe emas, Telegram link emas!
```

`backend/config/swagger.js:54-57` (ru):

```
### 🎬 Видео система (mkhls):
Видео стримятся через **собственный сервер mkhls**.
\`GET /api/videos/:id\` → возвращает **подписанный URL HLS master playlist**.
Frontend воспроизводит его через Vidstack + hls.js — не iframe, не Telegram!
```

- [ ] **Step 6: `.env.example` dan Bunny bo'limini o'chiring**

`backend/.env.example:87-106` — `# ─── Bunny.net — VIDEO (DEPRECATED...` sarlavhasidan boshlab `# BUNNY_STORAGE_CDN_BASE=https://aidevix.b-cdn.net` qatorigacha (va undan keyingi bo'sh qator) butun blokni o'chiring. `MKHLS_TRANSCODE_ON_UPLOAD=false` dan keyin darhol `# Payment Gateways` bo'limi kelishi kerak.

- [ ] **Step 7: Swagger haqiqatan yuklanishini va `$ref` uzilmaganini tasdiqlang**

```bash
cd aidevixBackend/backend && node -e "
const spec = require('./config/swagger');
const doc = spec.swaggerSpec || spec.specs || spec;
const json = JSON.stringify(doc);
console.log('BunnyPlayer qoldimi:', json.includes('BunnyPlayer'));
console.log('StreamPlayer bormi:', json.includes('StreamPlayer'));
console.log('bunny (har qanday) qoldimi:', /bunny/i.test(json));
"
```

Expected: `BunnyPlayer qoldimi: false`, `StreamPlayer bormi: true`, `bunny (har qanday) qoldimi: false`.

Agar `require` eksport shakli tufayli yiqilsa, `node -e "require('./config/swagger'); console.log('yuklandi')"` bilan hech bo'lmaganda sintaksis to'g'riligini tasdiqlang, so'ng `grep -c "BunnyPlayer\|bunny" config/swagger.js` → `0` bo'lishini tekshiring.

- [ ] **Step 8: Butun to'plamni ishga tushiring**

```bash
cd aidevixBackend/backend && npm test
```

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
cd aidevixBackend
git add backend/config/swagger.js backend/.env.example
git commit -m "$(cat <<'EOF'
docs(api): describe the mkhls player instead of the Bunny one

Swagger still documented a two-hour signed embedUrl to drop into an
iframe. The endpoint has returned {type, hlsUrl, expiresAt} since the
mkhls migration, so anyone reading the docs was being told the wrong
shape.

Renames BunnyPlayer to StreamPlayer and updates both $refs, drops the
bunnyVideoId/bunnyStatus properties, and removes the Bunny block from
.env.example.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Frontend matnlarini tozalash

To'rt joy: admin sozlamalar kartasi, service worker kommentlari, jamoa sahifasi va i18n.

**Files:**
- Modify: `frontend/src/app/admin/settings/page.tsx:68-74`
- Modify: `frontend/public/sw.js:8, 133`
- Modify: `frontend/src/app/team/page.tsx:114-119`
- Modify: `frontend/src/utils/i18n/uz.ts:892`, `ru.ts:868`, `en.ts:869`

**Interfaces:**
- Consumes: hech narsa
- Produces: hech narsa (faqat matn)

- [ ] **Step 1: Admin sozlamalar kartasini mkhls'ga almashtiring**

`frontend/src/app/admin/settings/page.tsx:68-74` — `<h3>` dan `</p>` gacha bo'lgan qismni almashtiring:

```tsx
              <h3 className="font-display text-lg font-bold text-white">mkhls Stream</h3>
              <p className="mt-2 text-sm text-slate-400">
                Videolar <strong className="text-slate-200">o‘z serverimizdagi mkhls</strong> orqali uzatiladi. Muhit
                o‘zgaruvchilari: <code className="rounded bg-slate-950 px-1.5 py-0.5 text-xs">MKHLS_BASE_URL</code>,{' '}
                <code className="rounded bg-slate-950 px-1.5 py-0.5 text-xs">MKHLS_PUBLIC_URL</code>,{' '}
                <code className="rounded bg-slate-950 px-1.5 py-0.5 text-xs">MKHLS_ADMIN_USERNAME</code>,{' '}
                <code className="rounded bg-slate-950 px-1.5 py-0.5 text-xs">MKHLS_ADMIN_PASSWORD</code>,{' '}
                <code className="rounded bg-slate-950 px-1.5 py-0.5 text-xs">MKHLS_NAMESPACE</code>,{' '}
                <code className="rounded bg-slate-950 px-1.5 py-0.5 text-xs">MKHLS_STREAM_TOKEN_TTL</code>. Admin kurs
                sahifasida video yaratiladi, so‘ng fayl backend proxy’siga yuboriladi — mkhls admin paroli
                brauzerga chiqmaydi, backend’da qoladi.
              </p>
```

- [ ] **Step 2: Service worker kommentlarini tuzating**

`frontend/public/sw.js:8`:

```js
 *   - Video CDN URL — bypass (signed URL TTL bor)
```

`frontend/public/sw.js:133`:

```js
  // Boshqa domain (CDN, video stream, API) — bypass
```

- [ ] **Step 3: Jamoa sahifasidan vendor nomini olib tashlang**

**Diqqat (Global Constraints):** vendor nomi ALMASHTIRILMAYDI, faqat OLIB TASHLANADI. Bu matn o'sha odamning tarixiy hissasini tasvirlaydi; "mkhls" deb yozish mkhls ishini (Plan 1-3) unga noto'g'ri yozib qo'yadi.

`frontend/src/app/team/page.tsx:114-119`:

```tsx
    details: {
      uz: 'Token-autentifikatsiyali HLS video pleer, videolar ichidagi quiz tizimi, progress tracking va skeletonlar.',
      en: 'Token-authenticated HLS video player, in-video quiz system, progress tracking, and skeletons.',
      ru: 'Токен-аутентифицированный HLS видеоплеер, система тестов внутри видео, отслеживание прогресса и скелетоны.'
    },
    stack: ['HLS.js', 'Video Stream', 'Skeleton CSS'],
```

- [ ] **Step 4: i18n matnlarini tuzating**

`frontend/src/utils/i18n/uz.ts:892`:

```ts
      'Video platformasining asosini yaratgan. Token-autentifikatsiyali HLS video pleer, videolar ichidagi quiz tizimi, qidiruv va filtrlash — bular Abduvorisning hissasi. Video yuklanish skeletoni va progress tracking ham uniki.',
```

`frontend/src/utils/i18n/ru.ts:868`:

```ts
      'Создал основу видео-платформы: token-authenticated HLS-плеер, quiz внутри видео, поиск и фильтрация. Также реализовал skeleton загрузки и tracking прогресса.',
```

`frontend/src/utils/i18n/en.ts:869`:

```ts
      'Built the core video platform: token-authenticated HLS player, in-video quizzes, search and filtering. Also implemented video loading skeletons and progress tracking.',
```

- [ ] **Step 5: Frontend manbasida "bunny" qolmaganini tasdiqlang**

```bash
cd aidevixBackend/frontend && grep -rni "bunny" src/ public/
```

Expected: hech qanday chiqish yo'q (bo'sh). `e2e/` ataylab tekshirilmaydi — u yerdagi urishlar "bunny yo'q" degan tasdiqlar.

- [ ] **Step 6: Frontend build o'tishini tasdiqlang**

```bash
cd aidevixBackend/frontend && npm run build
```

Expected: build muvaffaqiyatli tugaydi.

- [ ] **Step 7: Commit**

```bash
cd aidevixBackend
git add frontend/src/app/admin/settings/page.tsx frontend/public/sw.js frontend/src/app/team/page.tsx frontend/src/utils/i18n/uz.ts frontend/src/utils/i18n/ru.ts frontend/src/utils/i18n/en.ts
git commit -m "$(cat <<'EOF'
docs(ui): stop naming Bunny in admin settings, the SW and the team page

The admin settings card still told operators to configure
BUNNY_STREAM_API_KEY; it now lists the MKHLS_* variables the backend
actually reads.

The team page and i18n entries describe one person's historical
contribution, which genuinely was built on Bunny. Substituting "mkhls"
would credit them with the mkhls integration, which was Plans 1-3. The
vendor name is dropped instead and the contribution text stands.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Doimiy qo'riqchi test va to'liq tekshirish

Bu task tozalashni qulflaydi — Bunny'ning qaytib kirishi endi testni qizartiradi.

**Files:**
- Create: `backend/__tests__/no-bunny.test.js`

**Interfaces:**
- Consumes: Task 1-7 barcha Bunny izlarini olib tashlagan bo'lishi kerak
- Produces: hech narsa

- [ ] **Step 1: Qo'riqchi testni yozing**

Yangi fayl `backend/__tests__/no-bunny.test.js`:

```js
'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

// Bu yo'llar ATAYLAB tekshirilmaydi:
//  - docs/              — tarixiy spec, plan va HANDOFF yozuvlari, Bunny'ni
//                         nima uchun olib tashlaganimizni aynan shular tushuntiradi
//  - frontend/e2e/      — u yerdagi urishlar "bunny yo'q" degan TASDIQLAR
//  - backend/__tests__/ — xuddi shu sabab, va shu faylning O'ZI ham shu yerda:
//                         qo'riqchi o'z manbasidagi /bunny/i ni aybdor deb topardi
//  - .superpowers/      — gitignore'langan ijro ledgerlari
const IGNORED_PREFIXES = ['docs/', 'frontend/e2e/', 'backend/__tests__/', '.superpowers/'];

// Tozalash ATAYLAB uchta tushuntirish izohini qoldiradi. Ular Bunny'ning
// qaytishi emas — aksincha, u nima uchun ketgani va nima qoldirganini
// yozib qo'yadi. Ularni o'chirish haqiqiy ma'lumotni yo'qotardi:
//  - models/Video.js       — MongoDB'da qolgan `bunnyStatus_1` indeksini
//                            qo'lda qanday tushirish kerakligini aytadi
//  - videoController.js    — mkhls nima uchun oldindan slot talab qilmasligini
//                            eski tizim bilan solishtirib tushuntiradi
//  - admin/courses/[id]    — 6 daqiqalik polling timeout nima uchun olib
//                            tashlanganini tushuntiradi
const PROSE_ALLOWLIST = [
  'backend/models/Video.js',
  'backend/controllers/videoController.js',
  'frontend/src/app/admin/courses/[id]/page.tsx',
];

// Bular Bunny'ning HAQIQATAN qaytganini bildiradi: endpoint, config kaliti,
// modul yo'li yoki API yuzasi. Bularga allowlist TEGISHLI EMAS — istalgan
// faylda topilsa, bu xato.
const FORBIDDEN_IDENTIFIERS = [
  'bunnycdn',
  'mediadelivery.net',
  'BUNNY_STREAM_API_KEY',
  'BUNNY_LIBRARY_ID',
  'BUNNY_TOKEN_KEY',
  'utils/bunny',
  'bunnyVideoId',
  'BunnyPlayer',
  'bulkLinkBunny',
  'createBunnyVideo',
  'deleteBunnyVideo',
  'getBunnyVideoInfo',
  'streamUploadToBunny',
  'parseBunnyStatus',
  'generateSignedEmbedUrl',
];

const trackedFiles = () =>
  execFileSync('git', ['ls-files'], { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
    .split('\n')
    .filter(Boolean)
    .filter((file) => !IGNORED_PREFIXES.some((prefix) => file.startsWith(prefix)));

const readTracked = () => {
  const files = [];
  for (const file of trackedFiles()) {
    let contents;
    try {
      contents = fs.readFileSync(path.join(REPO_ROOT, file), 'utf8');
    } catch {
      continue; // binar yoki o'qib bo'lmaydigan fayl — e'tiborsiz
    }
    files.push([file, contents]);
  }
  return files;
};

// Qatlam 1 (qattiq): allowlist'siz — Bunny kodi/konfiguratsiyasining qaytishi.
const identifierOffenders = () =>
  readTracked()
    .filter(([, contents]) => FORBIDDEN_IDENTIFIERS.some((id) => contents.includes(id)))
    .map(([file]) => file);

// Qatlam 2 (yumshoq): yalang'och "bunny" so'zi — allowlist'dagi uch fayldan
// tashqari hech qayerda bo'lmasligi kerak.
const proseOffenders = () =>
  readTracked()
    .filter(([file, contents]) => /bunny/i.test(contents) && !PROSE_ALLOWLIST.includes(file))
    .map(([file]) => file);

describe('Bunny.net qoldiqlari', () => {
  it('hech qayerda Bunny kodi yoki konfiguratsiyasi yo\'q', () => {
    expect(identifierOffenders()).toEqual([]);
  });

  it('allowlist\'dan tashqarida "bunny" so\'zi yo\'q', () => {
    expect(proseOffenders()).toEqual([]);
  });

  it('utils/bunny.js moduli mavjud emas', () => {
    expect(fs.existsSync(path.join(REPO_ROOT, 'backend', 'utils', 'bunny.js'))).toBe(false);
  });

  it('sizib chiqqan kalitli fayl mavjud emas', () => {
    expect(fs.existsSync(path.join(REPO_ROOT, 'fetch_bunny.html'))).toBe(false);
  });
});
```

- [ ] **Step 2: Qo'riqchini ishga tushiring**

```bash
cd aidevixBackend/backend && npx jest __tests__/no-bunny.test.js
```

Expected: PASS, to'rtala test ham. Agar biror test yiqilsa, u aybdor fayllar ro'yxatini chiqaradi — o'sha fayllarni tegishli task qoidalariga ko'ra tozalang va qayta yuguring.

- [ ] **Step 3: Qo'riqchining IKKALA qatlamini ham sinang (testni test qiling)**

Ikkala qatlam alohida sinaladi, chunki ular boshqa-boshqa narsani ushlaydi.

Qatlam 2 (yalang'och so'z, allowlist'da bo'lmagan faylda):

```bash
cd aidevixBackend
echo "// bunny" >> backend/utils/mkhls.js
cd backend && npx jest __tests__/no-bunny.test.js; cd ..
git checkout backend/utils/mkhls.js
```

Expected: **FAIL** — `"bunny" so'zi yo'q` testi `backend/utils/mkhls.js` ni ko'rsatadi.

Qatlam 1 (taqiqlangan identifikator, ALLOWLIST'dagi faylda — allowlist uni qutqarmasligi kerak):

```bash
cd aidevixBackend
echo "// bunnyVideoId" >> backend/models/Video.js
cd backend && npx jest __tests__/no-bunny.test.js; cd ..
git checkout backend/models/Video.js
```

Expected: **FAIL** — `Bunny kodi yoki konfiguratsiyasi yo'q` testi `backend/models/Video.js` ni ko'rsatadi, garchi u allowlist'da bo'lsa ham. Bu allowlist qattiq qatlamni teshib o'tmasligini isbotlaydi.

Ikkala `git checkout` dan keyin fayllar asl holiga qaytadi.

- [ ] **Step 4: `git status` toza ekanini tasdiqlang**

```bash
cd aidevixBackend && git status --short
```

Expected: faqat `backend/__tests__/no-bunny.test.js` yangi fayl sifatida. `backend/utils/mkhls.js` o'zgargan bo'lmasligi kerak — bo'lsa, 3-qadamdagi `git checkout` ishlamagan, uni qayta bajaring.

- [ ] **Step 5: Butun backend to'plamini ishga tushiring**

```bash
cd aidevixBackend/backend && npm test
```

Expected: PASS — barcha fayllar yashil.

- [ ] **Step 6: Typecheck darvozasini ishga tushiring**

```bash
cd aidevixBackend && bash .superpowers/sdd/2026-08-10-plan3-frontend-player-admin/typecheck-gate.sh
```

Expected: PASS. **Eslatma:** `npm run typecheck` va `npm run build` tur xatosida qizarmaydi (`noCheck: true`), shuning uchun yagona ishonchli darvoza shu. Agar skript topilmasa, `.superpowers/` gitignore'langan bo'lgani uchun boshqa mashinada yo'q bo'lishi mumkin — bu holda buni yozib qoldiring va o'tkazib yuboring.

- [ ] **Step 7: e2e testlarni spec-boshiga ishga tushiring**

```bash
taskkill //IM chrome.exe //F
cd aidevixBackend/frontend && npx playwright test e2e/admin-videos.spec.ts
```

so'ng alohida:

```bash
taskkill //IM chrome.exe //F
cd aidevixBackend/frontend && npx playwright test e2e/videos-stream.spec.ts
```

Expected: ikkalasi ham o'z-o'zicha yashil. Xususan `admin-videos.spec.ts` dagi "tools sahifasida bulk Bunny bo'limi yo'q" va `videos-stream.spec.ts` dagi "kutish ekranida Bunny.net so'zi yo'q" testlari o'tishi kerak. **Hech qachon to'liq to'plamni bir yugurishda ishlatmang** — `STATUS_DLL_INIT_FAILED` bilan qulaydi (Global Constraints).

- [ ] **Step 8: Backend haqiqiy stack'da ko'tarilishini tasdiqlang**

`require` tekshiruvi modul yo'qligini ushlaydi, lekin haqiqiy ishga tushirishni emas. Stack'ni ko'taring:

```bash
cd aidevixBackend
docker compose -f docker-compose.dev.yml up -d
cd backend && npm run dev
```

Alohida terminalda:

```bash
curl -s http://localhost:5000/health
```

Expected: `/health` javob beradi va backend logida `Cannot find module '../utils/bunny'` kabi hech qanday xato yo'q.

**Ikkita ma'lum tuzoq (HANDOFF):** (1) konteynerlar `healthy` bo'lgandan darhol keyin `npm run dev`ning BIRINCHI ishga tushishi `Server selection timed out after 5000 ms` bilan qulashi mumkin — `touch backend/index.js` bilan qayta ishga tushiring, ikkinchi safar ulanadi; bu har nodemon restartida takrorlanishi mumkin. (2) Node jarayonlari to'planib qolsa tuzatishlar kuchga kirmaydi — `taskkill //IM node.exe //F`, so'ng qaytadan ko'taring.

**Bu qadam nimani isbotlamaydi:** to'liq yuklash → transcode → tokenli HLS zanjiri bu yerda qayta o'lchanmaydi. U Plan 3 Task 8'da haqiqiy stack'da uchidan-uchigacha tasdiqlangan va bu bosqich oqim yo'liga umuman tegmaydi — faqat o'lik Bunny kodini olib tashlaydi.

- [ ] **Step 9: Yakuniy repo skani**

```bash
cd aidevixBackend && git ls-files | xargs grep -iln "bunny" 2>/dev/null
```

Expected: faqat to'rt guruh —

1. `docs/` ichidagi tarixiy yozuvlar (spec, plan, HANDOFF)
2. `frontend/e2e/` dagi ikkita spec — yo'qlikni tasdiqlaydi
3. `backend/__tests__/` dagi test fayllari (`no-bunny.test.js`, `admin.routes.test.js`, `video.routes.test.js`) — xuddi shu sabab
4. Qo'riqchining `PROSE_ALLOWLIST` idagi **aynan uchta** fayl: `backend/models/Video.js`, `backend/controllers/videoController.js`, `frontend/src/app/admin/courses/[id]/page.tsx`

To'rtinchi guruhning har biri bitta tushuntirish izohi — Bunny nima qoldirgani yoki nima uchun ketgani haqida. Ularni tekshiring: agar biror faylda izohdan boshqa narsa (kod, config, import) bo'lsa, bu xato.

`backend/routes/`, `backend/config/`, `backend/utils/`, `frontend/public/`, `frontend/src/` ning qolgan qismi yoki repo ildizidan bitta ham fayl chiqmasligi kerak. `.playwright-cli/` dan ham hech narsa chiqmasligi kerak (Task 1 ikkitasini o'chirdi).

- [ ] **Step 10: `test-gemini.js` hali joyida ekanini oxirgi marta tasdiqlang**

```bash
cd aidevixBackend && ls test-gemini.js && git log --oneline -1 -- test-gemini.js
```

Expected: fayl mavjud va oxirgi commit shu ish boshlangunga qadar bo'lgan commit — ya'ni bu bosqichda unga tegilmagan.

- [ ] **Step 11: Commit**

```bash
cd aidevixBackend
git add backend/__tests__/no-bunny.test.js
git commit -m "$(cat <<'EOF'
test: guard against Bunny creeping back in

Scans every tracked file outside docs/ and frontend/e2e/ for the word
bunny and fails if it finds one. Those two directories are excluded on
purpose: docs/ is where the removal is explained, and the e2e specs
assert the absence.

Verified the guard actually bites by appending a bunny comment to
utils/mkhls.js and watching it fail before reverting.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Bosqich tugagandan keyin

Bu reja HANDOFF'ni yangilashni O'Z ICHIGA OLMAYDI — buni bosqich tugagach alohida qadam sifatida bajaring. HANDOFF'ga yozilishi shart bo'lgan narsalar:

1. **`test-gemini.js` va undagi ikkita Gemini kaliti** hali public repo'da — foydalanuvchi keyinga qoldirgan ochiq band.
2. **Bunny API kaliti hali bekor qilinmagan bo'lishi mumkin** — `dash.bunny.net` → Stream → library `621910`. Kodni o'chirish kalitni ishlamas qilmaydi.
3. **DB'da `bunnyVideoId`/`bunnyStatus` ma'lumoti va `bunnyStatus_1` indeksi qoldi** — migratsiya ataylab qilinmadi.
4. **Yangi qo'riqchi test** `backend/__tests__/no-bunny.test.js` — `docs/` va `frontend/e2e/` istisno.
5. **Xatti-harakat o'zgarishi:** `bunnyVideoId` tashigan eski video o'chirilganda Bunny tomonda yetim yozuv qoladi.
6. Bosqich 9 (deploy) uchun **CORS placeholder** hali qattiq blokator — HANDOFF'da allaqachon yozilgan, o'chirib yubormang.

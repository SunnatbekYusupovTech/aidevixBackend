# Bosqich 8 — xavfsizlik tozalash (Bunny qoldiqlarini olib tashlash)

**Sana:** 2026-08-11
**Holat:** dizayn tasdiqlangan, ijro rejasi kutilmoqda
**Oldingi kontekst:** `docs/superpowers/HANDOFF.md`, `docs/superpowers/specs/2026-08-05-video-streaming-mkhls-design.md` (rev. 4)

---

## 1. Nima uchun

Bosqich 1-7 video oqimini Bunny.net Stream'dan o'z-o'zida joylashgan mkhls'ga
ko'chirdi. Ko'chirish tugagan, lekin Bunny **kodi, model maydonlari, endpointlari,
API hujjati va bir martalik debug skriptlari** repo'da qolib ketgan. Repo
**public** (`github.com/SunnatbekYusupovTech/aidevixBackend`), shuning uchun bu
shunchaki tartibsizlik emas — ichida qattiq yozilgan API kaliti bor fayl ham bor.

## 2. Kashfiyot — HANDOFF ro'yxatidan kattaroq

HANDOFF bosqich 8 uchun to'rtta band sanagan edi (`utils/bunny.js`,
model maydonlari, `bulk-link`, `fetch_bunny.html`). Haqiqiy yuza 31 faylga
tarqalgan. Kontekst o'rganish paytida qo'shimcha topilgan, HANDOFF'da yo'q
bandlar:

### 2.1 Sizib chiqqan sirlar

| Fayl | Sir | Holat |
|---|---|---|
| `fetch_bunny.html` | Bunny API kaliti `164b15f1-…` + library `621910` | `origin/main`da jonli, public |
| `test-gemini.js` | Ikkita Google Gemini kaliti `AIzaSyDm-…` | `origin/main`da jonli, public |

Ikkala fayl ilgari `ed45137` ("fix(audit): … remove leaked-secret debug files")
commit'ida o'chirilgan edi, **lekin u commit `origin/claude/project-toliq-audit-r2nmzk`
branchida qolib ketgan va hech qachon `main`ga merge qilinmagan**. Shuning uchun
ikkalasi ham bugun ham ishchi daraxtda va `origin/main`da turibdi.

`fetch_bunny.html` shu bosqichda o'chiriladi. `test-gemini.js` foydalanuvchi
qarori bilan **tegilmaydi** (§7).

### 2.2 Qo'shimcha o'lik kod

- `GET /api/videos/:id/upload-credentials` — allaqachon mkhls'ga o'tgan, lekin
  frontend uni `adminApi.ts`da import qilib **hech qachon chaqirmaydi**.
- `checkVideoStatus` javobidagi `bunnyStatus` ko'zgusi — frontend faqat
  `streamStatus` o'qiydi (`admin/courses/[id]/page.tsx`), ya'ni ko'zgu o'lik.
- `swagger.js` — `BunnyPlayer` schemasi va `bunnyVideoId`/`bunnyStatus` maydon
  ta'riflari API hujjatini yolg'on qilib turibdi (haqiqiy javob `hlsUrl` bilan).

### 2.3 Bunny ijro yo'li allaqachon yo'q

`generateSignedEmbedUrl`, `createBunnyVideo`, `streamUploadToBunny`,
`getUploadCredentials` hech qayerdan chaqirilmaydi. `utils/bunny.js`ning
7 eksportidan faqat 3 tasi jonli:

- `deleteBunnyVideo` → `videoController.deleteVideo` ichida
- `getBunnyVideoInfo` + `parseBunnyStatus` → `adminController.bulkLinkBunny` ichida

**Natija:** eski Bunny videolari bugun ham o'ynamaydi. Bunny'ni o'chirish
foydalanuvchiga ko'rinadigan ijro xatti-harakatini o'zgartirmaydi.

## 3. Qamrov

Bunny **butunlay** olib tashlanadi: kod, model maydonlari, endpointlar, hujjat,
bir martalik skriptlar. MongoDB'ga tegilmaydi.

### 3.1 Backend

| Fayl | O'zgarish |
|---|---|
| `backend/utils/bunny.js` | Butun fayl o'chiriladi |
| `backend/controllers/videoController.js:10-17` | `require('../utils/bunny')` import bloki o'chiriladi |
| `backend/controllers/videoController.js:507-513` | `deleteVideo` ichidagi Bunny tozalash bloki o'chiriladi |
| `backend/controllers/videoController.js:871` | `bunnyStatus: video.streamStatus` ko'zgusi |
| `backend/controllers/videoController.js:897-899` | `bunnyStatus: info.status` ko'zgusi + izohi |
| `backend/controllers/videoController.js:702` | `getUploadCredentialsForVideo` funksiyasi o'chiriladi |
| `backend/controllers/videoController.js:1051` | Eksport ro'yxatidan `getUploadCredentialsForVideo` |
| `backend/controllers/videoController.js:20, 380-381, 698` | Bunny'ga ishora qiluvchi kommentlar/sarlavhalar mkhls'ga moslanadi |
| `backend/routes/videoRoutes.js:16` | Import ro'yxatidan `getUploadCredentialsForVideo` |
| `backend/routes/videoRoutes.js:56` | `GET /:id/upload-credentials` route o'chiriladi |
| `backend/routes/videoRoutes.js:53, 58` | "Bunny.net endpoints" sarlavhasi va "Bunny'ga oqizadi" kommenti tuzatiladi |
| `backend/controllers/adminController.js:364-405` | `bulkLinkBunny` funksiyasi o'chiriladi (JSDoc qatoridan yopuvchi `};` gacha) |
| `backend/controllers/adminController.js:712` | Eksport ro'yxatidan `bulkLinkBunny` |
| `backend/routes/adminRoutes.js:7` | Import ro'yxatidan `bulkLinkBunny` |
| `backend/routes/adminRoutes.js:69` | `POST /videos/bulk-link` route o'chiriladi |
| `backend/models/Video.js:48-60` | `bunnyVideoId` va `bunnyStatus` maydonlari + izohi |
| `backend/models/Video.js:96` | `videoSchema.index({ bunnyStatus: 1 })` |

O'chiriladigan bir martalik skriptlar:

- `fetch_bunny.html` (repo ildizi — **qattiq yozilgan kalit bilan**)
- `list-bunny-videos.js` (repo ildizi)
- `backend/check_bunny_video.js`
- `backend/list_bunny_videos_final.js`
- `backend/scripts/link-bunny.js`

**Yagona xatti-harakat o'zgarishi:** `bunnyVideoId` tashigan eski video
o'chirilganda endi Bunny tomonda yetim yozuv qoladi (backend endi Bunny'ga
DELETE yubormaydi). Bunny'dan butunlay voz kechilgani uchun bu qabul qilinadi.

### 3.2 Frontend

| Fayl | O'zgarish |
|---|---|
| `frontend/src/api/adminApi.ts:34` | `getUploadCredentials` funksiyasi o'chiriladi |
| `frontend/src/app/admin/courses/[id]/page.tsx:7` | Import ro'yxatidan `getUploadCredentials` (chaqiruv yo'q, faqat import) |
| `frontend/src/app/admin/settings/page.tsx:68-74` | Bunny kartasi mkhls kartasiga almashtiriladi |
| `frontend/public/sw.js:8, 133` | Kommentlarda "Bunny" → vendor-neytral "video CDN" |
| `frontend/src/app/team/page.tsx:115-119` | Vendor nomi olib tashlanadi (pastda) |
| `frontend/src/utils/i18n/uz.ts:892`, `ru.ts:868`, `en.ts:869` | Xuddi shunday |

**Admin settings kartasining yangi mazmuni** — haqiqiy mkhls o'zgaruvchilari
(`backend/.env.example:69-76` dan olingan): `MKHLS_BASE_URL`, `MKHLS_PUBLIC_URL`,
`MKHLS_ADMIN_USERNAME`, `MKHLS_ADMIN_PASSWORD`, `MKHLS_NAMESPACE`,
`MKHLS_STREAM_TOKEN_TTL`. Karta sarlavhasi "mkhls Stream". Matn yuklash
yo'lini to'g'ri tasvirlashi kerak: admin kurs sahifasida video yaratiladi,
so'ng fayl backend proxy'siga (`PUT /api/videos/:id/upload-proxy`) yuboriladi —
mkhls admin paroli backend'da qoladi.

**`team/page.tsx` va i18n matnlari — ehtiyotkorlik bilan.** Bu matn jamoa
a'zosining **tarixiy hissasini** tasvirlaydi, texnik qoldiq emas: o'sha ish
haqiqatan Bunny ustida qilingan. "Bunny.net" ni "mkhls" ga almashtirish uni
noto'g'ri odamga yozib qo'ygan bo'lardi — mkhls integratsiyasi Plan 1-3'da
qilingan. Shuning uchun **vendor nomi shunchaki olib tashlanadi**, hissa tavsifi
saqlanadi: "token-autentifikatsiyali HLS video pleer, videolar ichidagi quiz
tizimi, qidiruv va filtrlash". `stack` massividan `'Bunny.net'` elementi
chiqariladi, qolgan `'HLS.js'`, `'Video Stream'`, `'Skeleton CSS'` qoladi.

### 3.3 API hujjati

`backend/config/swagger.js`:

- `BunnyPlayer` schemasi → `StreamPlayer`, haqiqiy javob shakli bilan.
  `videoController.js:196-199` dagi haqiqiy ob'ekt:
  ```js
  player = { type: 'hls', hlsUrl: mkhls.buildHlsUrl(streamPath, token), expiresAt }
  ```
  Ya'ni schema `type` (`'hls'`), `hlsUrl` (tokenli master playlist URL) va
  `expiresAt` maydonlariga ega bo'lishi kerak. Eski `embedUrl` va uning
  `<iframe>` misoli olib tashlanadi — frontend endi `<iframe>` ishlatmaydi,
  Vidstack + hls.js orqali o'ynatadi.
- `Video` schemasidan `bunnyVideoId` (526) va `bunnyStatus` (531) maydonlari.
- `VideoResponse` (634) va `VideoLink` (589) dagi `BunnyPlayer` havolalari
  `StreamPlayer` ga yangilanadi.
- 29-30 va 54-55 qatorlardagi "Video tizimi (Bunny.net) … Bunny.net Stream
  orqali uzatiladi" matnlari (uz va ru) mkhls haqiqatiga moslanadi.

`backend/.env.example:87-105` — butun Bunny bo'limi (`BUNNY_STREAM_API_KEY`,
`BUNNY_LIBRARY_ID`, `BUNNY_TOKEN_KEY`, izohli `BUNNY_STORAGE_CDN_BASE`)
o'chiriladi. 89-qatordagi "MKHLS_* orqali ishlaydi. Keyingi relizda migration
bilan o'chiriladi" izohi ham ketadi.

### 3.4 Testlar

- `backend/__tests__/integration/video.routes.test.js:16` —
  `jest.mock('../../utils/bunny')` **o'chirilishi shart**, aks holda modul
  topilmay butun to'plam yiqiladi.
- Xuddi shu faylning 435-qatoridagi
  `expect(projection).not.toMatch(/bunnyVideoId/)` **saqlanadi** — arzon
  regressiya himoyasi.
- Mavjud e2e himoyalari saqlanadi va ular endi kuchliroq bo'ladi:
  `admin-videos.spec.ts:166-169` (tools sahifasida bulk Bunny yo'q),
  `videos-stream.spec.ts:244-252` (kutish ekranida "bunny" so'zi yo'q).

## 4. Tekshirish

1. `cd backend && npm test` — jest to'plami yashil. `jest.mock` o'chirilgani
   uchun bu birinchi navbatda tekshiriladigan narsa.
2. Typecheck darvozasi —
   `.superpowers/sdd/2026-08-10-plan3-frontend-player-admin/typecheck-gate.sh`
   (HANDOFF §"101 tur xatosi": repo'da `noCheck: true` bor, shuning uchun
   `npm run build` va `npm run typecheck` tur xatosida **hech qachon
   qizarmaydi** — faqat shu skript ishonchli).
3. `cd frontend && npm run build` — build o'tishi (o'chirilgan import'lar
   tufayli sinmasligi).
4. e2e — **spec-boshiga**, hech qachon bitta to'liq to'plam yugurishi emas
   (HANDOFF §"Test-muhit tuzoqlari": to'liq to'plam worker'larni
   `STATUS_DLL_INIT_FAILED` bilan qulatadi, bu test natijasi emas). Har
   yugurishdan oldin `taskkill //IM chrome.exe //F`.
   Kerakli spec'lar: `admin-videos.spec.ts`, `videos-stream.spec.ts`.
5. Yakuniy skan: `git ls-files | xargs grep -il bunny` — qolgan yagona
   urishlar `docs/` ichidagi tarixiy yozuvlar (spec, plan, HANDOFF) bo'lishi
   kerak, ilova kodida bitta ham emas.
6. Bunny kodi olib tashlangandan keyin backend hali ham ko'tarilishi va
   `GET /api/videos/:id` tokenli `hlsUrl` qaytarishi — lokal stack'da
   (HANDOFF §"Lokal muhitni ko'tarish"; Mongo timeout tuzog'i har nodemon
   restart'ida takrorlanadi, `touch backend/index.js` bilan yechiladi).

## 5. Qamrovdan tashqari — ataylab

- **`test-gemini.js` va undagi ikkita Gemini kaliti.** Foydalanuvchi qarori:
  ish yakunlangandan keyin o'zi hal qiladi. Fayl va kalitlar tegilmaydi.
- **Ildizdagi boshqa bir martalik skriptlar:** `add-git-instructions.js`,
  `fix-routers.js`, `migrate-frontend.js`, `test_logic.js`. Sir skani ularda
  hech narsa topmadi.
- **Git tarixini qayta yozish.** Qilinmaydi. Kalit public repo'da bo'lgani
  uchun `filter-repo` + force-push sizishni orqaga qaytarmaydi (fork, klon,
  GitHub keshi, scraper'lar), lekin 58 ta push qilinmagan commit'ni xavf
  ostiga qo'yadi va barcha klonlarni buzadi. Yagona samarali chora — kalitni
  bekor qilish (§7).
- **MongoDB migratsiyasi.** Qilinmaydi. `bunnyVideoId`/`bunnyStatus`
  ma'lumoti va `bunnyStatus_1` indeksi bazada qoladi. Mongoose `strict`
  rejimi ularni o'qishda ham, yozishda ham ko'rmaydi, shuning uchun zararsiz —
  lekin **kelajakdagi kishi uchun chalg'ituvchi qoldiq**, HANDOFF'ga
  yozilishi shart.

## 6. Xavflar

| Xavf | Yumshatish |
|---|---|
| `jest.mock('../../utils/bunny')` unutilsa butun jest to'plami yiqiladi | Tekshirish qadam 1 aynan shundan boshlanadi |
| `getUploadCredentialsForVideo` eksport/import zanjiri uch faylga tarqalgan (controller, routes) — bittasi unutilsa server ko'tarilmaydi | Tekshirish qadam 6 backend'ni haqiqatan ko'taradi |
| `swagger.js` katta va `BunnyPlayer` unga uch joydan havola qilinadi | `$ref` larni nom bo'yicha skanlash, qadam 5 |
| e2e "bunny yo'q" testlari yolg'on yashil bo'lishi | Ular allaqachon bor va o'zgartirilmaydi; ular tozalashni tasdiqlaydi, o'lchamaydi |

## 7. Foydalanuvchi tomonidagi ish (kod bloklamaydi)

`dash.bunny.net` → Stream → Library `621910` → **API Key'ni bekor qilish yoki
almashtirish**. Kodni o'chirish kalitni ishlamas qilmaydi: u public repo
tarixida qoladi va bekor qilinmaguncha kimdir library'ga video yuklashi,
o'chirishi yoki trafik sarflashi mumkin.

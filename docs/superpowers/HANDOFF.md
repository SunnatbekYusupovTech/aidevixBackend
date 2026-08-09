# Handoff — video streaming, Plan 3 ga o'tish

**Sana:** 2026-08-10
**Holat:** 3-5 bosqich tugadi, uchdan-uchgacha tekshirildi. Keyingisi — Plan 3
(frontend player va admin panel, spec 6-7 bosqich).

---

## Avval nimani o'qish kerak

| Fayl | Nima uchun |
|---|---|
| `docs/superpowers/specs/2026-08-05-video-streaming-mkhls-design.md` | **rev. 3.** Yagona haqiqat manbai. §6 (B1-B5), §15, §16 ni albatta o'qing. |
| `docs/superpowers/plans/2026-08-10-aidevix-mkhls-backend.md` | Tugagan reja (3-5 bosqich, Task 1-13). Plan 3 uchun namuna. |
| `.superpowers/sdd/2026-08-10-aidevix-mkhls-backend/progress.md` | Ijro ledgeri — har bir topilma, qaror va kechiktirilgan band. |
| `.superpowers/sdd/2026-08-10-aidevix-mkhls-backend/task-13-report.md` | Shu tekshiruvning to'liq dalili: ikkala konfiguratsiya bilan uchdan-uchgacha ishlash, ikkala test to'plami, topilgan va tuzatilgan xatolik. |

Ledger'dagi muhim narsalar spec rev.3 ga ko'chirilgan, shuning uchun **spec yetarli**
kundalik ishlash uchun. Ledger faqat "nima uchun shunday qaror qilingan" kerak bo'lganda.

---

## Ikkita repo

| Repo | Branch | Holat |
|---|---|---|
| `AiDeVix/mkhls-streamer` | `feat/vod-local-pipeline` | Task 13 oxirida `f2dfd1e`. Push hali **bloklangan** (`origin` push URL — `PUSH-DISABLED--fork-qiling-spec-5-bolim` sentinel). Claude trailer'siz commitlar. |
| `AiDeVix/aidevixBackend` | `docs/spec-video-streaming-rev2` | `main`dan 27+ commit oldinda, hali merge qilinmagan. Har bir commit `Co-Authored-By: Claude Opus 5 (1M context)` trailer bilan. |

mkhls Aidevix repo'sining **ichida emas, yonida** — spec'ning "mijoz, klonuvchi emas"
qoidasi. Bu qoida saqlanishi kerak.

---

## Lokal muhitni ko'tarish

```bash
cd aidevixBackend
docker compose -f docker-compose.dev.yml down -v   # toza boshlash uchun (Mongo volume o'chadi)
rm -rf .data/media/aidevix .data/cache/vod
export MKHLS_VOD_TRANSCODE_ON_UPLOAD=true           # yoki false — pastga qarang
docker compose -f docker-compose.dev.yml up -d --build
cd backend && node scripts/seed-dev-user.js && npm run dev
```

- `http://localhost:8080` — mkhls admin (`admin` / config'dagi parol)
- `http://localhost:5000/health` — backend health
- Seed tokenlari **15 daqiqa** yashaydi — muddati o'tsa qayta ishga tushiring
- **`.env`ni o'zgartirsangiz backend'ni qayta ishga tushiring.** `nodemon` faqat
  `js/mjs/cjs/json` kengaytmalarini kuzatadi, `.env` emas — fayl o'zgargani bilan
  jarayon eski qiymatni xotirada saqlab qoladi. Task 13 buni jonli namoyish qildi
  (pastga qarang, "MKHLS_TRANSCODE_ON_UPLOAD" bandi).
- **`MKHLS_VOD_TRANSCODE_ON_UPLOAD`** (konteyner) va **`MKHLS_TRANSCODE_ON_UPLOAD`**
  (`backend/.env`) **doim bir xil qiymatda bo'lishi shart.** Ikkalasi ham `true` bo'lsa —
  ikkala tomon ham navbatga qo'yishga urinadi (mkhls'ning dublikat-guard'i faqat hali
  pending/running job'ni bloklaydi — orada tugab qolgan job'ni bloklamaydi). Ikkalasi
  ham `false` bo'lsa (yoki biri eski qiymatni xotirada saqlab qolgan bo'lsa) — **hech kim
  navbatga qo'ymaydi**: video mkhls'da darhol `status:"ready"` (JIT oqim uchun "tayyor",
  pre-transcode ma'nosida emas) deb belgilanadi, `duration:0`, `transcode:null` qoladi va
  haqiqiy `master.m3u8` so'rovi **404 qaytaradi** — API "tayyor" deydi, pleer ishlamaydi.
  Task 13 buni aynan shu sabab bilan (`.env` tahrirlangandan keyin backend qayta ishga
  tushirilmagan edi) jonli reproduksiya qildi.

---

## Plan 3 boshlashdan oldin bilish shart

### Backend shartnomalari (o'zgarmasligi kerak, Plan 3 shularga moslashadi)

1. **`positionSeconds` — yagona to'g'ri nom.** Backend eski `watchedSeconds` nomini
   ham qabul qiladi (`enrollmentController.js:64`, `positionSeconds ?? watchedSeconds`),
   lekin **faqat bitta reliz uchun**. Frontend'dagi ikkala chaqiruv nuqtasi ko'chirilishi
   kerak:
   - `frontend/src/app/videos/[id]/page.tsx:147`
   - `frontend/src/app/videos/[id]/playground/page.tsx:217`

2. **`GET /videos/:id/link-bunny` endpointi endi yo'q.** O'rniga
   `PATCH /videos/:id/link-stream` bilan `{ streamPath }` (bunnyVideoId emas). Eski nomni
   hali chaqirayotgan joylar:
   - `frontend/src/api/adminApi.ts:36` (`linkVideoToBunny`)
   - `frontend/src/app/admin/courses/[id]/page.tsx:254`

   `backend/scripts/link-bunny.js` bunga aloqasi yo'q — u Mongo'ga to'g'ridan-to'g'ri
   yozadi, HTTP orqali emas.

3. **`bunnyStatus` — ataylab qoldirilgan ko'zgu, doimiy emas.** Admin panel hozir
   `bunnyStatus`ni o'qiydi; `checkVideoStatus` va `createVideo`/`getVideo` javoblari uni
   `streamStatus`dan hisoblab (mirror) qo'shadi — model'dagi haqiqiy `bunnyStatus` maydoni
   esa faqat eski Bunny yozuvlarida ishlatiladi. Plan 3 admin panelni `streamStatus`ga
   o'tkazadi va bu ko'zguni butunlay olib tashlaydi.

4. **Progress foizi yo'q.** `transcode.presetsDone` / `presetsTotal` — mkhls'dan keladigan
   yagona real progress ko'rsatkichlari (`presets_done`/`presets_total`). mkhls
   `progress_percent`ni hech qachon oshirmaydi (0 dan 100ga sakraydi), shuning uchun bu
   maydon ataylab client'ga chiqarilmagan. Admin panel progress UI'ni shu ikkitaga
   qurishi kerak — foiz emas.

5. **`GET /api/videos/:id` javob shakli:**
   ```json
   {
     "video": { /* streamPath YO'Q — provayder identifikatori tashqariga chiqmaydi */ },
     "player": { "type": "hls", "hlsUrl": "...", "expiresAt": "..." } | null,
     "progress": { "lastPositionSeconds": 2.5 } | null,
     "streamStatus": "pending" | "processing" | "ready" | "failed"
   }
   ```
   `player: null` — "tayyorlanmoqda" holati (frontend hozir buni to'g'ri ishlaydi).
   mkhls o'chgan bo'lsa `player:null` bilan 200 emas, **503** qaytadi (spec §11) — 200
   "tayyorlanmoqda" deb yolg'on aytardi.

### Task 13'da topilgan va tuzatilgan narsa

`GET /api/videos/top` (autentifikatsiyasiz endpoint, `frontend/src/app/page.tsx` bosh
sahifa uchun chaqiradi) `.lean()`ni proyeksiyasiz ishlatardi va shu bilan **har bir video
maydonini**, jumladan `streamPath`ni (provayder yo'li — spec §10.4 bo'yicha maxfiy) va
eskirgan `bunnyVideoId`/`bunnyStatus`ni ochiq qaytarardi. Bu funksiya migratsiyaning
o'n ikkita task'idan birortasi tomonidan o'zgartirilmagan edi — Task 6 `streamPath`
maydonini schema'ga qo'shgach, bu eski, betaraf endpoint uni avtomatik oqiza boshladi.
Aynan shu turdagi xatolik uchun Task 13 mavjud: birorta ham alohida task review buni
ko'ra olmasdi. `.select(...)` bilan tuzatildi (`getCourseVideos`dagi xavfsiz maydon
ro'yxati bilan bir xil). Batafsil: `task-13-report.md`.

### Boshqa narsalarga tegmang

- `bunny.js` **o'chirilmagan, deprecated.** `videoController.js`da faqat eski
  `deleteVideo` yo'lida (`deleteBunnyVideo`, best-effort) va `adminController.js`ning
  `bulkLinkBunny`sida ishlatiladi. Qolgan import'lar (`createBunnyVideo`,
  `getBunnyVideoInfo`, `generateSignedEmbedUrl`, `streamUploadToBunny`) o'lik — Plan 3
  ulardan foydalanmasin, faqat o'chirsin (xavfsizlik tozalash, spec 8-bosqich, Plan 3
  qamrovida emas, lekin ko'rsangiz eslab qo'ying).
- mkhls `DeleteVideo` faqat DB yozuvini o'chiradi — manba fayl va cache disk'da qoladi
  (spec §15.3, "9-bosqich tashvishi"). Bu Plan 3 qamrovida emas.

---

## Plan 3 qamrovi (spec 6-7 bosqich)

| # | Bosqich | Natija |
|---|---|---|
| 6 | Frontend player | `components/videos/LessonPlayer.tsx` (yangi) + `page.tsx` + Redux slice/types — `positionSeconds`ga o'tish, resume seek, throttled progress, token yangilash |
| 7 | Admin panel | `bunnyStatus` → `streamStatus` nomlash, `link-bunny` → `link-stream`, transcode progressi (`presetsDone`/`presetsTotal`, foizsiz) |

1-5 bosqich (mkhls upstream, backend client/model/controller, bug fixlar) — tugadi va
tekshirildi. 8 (xavfsizlik tozalash) va 9 (deploy) Plan 3'dan keyin, alohida.

---

## Ishlash uslubi (o'tgan ikki safar yaxshi ishladi)

`superpowers` skill'lari: brainstorming → writing-plans → subagent-driven-development.

Ikkita narsa aynan qimmat bo'ldi, saqlang:

- **Har taskda qo'lda uchdan-uchgacha tekshirish.** Container'da haqiqiy fayl bilan
  ishlatish — nima unit test va code review tutolmaydigan narsani ochadi. Bu Plan'da
  ham (Task 5: mock fixture'lar noto'g'ri edi; Task 13: `.env` o'zgarishi backend'ni
  qayta ishga tushirmasdan qo'llanmasligi) haqiqiy xatoliklarni ochdi.
- **Butun-branch review oxirida, alohida.** Plan 1-2'da u ma'lumot yo'qolishi bug'ini
  topdi — to'qqizta alohida task review'i o'tkazib yuborgan edi, chunki har bir task
  alohida to'g'ri edi. Bu Plan'da Task 13 xuddi shunday `videos/top` provayder-yo'l
  sizib chiqishini topdi: hech qaysi alohida task uni buzmagan, ammo birgalikda kombinatsiya
  buzgan. Plan 3 oxirida ham xuddi shu tarzda alohida whole-branch review rejalashtiring —
  implementator o'z branch'ini review qilmasin.

---

## Yangi suhbatni shu bilan boshlang

> `aidevixBackend/docs/superpowers/HANDOFF.md` ni o'qing va Plan 3 ga o'ting.

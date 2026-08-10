# Handoff — video streaming, Plan 3 ga o'tish

**Sana:** 2026-08-10
**Holat:** 3-5 bosqich tugadi, uchdan-uchgacha tekshirildi. Shundan keyin alohida
butun-branch review o'tkazildi (verdikt: DO NOT MERGE, to'rtta chok-orasidagi topilma —
birorta ham alohida task review buni ko'ra olmagan) va bitta tuzatish to'lqini
(`8611d95`, `c08083f`, `baec28b`) hammasini yopdi hamda qayta jonli tekshirdi. Bu hujjat
dastlab `55924fb`da yozilgan edi — o'sha uchta commit undan keyin keldi va bir nechta
bandni eskirtirdi; hammasi pastda yangilangan. Keyingisi — Plan 3 (frontend player va
admin panel, spec 6-7 bosqich).

---

## Avval nimani o'qish kerak

| Fayl | Nima uchun |
|---|---|
| `docs/superpowers/specs/2026-08-05-video-streaming-mkhls-design.md` | **rev. 3.** Yagona haqiqat manbai. §6 (B1-B5), §14, §15, §16 ni albatta o'qing. |
| `docs/superpowers/plans/2026-08-10-aidevix-mkhls-backend.md` | Tugagan reja (3-5 bosqich, Task 1-13). Task 8'dagi "faqat bitta tomon navbatga qo'yadi" bandi endi bekor qilingan (pastga qarang) — asl matn chizib qo'yilgan, o'chirilmagan, sabab bilan birga o'qilsin. Plan 3 uchun namuna. |
| `.superpowers/sdd/2026-08-10-aidevix-mkhls-backend/progress.md` | Ijro ledgeri — har bir topilma, qaror va kechiktirilgan band. Oxirgi bo'lim ("Final whole-branch review (opus) + fix wave") shu hujjatning manbasi. |
| `.superpowers/sdd/2026-08-10-aidevix-mkhls-backend/final-fix-report.md` | So'nggi tuzatish to'lqinining to'liq dalili — ettita topilma, har biri jonli o'lchangan (yuklash hajmi/vaqti, throttle, 502 yo'llari). |
| `.superpowers/sdd/2026-08-10-aidevix-mkhls-backend/task-13-report.md` | Birinchi uchdan-uchgacha tekshiruvning to'liq dalili: ikkala konfiguratsiya bilan ishlash, ikkala test to'plami, topilgan va tuzatilgan xatolik. |

Ledger'dagi va final-fix-report'dagi muhim narsalar spec rev.3 ga ko'chirilgan, shuning
uchun **spec yetarli** kundalik ishlash uchun. Ikkalasi ham faqat "nima uchun shunday
qaror qilingan" kerak bo'lganda. **Diqqat:** `.superpowers/sdd/` butunlay
`.gitignore`langan (`*` pattern) — bu ikkala fayl diskda bor, lekin hech qaysi commit'da
yo'q. Shu sababli ushbu HANDOFF va git tarixi durable yagona yozuv; keyingi bosqich uchun
muhim narsani faqat ledger'da qoldirmang — shu faylga yozing.

---

## Ikkita repo

| Repo | Branch | Holat |
|---|---|---|
| `AiDeVix/mkhls-streamer` | `feat/vod-local-pipeline` | So'nggi fix to'lqinidan keyin `bc97f80`da. Push hali **bloklangan** (`origin` push URL — `PUSH-DISABLED--fork-qiling-spec-5-bolim` sentinel). Claude trailer'siz commitlar. |
| `AiDeVix/aidevixBackend` | `docs/spec-video-streaming-rev2` | `main`dan 30+ commit oldinda, hali merge qilinmagan. Har bir commit `Co-Authored-By: Claude Opus 5 (1M context)` trailer bilan. |

mkhls Aidevix repo'sining **ichida emas, yonida** — spec'ning "mijoz, klonuvchi emas"
qoidasi. Bu qoida saqlanishi kerak.

---

## Lokal muhitni ko'tarish

```bash
cd aidevixBackend
docker compose -f docker-compose.dev.yml down -v   # toza boshlash uchun (Mongo volume o'chadi)
rm -rf .data/media/aidevix .data/cache/vod
docker compose -f docker-compose.dev.yml up -d --build
cd backend && node scripts/seed-dev-user.js && npm run dev
```

- `http://localhost:8080` — mkhls admin (`admin` / config'dagi parol)
- `http://localhost:5000/health` — backend health
- Seed tokenlari **15 daqiqa** yashaydi — muddati o'tsa qayta ishga tushiring
- **`.env`ni o'zgartirsangiz backend'ni qayta ishga tushiring.** `nodemon` faqat
  `js/mjs/cjs/json` kengaytmalarini kuzatadi, `.env` emas — fayl o'zgargani bilan
  jarayon eski qiymatni xotirada saqlab qoladi. Bu ikki marta — Task 13'da va so'nggi
  fix to'lqinining o'zida (finding 1'ni jonli tekshirayotganda) — real vaqt yo'qotib
  jonli namoyish bo'ldi. Ishonchli yechim: `touch backend/index.js`.
- **`MKHLS_VOD_TRANSCODE_ON_UPLOAD`** (konteyner, `docker-compose.dev.yml`) va
  **`MKHLS_TRANSCODE_ON_UPLOAD`** (`backend/.env`) endi **bir-biriga bog'liq emas.**
  Ikkalasi mos kelishi shart degan eski qoida **bekor qilindi** — aynan shu qoidaning
  o'zi ikkalasi mos kelmay qolganda hech kim navbatga qo'ymaydigan holatga olib kelardi
  (pastga qarang, "Backend shartnomalari" 7-band). Backend endi har bir yuklashdan keyin
  `startTranscode`ni **so'zsiz** chaqiradi va mkhls'ning "allaqachon ishlayapti"
  javobini (409) muvaffaqiyat deb qabul qiladi — konteyner o'zi avtomatik navbatga
  qo'yganmi yoki yo'qmi, natija bir xil. Ikkala shipped mkhls konfiguratsiyasi
  (`development`, `production`) `vod.transcode_on_upload: false` bilan keladi, shuning
  uchun amalda navbatga qo'yishni doim backend boshlaydi. `MKHLS_TRANSCODE_ON_UPLOAD`
  `backend/.env.example`da hujjat sifatida qoladi, lekin backend kodi endi unga
  qaramaydi.

---

## Plan 3 boshlashdan oldin bilish shart

### Backend shartnomalari (o'zgarmasligi kerak, Plan 3 shularga moslashadi)

1. **`positionSeconds` — yagona to'g'ri nom.** Backend eski `watchedSeconds` nomini
   ham qabul qiladi (`enrollmentController.js:64`, `positionSeconds ?? watchedSeconds`),
   lekin **faqat bitta reliz uchun**. Frontend'dagi ikkala chaqiruv nuqtasi ko'chirilishi
   kerak — hali ko'chirilmagan:
   - `frontend/src/app/videos/[id]/page.tsx:147` (`videoApi.saveProgress(courseId, id, watchedSecondsRef.current)`)
   - `frontend/src/app/videos/[id]/playground/page.tsx:217` (bir xil chaqiruv)

2. **`GET /videos/:id/link-bunny` endpointi endi yo'q.** O'rniga
   `PATCH /videos/:id/link-stream` bilan `{ streamPath }` (bunnyVideoId emas). Eski nomni
   hali chaqirayotgan joylar — hali ko'chirilmagan:
   - `frontend/src/api/adminApi.ts:36` (`linkVideoToBunny`, `videos/${id}/link-bunny`ga PATCH qiladi)
   - `frontend/src/app/admin/courses/[id]/page.tsx:254` (`linkVideoToBunny` shu yerda chaqiriladi)

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

5. **`GET /api/videos/:id` javob shakli** (`videoController.js`, `getVideo`) — o'zgarmadi:
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
   "tayyorlanmoqda" deb yolg'on aytardi. **Bitta narsa endi farqli: `streamStatus` bu
   javobda endi Mongo'dagi saqlangan qiymat emas, balki 6-banddagi yangilanishdan keyingi
   eng so'nggi qiymat bo'lishi mumkin** — quyida.

6. **`getVideo` endi `pending`/`processing` holatidagi videoni mkhls'dan o'zi
   yangilaydi.** Ilgari faqat admin-only `checkVideoStatus` mkhls'ni qayta o'qib
   `streamStatus`ni Mongo'ga yozardi; frontend'ning 30s poll'i esa
   `GET /api/videos/:id`ga tushardi (spec §11) — shuning uchun admin panelni yopgandan
   keyin tugagan transcode hech qachon Mongo'ga tushmas, video har doim
   "tayyorlanmoqda" bo'lib qolardi. Endi `refreshPreparingStatus`
   (`videoController.js:61`) shu poll'ning ichida mkhls'ni tekshiradi, natijani
   `Video.updateOne` bilan yozadi va o'sha javobning o'zida player'ni qaytaradi. Xato
   bo'lsa (mkhls o'chgan) — saqlangan holatga qaytadi, 503 emas (503 faqat *ready* video
   token ololmaganda ishlatiladi).

   **Operatsion ogohlantirish: throttle jarayon-ichida.** `lastStatusRefresh` — modul
   darajasidagi oddiy `Map` (`MKHLS_STATUS_REFRESH_COOLDOWN_MS`, standart 15000ms).
   Ko'p-replika deploy'da **har bir replika o'z xaritasini alohida saqlaydi** — umumiy
   (masalan Redis) throttle yo'q. Demak amaldagi yangilash tezligi **replika soniga
   ko'paytiriladi**: 3 replika bo'lsa, mkhls'ga har 15s emas, amalda har ~5s'da bitta
   so'rov borishi mumkin. Ataylab shunday — qo'shimcha dependency qo'shmaslik uchun —
   lekin deploy topologiyasi kattalashsa buni qayta ko'rib chiqish kerak.

7. **`MKHLS_TRANSCODE_ON_UPLOAD` darvozasi butunlay olib tashlandi.** Backend endi har
   bir yuklashdan keyin `startTranscode`ni so'zsiz chaqiradi, mkhls'ning "allaqachon
   ishlayapti" javobini (409, `{queued:false, alreadyRunning:true}`) muvaffaqiyat deb
   hisoblaydi. O'zgaruvchi `.env.example`da hujjat sifatida qoladi, lekin kod unga
   qaramaydi. Ilgari, konteyner va backend qiymatlari mos kelmay qolsa (yoki biri
   `.env` qayta yuklanmagani sababli eski qiymatni saqlab qolsa), **hech kim** navbatga
   qo'ymasdi: mkhls yuklangan videoni darhol `ready` (JIT ma'nosida, pre-transcode
   emas) deb belgilaydi, student to'g'ri ko'rinadigan player URL orqasidan 404 olardi —
   bu jonli kuzatilgan va tuzatilgan.

8. **`startTranscode` muvaffaqiyatsiz bo'lsa endi `streamStatus: 'failed'` yoziladi va
   502 qaytadi** (`videoController.js`, `uploadVideoProxy`) — ilgari 200 qaytib,
   videoni doimiy va aniqlab bo'lmaydigan tarzda yolg'on `ready` holatida qoldirardi.

9. **`useVideoLink` endi `streamPath`ni (va butun user hujjatini) qaytarmaydi** — ikkala
   `populate` endi proyeksiyalangan (`videoController.js:263-269`). Bu endpoint
   `authenticate`dan boshqa hech qanday guard'siz, ya'ni har qanday login qilgan
   foydalanuvchi ilgari provayder yo'lini (`streamPath`, spec §10.4 bo'yicha maxfiy) va
   butun `user` hujjatini ko'ra olardi.

10. **Yuklash muddatlari ikkala serverda ham ko'tarildi** — branch'dagi eng katta
    operatsion o'zgarish:
    - **Node:** `server.requestTimeout = 0` (`backend/index.js:655`); `headersTimeout`
      (70s) slowloris himoyasi sifatida saqlanadi. O'lchangan: 1.12 GB yuklash 192.3s'da
      tugadi (HTTP 200, transcode navbatga qo'yildi).
    - **mkhls (Go):** `server.read_timeout` Go'ning `ReadTimeout`i sifatida qo'llanardi —
      bu **butun body**ni o'qish muddati, uchala konfiguratsiyada ham (development,
      production, testing), ya'ni **productionda ham** har bir yuklash 30s bilan
      cheklangan edi. Endi `ReadHeaderTimeout` sifatida qo'llanadi,
      `ReadTimeout`/`WriteTimeout` 0 (`internal/application/app.go:722-724`).
    - **Ongli ravishda qabul qilingan xatar:** sekin-body so'rov endi ulanishni uzoq
      ushlab turishi mumkin. O'lchangan: 40 bayt ~120s davomida bir baytdan yuborilganda
      ulanish 117.5s'da hali ham kesilmagan edi (mkhls 502 bilan javob berdi — 40 bayt
      video emas — lekin ulanishning o'zi server tomonidan uzilmagan). Bu xatar ikkala
      serverda ham bir xil sabab bilan qabul qilingan.

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

## Ma'lum, hali tuzatilmagan muammolar

So'nggi butun-branch review davomida topilgan, ammo tuzatish to'lqini qamrovidan ataylab
tashqarida qoldirilgan narsalar. Hech biri tuzatilmagan; hech qayerda durable yozilmagan
edi — Plan 3 yoki keyingi bosqich ularga duch kelishi mumkin, shuning uchun bu yerda.

- **`getVideo`ning `.populate('course')`da proyeksiya yo'q** (`videoController.js:136`),
  ya'ni `data.video.course` orqali **butun Course hujjati** har qanday obuna bo'lgan
  foydalanuvchiga chiqadi. Eski muammo, mkhls migratsiyasiga aloqasi yo'q — buni keyin
  shu javob shaklini o'zgartiradigan kishi tuzatsin.

- **`markVideoWatched` `videoId` haqiqatan `courseId`ga tegishli ekanini tekshirmaydi**
  (`enrollmentController.js:80`). `progressPercent` `watchedVideos.length /
  course.videos.length` sifatida hisoblanadi (`enrollmentController.js:93-96`), shuning
  uchun o'zboshimcha, bir-biridan farqli ObjectId'larni yuborish uni 100%ga yetkazadi va
  sertifikat chiqaradi (`_issueCertificate`). Bu branch shu tekshirilmagan `videoId`ga
  endi `viewCount`ning `$inc`ini ham biriktirdi (`enrollmentController.js:116`) — bosh
  sahifa esa videolarni aynan `viewCount` bo'yicha saralaydi (`getTopVideos`,
  `videoController.js:1003`, `sort({ viewCount: -1 })`).

- **Eski `watchedVideos[].watchedSeconds` yozuvlari eski kumulyativ shartnoma ostida
  yozilgan, endi pozitsiya sifatida o'qiladi.** Migratsiya yo'q. Qaytib kelgan
  foydalanuvchining resume nuqtasi haqiqiy o'rnidan uzoqroqqa tushishi mumkin; bitta
  seansdan keyin o'z-o'zidan tuzaladi (keyingi yozuv to'g'ri shartnoma bilan qayta
  yoziladi), lekin Plan 3 resume funksiyasini aynan shu ma'lumot ustiga quradi —
  bilib qo'ying.

- **Hech qaysi qatlamda yuklash hajmi chegarasi yo'q.** Backend faqat `Content-Length`
  borligini va musbat ekanini tekshiradi (411 bo'lmasa — 6-band ostidagi 10-band). mkhls
  esa klient storage yo'lidan (backend'ning `buildStreamPath`i quradigan) hosil qilgan
  fayl nomining kengaytmasini tekshiradi, bu kengaytma haqiqatan oqib kelayotgan
  baytlardan qat'i nazar doim `.mp4`.

- **Go repo'da `finishJob`dagi metadata probe / `MarkVideoReady` / manba o'chirish
  tartibi endi testlar bilan mahkamlangan, lekin probe'ning to'g'riligi
  mahkamlanmagan.** `TestFinishJobPersistsMetadataBeforeMarkingReady` va
  `TestFinishJobMarksReadyBeforeDeletingSource` faqat chaqiruvlar tartibini tekshiradi —
  `GetMediaInfo` haqiqiy davomiylik/kenglik/balandlikni to'g'ri qaytarayotganini emas.
  Buni yopish uchun `s.ffmpeg` (`*ffmpeg.FFmpeg` konkret maydon) interfeys orqasiga
  olinishi kerak — bu refaktoring, fix to'lqini qamrovidan tashqarida qoldirilgan.

- **Jarayon eslatmasi, real vaqt yo'qotgan:** `nodemon` faqat `js/mjs/cjs/json`
  kengaytmalarini kuzatadi, `backend/.env` emas ("Lokal muhitni ko'tarish"ga qarang).
  Eskirgan `.env` bir marta tekshiruv natijasini sezdirmasdan buzgan edi — bu ikki marta
  (Task 13'da va so'nggi fix to'lqinida) sodir bo'ldi, shuning uchun bu yerda ham
  takrorlab qo'yildi.

---

## Plan 3 qamrovi (spec 6-7 bosqich)

| # | Bosqich | Natija |
|---|---|---|
| 6 | Frontend player | `components/videos/LessonPlayer.tsx` (yangi) + `page.tsx` + Redux slice/types — `positionSeconds`ga o'tish, resume seek, throttled progress, token yangilash |
| 7 | Admin panel | `bunnyStatus` → `streamStatus` nomlash, `link-bunny` → `link-stream`, transcode progressi (`presetsDone`/`presetsTotal`, foizsiz) |

1-5 bosqich (mkhls upstream, backend client/model/controller, bug fixlar, so'nggi
butun-branch review va tuzatish to'lqini) — tugadi va tekshirildi. 8 (xavfsizlik
tozalash) va 9 (deploy) Plan 3'dan keyin, alohida.

---

## Ishlash uslubi (uch marta ketma-ket yaxshi ishladi)

`superpowers` skill'lari: brainstorming → writing-plans → subagent-driven-development.

Ikkita narsa aynan qimmat bo'ldi, saqlang:

- **Har taskda qo'lda uchdan-uchgacha tekshirish.** Container'da haqiqiy fayl bilan
  ishlatish — nima unit test va code review tutolmaydigan narsani ochadi. Bu Plan'da
  ham (Task 5: mock fixture'lar noto'g'ri edi; Task 13: `.env` o'zgarishi backend'ni
  qayta ishga tushirmasdan qo'llanmasligi) haqiqiy xatoliklarni ochdi.
- **Butun-branch review oxirida, alohida.** Plan 1-2'da u ma'lumot yo'qolishi bug'ini
  topdi — to'qqizta alohida task review'i o'tkazib yuborgan edi, chunki har bir task
  alohida to'g'ri edi. Bu Plan'da bu naqsh **ikki marta** takrorlandi: Task 13
  `videos/top` provayder-yo'l sizib chiqishini topdi (bitta task ham buzmagan, kombinatsiya
  buzgan), so'ng butun branch tugagach o'tkazilgan yakuniy review to'rtta yana shunday
  chok-orasidagi xatolikni topdi (upload muddati, stuck-processing, false-ready,
  useVideoLink sizishi) — hammasi alohida to'g'ri ko'ringan tasklar orasida. Plan 3
  oxirida ham xuddi shu tarzda alohida whole-branch review rejalashtiring —
  implementator o'z branch'ini review qilmasin.

---

## Yangi suhbatni shu bilan boshlang

> `aidevixBackend/docs/superpowers/HANDOFF.md` ni o'qing va Plan 3 ga o'ting.

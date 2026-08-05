# Video streaming: Bunny Stream → mkhls-streamer

**Sana:** 2026-08-05
**Holat:** Dizayn tasdiqlangan, implementatsiya rejasi kutilmoqda

---

## 1. Kontekst va maqsad

Aidevix'da hozir video oqim **umuman ishlamaydi**. Mavjud integratsiya Bunny.net Stream'ga
qurilgan (`backend/utils/bunny.js`), lekin Bunny pullik xizmat va loyiha uni ishlatmayapti.
Foydalanuvchi `/videos/[id]` sahifasiga kirganda `player.embedUrl` hech qachon
to'ldirilmaydi va "Video tayyorlanmoqda" ekrani ko'rsatiladi.

**Maqsad:** Bunny Stream'ni o'z infratuzilmamizdagi **mkhls-streamer** (Go, HLS media server)
bilan almashtirish va Aidevix'da to'liq ishlaydigan video oqim yo'lini qurish.

### Mahsulot konteksti

`mkhls-streamer` — `C:\Users\ASUS\Documents\MyPros\AlloPlay\mkhls-streamer` dagi mustaqil
loyiha. Egasi uni kelajakda **alohida mahsulot / servis** sifatida chiqarishni rejalashtirmoqda.

Shu sababli qabul qilingan asosiy qoida:

> **Aidevix — mkhls'ning MIJOZI, klonuvchisi emas.**

Amalda:

- `aidevixBackend` repo'siga mkhls **manba kodi kirmaydi**. Aidevix faqat ishlab turgan
  instance'ning HTTP API'siga murojaat qiladi.
- mkhls'ga kerak bo'ladigan o'zgarishlar **generic** qilib yoziladi va AlloPlay'dagi asl
  repo'ga tushadi. `Aidevix` so'zi mkhls kodida hech qayerda uchramaydi.
- Aidevix tomonda bitta ingichka client qatlami (`backend/utils/mkhls.js`) bo'ladi — bu
  keyinchalik mahsulotning rasmiy Node SDK'siga aylanishi mumkin.
- Video yo'llari boshidanoq namespace bilan: `aidevix/{videoId}.mp4`. mkhls multi-tenant
  bo'lganda Aidevix hech narsa o'zgartirmasdan ko'chadi.

---

## 2. Non-goals

Bu spec quyidagilarni **qamrab olmaydi**:

- Live TV / kanal oqimi (mkhls'da bor, Aidevix'ga kerak emas)
- DRM (Widevine/FairPlay)
- mkhls'ni multi-tenant SaaS'ga aylantirish (alohida loyiha)
- Mobil ilova (`AidevixApp/` hozir bo'sh)
- H.265/HEVC (kelajakda, mkhls roadmap'ida)
- Bunny'dagi eski videolarni ko'chirish — hozir ishlaydigan oqim yo'q, ko'chiriladigan
  narsa ham yo'q

---

## 3. Qabul qilingan qarorlar

| Savol | Qaror | Sabab |
|---|---|---|
| Streaming provayder | mkhls-streamer | Bunny pullik; mkhls o'zimizniki va tayyor |
| Aidevix ↔ mkhls munosabati | Mijoz / HTTP API | mkhls alohida mahsulot bo'ladi |
| Hosting | Avval lokal, deploy keyin | Kod o'zgarmaydi, faqat URL |
| Storage | VPS diski + MinIO (S3 API) | Xalqaro karta kerak emas; keyin R2'ga ko'chish oson |
| Original mp4 arxivi | Google Drive / Yandex Disk (qo'lda) | Bepul sovuq arxiv; jonli oqim manbai EMAS |
| Transcode vaqti | Oldindan, yuklashda bir marta | Kuchsiz VPS JIT'da ko'p tomoshabinni ko'tara olmaydi |
| Frontend player | Vidstack | HLS + sifat/tezlik/PiP/klaviatura tayyor |
| Token IP bog'lanishi | **Yo'q** (boshida) | Mobil internetda IP o'zgaradi va player o'ladi |

### Nima uchun Google Drive origin sifatida rad etildi

- mkhls S3 protokolini biladi; Drive/Yandex API'si boshqacha → mahsulotga shubhali adapter
  yozish kerak bo'lardi
- Transcode manbadan range request (seek) talab qiladi; Drive katta fayllarda
  "download quota exceeded" va virus-scan interstitial qaytaradi
- Drive'ni media backend qilish ToS'ga zid — akkaunt cheklanishi kurslarning yo'qolishi demak

Drive'ning to'g'ri o'rni: transcode tugagandan keyin original mp4 nusxasi (sovuq arxiv),
sifat presetlari o'zgarganda qayta transcode uchun.

---

## 4. Arxitektura

```
ADMIN brauzer            Aidevix backend (Railway)          mkhls-streamer (VPS)        MinIO
                                                                                        │
  mp4 ──PUT octet-stream──▶ /api/videos/:id/upload-proxy ──multipart──▶ POST /admin/videos/upload ──▶ aidevix/{id}.mp4
                                     │                                        │
                                     │                          POST /admin/videos/{path}/transcode
                                     │                                        │
                                     │                                  ffmpeg (presigned URL)
                                     │                                        ▼
                                     │                          {cache}/vod/aidevix/{id}.mp4/{720p,480p,360p}/*.ts
                                     │
                             GET /api/videos/:id/status ◀── GET /admin/videos/{path}  (polling)


USER brauzer
  /videos/[id] ──▶ GET /api/videos/:id      (authenticate → checkSubscriptions → Pro tekshiruv)
                        └─▶ mkhls: POST /admin/tokens/stream {allowed_path, expires_in}
                   ◀── { video, player: {type:'hls', hlsUrl, expiresAt}, progress:{lastPositionSeconds} }

  Vidstack ──▶ GET {PUBLIC_URL}/vod/aidevix/{id}.mp4/master.m3u8?token=… ──▶ mkhls ──▶ .m3u8 + .ts
```

**Muhim:** Aidevix backend video faylni hech qachon diskka yozmaydi — faqat oqizadi.
Railway'ning efemer diski muammo bo'lmaydi.

---

## 5. Komponent A — mkhls-streamer o'zgarishlari (upstream, generic)

Bu o'zgarishlar AlloPlay'dagi mkhls repo'sida bajariladi. Hammasi generic — istalgan
mijozga kerak.

### A1. S3 manbadan transcode

**Muammo:** `internal/application/service/transcoding_service.go:180` ffmpeg kirishi
sifatida `video.Path` ni ishlatadi — bu lokal fayl yo'li. S3 rejimida `video.Path` bu S3
kaliti va ffmpeg uni o'qiy olmaydi. Natijada `admin_handler.go:513` da S3 videolar
shunchaki `ready` deb belgilanadi va faqat JIT'ga qoldiriladi.

**Yechim:** `TranscodingService` manba turini hisobga olsin. S3 manbada obyekt uchun
**presigned URL** olinadi va ffmpeg'ga kirish sifatida beriladi (HTTP range'ni
qo'llab-quvvatlaydi, lokal nusxa kerak emas).

- `StartTranscoding` da `video.Path` o'rniga `resolveInputURL(ctx, video)` ishlatiladi
- `resolveInputURL`: local manbada — fayl yo'li; s3 manbada — `PresignedGetObject` (TTL
  transcode davomiyligidan katta, masalan 6 soat)
- `GetMediaInfo` ham xuddi shu URL bilan chaqiriladi

### A2. Video uchun transcode'ni ishga tushirish endpointi

Hozir transcode faqat `POST /admin/videos/scan` ichida, lokal katalog uchun ishga tushadi.
Bitta videoni nishonlab bo'lmaydi.

```
POST /admin/videos/{id}/transcode
Body: { "presets": ["720p","480p","360p"] }   // ixtiyoriy, bo'sh bo'lsa avtomatik
→ 202 { "job_id": "...", "status": "pending", "presets": [...] }
```

- `RequireOperator()` himoyasi ostida
- Video allaqachon transcode qilinayotgan bo'lsa `409 CONFLICT`

**Eslatma ID haqida:** `entity.generateVideoID` (`internal/domain/entity/video.go:100`)
yo'ldagi ajratgichni `_` ga almashtiradi, ya'ni `aidevix/68f….mp4` → `aidevix_68f….mp4`.
ID'da `/` bo'lmagani uchun `:id` route'i muammosiz ishlaydi. Aidevix client'i shu
konvertatsiyani `pathToId()` yordamchisi bilan bajaradi.

### A6. Yo'l ↔ ID normallashtirish nomuvofiqligi (bug)

VOD handler DB'da videoni **xom URL yo'li** bilan qidiradi
(`vod_handler.go:104` → `checkVideoStreamable` → `videoRepo.GetByID(ctx, "aidevix/68f….mp4")`),
lekin yozuv `generateVideoID` natijasi (`aidevix_68f….mp4`) bilan saqlangan. Ya'ni
namespace'li (ichma-ich) yo'llarda qidiruv **hech qachon topmaydi**.

Hozir bu jimgina o'tib ketadi, chunki "DB'da yo'q video ruxsat etiladi" (JIT bilan orqaga
moslik uchun). Lekin natijada:

- video `processing` yoki `failed` holatida ham oqim to'sib qo'yilmaydi
- oldindan transcode qilingan chiqish `{cache}/vod/{ID}` ga yoziladi, VOD handler esa
  `{cache}/vod/{URL yo'li}` dan qidiradi — mos kelmaydi

**Yechim:** VOD yo'lini repozitoriyga murojaatdan va cache yo'lini hisoblashdan oldin bir
xil `NormalizeVideoID(path)` funksiyasi orqali o'tkazish. Bu — mkhls'ning o'z bug'i,
Aidevix'ga bog'liq emas; upstream'da tuzatiladi va test bilan qoplanadi.

**Bu birinchi tekshiriladigan narsa** — 1-bosqichda lokal muhitda ichma-ich yo'l bilan
uchdan-uchgacha (yuklash → transcode → o'ynatish) sinab ko'riladi.

### A3. Yuklashdan keyin avtomatik transcode

`AdminHandler.UploadVideo` (`admin_handler.go:598`) hozir videoni darhol `ready` deb
belgilaydi (JIT). Konfiguratsiyaga bog'liq holat qo'shiladi:

```yaml
vod:
  transcode_on_upload: true   # default false — orqaga moslik
```

`true` bo'lganda: yuklangandan keyin status `processing`, transcode navbatga qo'yiladi,
tugagach `ready`.

### A4. Video status endpointini boyitish

`GET /admin/videos/{id}` javobiga transcode progressi qo'shiladi, toki mijoz polling
qilib foydalanuvchiga ko'rsata olsin:

```json
{
  "id": "aidevix/68f….mp4",
  "status": "processing",
  "duration": 2412,
  "transcode": { "progress_percent": 42, "presets_done": ["360p"], "presets_total": 3 }
}
```

### A5. Yuklash yo'lini (kalitni) boshqarish

`UploadVideo` hozir S3 kaliti sifatida `header.Filename` ni ishlatadi. Mijoz kalitni aniq
belgilay olishi kerak (namespace uchun):

```
POST /admin/videos/upload
  form field "file"  — binary
  form field "path"  — ixtiyoriy, masalan "aidevix/68f….mp4"
```

`path` berilmasa — hozirgidek `filename`. Yo'l tozalanadi (`..`, absolyut yo'l, boshidagi
`/` rad etiladi).

---

## 6. Komponent B — Aidevix backend

### B1. `backend/utils/mkhls.js` (yangi)

`utils/bunny.js` o'rniga, bir xil shakldagi ingichka client. Tashqi bog'liqlik: `axios`
(mavjud), `form-data` (yangi).

```js
pathToId(streamPath)                         // "aidevix/68f.mp4" → "aidevix_68f.mp4" (A2 dagi qoida)
getAdminToken()                              // POST /admin/login — JWT xotirada cache,
                                             //   expiry-60s da yangilanadi, 401 da qayta login
uploadVideo(streamPath, stream, size)        // POST /admin/videos/upload (multipart, "path" maydoni)
startTranscode(streamPath, presets)          // POST /admin/videos/{id}/transcode
getVideoInfo(streamPath)                     // GET  /admin/videos/{id} → status, duration, transcode
generateStreamToken(streamPath, ttlSeconds)  // POST /admin/tokens/stream
buildHlsUrl(streamPath, token)               // `${PUBLIC_URL}/vod/${streamPath}/master.m3u8?token=…`
deleteVideo(streamPath)                      // DELETE /admin/videos/{id}
parseStreamStatus(mkhlsStatus)               // mkhls status → Aidevix status
```

`streamPath` — S3 kaliti va public URL yo'li (`/` bilan). `id` — mkhls'ning ichki
identifikatori (`_` bilan). Client faqat `streamPath` qabul qiladi, `pathToId` ni ichida
o'zi qo'llaydi — chaqiruvchi kod bu farqni bilmaydi.

**Status xaritasi:**

| mkhls | Aidevix `streamStatus` |
|---|---|
| `pending` | `pending` |
| `processing` | `processing` |
| `ready` | `ready` |
| `error`, `unavailable` | `failed` |

**ENV:**

```
MKHLS_BASE_URL=http://localhost:8080        # server ↔ server
MKHLS_PUBLIC_URL=http://localhost:8080      # brauzerdan ko'rinadigan (prod: https://stream.aidevix.uz)
MKHLS_ADMIN_USERNAME=admin
MKHLS_ADMIN_PASSWORD=…
MKHLS_NAMESPACE=aidevix
MKHLS_STREAM_TOKEN_TTL=14400                # 4 soat
```

`BASE_URL` va `PUBLIC_URL` alohida, chunki prod'da backend ichki tarmoq orqali, brauzer
esa domen orqali murojaat qiladi.

### B2. `models/Video.js`

Qo'shiladi:

```js
streamPath:   { type: String, default: null },   // "aidevix/{videoId}.mp4"
streamStatus: { type: String, enum: ['pending','processing','ready','failed'], default: 'pending' },
```

`bunnyVideoId` va `bunnyStatus` **deprecated izohi bilan qoldiriladi** (bir relizga), keyin
migration bilan o'chiriladi. Indeks: `videoSchema.index({ streamStatus: 1 })`.

### B3. `controllers/videoController.js`

| Funksiya | O'zgarish |
|---|---|
| `createVideo` | Bunny slot yaratish o'rniga `streamPath = ${NAMESPACE}/${video._id}.mp4` hisoblanadi, `streamStatus='pending'`. Upload info hozirgidek proxy URL. |
| `uploadVideoProxy` | `streamUploadToBunny` o'rniga `mkhls.uploadVideo(streamPath, req, contentLength)`. Muvaffaqiyatdan keyin `streamStatus='processing'`. mkhls'da `transcode_on_upload` yoqilmagan bo'lsa `startTranscode` chaqiriladi. |
| `checkVideoStatus` | `mkhls.getVideoInfo` → status + duration + transcode progressi DB'ga yoziladi va qaytariladi. |
| `getVideo` | `generateSignedEmbedUrl` o'rniga `generateStreamToken` + `buildHlsUrl`. |
| `deleteVideo` | `deleteBunnyVideo` o'rniga `mkhls.deleteVideo`. |
| `linkToBunny` | `linkToStream(streamPath)` deb nomlanadi — mavjud mkhls yo'liga qo'lda bog'lash. |
| `getCourseVideos` | `select` dan provayder ID olib tashlanadi (hozir `bunnyVideoId` ochiq chiqadi). |

**`getVideo` yangi javobi:**

```json
{
  "success": true,
  "data": {
    "video": { "_id": "...", "title": "...", "duration": 2412, "...": "..." },
    "player": {
      "type": "hls",
      "hlsUrl": "https://stream.aidevix.uz/vod/aidevix/68f….mp4/master.m3u8?token=…",
      "expiresAt": "2026-08-05T14:00:00.000Z"
    },
    "progress": { "lastPositionSeconds": 734 }
  }
}
```

`player` — video tayyor bo'lmasa `null` (hozirgi xatti-harakat saqlanadi).
`progress` — `Enrollment.watchedVideos[].watchedSeconds` dan; enrollment yo'q bo'lsa `null`.

`video.rating` javobdan olib tashlanadi — `models/Video.js` da bunday field yo'q, hozir
doim `undefined` qaytadi.

**Stream token:**

- `allowed_path = /vod/{streamPath}` — token faqat shu darsga yaraydi
- `client_ip` — **bo'sh**. Mobil internetda IP o'zgaradi va dars o'rtasida player o'ladi.
  Path cheklovi + 4 soatlik TTL yetarli.
- TTL 4 soat — eng uzun darsdan katta, lekin havola tarqalsa ham tez o'ladi

### B4. `viewCount` tuzatish

Hozir har `GET /api/videos/:id` da `$inc: { viewCount: 1 }` — refresh qilinsa ham,
video tayyor bo'lmasa ham oshadi.

Yangi qoida: `viewCount` faqat shu foydalanuvchi uchun `Enrollment.watchedVideos` da yozuv
**birinchi marta** paydo bo'lganda oshadi (`enrollmentController.markVideoWatched` ichida).
`getVideo` dan `$inc` butunlay olib tashlanadi.

### B5. Progress bug'i (`controllers/enrollmentController.js:89`)

```js
enrollment.totalWatchedSeconds += watchedSeconds;   // ← frontend KUMULYATIV yuboradi
```

Frontend har 10 soniyada `10, 20, 30, …` yuboradi, ya'ni 5 daqiqalik ko'rish
`10+20+…+300 = 4650` soniya (77 daqiqa) deb yoziladi.

**Yechim:** shartnoma aniq belgilanadi — frontend **joriy pozitsiyani** (`positionSeconds`)
yuboradi, backend deltani o'zi hisoblaydi:

```js
const prev  = alreadyWatched?.watchedSeconds || 0;
const delta = Math.max(0, Math.min(positionSeconds - prev, 120)); // seek/hiyla himoyasi
enrollment.totalWatchedSeconds += delta;
alreadyWatched.watchedSeconds = Math.max(prev, positionSeconds);
```

`120` cheklovi: 10 soniyalik intervalda undan ko'p "ko'rilgan" bo'lishi mumkin emas —
oldinga seek qilish yoki qo'lda so'rov yuborish soatlarni qo'shib yubormaydi.

Orqaga moslik: `watchedSeconds` nomi `positionSeconds` ga o'zgaradi, eski nom ham
qabul qilinadi (bir reliz).

---

## 7. Komponent C — Aidevix frontend

### C1. `components/videos/LessonPlayer.tsx` (yangi)

Vidstack asosidagi player. `app/videos/[id]/page.tsx` dagi `<iframe>` (411-417-qatorlar)
shu komponent bilan almashtiriladi.

```tsx
<LessonPlayer
  hlsUrl={player.hlsUrl}
  expiresAt={player.expiresAt}
  startAt={progress?.lastPositionSeconds ?? 0}
  poster={video.thumbnail}
  onPosition={(seconds) => …}      // throttled, faqat o'ynayotganda
  onTokenExpired={() => refetch()}
/>
```

**Mas'uliyatlari:**

1. **Resume** — `loaded-metadata` da `startAt > 5 && startAt < duration - 15` bo'lsa
   o'sha joyga seek qiladi va "Davom etish" toast'ini ko'rsatadi
2. **Progress** — `time-update` hodisasi, 10 soniyada bir marta throttle. `paused` yoki
   `seeking` bo'lsa yubormaydi. Backend'ga **joriy pozitsiya** ketadi
3. **Token yangilanishi** — ikki xil signal:
   - proaktiv: `expiresAt` gacha 5 daqiqa qolganda `fetchById` qayta chaqiriladi
   - reaktiv: player `error` bersa (403/401 segment) — bir marta qayta urinish
   Yangi `hlsUrl` kelganda joriy pozitsiya saqlanadi va shu joydan davom etadi
4. **Sifat / tezlik / PiP / klaviatura** — Vidstack default layout'idan

### C2. `page.tsx` o'zgarishlari

- `player.embedUrl` → `player.hlsUrl` (30-qator va 409-417-qatorlar)
- Progress `useEffect` (140-154-qatorlar) **butunlay olib tashlanadi** — endi player
  hodisalari boshqaradi
- Sticky mini-player saqlanadi, lekin endi u DOM'da bitta `<video>` elementi (iframe emas),
  shuning uchun ko'chirishda qayta yuklanmaydi

### C3. `types/video.ts` va `store/slices/videoSlice.ts`

```ts
export interface Player {
  type: 'hls';
  hlsUrl: string;
  expiresAt: string;
}
export interface Progress { lastPositionSeconds: number }
```

`videoSlice` `fetchVideo.fulfilled` da `progress` ni ham saqlaydi.

### C4. Admin panel (`app/admin/courses/[id]/page.tsx`)

Oqim shakli **o'zgarmaydi** — hozirgi 3 bosqich (create → upload → poll) bir xil
qoladi. Faqat nomlar: `bunnyStatus` → `streamStatus`, `bunnyGuid` → `streamPath`.
Polling'ga transcode progressi (`transcode.progress_percent`) qo'shiladi.

`api/adminApi.ts`: `linkVideoToBunny` → `linkVideoToStream`, `bulkLinkBunny` olib tashlanadi.

---

## 8. Komponent D — Lokal muhit

`docker-compose.dev.yml` (aidevixBackend ildizida):

```yaml
services:
  minio:        # S3 API :9000, konsol :9001, bucket "aidevix-media"
  mkhls:        # AlloPlay'dagi mkhls-streamer image, :8080
                # VOD_SOURCE_TYPE=s3, S3_ENDPOINT=minio:9000
                # VOD_CACHE_PATH=/cache, VOD_CACHE_MAX_SIZE=20GB
                # transcode_on_upload=true
```

mkhls image AlloPlay repo'sidan quriladi (`deployments/docker/`), Aidevix repo'sida faqat
compose fayli va `.env.example` bo'ladi.

`backend/.env.example` ga `MKHLS_*` o'zgaruvchilari qo'shiladi, `BUNNY_*` deprecated deb
belgilanadi.

---

## 9. Xavfsizlik

1. **`fetch_bunny.html` o'chiriladi.** Faylda haqiqiy Bunny API kaliti
   (`164b15f1-…`) va library ID hardcode qilingan va git tarixiga tushgan.
   Kalit Bunny panelidan **bekor qilinadi** (faylni o'chirish yetarli emas — tarixda qoladi).
2. `MKHLS_ADMIN_PASSWORD` faqat backend'da; frontend'ga hech qachon chiqmaydi.
   Foydalanuvchi faqat bitta darsga yaraydigan qisqa muddatli stream token oladi.
3. Stream token `allowed_path` bilan cheklangan — bir darsning tokeni boshqasini ochmaydi.
4. `getCourseVideos` (auth talab qilmaydigan endpoint) dan `streamPath` chiqarilmaydi.
5. Upload proxy `requireAdmin` ostida qoladi; fayl kengaytmasi va hajmi backend'da
   tekshiriladi (mkhls ham tekshiradi, lekin ikki qatlam yaxshi).
6. mkhls prod'da to'g'ridan-to'g'ri internetga ochilmaydi — nginx orqasida, faqat `/vod/*`
   va `/health` public; `/admin/*` faqat ichki tarmoq yoki IP allowlist.

---

## 10. Xatoliklarni boshqarish

| Holat | Backend | Frontend |
|---|---|---|
| mkhls o'chgan (`ECONNREFUSED`) | `503`, `player: null`, log | "Video vaqtincha mavjud emas" + qayta urinish tugmasi |
| mkhls login muvaffaqiyatsiz | `502`, cache tozalanadi | yuqoridagidek |
| Video `processing` | `200`, `player: null`, `streamStatus` qaytariladi | "Tayyorlanmoqda" + avtomatik polling (30s) |
| Video `failed` | `200`, `player: null` | "Xatolik yuz berdi, administratorga murojaat qiling" |
| Token muddati tugadi | — | player `error` → bir marta avtomatik `refetch` → o'sha joydan davom |
| Segment 403 | — | yuqoridagidek |
| Upload uzildi | `502`, `streamStatus='failed'` | admin panelda xato + qayta yuklash |

**Muhim:** hozirgi frontend "video tayyor emas" holatida foydalanuvchini qo'lda
`window.location.reload()` qilishga majburlaydi. Yangi versiyada 30 soniyalik avtomatik
polling bo'ladi va tayyor bo'lganda player o'zi paydo bo'ladi.

---

## 11. Test rejasi

**mkhls (upstream):**
- `TranscodingService` — S3 manbada presigned URL hosil qilinishi (table-driven)
- `POST /admin/videos/{id}/transcode` — 202, 409 (allaqachon ishlayapti), 404
- Upload'da `path` maydonini tozalash — `..`, absolyut yo'l, bo'sh qiymat
- `NormalizeVideoID` — ichma-ich yo'l (`a/b.mp4`) uchun VOD handler, transcode chiqishi va
  repozitoriy bir xil ID'ga kelishi (A6 bug'i uchun regressiya testi)

**Aidevix backend (`backend/__tests__`):**
- `utils/mkhls.js` — `nock` bilan: login cache, 401'da qayta login, token generatsiya,
  URL qurish, status xaritasi
- `getVideo` — mkhls mock'langan holda: tayyor / processing / failed / mkhls o'chgan
- `markVideoWatched` — delta hisobi, 120s cheklovi, orqaga seek qilinganda
  `totalWatchedSeconds` oshmasligi

**Frontend:**
- `LessonPlayer` — resume seek, throttled progress, token yangilash (mock player hodisalari)
- E2E (`frontend/e2e`): admin yuklaydi → status ready → user ko'radi → progress saqlanadi
  → qayta kirganda o'sha joydan davom etadi

**Qo'lda tekshirish:**
- Lokal compose ko'tariladi, haqiqiy mp4 yuklanadi, brauzerda o'ynatiladi, sifat almashtiriladi,
  tab yopilib qayta ochiladi (resume), 4 soatdan keyin token yangilanishi (TTL'ni
  vaqtincha 2 daqiqaga tushirib tekshiriladi)

---

## 12. Bosqichlar

| # | Bosqich | Natija |
|---|---|---|
| 1 | Lokal muhit | `docker compose up` bilan mkhls + MinIO ishlaydi, `/health` javob beradi |
| 2 | mkhls upstream (A1–A5) | S3 manbadan pre-transcode ishlaydi, testlar o'tadi |
| 3 | Backend client + model | `utils/mkhls.js` + `Video` schema + unit testlar |
| 4 | Backend controller | upload/status/getVideo/delete oqimi to'liq |
| 5 | Bug fixlar | progress delta, viewCount, `rating`, `getCourseVideos` leak |
| 6 | Frontend player | `LessonPlayer` + `page.tsx` + slice/types |
| 7 | Admin panel | nomlar + transcode progressi |
| 8 | Xavfsizlik tozalash | `fetch_bunny.html` o'chirish, Bunny kalitini bekor qilish |
| 9 | Deploy | VPS + nginx + SSL + `MKHLS_PUBLIC_URL` |

1–8 lokalda to'liq bajariladi va tekshiriladi; 9 alohida.

---

## 13. Ochiq risklar

1. **VPS CPU** — pre-transcode 40 daqiqalik videoni 3 presetga o'girish 2 vCPU'da
   ~15-25 daqiqa oladi. Adminlar buni bilishi kerak; yuklash navbati ketma-ket bo'ladi.
   *Yumshatish:* admin panelda aniq progress ko'rsatiladi; kerak bo'lsa preset soni
   kamaytiriladi (720p + 480p).

2. **Disk hajmi** — dars ≈ 690 MB (720p+480p). 100 dars ≈ 69 GB. Hetzner CX22 da 40 GB.
   *Yumshatish:* transcode tugagach original mp4 MinIO'dan o'chiriladi (Drive'da arxiv
   qoladi); disk to'lganda volume qo'shiladi (arzon) yoki R2'ga ko'chiriladi — S3 API
   bir xil bo'lgani uchun kod o'zgarmaydi.

3. **Aidevix backend Railway'da, mkhls VPS'da** — upload trafigi Railway orqali o'tadi
   (proxy). Katta fayllarda Railway timeout/limitlariga urilishi mumkin.
   *Yumshatish:* agar muammo bo'lsa, keyingi bosqichda admin uchun mkhls'ga to'g'ridan-to'g'ri
   yuklash (qisqa muddatli upload token bilan) qo'shiladi. Bu ham generic feature.

4. **mkhls hali Aidevix bilan sinovdan o'tmagan** — AlloPlay konteksti (live TV, UDP) boshqa.
   VOD yo'li kamroq ishlatilgan bo'lishi mumkin.
   *Yumshatish:* 1-bosqichda lokal muhitda qo'lda to'liq tekshiriladi.

5. **Vidstack bundle hajmi** — Next.js sahifasiga ~100 KB qo'shadi.
   *Yumshatish:* `next/dynamic` bilan `ssr: false` yuklanadi (loyihada `IntegratedPlayground`
   uchun shu naqsh allaqachon ishlatilgan).

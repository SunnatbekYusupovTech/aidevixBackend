# Video streaming: Bunny Stream → mkhls-streamer

**Sana:** 2026-08-05 (rev. 2 — 2026-08-09: infratuzilma qarori)
**Holat:** Dizayn tasdiqlangan, implementatsiya rejasi kutilmoqda

> **rev. 2 o'zgarishlari:** hosting Contabo VPS deb belgilandi; storage MinIO/S3 o'rniga
> lokal disk; presetlar screencast uchun qayta hisoblandi (1080p qo'shildi, 360p olib
> tashlandi); bepul darslar YouTube'ga ajratildi; original master arxivi majburiy qoida
> bo'ldi; 9-bo'lim (infratuzilma) qo'shildi; 1 va 2-risklar qayta yozildi.

---

## 1. Kontekst va maqsad

Aidevix'da hozir video oqim **umuman ishlamaydi**. Mavjud integratsiya Bunny.net Stream'ga
qurilgan (`backend/utils/bunny.js`), lekin Bunny pullik xizmat va loyiha uni ishlatmayapti.
Foydalanuvchi `/videos/[id]` sahifasiga kirganda `player.embedUrl` hech qachon
to'ldirilmaydi va "Video tayyorlanmoqda" ekrani ko'rsatiladi.

**Maqsad:** Bunny Stream'ni o'z infratuzilmamizdagi **mkhls-streamer** (Go, HLS media server)
bilan almashtirish va Aidevix'da to'liq ishlaydigan video oqim yo'lini qurish.

### Kontent bo'linishi (rev. 2)

Barcha video mkhls orqali o'tmaydi:

| Kontent | Qayerda | Sabab |
|---|---|---|
| **Bepul darsliklar** | YouTube (public) | Trafikning katta qismi shu yerda; Google bepul ko'taradi. Ustiga SEO va discovery. |
| **Pullik darslar** | mkhls (o'z VPS'imiz) | Himoya kerak; token bilan cheklangan oqim. |

Bu bo'linish infratuzilma talabini keskin kamaytiradi — o'z serverimiz faqat pullik
kontentni tarqatadi.

**Qattiq qoida:** pullik dars hech qachon YouTube'ga chiqmaydi, hatto `unlisted` bo'lsa ham.
Unlisted havola tarqaladi va `yt-dlp` bilan yuklab olinadi.

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
| Bepul kontent | YouTube | Trafikning katta qismini Google bepul ko'taradi |
| Hosting | **Contabo VPS** (150 GB, 200 Mbit/s, unlimited traffic) | O'zgaruvchi xarajat nol; disk va trafik shu ish yuki uchun eng mos |
| Storage | **Lokal VPS diski** | 150 GB yetadi; S3 qatlami hozir keraksiz murakkablik |
| Original mp4 arxivi | Tashqi disk / Drive (VPS'dan tashqarida) | **Majburiy** — pastdagi qoidaga qarang |
| Transcode vaqti | Oldindan, yuklashda bir marta | Kuchsiz VPS JIT'da ko'p tomoshabinni ko'tara olmaydi |
| Presetlar | **1080p + 720p + 480p** | Screencast: kod o'qilishi kerak; 360p'da kod umuman o'qilmaydi |
| Frontend player | Vidstack | HLS + sifat/tezlik/PiP/klaviatura tayyor |
| Token IP bog'lanishi | **Yo'q** (boshida) | Mobil internetda IP o'zgaradi va player o'ladi |

### Original master arxivi — majburiy qoida

Transcode tugagach original mp4 **VPS diskidan o'chiriladi** (joy tejash uchun), lekin
**VPS'dan tashqarida nusxasi qolishi shart**. Original butunlay yo'q qilinsa:

1. Keyinchalik yangi preset qo'shib bo'lmaydi (masalan 1440p) — manba yo'q
2. Transcode xatosi (noto'g'ri audio trek, kesilgan oxiri) qaytarib bo'lmas bo'ladi
3. **VPS o'lsa yoki akkaunt to'xtatilsa, butun pullik kurs kutubxonasi yo'qoladi** —
   bu mahsulotning o'zi

Amaliy yechim ($0): darsni yozgan odam master faylni o'zida (tashqi HDD yoki Drive)
saqlaydi — fayllar allaqachon unda bor. Buni **jarayon qoidasi** qilish kerak, tasodifga
qoldirmaslik.

Operatsion shart: `streamStatus === 'ready'` bo'lgandan **keyin** original o'chiriladi,
undan oldin emas.

### Nima uchun Google Drive origin sifatida rad etildi

- mkhls lokal fayl va S3 biladi; Drive/Yandex API'si boshqacha → mahsulotga shubhali adapter
  yozish kerak bo'lardi
- Transcode manbadan range request (seek) talab qiladi; Drive katta fayllarda
  "download quota exceeded" va virus-scan interstitial qaytaradi
- Drive'ni media backend qilish ToS'ga zid — akkaunt cheklanishi kurslarning yo'qolishi demak

Drive'ning to'g'ri o'rni: transcode tugagandan keyin original mp4 nusxasi (sovuq arxiv),
sifat presetlari o'zgarganda qayta transcode uchun.

---

## 4. Arxitektura

```
ADMIN brauzer            Aidevix backend (Railway)          mkhls-streamer (Contabo VPS)
                                                                          │
  mp4 ──PUT octet-stream──▶ /api/videos/:id/upload-proxy ──multipart──▶ POST /admin/videos/upload
                                     │                                    └─▶ {media}/aidevix/{id}.mp4
                                     │                                        │
                                     │                          POST /admin/videos/{path}/transcode
                                     │                                        │
                                     │                                  ffmpeg (lokal fayl)
                                     │                                        ▼
                                     │                    {cache}/vod/aidevix/{id}.mp4/{1080p,720p,480p}/*.ts
                                     │                                        │
                                     │                          ready → original mp4 o'chiriladi
                                     │                                  (tashqi arxivda nusxasi bor)
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

**Ish nusxasi:** `C:\Users\ASUS\Documents\MyPros\AiDeVix\mkhls-streamer` (`main` @ `51dd410`).
Aidevix repo'sidan tashqarida — 1-bo'limdagi "mijoz, klonuvchi emas" qoidasiga muvofiq.

**Remote holati (qasddan shunday):**

```
origin  github.com/alloplay-org/mkhls-streamer   (fetch)
origin  PUSH-DISABLED--fork-qiling-spec-5-bolim  (push)   ← push bloklangan
```

Fetch ishlaydi (upstream yangilanishlarini olish mumkin), push esa `fatal` bilan to'xtaydi.
Sabab: AlloPlay repo'siga tasodifiy push bo'lmasligi kerak.

**Reja:** A-seriya ishi shu lokal nusxada commit qilinadi, **push qilinmaydi**. Keyinchalik
mkhls **alohida repo**ga ko'chiriladi — commitlar va tarix saqlanadi, faqat remote va repo
yangi bo'ladi. Ya'ni ko'chirish `git remote set-url` darajasidagi ish, tarixni qayta qurish emas.

Shu paytgacha ish `main` da emas, `feat/...` branch'ida olib boriladi, toki `main`
upstream'ning toza nusxasi bo'lib qolsin va ko'chirishda farq aniq ko'rinsin.

> ⚠️ **Push yo'q ekan, bu papka yagona nusxa.** `AiDeVix\mkhls-streamer` yo'qolsa,
> A-seriya ishi ham yo'qoladi. Alohida repoga ko'chirish kechiktirilmasin yoki papka
> zaxiralansin. (Bu 14-bo'limdagi 6-riskning aynan o'sha shakli.)

**Fayl yo'llari haqida ikkita aniqlik (rev. 2 da tekshirildi):**

- Handler'larning haqiqiy yo'li — `internal/interfaces/http/handler/admin_handler.go`
  (quyida `handler/` tushib qolgan joylar bor)
- Repo'da `internal/interface/http/` **va** `internal/interfaces/http/` — ikkalasi ham bor.
  A-seriyani boshlashdan oldin qaysi biri tirik ekanini aniqlash kerak; o'lik nusxa bo'lsa
  alohida commit bilan o'chiriladi (bu ham upstream tozalash).

### A1. S3 manbadan transcode — **KECHIKTIRILDI (rev. 2)**

rev. 1 da storage MinIO (S3) edi, shuning uchun ffmpeg'ni S3 manbaga ulash kerak edi.
rev. 2 da storage **lokal disk**, ya'ni `transcoding_service.go` dagi `video.Path` allaqachon
to'g'ri ishlaydi va bu ish **hozir kerak emas**.

Kelajakda R2/S3'ga ko'chilganda qaytariladi. O'shanda yechim: `StartTranscoding` da
`video.Path` o'rniga `resolveInputURL(ctx, video)` — local manbada fayl yo'li, s3 manbada
`PresignedGetObject` (ffmpeg HTTP range'ni qo'llab-quvvatlaydi). `GetMediaInfo` ham
xuddi shu URL bilan.

> Bu 2-bosqichni sezilarli qisqartiradi. A6 esa baribir kerak.

### A2. Video uchun transcode'ni ishga tushirish endpointi

Hozir transcode faqat `POST /admin/videos/scan` ichida, lokal katalog uchun ishga tushadi.
Bitta videoni nishonlab bo'lmaydi.

```
POST /admin/videos/{id}/transcode
Body: { "presets": ["1080p","720p","480p"] }   // ixtiyoriy, bo'sh bo'lsa avtomatik
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
  "transcode": { "progress_percent": 42, "presets_done": ["480p"], "presets_total": 3 }
}
```

### A5. Yuklash yo'lini (kalitni) boshqarish

`UploadVideo` hozir saqlash yo'li sifatida `header.Filename` ni ishlatadi. Mijoz yo'lni aniq
belgilay olishi kerak (namespace uchun):

```
POST /admin/videos/upload
  form field "file"  — binary
  form field "path"  — ixtiyoriy, masalan "aidevix/68f….mp4"
```

`path` berilmasa — hozirgidek `filename`. Yo'l tozalanadi (`..`, absolyut yo'l, boshidagi
`/` rad etiladi).

### A7. Transcode'dan keyin manbani o'chirish (yangi, rev. 2)

Repo'da bunday imkoniyat **yo'q** (`delete_source` / `remove_source` bo'yicha qidiruv bo'sh).
150 GB disk uchun bu kerak — original mp4 transcode chiqishidan katta va tayyor bo'lgach
serverda turishi shart emas.

```yaml
vod:
  delete_source_after_transcode: false   # default false — orqaga moslik
```

Shartlar (ehtiyotkorlik muhim — bu qaytarib bo'lmas amal):

- faqat **barcha** presetlar muvaffaqiyatli tugagandan va status `ready` bo'lgandan keyin
- transcode chiqishi tekshirilgandan keyin (master playlist mavjud, har preset'da
  segmentlar bor, `duration > 0`)
- biror preset `failed` bo'lsa — manba **saqlanadi**
- o'chirish alohida log yozuvi qoldiradi

Bu generic feature — istalgan mijozga kerak.

### A8. Preset sozlamalari — kod o'zgarishi kerak emas

`internal/infrastructure/config/config.go:127` `Presets []PresetConfig` — presetlar
YAML'da to'liq sozlanadi (`name`, `width`, `height`, `video_bitrate`, `audio_bitrate`).
Screencast bitrate'lari **config orqali** beriladi, upstream kodga tegilmaydi.
Qiymatlar 9-bo'limda.

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

`streamPath` — mkhls'dagi saqlash yo'li va public URL yo'li (`/` bilan). `id` — mkhls'ning ichki
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
  mkhls:        # mkhls-streamer image, :8080
                # VOD_SOURCE_TYPE=local
                # VOD_MEDIA_PATH=/media          (original mp4)
                # VOD_CACHE_PATH=/cache          (HLS chiqishi)
                # transcode_on_upload=true
                # delete_source_after_transcode=false   ← lokalda O'CHIQ
    volumes:
      - ./.data/media:/media
      - ./.data/cache:/cache
```

MinIO **olib tashlandi** (rev. 2) — prod'da ham, lokalda ham lokal disk ishlatiladi, ya'ni
lokal muhit prod'ga o'xshaydi.

Lokalda `delete_source_after_transcode` **o'chiq** bo'lishi shart: sinov paytida
manba faylni qayta-qayta ishlatish kerak bo'ladi.

mkhls image AlloPlay repo'sidan quriladi (`deployments/docker/`), Aidevix repo'sida faqat
compose fayli va `.env.example` bo'ladi.

`backend/.env.example` ga `MKHLS_*` o'zgaruvchilari qo'shiladi, `BUNNY_*` deprecated deb
belgilanadi.

---

## 9. Infratuzilma (rev. 2)

### 9.1 Server

**Contabo VPS** — 150 GB disk, 200 Mbit/s port, unlimited traffic, ~€6/oy. Germaniya DC
(O'zbekistonga xalqaro tranzit odatda Yevropa orqali o'tadi).

Bu **yagona takrorlanuvchi xarajat**. O'zgaruvchi xarajat nol: 10 ta ham, 500 ta ham
o'quvchi bo'lsa hisob bir xil. Bunny'ga nisbatan 10–50 barobar arzon va o'quvchi soni
oshgani bilan o'smaydi.

Contabo'ning ikkita ma'lum kamchiligi, ikkalasi ham bu ish yuki uchun chidasa bo'ladi:

- **Shared (oversubscribed) vCPU** → ffmpeg ajratilgan vCPU'ga qaraganda ~1.5–2× sekin.
  Yuklash siyrak bo'lgani uchun ahamiyatsiz (14-bo'lim, 1-risk).
- **Backup ichida yo'q** → 3-bo'limdagi arxiv qoidasi shuning uchun majburiy.

### 9.2 Asosiy cheklov: port, trafik emas

"Unlimited traffic" chalg'itadi. Cheklaydigan narsa **200 Mbit/s port**, va u hajmni emas,
**bir vaqtdagi tomoshabinlar sonini** cheklaydi:

| Preset | Bitrate | Nazariy concurrent |
|---|---|---|
| 1080p | 1.5 Mbps | ~130 |
| 720p | 0.9 Mbps | ~220 |
| 480p | 0.5 Mbps | ~400 |
| **ABR aralash (real)** | ~1.0 Mbps | ~200 → **xavfsiz ~140** |

Xavfsiz raqam pastroq, chunki HLS burst bilan yuklaydi (segment tez tortiladi, keyin
pauza) — o'rtacha bitrate emas, peak muhim.

**Bu chegara qattiq:** undan oshganda hisob o'smaydi, **hamma birdaniga buferlanadi**.
Shuning uchun concurrent ulanishlar boshidanoq kuzatiladi (9.6).

Pullik kontent uchun bu yetarli: ~300 pullik obunachida peak concurrent odatda 15–30.
Chegaraga yetish uchun ~1500+ faol pullik obunachi kerak.

### 9.3 Disk byudjeti

```
150 GB − OS/Docker/loglar (~20 GB) = ~130 GB
1 soatlik dars (3 preset)  ≈ 1.3 GB
1 ta o'rtacha dars (35 daq) ≈ 0.76 GB
→ sig'im ≈ 170 dars
```

Bu **qattiq devor** va jimgina to'lmaydi — disk 100% bo'lganda transcode ham, oqim ham
buziladi. 80% da alert (9.6).

### 9.4 Preset sozlamalari — screencast uchun

Dasturlash darsi deyarli statik ekran. Standart konfigdagi qiymatlar (1080p = 5000k)
oddiy video uchun mo'ljallangan va bu yerda 3× ortiqcha:

| Preset | O'lcham | Video bitrate | Audio | Sabab |
|---|---|---|---|---|
| 1080p | 1920×1080 | **1500k** | 128k | Kod o'qilishi uchun kerak |
| 720p | 1280×720 | **900k** | 96k | Asosiy preset, ABR ko'pincha shuni tanlaydi |
| 480p | 854×480 | **500k** | 64k | Sekin internet uchun fallback |

**360p olib tashlandi** — 360p'da kod umuman o'qilmaydi, ya'ni u foydasiz preset:
disk va transcode vaqtini yeydi, lekin hech kimga yaramaydi.

ffmpeg tomonda: `-preset slow -crf 23 -g 48 -sc_threshold 0`. Sekinroq encode, lekin
sezilarli kichik fayl va yaxshi sifat — yuklash siyrak bo'lgani uchun sekinlik muhim emas.

Bu qiymatlar **prod config YAML'ida** beriladi (A8), upstream kodga tegilmaydi.

### 9.5 Tarmoq va xavfsizlik konturi

```
stream.aidevix.uz  →  nginx (TLS, Let's Encrypt)  →  mkhls :8080
                        ├── /vod/*    public (token bilan)
                        ├── /health   public
                        └── /admin/*  DENY — faqat localhost / IP allowlist
```

`MKHLS_PUBLIC_URL=https://stream.aidevix.uz`, `MKHLS_BASE_URL` — Railway'dan admin API'ga.
Admin API internetga ochilmaydi (10-bo'lim, 6-band), shuning uchun Railway backend'i uchun
IP allowlist yoki alohida himoyalangan yo'l kerak — bu deploy bosqichida hal qilinadi.

> **Cloudflare haqida ogohlantirish:** `stream.aidevix.uz` ni Cloudflare'ga qaratib
> **orange-cloud (proxy) yoqmaslik kerak**. Bepul/Pro tarifda oddiy CDN orqali video
> tarqatish ToS 2.8 ga zid va akkaunt to'xtatilishi mumkin. DNS-only (grey cloud).
> R2'dan egress esa bunga kirmaydi — 9.7 dagi o'sish yo'liga qarang.

### 9.6 Monitoring (yangi — deploy bosqichining bir qismi)

AlloPlay'da tayyor stack bor: `alloplay-infra/configs/grafana/dashboards/mkhls-streamer.json`
va Prometheus/Loki/AlertManager konfiglari. Aidevix shuni qayta ishlatadi.

Majburiy alertlar:

| Alert | Chegara | Nima uchun |
|---|---|---|
| Disk to'lishi | >80% | 9.3 dagi qattiq devor |
| Concurrent ulanishlar | >100 | 9.2 dagi port chegarasiga yaqinlashuv |
| Transcode navbati | >3 ish yoki >2 soat | Yuklash tiqilib qolgan |
| mkhls `/health` | 2 daq javob yo'q | Xizmat o'lgan |

### 9.7 O'sish yo'li — qachon nima qilinadi

Hozir hech biri qilinmaydi. Har biri **o'lchov natijasida** ishga tushadi, taxmin bilan emas:

| Signal | Harakat | Narx |
|---|---|---|
| Disk >80% | Contabo block storage yoki plan oshirish | ~€3.5/250 GB |
| Concurrent >120 muntazam | Cloudflare **R2 + Worker** delivery qatlami | ~$2/oy, egress $0 |
| Toshkentda peak-soat buferlanish shikoyati | Xuddi shu R2+Worker (CF'da Toshkent PoP bor) | ~$2/oy |
| UZ auditoriya yetakchi bo'lsa | **TAS-IX edge node** (`internal/cluster/edge.go`) | UZ VPS narxi |

Uchalasi ham `stream.aidevix.uz` domenini saqlaydi → **frontend va Aidevix backend kodiga
tegilmaydi**. Migratsiya narxi shuning uchun past va hozir qaror qilish shart emas.

TAS-IX alohida qiymatga ega: ko'p UZ operatorlarida TAS-IX ichidagi trafik foydalanuvchi
tarifidan yechilmaydi — ya'ni o'quvchi darsni ko'rganda mobil internetini sarflamaydi.
Bu infratuzilma emas, **mahsulot ustunligi**. (Operatorlar bilan tasdiqlash kerak —
tarif siyosati o'zgarib turadi.)

---

## 10. Xavfsizlik

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

## 11. Xatoliklarni boshqarish

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

## 12. Test rejasi

**mkhls (upstream):**
- `delete_source_after_transcode` (A7) — barcha presetlar `ready` bo'lgandagina o'chirish;
  biror preset `failed` bo'lsa manba **saqlanishi** (bu eng muhim test — amal qaytarib
  bo'lmas)
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

## 13. Bosqichlar

| # | Bosqich | Natija |
|---|---|---|
| 1 | Lokal muhit | `docker compose up` bilan mkhls ishlaydi (lokal disk, MinIO'siz), `/health` javob beradi |
| 2 | mkhls upstream (A2, A6, A3, A4, A5, A7) | Ichma-ich yo'l bilan pre-transcode ishlaydi, testlar o'tadi |
| 3 | Backend client + model | `utils/mkhls.js` + `Video` schema + unit testlar |
| 4 | Backend controller | upload/status/getVideo/delete oqimi to'liq |
| 5 | Bug fixlar | progress delta, viewCount, `rating`, `getCourseVideos` leak |
| 6 | Frontend player | `LessonPlayer` + `page.tsx` + slice/types |
| 7 | Admin panel | nomlar + transcode progressi |
| 8 | Xavfsizlik tozalash | `fetch_bunny.html` o'chirish, Bunny kalitini bekor qilish |
| 9 | Deploy | Contabo + nginx + TLS + preset config + monitoring (9-bo'lim) |

1–8 lokalda to'liq bajariladi va tekshiriladi; 9 alohida.

**rev. 2 da 2-bosqich qisqardi:** A1 (S3 presigned transcode) kechiktirildi va A8 config
ishi bo'lib chiqdi. Qolgani: A6 (bug, birinchi tekshiriladi), A2, A3, A4, A5, A7.

---

## 14. Ochiq risklar

1. **Transcode sekinligi** — Contabo'ning shared vCPU'sida 40 daqiqalik darsni 3 presetga
   o'girish ~40–60 daqiqa olishi mumkin.
   *Baho: past.* Ta'lim platformasida yuklash siyrak va to'p-to'p — kurs bir marta
   yuklanadi, keyin oylar davomida ko'riladi. Hech kim darsni yuklangan zahoti ko'rmaydi.
   *Yumshatish:* ketma-ket navbat + admin panelda aniq progress (A4). Katta kurs
   ko'chirilayotganda serverni vaqtincha kattalashtirish mumkin (Contabo soatbay emas —
   bu Hetzner'dagidek arzon emas, shuning uchun oddiy yechim: kechasi yuklash).

2. **Disk 150 GB — qattiq devor** — sig'im ≈ 170 dars (9.3). Disk 100% bo'lganda transcode
   ham, oqim ham buziladi.
   *Yumshatish:* 80% da alert (9.6); transcode tugagach original o'chiriladi (A7);
   devorga yaqinlashganda block storage yoki R2 (9.7). Hech biri shoshilinch qaror emas.

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

6. **Bitta VPS — yagona nosozlik nuqtasi (eng jiddiy risk).** Contabo diski buzilsa,
   akkaunt to'xtatilsa yoki to'lov o'tmasa, pullik kurslar **butunlay yo'qoladi** — bu
   mahsulotning o'zi. Contabo'da backup ichida yo'q.
   *Yumshatish:* 3-bo'limdagi **majburiy** original master arxivi. Bu risk texnik emas,
   **jarayon** riski — arxiv qoidasi buzilsa, yumshatish ham yo'q. Transcode chiqishi
   yo'qolsa, masterlardan qayta transcode qilish og'riqli lekin mumkin; masterlar yo'qolsa
   — hech narsa qilib bo'lmaydi.
   Keyingi qadam (ixtiyoriy, ~$2/oy): `rclone` bilan haftalik R2'ga sync — serving uchun
   emas, faqat arxiv, kod o'zgarishisiz.

7. **200 Mbit/s port — concurrent chegara** (9.2). Chegaradan oshganda hisob o'smaydi,
   **hamma birdaniga buferlanadi**, ya'ni nosozlik jimgina emas, keskin bo'ladi.
   *Yumshatish:* concurrent ulanishlar alerti (9.6) chegaradan oldin ogohlantiradi;
   o'sish yo'li 9.7 da tayyor.

8. **Bepul/pullik chegara buzilishi** — pullik dars xato bilan YouTube'ga (hatto unlisted)
   chiqib ketsa, u `yt-dlp` bilan yuklab olinadi va himoya ma'nosini yo'qotadi.
   *Yumshatish:* 1-bo'limdagi qattiq qoida; admin panelda ikki oqim aniq ajratilgan
   bo'lishi kerak (bu 7-bosqichda hisobga olinadi).

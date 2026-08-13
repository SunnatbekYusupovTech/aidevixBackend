# Plan 5 — beshta jonli xato

**Sana:** 2026-08-12
**Holat:** dizayn tasdiqlangan, ijro rejasi kutilmoqda
**Repolar:** `AiDeVix/aidevixBackend` (4 band) va `AiDeVix/mkhls-streamer` (1 band)

---

## 1. Nima uchun

mkhls migratsiyasi (bosqich 1-8 + Plan 4) tugadi, lekin HANDOFF'da yig'ilib qolgan
beshta **jonli** xato bor. Ularning hech biri deploy qadami emas va uchtasi
xavfsizlikka tegishli. Bu spec ularni yopadi.

Har bir band kod bo'yicha tekshirildi — HANDOFF'dagi tavsiflarga ishonilmadi, chunki
oldingi bosqichda spec da'volarining uchtasi noto'g'ri chiqqan edi.

## 2. Band 1 — kengaytmalar ro'yxati ikkiga ajralib ketgan (mkhls)

### 2.1 Bug

`internal/interfaces/http/handler/admin_handler.go:791-794` yuklashda **sakkizta**
kengaytmani qabul qiladi:

```go
validExtensions := map[string]bool{
    ".mp4": true, ".mkv": true, ".avi": true, ".mov": true,
    ".webm": true, ".flv": true, ".wmv": true, ".m4v": true,
}
```

Ikkala config esa faqat **beshtasini** sanaydi (`configs/production/config.yaml`,
`configs/development/config.yaml` → `vod.allowed_extensions`), va
`internal/infrastructure/config/config.go:361` dagi default ham xuddi shu beshta.

Natija: `.flv`, `.wmv`, `.m4v` **yuklanadi**, lekin `LocalVideoSource` ularni
qidirmaydi — `findVideoFile` to'g'ridan-to'g'ri stat filialini o'tkazib yuboradi
(kengaytma qo'llab-quvvatlanadigan ro'yxatda yo'q) va `x.flv.mp4`, `x.flv.mkv` …
ni sinaydi. Hech biri mavjud emas → **doimiy 404**, va `triggerPreTranscode`
ishga tushmagani uchun o'z-o'zini tuzatish ham yo'q.

Bu Plan 4 Task 1 aynan `.mp4` uchun yopgan xatoning **o'zi**, uch format uchun
hamon ochiq.

### 2.2 Qaror va yechim

Foydalanuvchi qarori: **yuklash ro'yxati beshtaga toraytiriladi**. `.flv`, `.wmv`,
`.m4v` yuklanmaydi. Sabab: admin darhol aniq xato oladi, hozirgidek yuklab bo'lib
keyin jimgina 404 olmaydi; va bu formatlar bilan transcode preset'lari hech qachon
sinalmagan.

**Ro'yxat qattiq yozilmaydi — config'dan olinadi.** Qattiq yozilgan mapni tahrirlash
aynan shu ajralishni qaytadan yaratadi: ikki ro'yxat mustaqil ravishda yana
ajraladi. Shuning uchun:

- `AdminHandler` ga `allowedExtensions []string` maydoni qo'shiladi
  (`admin_handler.go:50-62` dagi struct — u hozir `videoRootPath`,
  `transcodeOnUpload` kabi alohida maydonlarni ushlaydi, config'ning o'zini emas;
  bu naqsh saqlanadi).
- `internal/application/app.go` da handler quriladigan joyda
  `config.VOD.AllowedExtensions` uzatiladi — o'sha qiymat `app.go:244` va `:257`
  da `NewLocalVideoSource`/`NewS3VideoSource` ga allaqachon berilyapti, ya'ni
  yagona haqiqat manbai bo'ladi.
- Xato xabari ham shu ro'yxatdan quriladi, qo'lda yozilmaydi — aks holda matn
  ro'yxatdan ajralib qoladi.

## 3. Band 2 — bosh sahifa yiqilishi (frontend)

`frontend/src/components/home/ContinueWatching.tsx:6` va
`frontend/src/components/home/RecommendedForYou.tsx:5`:

```ts
import { motion } from 'framer-motion';
```

Ikkala komponent `frontend/src/components/home/HomeClient.tsx:1103-1104` da
render bo'ladi, va o'sha joy `<LazyMotion features={domAnimation} strict>`
(`HomeClient.tsx:668-1197`) **ichida**. `strict` rejimi aynan `motion` ni
ishlatishni taqiqlaydi va xato tashlaydi — `m` talab qilinadi.

`HomeClient.tsx:7` ning o'zi to'g'ri qiladi: `import { LazyMotion, domAnimation, m }`.

**Yechim:** ikkala faylda `motion` → `m`, va fayl ichidagi barcha `motion.` →
`m.`. Boshqa o'zgarish yo'q.

`BetaWelcomeModal.tsx` HANDOFF'da xuddi shu muammo bilan sanalgan edi, lekin
tekshirilganda unda `framer-motion` importi umuman yo'q — allaqachon tuzatilgan
yoki hech qachon bo'lmagan. Unga tegilmaydi.

## 4. Band 3 — `getVideo` proyeksiyasi (backend)

`backend/controllers/videoController.js:141`:

```js
const video = await Video.findById(id).populate('course').lean();
```

Proyeksiya yo'q, va `:231` da `course: video.course` javobga to'liq qo'yiladi —
ya'ni butun `Course` hujjati har qanday obuna bo'lgan foydalanuvchiga chiqadi.

**Qaysi maydonlar kerakligi taxmin qilinmaydi — frontend'ning o'z tipi aytadi**
(`frontend/src/types/video.ts:10-14`):

```ts
course?: {
  _id: string;
  title: string;
  category?: string;
};
```

Ichki iste'molchilar ham shu uchtadan nariga chiqmaydi: `video.course?.category`
(Pro darvozasi, `videoController.js:151`) va `video.course?._id` (`:208`).

**Yechim:** `.populate('course', '_id title category')`.

## 5. Band 4 — `markVideoWatched` a'zolikni tekshirmaydi (backend)

Beshtasining ichida eng jiddiysi.

### 5.1 Mexanizm

`backend/controllers/enrollmentController.js`:

- `:73-76` — `course` `Course.findById(courseId).select('videos')` bilan yuklanadi.
- `:80` — `videoId` bo'yicha `watchedVideos` ichidan qidiriladi.
- `:86` — topilmasa **shartsiz** `enrollment.watchedVideos.push({ videoId, ... })`.
- `:93-95` — `progressPercent = watchedVideos.length / course.videos.length`.
- `:100-104` — `progressPercent >= 100` bo'lsa `_issueCertificate` chaqiriladi.
- `:116` — `Video.updateOne({ _id: videoId }, { $inc: { viewCount: 1 } })`.

`videoId` ning `courseId` ga tegishli ekani **hech qayerda tekshirilmaydi**.
Ya'ni obuna bo'lgan foydalanuvchi N ta ixtiyoriy `videoId` bilan endpoint'ni
chaqirib `progressPercent` ni 100% ga yetkazadi va **sertifikat oladi**. Shu bilan
birga ixtiyoriy videoning `viewCount` i oshadi — bosh sahifa videolarni aynan
shu bo'yicha saralaydi.

### 5.2 Yechim

Tuzatish arzon, chunki kerakli ma'lumot allaqachon qo'lda: `course.videos`.
`push` dan **oldin** a'zolik tekshiriladi; tegishli bo'lmasa so'rov rad etiladi
va hech qanday yon ta'sir (progress, sertifikat, `viewCount`, ActivityLog)
ishlamaydi. Qo'shimcha DB so'rovi kerak emas.

Rad etish kodi **404** bo'ladi, 403 emas: mavjud bo'lmagan yoki bu kursga
tegishli bo'lmagan dars — foydalanuvchi uchun bir xil, "topilmadi". Bu qo'shni
javob bilan izchil (`:78` — "Siz bu kursga yozilmagansiz" ham 404).

### 5.3 Ataylab qamrovdan tashqari

Eski `enrollment.watchedVideos` yozuvlarida allaqachon begona `videoId` bo'lishi
mumkin — ular progress'ni bugun ham shishirib turibdi. Tozalash **migratsiya**
bo'ladi va bu loyihada DB'ga tegmaslik izchil qaror bo'lgan (bosqich 8, Plan 4).
HANDOFF'ga ochiq band sifatida yoziladi.

## 6. Band 5 — yuklash hajmi chegarasi yo'q (backend)

`backend/controllers/videoController.js` dagi `uploadVideoProxy` `Content-Length`
ni o'qiydi va musbat emasligini tekshirib **411** qaytaradi, lekin **yuqori
chegara yo'q**. Express'ning `STRICT_JSON_LIMIT`/`FORM_LIMIT` (`backend/index.js:226,231`)
bu yo'lga tegishli emas — `upload-proxy` xom `octet-stream` ni to'g'ridan-to'g'ri
pipe qiladi.

**Yechim:** `Content-Length` **5 GB** dan katta bo'lsa **413** qaytariladi
(foydalanuvchi qarori). Chegara nomlangan konstanta sifatida yoziladi, sehrli
raqam emas.

**Faqat backend proxy'da.** mkhls'ning o'z admin API'sida ham chegara yo'q, lekin
ilova unga faqat shu proxy orqali boradi. mkhls tomonidagi bo'shliq hujjatlashtiriladi,
tuzatilmaydi (YAGNI).

## 7. Testlar

| Band | Test |
|---|---|
| 1 | Go test: `.flv` yuklash → 400 `INVALID_FILE`; `.mp4` → o'tadi. Ro'yxat config'dan kelishini qulflash uchun handler bo'sh bo'lmagan maxsus ro'yxat bilan quriladi. |
| 2 | `frontend/e2e/homepage.spec.ts` — bosh sahifa xatosiz yuklanishi va ikkala blok render bo'lishi. |
| 3 | `backend/__tests__/integration/video.routes.test.js` — javobdagi `data.video.course` da faqat `_id`, `title`, `category` bo'lishi. |
| 4 | Yangi `backend/__tests__/integration/enrollment.routes.test.js` — begona `videoId` rad etiladi, `progressPercent` o'zgarmaydi, sertifikat chiqmaydi, `viewCount` oshmaydi; tegishli `videoId` esa ishlaydi. |
| 5 | Xuddi shu `video.routes.test.js` — 5 GB dan katta `Content-Length` → 413; chegaradagi qiymat → o'tadi. |

Har bandda TDD: test avval qizil bo'lishi SHART. 4-band uchun bu ayniqsa muhim —
tekshiruvsiz test yashil bo'lsa, u hech narsa isbotlamaydi.

## 8. Qamrovdan tashqari — ataylab

- **DB migratsiyasi** (§5.3).
- **mkhls tomonidagi hajm chegarasi** (§6).
- **`.flv`/`.wmv`/`.m4v` ni haqiqatan qo'llab-quvvatlash** — foydalanuvchi rad etdi.
- `BetaWelcomeModal.tsx` — tekshirildi, muammo yo'q (§3).
- HANDOFF'dagi qolgan ochiq bandlar: `Providers.tsx` Google client ID,
  `seed-dev-user.js` `emailVerified`, resume "eng uzoq vs oxirgi" xatti-harakati,
  eski `watchedSeconds` migratsiyasi. Bu spec ularga tegmaydi.

## 9. Xavflar

| Xavf | Yumshatish |
|---|---|
| Band 1 config'ni handler'ga ulash `app.go` va konstruktor imzosini o'zgartiradi | O'zgarish bitta qo'shimcha parametr; mavjud naqsh (`videoRootPath`, `transcodeOnUpload`) aynan shunday |
| Band 3 proyeksiyasi ko'rinmagan iste'molchini buzishi | Frontend tipi va ikkita ichki chaqiruv joyi tekshirildi; reja qidiruv qadamini majbur qiladi |
| Band 4 tuzatishi qonuniy oqimni bloklashi | Test ikkala tomonni ham qamraydi: begona ID rad etiladi, tegishli ID o'tadi |
| Band 2 ni faqat build bilan tekshirish yolg'on ishonch beradi | `frontend/tsconfig.json` da `noCheck: true`; yagona ishonchli tekshiruv — e2e |
| Band 5 chegarasi qonuniy katta darsni rad etishi | 5 GB foydalanuvchi tanlovi; 40-60 daqiqalik 1080p manba odatda 2-4 GB |

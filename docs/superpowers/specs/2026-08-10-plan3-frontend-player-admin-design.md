# Plan 3 — Frontend player va admin panel (spec 6-7 bosqich)

**Sana:** 2026-08-10
**Holat:** dizayn tasdiqlangan, reja yozilmagan
**Asos:** `2026-08-05-video-streaming-mkhls-design.md` rev. 4 (§7 C1-C4, §11, §14, §16.8)
**Oldingi bosqich:** `docs/superpowers/HANDOFF.md` — 3-5 bosqich tugagan, backend shartnomalari mahkamlangan

Bu hujjat asosiy spec'ning §7 (Komponent C) bo'limini almashtiradi. §7 rev. 1 da yozilgan
va o'shandan beri to'rtta narsa o'zgardi: backend shartnomalari mahkamlandi (Plan 2),
mkhls javoblarining haqiqiy shakli aniqlandi (rev. 3), progress bug'i ikkita call site'da
ekani ma'lum bo'ldi (§16.8), va Task 13 tuzatishi admin panelni jimgina buzdi (pastda).
Ziddiyat bo'lsa **shu hujjat ustun**.

---

## 1. Nima uchun bu ish kerak

Backend `player.embedUrl` o'rniga `player.hlsUrl` qaytaradi. Frontend hamon `embedUrl`ni
o'qiydi. Ya'ni **hozir hech qaysi sahifada video umuman o'ynamaydi** — ikkala player ham
(`videos/[id]/page.tsx:411` va `videos/[id]/playground/page.tsx:467`) `undefined` manba
bilan bo'sh iframe chizadi.

Bu Plan 3 ning majburiy minimumi. Qolgan hammasi shu bilan bir vaqtda ochiladigan
qarzlar.

### 1.1 Migratsiya ochib qoldirgan to'rtta narsa

Bular Plan 2 review'larida ko'rinmagan, chunki hech biri backend kodida emas.

1. **Admin panel dars ro'yxati jimgina buzuq.** Task 13 `getCourseVideos` ga
   proyeksiya qo'shdi (`videoController.js`, `.select('… streamStatus')`) — `bunnyVideoId`
   va `bunnyStatus` endi qaytmaydi. Admin ro'yxati esa aynan shularni o'qiydi
   (`admin/courses/[id]/page.tsx:621, 641`). Natija: **har bir dars doim `pending`**
   ko'rinadi va "GUID ulash" tugmasi **doim** chiqadi. Xato emas, shunchaki hamma joyda
   `undefined`.

2. **30 soniyalik avtomatik polling hech qachon yozilmagan.** Spec §11 va HANDOFF'ning
   6-bandi uni mavjud deb gapiradi — backend'ning `refreshPreparingStatus`i aynan shu
   poll uchun qurilgan (`videoController.js:61`). Frontendda esa faqat qo'lda
   `window.location.reload()` tugmasi bor. Backend tomon tayyor, klient tomoni yo'q.

3. **`videoSlice` javobning yarmini tashlab yuboradi.** `fetchVideo.fulfilled` faqat
   `video`/`videoLink`/`player`ni oladi; `progress` va `streamStatus` e'tiborsiz qoladi
   (`store/slices/videoSlice.ts:108-114`). Resume ham, polling ham aynan shu ikkitasiga
   tayanadi.

4. **`admin/tools/page.tsx` o'lik oqimni taklif qilib turadi** — CSV bulk-link
   (`videoId,bunnyVideoId`), `bunnyVideoId` maydoniga yozadi, playback esa uni endi
   umuman o'qimaydi.

### 1.2 Qamrov spec §7 dan kengroq

| Spec §7 sanagan | Aslida kerak |
|---|---|
| `page.tsx` player | `page.tsx` **va** `playground/page.tsx` — ikkalasida ham iframe bor |
| `page.tsx` progress call site | ikkala call site (§16.8 buni allaqachon aytgan) |
| `bunnyStatus` → `streamStatus` nomlash | nomlash **+** ro'yxatning buzuq holatini tuzatish |
| — | 30s polling (§11 talab qiladi, hech qachon yozilmagan) |
| — | `failed` holat ekrani (§11 talab qiladi, hech qachon yozilmagan) |
| `transcode.progress_percent` | `presetsDone`/`presetsTotal` — `progress_percent` o'smaydi (rev. 3) |

Oxirgi qator — spec §7 C4 ning **eskirgan bandi**. rev. 3 ning §6 dagi ogohlantirishi
ustun: `progress_percent` butun transcode davomida `0`, oxirida `100`.

---

## 2. Arxitektura

Plan 3 ning murakkabligi playerda emas — **hayot siklida**: resume seek, throttled
progress, token yangilash (proaktiv + reaktiv), `pending`/`processing` uchun polling.
Va bularning hammasi ikkala sahifada bir xil kerak.

Shuning uchun ikkiga bo'linadi:

| Fayl | Mas'uliyati | Biladi | Bilmaydi |
|---|---|---|---|
| `components/videos/LessonPlayer.tsx` | faqat o'ynatish | Vidstack, DOM | Redux, API, i18n |
| `hooks/useLessonStream.ts` | faqat hayot sikli | Redux, `videoApi`, taymerlar | DOM, JSX |

**Chegara sinovi.** `LessonPlayer`ni bitta `.m3u8` URL bilan, Redux'siz ishga tushirish
mumkin bo'lishi kerak. `useLessonStream`ni player'siz chaqirish mumkin bo'lishi kerak.
Ikkalasi ham shu sinovdan o'tadi — o'tmasa chegara noto'g'ri.

Sahifalar faqat ulaydi va gate/xato ekranlarini chizadi. `page.tsx` allaqachon 559 qator;
unga yana taymer mantiqi qo'shilmaydi.

**Rad etilgan variantlar.** (a) Hammasini `LessonPlayer` ichiga solish — playback UI
Redux'ga bog'lanadi, uch tilli matnlar player ichiga tushadi, test qilib bo'lmaydi.
(b) Redux thunk'lari (`pollStreamStatus`, `reportPosition`) — kodbaza uslubiga mos, lekin
`setInterval`/throttle thunk ichida noqulay va pozitsiya yuborish fire-and-forget, unga
state umuman kerak emas.

### 2.1 Vidstack va hls.js

Player kutubxonasi — **Vidstack** (spec §7 C1 tanlovi, tasdiqlandi). Sifat tanlash,
tezlik, PiP, klaviatura, fullscreen va mobil gestures `DefaultVideoLayout`dan keladi.

**Diqqat: `hls.js` alohida dependency sifatida o'rnatiladi va Vidstack'ga uzatiladi.**
Standart holatda `<MediaPlayer>` ishga tushganda hls.js'ni JSDelivr CDN'dan `import()`
qiladi — ya'ni pullik darsning o'ynashi tashqi CDN'ga bog'lanib qolardi. Bundle qilingan
nusxa uzatilsa runtime'da hech qanday tashqi so'rov qolmaydi.

Ikkala sahifa ham komponentni `next/dynamic({ ssr: false })` bilan yuklaydi —
`IntegratedPlayground` da allaqachon ishlatilgan naqsh, spec §14.5 riskining yumshatishi.

### 2.2 Token segmentlarga qanday yetadi (tasdiqlangan)

Bu dizaynning eng katta noaniqligi edi va yopildi. mkhls playlist'ni xizmat qilishdan
oldin **qayta yozadi**: `appendQueryParams`
(`internal/interfaces/http/handler/vod_handler.go:730`) har bir URI qatoriga
`?token=…` qo'shadi. Ya'ni variant playlist va segmentlar tokenni avtomatik meros
oladi.

Xulosa: hls.js uchun hech qanday `xhrSetup` yoki interceptor kerak emas. Backend
qaytargan `hlsUrl`ni to'g'ridan-to'g'ri berish yetarli.

### 2.3 Yangi cross-origin talabi

Eski iframe Bunny'ning o'z sahifasini yuklardi — CORS umuman ishtirok etmasdi. hls.js
esa playlist va segmentlarni `fetch` bilan oladi, ya'ni **mkhls endi CORS sarlavhalarini
berishi shart**.

- **Lokal:** `configs/development/config.yaml:220` — `allowed_origins: ["*"]`. Ishlaydi,
  o'zgarish kerak emas.
- **Prod:** `configs/production/config.yaml:217` hamon `https://your-domain.com`
  placeholder'i. Deploy'da `https://aidevix.uz` ga o'rnatilishi **shart**, aks holda
  brauzer har bir segmentni bloklaydi.

Bu Plan 3 to'sig'i emas (Go repo'ga o'zgarish kerak emas), lekin 9-bosqich uchun qattiq
band — §7 ga yoziladi.

---

## 3. `useLessonStream` shartnomasi

```ts
useLessonStream(videoId: string, opts: { reportProgress: boolean })
  → {
      video, videoLink, streamStatus, loading, error,
      isPreparing: boolean,   // streamStatus 'pending' | 'processing'
      hasFailed:   boolean,   // streamStatus === 'failed'
      playerProps: {
        hlsUrl: string; poster?: string; startAt: number;
        onPosition(sec: number): void;
        onError(): void;
      } | null,
    }
```

`playerProps === null` bo'lsa sahifa o'zining gate / tayyorlanmoqda / xato ekranini
chizadi. Hook hech qachon JSX qaytarmaydi.

`opts.reportProgress` — sahifalar `isLoggedIn && isSubscribed`ni allaqachon hisoblaydi;
hook uni qayta hisoblamaydi.

`videoLink` ham qaytariladi, chunki `page.tsx` ning `telegramLink` shoxi unga tayanadi —
aks holda sahifa `useLessonStream` va `useVideos` ni yonma-yon chaqirishga majbur
bo'lardi va "video holati qayerdan keladi" degan savol ikki javobli bo'lib qolardi.
Sahifalar `useVideos`ni to'g'ridan-to'g'ri chaqirmaydi.

### 3.1 Resume — `startAt` muzlatiladi

`progress.lastPositionSeconds` **birinchi mount'da bir marta** `resumeAtRef` ga
yoziladi. Keyingi hech qanday refetch (token yangilanishi, polling) undan qayta
o'qimaydi.

Nima uchun: 4 soatdan keyin token yangilanganda `fetchById` yangi javob keltiradi, uning
`progress` maydonida esa **shu seans boshidagi** pozitsiya turadi (backend'ga eng ko'pi
10 soniyada bir marta yoziladi, lekin javob baribir eski). Muzlatilmasa player o'sha
eski nuqtaga sakrardi.

```
startAt = positionRef.current > 0 ? positionRef.current : resumeAtRef.current
```

`positionRef` — player'dan kelgan eng oxirgi pozitsiya. Orqaga seek qilingan bo'lsa u
ham orqada bo'ladi, ya'ni `Math.max` ishlatilmaydi (aks holda token yangilanganda
foydalanuvchining ataylab orqaga qaytgani bekor qilinardi).

**Seek sharti `LessonPlayer` ichida:** `startAt > 5 && startAt < duration - 15`
(spec §7 C1.1).

**Bu shart bir vaqtning o'zida ma'lum ma'lumot muammosini ham yopadi.** HANDOFF
("Ma'lum, hali tuzatilmagan muammolar", 3-band): eski `watchedVideos[].watchedSeconds`
yozuvlari kumulyativ shartnoma ostida yozilgan (10+20+30+…), ya'ni deyarli har doim
`duration`dan **katta**. Shart ularni jimgina rad etadi — seek bo'lmaydi, foydalanuvchi
boshidan ko'radi, birinchi yozuvdan keyin ma'lumot o'zini tuzatadi. Alohida migratsiya
kerak emas.

### 3.2 Progress

`onPosition(sec)` player'dan `time-update` da keladi (~4 marta/soniya). Player `paused`
yoki `seeking` holatida umuman chaqirmaydi — bu **player mas'uliyati**, hook emas.

Hook throttle qiladi:

```
if (sec - lastSentRef.current >= 10) → POST
```

Endpoint: `POST /api/enrollments/:courseId/watch/:videoId`, tanasi **`{ positionSeconds }`**.
Eski `watchedSeconds` nomi yuborilmaydi (HANDOFF "Backend shartnomalari" 1-band —
backend uni faqat bitta reliz qabul qiladi). `courseId` — `video.course._id` dan.

**Flush.** Unmount'da va `visibilitychange → hidden` da oxirgi pozitsiya yuboriladi.
Hozirgi kodda tabni yopganda 10 soniyagacha yo'qoladi. Best-effort: `visibilitychange`
kafolat bermaydi, lekin route almashganda (unmount) ishonchli.

### 3.3 Token yangilash — ikkita signal

**Proaktiv.** `player.expiresAt` ma'lum bo'lgach `setTimeout(expiresAt - now - 5daq)`,
manfiy bo'lsa 0 ga qisiladi. Ishga tushganda `fetchById(videoId)`. `expiresAt`
o'zgarganda taymer tozalanadi va qayta qo'yiladi.

**Reaktiv.** Player `onError` bersa (403/401 segment) → `fetchById`, lekin **30 soniyada
bir martadan ko'p emas** (`errorRetryAtRef` vaqt tamg'asi).

30 soniyalik tormoz majburiy: usiz haqiqatan buzuq oqim (masalan mkhls o'chgan) cheksiz
`error → refetch → error` siklini yaratadi. Refetch 503 qaytarsa xato Redux orqali
sahifaga chiqadi va "Video vaqtincha mavjud emas" ekrani ko'rsatiladi (spec §11).

Yangi `hlsUrl` kelganda player manbasi almashadi, `startAt` qoidasi (3.1) bo'yicha
o'sha joydan davom etadi.

### 3.4 Polling

Shart: `player === null && (streamStatus === 'pending' || streamStatus === 'processing')`
→ har **30 soniyada** `fetchById` (spec §11).

To'xtash: `player !== null` yoki `streamStatus === 'failed'`.

Backend'ning `refreshPreparingStatus` cooldown'i 15000ms
(`MKHLS_STATUS_REFRESH_COOLDOWN_MS`), ya'ni 30s poll har safar yangi o'qishni oladi va
bekorga urinmaydi. Cooldown ko'p-replika deploy'da replikaga bo'linadi (HANDOFF
6-bandidagi operatsion ogohlantirish) — bu klient tomonini o'zgartirmaydi.

### 3.5 Tozalash

Unmount'da: proaktiv taymer, poll intervali va `visibilitychange` listener'i o'chadi;
oxirgi pozitsiya flush qilinadi.

---

## 4. `LessonPlayer` komponenti

```tsx
<LessonPlayer
  hlsUrl={string}
  poster={string | undefined}
  startAt={number}
  onPosition={(sec: number) => void}
  onError={() => void}
  onResume={(sec: number) => void}   // ixtiyoriy
/>
```

**Mas'uliyatlari:**

1. `<MediaPlayer>` + `<MediaProvider>` + `<DefaultVideoLayout>` — sifat tanlash, tezlik,
   PiP, klaviatura, fullscreen shundan keladi
2. `loaded-metadata` da: `startAt > 5 && startAt < duration - 15` bo'lsa o'sha joyga
   seek qiladi va `onResume(startAt)` chaqiradi
3. `time-update` da: `!paused && !seeking` bo'lsagina `onPosition(currentTime)`
4. `error` da: `onError()`

**`onResume` nima uchun bor.** Spec §7 C1.1 "Davom etish toast'i" deydi. Toast matni uch
tilda — agar player uni o'zi ko'rsatsa, i18n konteksti player ichiga tushadi va u
qayta ishlatiladigan bo'lmay qoladi. Shuning uchun: player seek qiladi va xabar beradi,
**toast'ni sahifa ko'rsatadi**.

**Uslub.** Vidstack default layout o'z CSS'ini olib keladi
(`vidstack/player/styles/default/theme.css` va `.../layouts/video.css`) —
komponent ichida import qilinadi. Loyihaning daisyUI/Tailwind uslubi bilan urishishi
mumkin; kerak bo'lsa override'lar shu komponent faylida qoladi, global CSS'ga
chiqmaydi.

---

## 5. Sahifa o'zgarishlari

### 5.1 `app/videos/[id]/page.tsx`

**O'chiriladi:**
- `embedUrl` hosilasi (30-qator)
- ko'r progress `useEffect` (140-154-qatorlar) — har 10 soniyada `+= 10` qiladigan
  taymer, video o'ynayaptimi-yo'qmi bilmaydi

**O'zgaradi:**
- Gate zinapoyasidagi `embedUrl ?` shoxi → `playerProps ?`, ichida `<LessonPlayer>`
- "Tayyorlanmoqda" shoxi qoladi, lekin endi o'zi 30s'da yangilanadi. "Yangilash" tugmasi
  qochish yo'li sifatida qoladi, ammo `window.location.reload()` emas — `fetchById`.
  Reload butun Redux holatini va obuna tekshiruvini qaytadan boshlaydi
- `busyDesc` matni uchala tilda tuzatiladi: hozir "Video **Bunny.net** da hali qayta
  ishlanmoqda" deydi (52-56-qatorlar). Foydalanuvchiga ko'rinadigan yolg'on

**Qo'shiladi:**
- **`hasFailed` shoxi** — hozir umuman yo'q. Spec §11 talab qiladi: "Xatolik yuz berdi,
  administratorga murojaat qiling". Hozir `failed` video jimgina "tayyorlanmoqda" bo'lib
  abadiy aylanadi, chunki `player: null` ikkala holatda ham bir xil ko'rinadi
- Resume toast'i (`onResume`)

**O'zgarmaydi:**
- Sticky mini-player. `motion.div` bir xil DOM tugunini `relative` ↔ `fixed` qilib
  ko'chiradi — element qayta yaratilmaydi, ya'ni `<video>` uzilmaydi. Qo'lda
  tekshiriladi
- `videoLink.telegramLink` shoxi
- Login / obuna gate'lari

**Olib tashlanadi — yulduzcha reytingi (341-qator).** `video.rating?.average` chizadi,
lekin backend `rating`ni javobdan **ataylab olib tashlagan** (`videoController.js`
`getVideo`: "models/Video.js da bunday field yo'q, ya'ni u har doim undefined
qaytardi"). Ya'ni bu qator hozir har doim soxta **"0.0"** ko'rsatadi. Haqiqiy reyting
kerak bo'lsa `videoApi.getRating` alohida endpoint sifatida bor — bu Plan 3 qamrovi
emas.

### 5.2 `app/videos/[id]/playground/page.tsx`

Spec §7 bu sahifani sanamagan, lekin unda ham player bor (467-469-qatorlar) va u ham
hozir bo'sh. §16.8 progress uchun qamrovni kengaytirgani kabi, bu ham kengaytiradi.

- iframe (467) → `LessonPlayer`, **bir xil komponent, bir xil xatti-harakat** (resume,
  progress, token yangilash). Komponentni ajratishning ma'nosi ham shu
- ko'r taymer (214-223) o'chiriladi
- qo'lda "darsni tugatdim" tugmasi qoladi

**Ikkala sahifa bir vaqtda ochiq bo'lsa xavf yo'q:** backend
`Math.max(previousPosition, position)` qiladi (`enrollmentController.js`), ya'ni ikki
manbadan yozish eng uzoq nuqtani buzmaydi.

### 5.3 `types/video.ts`

```ts
export interface Player   { type: 'hls'; hlsUrl: string; expiresAt: string }
export interface Progress { lastPositionSeconds: number }
export type StreamStatus  = 'pending' | 'processing' | 'ready' | 'failed'
```

`Player.embedUrl` va `Player.telegramLink` olib tashlanadi — `telegramLink` aslida
`videoLink`ga tegishli, `player`ga emas (hozirgi tip noto'g'ri).
`Video.rating` ham olib tashlanadi (5.1).

### 5.4 `store/slices/videoSlice.ts` va `hooks/useVideos.ts`

- `fetchVideo.fulfilled` `progress` va `streamStatus`ni ham saqlaydi
- `clearCurrentVideo` ularni ham tozalaydi
- Yangi selektorlar: `selectVideoProgress`, `selectStreamStatus`
- `useVideos` ikkalasini chiqaradi
- 76-qatordagi `/** Bunny.net Stream: { embedUrl, expiresAt } */` izohi yangilanadi

### 5.5 `api/videoApi.ts`

```ts
saveProgress: (courseId: string, videoId: string, positionSeconds: number) =>
  api.post(`enrollments/${courseId}/watch/${videoId}`, { positionSeconds })
```

---

## 6. Admin panel (7-bosqich)

### 6.1 Nomlash va tur

```ts
type VideoRow = {
  _id: string; title: string; description?: string;
  order: number; duration: number;
  streamStatus: StreamStatus;
}
```

`bunnyVideoId` va `bunnyStatus` yo'qoladi. `StatusBadge` to'rtta holatni biladi:
`pending | processing | ready | failed`. `encoding` va `error` shoxlari o'chadi — mkhls
ularni hech qachon chiqarmaydi (`parseStreamStatus`: `error`/`unavailable` → `failed`).

### 6.2 Yuklash oqimi — transcode kutishi ajratiladi

Hozirgi polling `attempts > 72`, ya'ni **6 daqiqa**, keyin "Timeout" xatosi
(`admin/courses/[id]/page.tsx:209-214`). Bunny uchun to'g'ri edi. mkhls'da 40 daqiqalik
dars **40-60 daqiqa** transcode bo'ladi (spec §14.1). Ya'ni har bir haqiqiy dars
yuklanganda admin "Timeout" xatosini ko'radi, video esa sog'-salomat ishlanayotgan
bo'ladi.

| Bosqich | Hozir | Yangi |
|---|---|---|
| create | slot yaratilmoqda | o'zgarmaydi |
| upload | fayl yuklanmoqda (%) | o'zgarmaydi |
| transcode kutish | **6 daq bloklaydi, keyin xato** | **bloklamaydi** — panel "yuklandi, transcode navbatda" deb yopiladi |
| kuzatish | yo'q | `processing` qatorlari `GET /videos/:id/status` bilan kuzatiladi (pastda) |

**Ro'yxat polling qoidalari.** Faqat `streamStatus === 'processing'` qatorlari,
har **20 soniyada**, va faqat **tab ko'rinib turganda**
(`document.visibilityState === 'visible'`).

Cheklovlar majburiy, chunki bu endpoint student poll'idan farq qiladi:
`checkVideoStatus`da **hech qanday cooldown yo'q** — har chaqiruv to'g'ridan-to'g'ri
mkhls'ga boradi (`refreshPreparingStatus`ning 15s throttle'i faqat `getVideo`da).
Bir kurs ommaviy yuklanayotganda 10 ta qator bir vaqtda `processing` bo'lishi mumkin;
tormozsiz ochiq qoldirilgan tab soatlab mkhls'ni urib turardi. Yashirilgan tabda
poll to'xtaydi va ko'rinishi bilan darhol bir marta yangilanadi.

Yuklash `PUT /api/videos/:id/upload-proxy` orqali ketadi (o'zgarmaydi) va
`axiosInstance` `timeout: 0` bilan chaqiradi (`uploadVideoBinary`) — Node tomonda
`server.requestTimeout = 0` (HANDOFF 10-band), ya'ni 1 GB fayl uchun ~192 soniya normal.

### 6.3 Transcode progressi — foizsiz

`GET /api/videos/:id/status` javobi:

```json
{ "videoId": "…", "streamStatus": "processing", "isReady": false,
  "duration": 2412,
  "transcode": { "presetsDone": ["720p","480p"], "presetsTotal": 3 } }
```

UI: ingichka bar, kengligi `presetsDone.length / presetsTotal`, ostida `2/3 preset`
matni.

**Foiz raqami hech qayerda yozilmaydi.** `progress_percent` mkhls'da hech qachon
o'smaydi — 0 dan 100ga sakraydi (spec §6 rev. 3 ogohlantirishi, HANDOFF 4-band).
`presetsDone`/`presetsTotal` yagona haqiqiy va monoton ko'rsatkich. `presetsTotal === 0`
bo'lsa bar umuman chizilmaydi.

Javobdagi `bunnyStatus` — Plan 2 ataylab qoldirgan ko'zgu (HANDOFF 3-band). Plan 3 uni
o'qishni to'xtatadi; backend'dan olib tashlash 8-bosqich ishi.

### 6.4 502 ni yutmaslik

Backend endi `startTranscode` muvaffaqiyatsiz bo'lsa `streamStatus: 'failed'` yozadi va
**502** qaytaradi (HANDOFF 8-band) — ilgari 200 qaytib videoni yolg'on `ready` holatida
qoldirardi. Hozirgi umumiy `catch` buni "Yuklashda xato" deb ko'rsatadi. Aniq xabar
bo'ladi: fayl yuklandi, lekin transcode boshlanmadi.

### 6.5 Qo'lda ulash

`getCourseVideos` autentifikatsiyasiz endpoint va `streamPath` undan **ataylab** olib
tashlangan (spec §10.4, Task 13 tuzatishi). Shuning uchun admin panel `streamPath`ni
umuman ko'rsatmaydi:

- "Bunny GUID" maydoni → **"mkhls yo'li (qo'lda ulash)"**, faqat-yozish, prefill yo'q
- Placeholder: `aidevix/<videoId>.mp4` — yo'l determinlashgan (`buildStreamPath`), admin
  uni videoId'dan biladi
- `linkVideoToStream(id, streamPath)` → `PATCH /api/videos/:id/link-stream`,
  tanasi `{ streamPath }`
- Ulash tugmasi `streamStatus === 'pending'` da chiqadi
- GUID chipi (622-626) o'chadi

Qo'lda ulash faqat eski yoki qo'lda yuklangan fayllar uchun kerak — normal oqimda
`createVideo` `streamPath`ni o'zi hisoblaydi.

**Rad etilgan variant:** yangi `GET /api/admin/courses/:courseId/videos` endpointi
(to'liq admin proyeksiyasi bilan). Tozaroq ajratish bo'lardi, lekin Plan 3'ni backend'ga
chiqaradi va `streamPath` ko'rsatish hech qanday real ehtiyojni yopmaydi.

### 6.6 Tozalash

- `adminApi.ts`: `linkVideoToBunny` → `linkVideoToStream`; `bulkLinkBunny` o'chiriladi
- `admin/tools/page.tsx`: CSV bulk-link bo'limi (206-231-qatorlar atrofi) o'chiriladi
- Bosqich yorliqlari: "Bunny kodlayapti…" → "mkhls transcode navbatida…";
  "BUNNY_STREAM_API_KEY tekshiring" → mkhls xabari

Backend `POST /api/admin/videos/bulk-link` va `adminController.bulkLinkBunny`
**joyida qoladi** — ular 8-bosqich (Plan 4) qamrovida, §16.6 ning "bir reliz deprecated"
qoidasi bo'yicha. Faqat frontend UI olib tashlanadi.

### 6.7 Bepul/pullik ko'rinishi (spec §14.8)

Spec riski §14.8: "admin panelda ikki oqim aniq ajratilgan bo'lishi kerak (bu
7-bosqichda hisobga olinadi)".

Amalda ajratish shart emas: admin panelda **yagona** yuklash yo'li bor va u mkhls'ga
ketadi — YouTube yo'li umuman mavjud emas, ya'ni pullik darsni xato bilan YouTube'ga
chiqarish imkoniyati yo'q. `Video` modelida bunday maydon ham yo'q; yagona signal —
`Course.isFree`.

Eng arzon amal: kurs sarlavhasi yonida `isFree` holatini badge qilib ko'rsatish
(`Bepul kurs` / `Pullik kurs`), admin pullik darsni yuklayotganini ko'rib tursin. Bu
riskni yopmaydi (yopadigan narsa yo'q), lekin §14.8 ning niyatini bajaradi.

---

## 7. Xatoliklar (spec §11 ning frontend tomoni)

| Holat | Backend | Frontend |
|---|---|---|
| `player: null`, `streamStatus: 'processing'` | 200 | "Tayyorlanmoqda" + 30s auto-poll |
| `player: null`, `streamStatus: 'failed'` | 200 | **"Xatolik yuz berdi, administratorga murojaat qiling"**, poll to'xtaydi |
| mkhls o'chgan, video `ready` | 503 | "Video vaqtincha mavjud emas" + qayta urinish |
| Token muddati tugadi / segment 403 | — | player `error` → 30s tormoq bilan bir marta refetch → o'sha joydan davom |
| Obuna yo'q / login yo'q / Pro kerak | 403 / 401 / 402 | mavjud gate ekranlari, o'zgarmaydi |

---

## 8. Testlar va tekshirish

**Unit runner qo'shilmaydi.** Loyihada jest/vitest yo'q — vitest + testing-library
o'rnatish yangi konfiguratsiya, yangi devDeps va yangi CI yuzasi degani, Plan 3
qamrovidan tashqari. Ikki qatlam ishlatiladi.

### 8.1 Playwright — `e2e/videos.spec.ts` kengaytiriladi

`GET /api/videos/:id` javobi route-mock bilan boshqariladi. Shu bilan qo'lda hosil
qilib bo'lmaydigan holatlar deterministik tekshiriladi:

| Ssenariy | Nima tasdiqlanadi |
|---|---|
| `player: null`, `streamStatus: 'processing'`, keyin `ready` | poll ishlaydi, player o'zi paydo bo'ladi, qo'lda reload kerak emas |
| `streamStatus: 'failed'` | xato ekrani chiqadi va poll **to'xtaydi** |
| `expiresAt` = hozir + 6 daqiqa | proaktiv refetch o'z vaqtida ketadi |
| player `error` × 3 ketma-ket | refetch **bir marta** ketadi (30s tormoz) |
| `progress.lastPositionSeconds` > `duration` | seek **bo'lmaydi** (3.1 dagi eski ma'lumot himoyasi) |
| POST tanasi | `positionSeconds` bor, `watchedSeconds` **yo'q** |

Admin panel uchun: `GET /videos/:id/status` mock'i bilan `presetsDone`/`presetsTotal`
bar'i va `presetsTotal === 0` holati.

### 8.2 Qo'lda uchdan-uchgacha, haqiqiy konteynerda

HANDOFF bu usulni ikki marta eng qimmat amaliyot deb belgilagan — Plan 1-2 va Plan 2'da
u mock ham, review ham tutolmagan xatoliklarni ochgan. Har task oxirida:

1. `docker compose -f docker-compose.dev.yml up -d --build`, backend `npm run dev`
2. Admin panelda haqiqiy mp4 yuklash → panel bloklanmasdan yopilishi
3. Ro'yxat qatori `processing` → `n/m preset` progressi o'sishi → `ready`
4. Student sahifasida video o'ynashi, sifat almashishi
5. 15 soniya ko'rib tabni yopish → qayta ochib **resume ishlaganini** ko'rish
6. Sticky mini-player'ga o'tkazish → o'ynash uzilmasligi
7. `playground` sahifasida ham 4-6 bandlar

**Eslatma:** `.env` o'zgartirilsa backend qayta ishga tushirilsin — `nodemon` `.env`ni
kuzatmaydi. Bu HANDOFF'da ikki marta real vaqt yo'qotgan (`touch backend/index.js`).
Seed tokenlari 15 daqiqa yashaydi.

### 8.3 Bundle o'lchovi

Task oxirida `npm run build` bilan `videos/[id]` route'ining o'lchami o'lchanadi va
spec §14.5 ning "~100 KB" da'vosi tasdiqlanadi yoki tuzatiladi.

### 8.4 Plan 3 oxirida alohida whole-branch review

HANDOFF'ning eng kuchli tavsiyasi. Bu naqsh Plan 1-2 da bir marta, Plan 2 da yana ikki
marta chok-orasidagi xatoliklarni topgan — har biri alohida to'g'ri ko'rinadigan tasklar
orasidan. **Implementator o'z branch'ini review qilmaydi.**

---

## 9. Risklar

| Risk | Baho | Yumshatish |
|---|---|---|
| Vidstack default layout CSS daisyUI/Tailwind bilan urishishi | O'rta | Override'lar komponent faylida qoladi; qo'lda tekshiriladi |
| Bundle o'lchovi §14.5 da'vosidan katta chiqishi | O'rta | 8.3 da o'lchanadi; `next/dynamic ssr:false` allaqachon qo'llanadi |
| Token yangilanganda `src` almashishi ~1s uzilish berishi | Past | TTL 4 soat — 4 soatda bir marta |
| Sticky mini-player'da `<video>` uzilishi | Past | Bir xil DOM tuguni, remount yo'q — lekin 8.2 da qo'lda tasdiqlanadi |
| Prod CORS placeholder'i | Plan 3 ga ta'sir qilmaydi | 9-bosqich bandi (2.3) |
| Ikki sahifadan bir vaqtda progress yozish | Yo'q | Backend `Math.max` qiladi |

---

## 10. Qamrovdan tashqari

- `utils/bunny.js` va o'lik import'larni o'chirish — 8-bosqich (Plan 4)
- Backend `bunnyVideoId`/`bunnyStatus` maydonlarini schema'dan olib tashlash — 8-bosqich
- `POST /api/admin/videos/bulk-link` backend endpointi — 8-bosqich
- `getVideo`ning `.populate('course')` proyeksiyasiz ekani — HANDOFF'dagi ma'lum muammo,
  javob shaklini o'zgartiradigan kishi tuzatsin
- `markVideoWatched`ning `videoId ∈ course` tekshirmasligi — HANDOFF'dagi ma'lum muammo,
  sertifikat/`viewCount` ta'sirlari bilan; alohida ish
- Yuklash hajmi chegarasi — hech qaysi qatlamda yo'q, HANDOFF'dagi ma'lum muammo
- Haqiqiy video reytingi (`videoApi.getRating` ni ulash) — 5.1
- Deploy va prod konfiguratsiyasi — 9-bosqich

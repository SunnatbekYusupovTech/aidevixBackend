# Handoff — video streaming, Plan 3 tugadi

**Sana:** 2026-08-10 (yozilgan sana; sana o'zgargan bo'lishi mumkin, ahamiyatsiz)
**Holat:** Bosqich 1-7 tugadi (mkhls upstream, backend, frontend player + admin panel).
Plan 3 (`feat/plan3-frontend-player`, spec 6-7-bosqich) barcha 8 task orqali o'tdi, har
biri alohida review qildi, oxirida bu Task 8 haqiqiy stack'ga qarshi qo'lda tekshirdi.
Undan keyin **whole-branch review ham o'tkazildi va topilmalari yopildi** — qarang
"Whole-branch review — tuzatilgan bandlar".
**Merge qilinmagan.** Keyingi qadam — bosqich 8 (xavfsizlik tozalash) va 9 (deploy).

> **2026-08-12 yangilanishi:** bosqich 8 BAJARILDI —
> `feat/stage8-security-cleanup` branchida, merge qilinmagan. To'liq tafsilot:
> pastdagi "Bosqich 8 — nima qilindi" bo'limi. **Eng muhimi: Bunny API kaliti
> hali bekor qilinmagan va u public git tarixida qoladi.** Keyingi qadam —
> bosqich 9 (deploy).

---

## Shu hujjat yozilgandan KEYIN nima bo'ldi (eng muhim qism)

Plan 3 `main`ga **merge qilindi**, so'ng jonli brauzer tekshiruvi to'rtta xato ochdi va
hammasi tuzatildi. `main` hozir `origin/main`dan **57 commit oldinda va push qilinmagan**.

| Commit | Nima |
|---|---|
| `6fb0a19` | Token yangilanganda o'ynash to'xtab qolardi. Manba almashadi, provayder pauzada qaytadi, hech kim `play()` chaqirmaydi. 360s token bilan o'lchangan: dars **57-soniyada** qotardi; prod'da (14400s) ~3s 55daq da. Whole-branch review buni Important deb belgilagan va "brauzersiz tekshirib bo'lmaydi" degan edi — aynan shunday chiqdi |
| `e2b3382` | O'sha almashuvda **ovoz, mute va tezlik** ham standartga qaytardi — mute qilingan dars to'satdan baland ovozda yoqilardi. Imperativ tiklash ishlamadi (handler o'zlashtirishlardan keyingi qatorga yetmaydi); boshqariladigan props bilan yechildi |
| `460fed8` | **Kurs saqlash umuman ishlamasdi.** Daraja tanlagichida `<option>` larda `value` yo'q edi → qiymat matn mazmuni (`"Beginner"`), schema enum'i esa kichik harf. Kategoriya erkin matn maydoni edi. Backend validatsiya xatosini 500 va mazmunsiz xabar bilan qaytarardi → endi 400 va qaysi maydon aybdorligi |
| `864440b` | `/courses/<slug>` darslarni ko'rsatmasdi: kurs slug bilan topilardi, darslar esa o'sha slug bilan so'ralib 500 berardi. Endi endpoint ObjectId ham, slug ham qabul qiladi; noma'lum slug 404 |

Oxirgi ikkitasi **eskidan mavjud** xatolar — Plan 3 ularga tegmagan. `864440b` shu ish
yo'nalishidagi ikkinchi backend o'zgarishi.

**Brauzerda inson tomonidan tasdiqlangan:** token yangilanishida o'ynash uzilmasligi,
ovoz/mute saqlanishi, video yuklash va presetlar (`n/m`), kurs sahifasida darslar,
admin panelda kurs saqlash.

**Hali brauzerda tekshirilmagan:** resume (tabni yopib qayta ochish), sticky mini-player,
sifat/PiP/klaviatura, admin progress bar'ining jonli o'sishi, tab yashiringanda
polling to'xtashi, playground sahifasi.

### Muhit haqida — aniqlashtirishlar

- **Mongo timeout tuzog'i faqat birinchi bootda emas.** U **har bir nodemon qayta ishga
  tushishida** takrorlanadi (bir kunda uch marta). `touch backend/index.js` ni takroran
  bosish kerak bo'lishi mumkin.
- **Node jarayonlari to'planib qoladi.** O'ldirilgan bolaning `nodemon`i tirik qolib,
  eski log fayliga yozishda davom etadi va tuzatishlar kuchga kirmaydi. Shubha bo'lsa:
  `taskkill //IM node.exe //F`, so'ng backend va frontend'ni yangidan ko'tarish.
- **Orfan `chrome.exe` Playwright'da soxta yiqilish beradi** (yiqilish to'plami har
  safar boshqacha). Har yugurishdan oldin tozalash shart.
- Lokal sinov uchun `MKHLS_STREAM_TOKEN_TTL` vaqtincha `360` qilingan edi — **`14400`ga
  qaytarildi**. `frontend/.env.local` da soxta `NEXT_PUBLIC_GOOGLE_CLIENT_ID` qoldi
  (gitignore'langan, quyida sababi).

### Topilgan, ATAYLAB tuzatilmagan (foydalanuvchi keyinga qoldirdi)

- `Providers.tsx:38` `NEXT_PUBLIC_GOOGLE_CLIENT_ID` bo'lmasa bo'sh satr uzatadi →
  `@react-oauth/google` xato tashlaydi va **login sahifasini butunlay bloklaydi**.
- `BetaWelcomeModal.tsx:5` `m` emas, `motion` import qiladi va `HomeClient.tsx:668`
  dagi `LazyMotion strict` ichida ishlaydi → **bosh sahifa yiqiladi**. Xuddi shu holat
  `home/ContinueWatching.tsx` va `home/RecommendedForYou.tsx` da ham.
- `seed-dev-user.js` hisoblarni `emailVerified: false` qoldiradi → login bloklanadi.
- `/api/projects/course/<slug>` slug qabul qilmaydi (404 beradi, 500 emas — bloklamaydi).
- **Takrorlanmagan:** `TypeError: disabled is not a function`, `@vidstack/react` ichida
  (`vidstack-DxAMdmBt.js:7661` Slider#isDisabled ← `:7114` SliderPreview#updatePlacement).
  Foydalanuvchi bir marta ko'rgan; to'rtta repro urinishi (hover, o'ynash, sakkizta
  boshqaruv, slayder sudrash) natija bermadi. Dublikat o'rnatish rad etilgan.

---

## Avval nimani o'qish kerak

| Fayl | Nima uchun |
|---|---|
| `docs/superpowers/specs/2026-08-05-video-streaming-mkhls-design.md` | **rev. 4.** Yagona haqiqat manbai. §6, §14.5, §15 (§15.4 holat jadvali endi 6-7 uchun ✅), §16 ni o'qing. |
| `docs/superpowers/plans/2026-08-10-plan3-frontend-player-admin.md` | Tugagan reja, 8 task. Namuna sifatida keyingi planlar uchun ham foydali. |
| `.superpowers/sdd/2026-08-10-plan3-frontend-player-admin/progress.md` | Ijro ledgeri — har bir task, review topilmasi, tuzatish davri. `.gitignore`langan, faqat diskda. |
| `.superpowers/sdd/2026-08-10-plan3-frontend-player-admin/task-8-report.md` | Shu task'ning to'liq dalili: haqiqiy stack'da yuklash → transcode → token'li HLS zanjiri, mkhls o'chirilgan holat, va qaysi tekshiruvlar odam qo'lida qolgani. |

Bulardan tashqari eski (Plan 2) ledger va hisobotlar ham diskda bor
(`.superpowers/sdd/2026-08-10-aidevix-mkhls-backend/`), lekin ularning muhim qismi
avvalgi HANDOFF orqali allaqachon shu faylga va spec'ga ko'chirilgan.

**Diqqat:** `.superpowers/sdd/` butunlay `.gitignore`langan (`*` pattern). Shu HANDOFF va
git tarixi **yagona durable yozuv**. Keyingi bosqich uchun muhim narsani faqat ledger'da
qoldirmang — shu faylga yozing.

---

## Ikkita repo

| Repo | Branch | Holat |
|---|---|---|
| `AiDeVix/mkhls-streamer` | `feat/vod-local-pipeline` | **`d04955f`** — Plan 4 shu branchga merge qilindi (`bc97f80` dan 7 commit, fast-forward). Push hali **bloklangan** (`origin` push URL — `PUSH-DISABLED--fork-qiling-spec-5-bolim` sentinel, tekshirilgan — hali joyida). |
| `AiDeVix/aidevixBackend` | **`main`** | Plan 3 ham, bosqich 8 ham `main`ga merge qilingan; feature branchlar o'chirilgan. `origin/main` (`34c4c47`) dan ~76+ commit oldinda va **hech narsa push qilinmagan**. Aniq raqamga ishonmang — `git log --oneline origin/main..HEAD \| wc -l` bilan qayta hisoblang. Har bir commit `Co-Authored-By: Claude Opus 5 (1M context)` trailer bilan. |

mkhls Aidevix repo'sining **ichida emas, yonida** (`../mkhls-streamer`) — spec'ning
"mijoz, klonuvchi emas" qoidasi. Bu qoida saqlanadi.

---

## Bundle o'lchovi (Task 8 Step 1, spec §14.5 uchun haqiqiy raqam)

`npm run build`, ikkala tomon (branch nuqtasi `24b31c5` vs `a9c85e5`):

| route | oldin (24b31c5) | keyin (a9c85e5) |
|---|---|---|
| `/videos/[id]` | 7.98 kB / **306 kB** First Load | 8.94 kB / **307 kB** |
| `/videos/[id]/playground` | 11.1 kB / **314 kB** | 11.6 kB / **315 kB** |
| shared baseline | 165 kB | 166 kB |

**First Load JS ~1 kB o'sdi — spec §14.5'ning "Vidstack ~100 KB qo'shadi" taxminidan
juda uzoq.** Sabab: `LessonPlayer` `next/dynamic({ ssr: false })` bilan yuklanadi
(Task 1), shuning uchun Vidstack va hls.js First Load'ga **umuman kirmaydi**. Ularning
haqiqiy og'irligi lazy chunk'larda — video darsi sahifasi player'ni mount qilganda
yuklanadigan alohida bundle'larda (eng kattasi diskda 504K, yana ikkitasi 220K va 200K,
siqilmagan — tarmoq orqali gzip/br bilan kichikroq boradi). **§14.5'ning mitigatsiyasi
to'liq ishladi** — bu 200 KB'dan oshgan "ochiq risk" emas, aksincha rejalashtirilgan
strategiyaning tasdiqlangan natijasi.

---

## npm dist-tag tuzog'i — keyingi `npm install`ni yana urishi mumkin

`@vidstack/react`ning **`latest` dist-tegi `0.6.15`** — eski, mos kelmaydigan API
liniyasi. Bu loyiha **`1.15.6`**ga tayanadi (`vidstack` paketi ham xuddi shu versiyada).
`frontend/package.json`da ikkalasi ham **aniq versiyaga** pin qilingan (caret emas):

```
"@vidstack/react": "1.15.6",
"vidstack": "1.15.6",
"hls.js": "^1.6.17",
```

Ehtiyotsiz `npm install <biror narsa>` yoki `npm update` `@vidstack/react`ni yangi
versiyaga ko'chirishga urinib, `0.6.15`ga tushirib qo'yishi mumkin (agar kimdir aniq
versiyani caret'ga o'zgartirsa) — bu build'ni **buzuq ko'rinmasdan** buzadi, chunki
`0.6.15`ning API'si butunlay boshqa (masalan `MediaPlayer`/`MediaProvider` komponent
shakli farq qiladi). Bu loyihada dependency **qo'shilmadi/yangilanmadi** — pin
qasddan shunday qoldirilgan.

---

## Production CORS hali placeholder — 9-bosqich uchun qattiq band

`mkhls-streamer/configs/production/config.yaml:213-218`:

```yaml
cors:
  allowed_origins:
    - "https://your-domain.com"
    - "https://admin.your-domain.com"
```

Bu **yangi talab**, eski Bunny iframe davrida yo'q edi: hls.js brauzerda `fetch()`
bilan to'g'ridan-to'g'ri playlist va segmentlarni oladi (Bunny esa `<iframe>` orqali
o'z domenidan ko'rsatardi, CORS umuman kerak emas edi). Haqiqiy production domen shu
faylga yozilmaguncha, prod'da hls.js'ning `fetch` so'rovlari brauzer tomonidan
bloklanadi va video **hech qachon o'ynamaydi** — bu holat lokal (`localhost`) muhitda
sinalmaydi, faqat prod domenda ko'rinadi. **9-bosqichni bloklaydigan qattiq band.**

---

## Repo bo'ylab 101 haqiqiy tur xatosi — hech narsa ushlamaydi

`frontend/tsconfig.json`da `"noCheck": true` bor, va `next build` xuddi shu
tsconfig'ni meros qiladi — ya'ni **`npm run typecheck` ham, `npm run build` ham
biror tur xatosida hech qachon qizarmaydi**. Bu Plan 3 boshlanishidan oldin allaqachon
shunday edi: branch nuqtasida 32 faylda 101 haqiqiy tur xatosi bor, build baribir
o'tadi. Repo bo'ylab tozalash **hech qaysi task tomonidan da'vo qilinmagan** — bo'sh
ish.

Plan 3 buning o'rniga **skoplashtirilgan darvoza** ostida ishladi:
`.superpowers/sdd/2026-08-10-plan3-frontend-player-admin/typecheck-gate.sh`
(`.gitignore`langan papkada, lekin skript diskda qoladi va o'zi joylashgan joydan
mustaqil ishlaydi — undan nusxa olib boshqa joyga ko'chirsa ham ishlaydi). U
`noCheck`ni majburan o'chiradi va faqat **plan tegib o'tgan fayllarda** yangi tur
xatosi yo'qligini tasdiqlaydi, baseline'ga solishtirib
(`typecheck-baseline-counts.txt`: `useVideos.ts` 4, `videoSlice.ts` 5, qolgan hamma
joy 0). Task 8'da oxirgi marta ishga tushirildi — PASS, hech qanday yangi xato yo'q.
Keyingi kishi shu skriptni saqlab qo'ysin (yoki qo'lda tekshirsin) — `noCheck`ni
o'chirmasdan `tsc --noEmit` ishlatish repo bo'ylab 101 xatoni qaytadan ko'rsatadi,
plan-tegib-o'tgan fayllarni ajratib bo'lmaydi.

---

## Test-muhit tuzoqlari (real vaqt yo'qotgan)

- **Orphan `chrome.exe` yig'ilib qoladi va Playwright'ni yolg'on buzadi.** Har xil
  ishga tushirishda har xil test to'plami "muvaffaqiyatsiz" bo'ladi. Har doim
  `taskkill //IM chrome.exe //F` va port 3000'ni bo'shatib, keyin ishonch bilan
  natija o'qing.
- **Butun to'plam ishga tushirish worker'larni `STATUS_DLL_INIT_FAILED`
  (0xC0000142) bilan qulatadi** — bu Windows resurs (desktop-heap) tugashi, test
  natijasi emas. Isbot: `videos-stream.spec.ts:33` yolg'iz ishga tushirilganda 3/3
  o'tadi, to'liq to'plam ichida xuddi shu worker qulashi bilan "muvaffaqiyatsiz" deb
  belgilanadi. **Xulosa: har doim spec-boshiga tekshiring, hech qachon bitta to'liq
  to'plam yugurishiga ishonmang.**
- **`e2e/auth.spec.ts`ning 12 ta muvaffaqiyatsizligi oldindan mavjud**, Plan 3'ga
  aloqasi yo'q — branch nuqtasida ham xuddi shunday qizil edi (ikki tomonda
  o'lchangan: HEAD va BASE, bir xil 5 ta o'tadi, bir xil qolgani yo'q).
- **`page.clock` bilan ishlaydigan har qanday test, agar kumulyativ
  `fastForward` ~120 soniyadan oshsa, `clock.install()`dan **keyin**
  `suppressMarketingChromeTimers(page)` chaqirishi kerak.** Sabab:
  `page.clock.install()` `requestIdleCallback`ni ham soxtalashtiradi, bu esa
  webpack'ning chunk-load timeout'i orqali `ClientLayoutWrapper`'ning yetti
  kechiktirilgan `next/dynamic` vidjetidan istalganini haqiqiy tarmoq bilan soxta
  soat orasidagi poyga bilan yo'qotib qo'yishi mumkin. Helper
  `e2e/helpers/` ichida, faqat shu chegaradan o'tadigan testlarga ulangan.

---

## Lokal muhitni ko'tarish

```bash
cd aidevixBackend
docker compose -f docker-compose.dev.yml down -v
rm -rf .data/media/aidevix .data/cache/vod
docker compose -f docker-compose.dev.yml up -d --build
cd backend && node scripts/seed-dev-user.js && npm run dev
```

Alohida terminalda: `cd frontend && npm run dev`.

- `http://localhost:8080` — mkhls admin
- `http://localhost:5000/health` — backend health
- Seed tokenlari **15 daqiqa** yashaydi
- **`.env`ni o'zgartirsangiz backend'ni qayta ishga tushiring** — `nodemon` faqat
  `js/mjs/cjs/json` kuzatadi, `.env` emas. Ishonchli yechim: `touch backend/index.js`.
- **Task 8'da jonli kuzatilgan yangi tuzoq:** konteynerlar sog'lom (`healthy`)
  bo'lgandan darhol keyin `npm run dev`ning **birinchi** ishga tushishi
  `Server selection timed out after 5000 ms` bilan qulashi mumkin, garchi
  `mongosh`/`Test-NetConnection` portni ochiq deb ko'rsatsa ham. `touch
  backend/index.js` bilan qayta ishga tushirish ikkinchi safar darhol ulanadi.
  Ildiz sababi aniqlanmadi (Mongo konteynerining o'z sovuq boshlanish oynasimi,
  yoki `index.js`ning Railway uchun yozilgan `net.setDefaultAutoSelectFamily(false)`
  / `dns.setDefaultResultOrder('ipv4first')` IPv6 hack'i bilan aloqasimi) — ~1
  daqiqa vaqt oldi, qayta urinishda o'z-o'zidan tuzaldi. Takrorlansa, shu yerdan
  boshlang.

---

## Task 8: haqiqiy stack'ga qarshi qo'lda tekshirish — nima tasdiqlandi, nima odam kerak

To'liq dalil: `.superpowers/sdd/2026-08-10-plan3-frontend-player-admin/task-8-report.md`
(gitignore'langan, lekin diskda). Qisqacha:

**Terminal orqali tasdiqlangan (haqiqiy Docker stack, haqiqiy mp4, mock yo'q):**
- Admin oqimi: video yaratish → `PUT .../upload-proxy` bilan haqiqiy `.mp4`
  yuklash → javobda `pending → processing` o'tishi ko'rindi → status endpoint'ni
  bir necha marta so'rab, oxir-oqibat `streamStatus: "ready"`,
  `transcode.presetsDone: ["480p","720p"]`, `presetsTotal: 2` (720p manba klip
  bilan, ikkita preset hosil bo'lishi uchun ataylab).
- `GET /api/videos/:id` (student token) → `player.hlsUrl` bor, tokenli.
- Shu URL'ni `curl` bilan olish → 200, `application/vnd.apple.mpegurl`, master
  playlist ikkita rung bilan (720p, 480p), **ikkalasining ham child URI'si xuddi
  shu `?token=`ni tashiydi**. Child playlist va bitta segment (`.ts`) ham 200
  bilan, tokenli, haqiqiy baytlar bilan qaytdi — butun zanjir (master → rung
  playlist → segment) uchidan-uchigacha tasdiqlandi.
- mkhls o'chirilganda (`docker compose stop mkhls`): tayyor videoni so'rash
  **503** qaytardi (`"Video vaqtincha mavjud emas..."`), 200+`player:null`
  "tayyorlanmoqda" yolg'oni emas. mkhls qaytarilgach darhol 200 + yangi
  `hlsUrl`. Frontend kodida mos filial ham tasdiqlandi:
  `frontend/src/app/videos/[id]/page.tsx:234` — `isBusy = statusCode === 503`.

**Halol bo'shliq:** qisqa klip (~10s, 2 preset) bu mashinada ~15 soniyadan tez
transcode qildi — poll oralig'imdan tezroq — shuning uchun `n/m preset`ning
**oraliq** qiymatini (masalan `1/2`) curl orqali ushlab qololmadim, faqat
boshlang'ich va yakuniy holatlarni. Admin panelning progress-barini jonli
o'sishini ko'rish — pastdagi ro'yxatda.

**Odam brauzerda tekshirishi kerak (men urinmadim — Next dev server'ni o'zim
ishga tushirmaslik qoidasi bor, va Playwright'ning mavjud testlari mock route'lar
ustida ishlaydi, bu haqiqiy stack emas):**
1. `/admin/courses/<id>` — "Pullik kurs" badge'i.
2. Yuklash paneli **bloklanmasdan** yopilishi, to'g'ri toast matni.
3. Qatorda `processing` badge va `n/m preset` sonining **ko'rinib o'sishi**.
4. Foiz raqami hech qayerda yo'qligi.
5. Tabni yashirganda `/status` so'rovlari to'xtashi, qaytganda darhol biri ketishi.
6. `/videos/<id>` — video ko'rinib o'ynashi, sifat menyusi, tezlik, PiP,
   fullscreen, klaviatura (probel, ←/→).
7. ~20s ko'rib tab yopib qayta ochish → "Davom ettirildi" toast'i, to'g'ri joydan
   davom etishi.
8. Sahifani pastga aylantirganda sticky mini-player'ga o'tish **uzilishsiz**.
9. `/videos/<id>/playground` — o'sha video, resume ham ishlashi.
10. Tayyor bo'lmagan videoda "tayyorlanmoqda" ekrani, tayyor bo'lgach player
    **qo'l tegizmasdan** paydo bo'lishi.
11. mkhls o'chirilganda 503 ekranining haqiqiy ko'rinishi/matni brauzerda.

---

## Ma'lum, hali tuzatilmagan muammolar (eski HANDOFF'dan ko'chirildi + Plan 3'da topilganlar)

Eski (Plan 2 tugagandan keyingi) HANDOFF'dan ko'chirilgan, hech biri tuzatilmagan:

- **`getVideo`ning `.populate('course')`da proyeksiya yo'q**
  (`videoController.js:136`), ya'ni `data.video.course` orqali butun `Course`
  hujjati har qanday obuna bo'lgan foydalanuvchiga chiqadi.
- **`markVideoWatched` `videoId` haqiqatan `courseId`ga tegishli ekanini
  tekshirmaydi** (`enrollmentController.js:80`). O'zboshimcha `videoId`
  yuborish `progressPercent`ni 100%ga yetkazib sertifikat chiqarishi mumkin;
  bundan tashqari tekshirilmagan `videoId`ga `viewCount`ning `$inc`i ham
  biriktirilgan — bosh sahifa videolarni aynan shu bo'yicha saralaydi.
- **Yuklash hajmi chegarasi hech qaysi qatlamda yo'q.** Backend faqat
  `Content-Length` musbat ekanini tekshiradi.
- **Eski `watchedVideos[].watchedSeconds` yozuvlari eski kumulyativ shartnoma
  ostida yozilgan, endi pozitsiya sifatida o'qiladi.** Migratsiya yo'q.
  Qaytib kelgan foydalanuvchining resume nuqtasi haqiqiy o'rnidan uzoqroqqa
  tushishi mumkin; bitta seansdan keyin o'z-o'zidan tuzaladi (keyingi yozuv
  to'g'ri shartnoma bilan qayta yoziladi). **Bu Plan 3'da avvalgidan ko'ra
  ko'proq ahamiyatga ega bo'ldi**, chunki resume funksiyasining o'zi endi
  bor va aynan shu ma'lumot ustiga qurilgan
  (`frontend/src/components/videos/LessonPlayer.tsx`). Uni yutib yuboradigan
  narsa — `handleCanPlay`dagi resume darvozasi: `startAt >
  MIN_RESUME_SECONDS (5)` va `startAt < duration - END_GUARD_SECONDS (15)`
  (`LessonPlayer.tsx:36-38,70,76`). Kumulyativ qiymat deyarli har doim
  dars uzunligidan katta bo'lgani uchun ikkinchi shart uni tabiiy ravishda
  rad etadi — bu tasodif emas, ataylab shunday yozilgan (qarang shu joydagi
  izoh). Darvoza Task 7'da ikki tomondan ham testlar bilan mahkamlangan
  (40 soniyalik/4-segmentli `e2e/fixtures/hls-sample-long` fixture'i orqali:
  bitta test seek qilishi SHART bo'lgan holatni, ikkinchisi seek qilMASLIGI
  SHART bo'lgan holatni tekshiradi). Kimdir bu darvozani "soddalashtirsam"
  deb (masalan `END_GUARD_SECONDS`ni kamaytirib yoki olib tashlab) o'zgartirsa,
  qaytib kelgan foydalanuvchilar uchun jimgina buziladi — testlar buni ushlaydi,
  lekin faqat agar kimdir nima uchun bu son shunday tanlanganini bilsa.
- **Resume "eng uzoq" nuqtani o'qiydi, "oxirgi" nuqtani emas — va bu
  yuqoridagi `END_GUARD_SECONDS` darvozasi bilan birga bitta darsni
  ABADIY resume'siz qoldirishi mumkin.** (Whole-branch review'da
  yozib qo'yilgan; xatti-harakat ATAYLAB o'zgartirilmadi.)
  `markVideoWatched` pozitsiyani `Math.max(previousPosition, position)`
  bilan saqlaydi (`backend/controllers/enrollmentController.js:89`) —
  "orqaga seek eng uzoq ko'rilgan nuqtani kamaytirmasin" degan
  qasddan qo'yilgan qoida. Yangi player esa oldinga seek qilingandan
  KEYINGI pozitsiyani ham xuddi shu endpoint orqali xabar qiladi
  (`useLessonStream`ning `onPosition`i `time-update`dan keladi, seek
  farqlanmaydi). Ya'ni 40 daqiqalik darsni 39:00 ga sudrab tashlagan
  foydalanuvchida 39:00 saqlanadi — garchi u o'sha joyni ko'rmagan
  bo'lsa ham. Keyingi tashrifda `startAt = 39:00`, bu esa
  `startAt < duration - END_GUARD_SECONDS (15)` shartidan o'tolmaydi va
  `LessonPlayer` resume'ni rad etadi — **shu dars uchun doimiy ravishda**,
  chunki saqlangan qiymat endi hech qachon kamaymaydi. Yuqoridagi
  `END_GUARD_SECONDS` izohi bu darvozani faqat "eski kumulyativ
  ma'lumotdan himoya" deb tushuntiradi — ikkalasi bir-biriga shu tarzda
  bog'lanib ketishi alohida qaralganda ko'rinmaydi, shuning uchun shu
  yerda yozib qo'yildi. Tuzatish (agar kerak bo'lsa) ikkitasidan biri:
  resume uchun `Math.max`dan alohida "oxirgi pozitsiya" maydonini
  saqlash, yoki oxirigacha yetgan darsni 0'dan boshlash.
- **Go repo'da `finishJob`dagi metadata probe** (`GetMediaInfo`ning haqiqiy
  davomiylik/o'lchamni to'g'ri qaytarishi) hali testlar bilan mahkamlanmagan
  — faqat chaqiruvlar tartibi mahkamlangan. Yopish uchun `s.ffmpeg` interfeys
  orqasiga olinishi kerak.

Plan 3 davomida topilgan, ataylab tuzatilmagan yangi bo'shliqlar:

- **`useLessonStream`ning `isOwnResponse` darvozasi `GET /api/videos/:id`
  hamon `findById` bo'lib qolishiga tayanadi** (`frontend/src/hooks/
  useLessonStream.ts:96-101`). Bu darvoza — muzlatilgan resume nuqtasini
  eski Redux qiymati zaharlashidan saqlaydigan va fon-refetch o'ynayotgan
  darsni buzib qo'yishining oldini oladigan narsa (Task 2 fix davrida
  qo'shilgan): javob faqat `video._id === so'ralgan videoId` bo'lsagina
  qabul qilinadi. **Agar kimdir shu endpoint'ga slug yoki alias orqali
  qidirish qo'shsa** (masalan URL'da `/videos/mening-darsim` kabi
  inson-o'qiy oladigan yo'l), `video._id` endi so'ralgan `videoId`ga teng
  bo'lmay qoladi, darvoza hech qachon ochilmaydi, va sahifa **abadiy
  spinner** ko'rsatadi — hech qanday xato, hech qanday log, faqat
  cheksiz yuklanish. Bu endpoint'ni o'zgartiradigan kishi buni oldindan
  bilishi kerak.

  **TUZATISH KIRITILDI (whole-branch review, Critical).** Yuqoridagi
  tavsif bu xavfni "kelajakda kimdir slug qo'shsa" degan SHARTLI holat
  qilib ko'rsatgan edi — bu NOTO'G'RI edi. Xuddi shu abadiy spinner
  **bugungi kodda ham, endpoint'ga umuman tegmasdan**, oddiy ikki
  bosishlik yo'lda yuz berardi: `videos.current` butun ilova uchun bitta
  global slot, `fetchVideo.fulfilled` esa unga SHARTSIZ yozardi. Dars A
  ochiladi (tayyor — tez javob), foydalanuvchi `pending`/`processing`
  holatidagi dars B'ga o'tadi (backend `refreshPreparingStatus` ichida
  mkhls'ga borgani uchun javob sekin), B javob bermasdan turib Orqaga
  bosadi. A qayta so'ralib tez javob beradi, SO'NG B'ning kechikkan
  javobi kelib `current`ni B qilib qo'yadi — URL esa hamon A. Shundan
  keyin `isOwnResponse` abadiy `false`: `player` ham, `streamStatus` ham
  null, ya'ni token taymeri (`expiresAt` kerak), tayyorlanish polli
  (`isPreparing` kerak) va `onError` (player mount bo'lmagan) — hammasi
  o'chadi; dastlabki fetch effekti `[videoId]`ga bog'liq bo'lgani uchun
  qayta ishlamaydi; "Yangilash" tugmasi esa faqat kutish ekranida
  chiziladi, u esa umuman chizilmaydi (spinner undan oldin qaytadi).
  Faqat qattiq reload qutqarardi.

  Yechim `frontend/src/store/slices/videoSlice.ts`da: slice endi
  `currentRequestId` saqlaydi (`fetchVideo.pending`da
  `action.meta.requestId` yoziladi) va `fulfilled`/`rejected` faqat ENG
  OXIRGI so'rovga tegishli bo'lsa ma'lumot yozadi; `clearCurrentVideo`
  ham uni `null` qiladi, ya'ni tozalashdan keyin kelgan kechikkan javob
  darsni tiriltirib yubormaydi. `loading` bayrog'i ATAYLAB shartsiz
  tushiriladi (u `fetchCourseVideos` bilan umumiy — kurs sahifasidagi
  darslar ro'yxati ham shunga qaraydi). `isOwnResponse` darvozasi
  o'z joyida QOLDI: u boshqa vazifani bajaradi (fon-refetch o'ynayotgan
  player'ni uzmasligi va resume nuqtasi eski darsdan muzlab qolmasligi),
  va yuqoridagi slug/alias ogohlantirishi hamon o'z kuchida. Regressiya
  testi: `frontend/e2e/videos-stream.spec.ts` → "darslar orasida
  almashinuv" — kurs sahifasidan SPA navigatsiyasi bilan haqiqiy
  ketma-ketlikni bosib o'tadi (sekin javob qo'lda ochiladigan "eshik"
  ortida ushlab turiladi, shuning uchun tartib mashina yukiga bog'liq
  emas). Tuzatishsiz test qizil (`[data-media-player]` yo'qoladi),
  tuzatish bilan yashil.
- **`frontend/src/app/admin/settings/page.tsx` hamon Bunny konfiguratsiyasini
  hujjatlaydi** (`BUNNY_STREAM_API_KEY`, `BUNNY_LIBRARY_ID`, `BUNNY_TOKEN_KEY`)
  — mkhls migratsiyasidan keyin ham. Hech qaysi Plan 3 task'i buni o'z
  qamroviga olmagan — haqiqiy plan bo'shlig'i, whole-branch review'ga
  ko'rsatilgan.
- **Admin testlari `startUpload`ni umuman ishga tushirmaydi.** Oltinchi
  daqiqalik transcode kutish qaytadan kirsa ham (masalan
  `MKHLS_VOD_TRANSCODE_ON_UPLOAD` gate qaytarilsa), Playwright to'plami buni
  ushlamaydi. Task 8'ning qo'lda uchdan-uchgacha tekshiruvi (yuqorida) aynan
  shu yo'lni bosib o'tadi, lekin bu avtomatlashtirilmagan — regressiya
  qaytadan kirsa hech narsa qizarmaydi.
- **`e2e/fixtures/hls-sample-long/` uchun aniq `ffmpeg` buyrug'i yozilmagan
  edi** (Task 7da bayroq qilingan). Task 8'da `ffprobe` bilan mavjud
  segmentlarning har bir parametrini (kodek, profil, o'lcham, fps, audio)
  mos keltiradigan buyruq qayta tiklandi va tasdiqlandi (bir xil kodek/
  profil/o'lcham/fps, bir xil 4×10s segment chegaralari) —
  `frontend/e2e/fixtures/hls-sample-long/README.md`ga yozildi. Fayl hajmlari
  asl nusxadan sal farq qiladi (asl encoder sifat sozlamasi noma'lum) —
  testlar uchun ahamiyatsiz.

Ledger'dan qo'lda o'tkazilgan, harakat qilishga arziydigan kichik (minor)
band(lar) — to'liq ro'yxat emas, faqat keyingi kishi duch kelishi mumkin
bo'lganlari:

- ~~**`useLessonStream`ning xato-refetch mexanizmi `hlsUrl` o'zgarmagan
  holatda tiklanolmaydi**~~ (Task 2 fix davrida deferred minor deb
  yozilgan edi). **Bu band O'CHIRILDI — u aslida mavjud emas edi**
  (whole-branch review). Tavsif etilgan holat — "refetch xuddi o'sha
  `hlsUrl`ni qaytaradi" — sodir bo'lishi MUMKIN emas: `GET /videos/:id`
  har chaqiruvda `mkhls.generateStreamToken` orqali mkhls'ga
  `POST /admin/tokens/stream` yuborib YANGI token oladi
  (`backend/utils/mkhls.js:177`), `hlsUrl` esa shu token bilan quriladi
  (`backend/controllers/videoController.js:182-187`). Ya'ni `hlsUrl` har
  javobda boshqacha bo'ladi va vidstack manbani doim qaytadan yuklaydi.
  Keyingi kishi bu "muammo"ni qidirib vaqt sarflamasin.
- **O'lik i18n kaliti `playground.videoLoading`** uchala lokal faylda ham
  qoldi (`frontend/src/utils/i18n/{uz,ru,en}.ts`) — Task 4 uni ataylab
  o'chirmadi, chunki brief bunga buyurmagan edi. Keyingi kishi shu kalitni
  ishlatadigan joy qidirib vaqt yo'qotmasin — u hech qayerda chaqirilmaydi.

---

## Whole-branch review — tuzatilgan bandlar (branch'dagi oxirgi ish)

Butun-branch review (implementator emas) o'tkazildi va topilmalari bitta
tuzatish to'lqinida yopildi. Qisqacha:

1. **Critical — tartibsiz javob sahifani abadiy spinnerda qoldirardi.**
   `videoSlice`da so'rov ketma-ketligi (`currentRequestId`). To'liq tavsif
   yuqorida, "isOwnResponse" bandida. Regressiya testi qo'shildi
   (`videos-stream.spec.ts` → "darslar orasida almashinuv"): tuzatishsiz
   qizil, tuzatish bilan yashil.
2. **Important — token yangilash taymerida pol yo'q edi.**
   `useLessonStream.ts`: `Math.max(0, lead)` → `Math.max(
   TOKEN_REFRESH_MIN_DELAY_MS = 30_000, lead)`. `MKHLS_STREAM_TOKEN_TTL`
   300 soniya yoki undan past qo'yilsa (yoki mijoz soati oldinda ketsa)
   `lead` doim manfiy chiqib, taymer darhol otilardi: har aylanishda yangi
   token, yangi `hlsUrl`, player qaytadan yuklanadi, backend esa har safar
   mkhls'ga qayta autentifikatsiya qiladi — ya'ni ISSIQ SIKL. Standart TTL
   (14400) buni uxlab yotgan holatda ushlab turardi, lekin hech narsa
   cheklamasdi. Pol bilan qisqa TTL shunchaki davriy yangilanishga aylanadi.
3. **Minor — `adminNav.tsx`dagi eskirgan hint.** "Telegram, **Bunny bulk**,
   AI news" → "Telegram, AI news". Bulk bo'limi bu branch'da
   `admin/tools/page.tsx`dan o'chirilgan edi, hint esa qolib ketgan edi.

Test gigienasi bo'yicha bitta qo'shimcha tuzatish (ilova kodi emas):
`e2e/admin-videos.spec.ts`ning `mockAdmin`i endi `aidevix_cookie_consent`
kalitini oldindan qo'yadi. `CookieConsent` paneli (`z-[1100]`, `fixed`)
mount'dan 600ms keyin ochilib, tahrirlash modalining "Saqlash" tugmasini
to'sib qo'yardi. Bu **branch'ga aloqasi yo'q**: xuddi shu test toza
`2bc06e2` daraxtida, hech qanday o'zgarishsiz ham aynan shu tarzda
yiqilishi tekshirildi.

---

## Keyingi bosqich

1. ~~**Alohida whole-branch review** (implementator emas).~~ **BAJARILDI** —
   natijasi yuqoridagi bo'limda. Naqsh yana ishladi: Critical topilma
   sakkizta alohida o'tgan task review'ining hech biriga ko'rinmagan edi.
   Bu naqsh Plan 1-2'da
   bir marta va Plan 2'da yana ikki marta chok-orasidagi xatoliklarni topgan
   — har biri alohida to'g'ri ko'ringan tasklar orasidan (masalan `getVideo`
   populate proyeksiyasi, `useVideoLink` sizishi — barchasi alohida task
   review'lardan o'tib ketgan edi, faqat butun-branch review ushladi).
2. ~~**Bosqich 8 — xavfsizlik tozalash.**~~ **BAJARILDI** — pastdagi
   "Bosqich 8 — nima qilindi" bo'limiga qarang. Branch
   `feat/stage8-security-cleanup`, **merge qilinmagan**.
3. **Bosqich 9 — deploy.** CORS placeholder'ini haqiqiy domen bilan
   almashtirish (yuqorida) qattiq blokator. Spec §15.2 (mkhls'ning uchta
   oldindan mavjud bug'i — `LocalVideoSource.findVideoFile` kengaytma bug'i,
   prod config `${VAR}` kengaytirilmasligi, `App.New`ning qattiq validatsiyasi)
   ham shu bosqichdan oldin hal qilinishi shart, spec §16 bilan birga o'qing.

---

## Bosqich 8 — nima qilindi (2026-08-12)

Branch `feat/stage8-security-cleanup`, `main`dan `9d74676`da ajralgan, **14 commit**,
**merge qilinmagan va push qilinmagan**. Spec: `specs/2026-08-11-stage8-security-cleanup-design.md`,
reja: `plans/2026-08-11-stage8-security-cleanup.md`. Bosqich subagent-driven, 8 task,
har biri alohida review, oxirida butun-branch review.

Bunny **butunlay** olib tashlandi: `utils/bunny.js` moduli, `deleteVideo` dagi oxirgi
chaqiruv, `POST /api/admin/videos/bulk-link` + `bulkLinkBunny`, o'lik
`GET /api/videos/:id/upload-credentials` (backend + frontend), model'dagi
`bunnyVideoId`/`bunnyStatus` + `index({bunnyStatus:1})`, `/status` javobidagi
`bunnyStatus` ko'zgusi, swagger'dagi `BunnyPlayer` (→ `StreamPlayer`) va
`.env.example` dagi `BUNNY_*` bloki, frontend matnlari, hamda `sw.js` dagi Bunny
bypass hostlari.

### SIZNING ISHINGIZ — hali bajarilmagan

- **Bunny API kaliti hali bekor qilinmagan.** `fetch_bunny.html` ichida qattiq yozilgan
  kalit (`164b15f1-…`, library `621910`) bor edi; fayl o'chirildi, lekin repo
  **public** (`github.com/SunnatbekYusupovTech/aidevixBackend`) va kalit **git tarixida
  qoladi**. Git tarixi ataylab qayta yozilmadi (fork/klon/kesh/scraper sizishni orqaga
  qaytarmaydi). Yagona samarali chora: `dash.bunny.net` → Stream → library `621910` →
  API Key'ni **bekor qilish/almashtirish**.
- **`test-gemini.js` hali repo ildizida, ikkita Google Gemini kaliti bilan.** Siz uni
  keyinga qoldirdingiz — bu bosqich unga umuman tegmadi (branch tarixida yo'q).
  Xuddi shu kalitlar ham public tarixda.

### Ataylab qilinmagan qarorlar

- **DB migratsiyasi yo'q.** `bunnyVideoId`/`bunnyStatus` ma'lumoti va `bunnyStatus_1`
  indeksi MongoDB'da qoladi. Mongoose `strict` rejimi ularni ko'rmaydi, ya'ni zararsiz.
  Qo'lda tozalash: `db.videos.dropIndex('bunnyStatus_1')` — bu eslatma
  `backend/models/Video.js` da izoh sifatida yozib qo'yilgan.
- **Xatti-harakat o'zgarishi:** `bunnyVideoId` tashigan eski video o'chirilganda endi
  Bunny tomonda yetim yozuv qoladi (backend endi Bunny'ga DELETE yubormaydi).
- **Uchta izoh ataylab qoldirildi** — ular Bunny nima uchun ketgani va nima
  qoldirganini tushuntiradi: `models/Video.js` (indeks yo'riqnomasi),
  `controllers/videoController.js` (mkhls nima uchun slot talab qilmasligi),
  `frontend/src/app/admin/courses/[id]/page.tsx` (6 daqiqalik polling timeout).
- **`team/page.tsx` va i18n'da vendor nomi almashtirilmadi, olib tashlandi** — u matn
  bir odamning tarixiy hissasini tasvirlaydi, "mkhls" deb yozish mkhls ishini
  (Plan 1-3) unga noto'g'ri yozib qo'ygan bo'lardi.
- **`.playwright-cli/` dan faqat 2 ta fayl o'chirildi** (Bunny matni tutgani), qolgan
  37 tasi qoldi.

### Yangi qo'riqchi test — buni bilmasdan o'zgartirmang

`backend/__tests__/no-bunny.test.js`, **ikki qatlamli**:

- **1-qatlam (qattiq):** `FORBIDDEN_IDENTIFIERS` — `bunnycdn`, `mediadelivery.net`,
  `b-cdn.net`, `BUNNY_*` kalitlari, `utils/bunny`, `bunnyVideoId`, `bunnyStatus:`
  (ikki nuqta bilan!), `BunnyPlayer`, eski funksiya nomlari. **Istalgan faylda**
  qizaradi — allowlist uni teshib o'tolmaydi.
- **2-qatlam (yumshoq):** yalang'och `bunny` so'zi — yuqoridagi uchta izoh fayli
  (`PROSE_ALLOWLIST`) dan tashqari hamma joyda qizaradi.
- Istisnolar: `docs/`, `frontend/e2e/`, `backend/__tests__/` — ular yo'qlikni
  TASDIQLAYDI, shuning uchun Bunny nomini aytishi shart.
- `bunnyStatus:` ataylab ikki nuqta bilan: `Video.js` dagi `bunnyStatus_1` izohini
  yolg'on aybdor qilmasligi uchun. Bo'sh joyli variant (`bunnyStatus :`) va
  TS `bunnyStatus?:` ushlanmaydi — bilib qilingan murosaga.
- **Allowlist'ga fayl qo'shib testni yashil qilmang.** Ikki marta shu qo'riqchi
  haqiqiy qoldiqni topdi (`sw.js` dagi Bunny bypass hostlari, keyin swagger'dagi
  `vz-*.b-cdn.net` thumbnail misoli).

### Tekshirilgan / tekshirilmagan

- Backend: **9 to'plam / 159 test / 0 xato.** Typecheck darvozasi PASS. Frontend build PASS.
- e2e: ikkala Bunny-yo'qligi testi 6 ta brauzer profilida **12/12 yashil**.
- **Qolgan 40 e2e xatoligi bu branch'ga aloqasi yo'q**, sababi mexanik ravishda
  aniqlandi: `admin/layout.tsx:236` da sidebar `hidden lg:block`, ya'ni 1024px dan
  past ekranlarda ko'rinmaydi; `admin-videos.spec.ts:93,114` esa `getByText('Aidevix
  Admin')` ni kutadi → 2 test × 3 tor profil = aynan 6 ta. Qolgan 34 tasi WebKit
  oilasida: player `hls.js` ishlatadi, u MSE talab qiladi, Playwright'ning WebKit
  build'i esa bunda ma'lum cheklovga ega. Desktop Chromium 45/45 yashil.
- **Tekshirilmagan:** jonli Docker stack'da uchidan-uchigacha smoke (spec §4.6) —
  ijro paytida Docker'da konteyner yo'q edi. Deploy'dan keyin bir marta yugurtiring:
  backend ko'tarilishi va `GET /api/videos/:id` tokenli `hlsUrl` qaytarishi.

---

## Plan 4 — mkhls §15.2 blokatorlari (2026-08-12)

Ish **`mkhls-streamer` repo'sida**, `feat/vod-local-pipeline` ga merge qilingan
(`bc97f80` → `d04955f`, 7 commit). **Push hamon bloklangan** — sentinel joyida.
Spec: `specs/2026-08-12-mkhls-stage9-blockers-design.md`,
reja: `plans/2026-08-12-mkhls-stage9-blockers.md`.

Spec §15.2 ning uchala bandi yopildi:

1. **`LocalVideoSource.findVideoFile`** endi kengaytmani ko'r-ko'rona qo'shmaydi
   (`findS3Video` mantiqi ko'chirildi). `pkg/storage/` da birinchi test fayli paydo bo'ldi.
2. **Prod config'dagi `${VAR}` placeholder'lari** aniq qiymatlarga almashtirildi;
   override yagona mexanizm — `MKHLS_` + nuqtali kalit yo'li.
3. **`deployments/PREFLIGHT.md`** — `App.New` sovuq startda nimani tekshirishi yozildi.
   Kod o'zgartirilmadi.

### Bu bosqichda spec/rejamning uchta faktik xatosi topildi

Review'lar har birini kod bilan isbotladi; spec va reja tuzatish bloklari bilan yangilandi:

- `expandEnvVars` `s3.endpoint/access_key/secret_key/bucket` va `auth.*` ni **kengaytiradi**
  (`config.go:537-549`). Qamrab olinmaganlari faqat `vod.source_type`, `vod.cache_max_size`,
  `s3.region`. Muhimi: `os.ExpandEnv` qo'yilmagan env uchun `""` qaytaradi, ya'ni qamrab
  olingan maydonlar uchun "qiymatda `${` yo'q" tekshiruvi **trivial o'tadi**.
- `vod.root_path` tekshiruvi **ulanmagan volume'ni ushlamaydi**: `app.go:133`
  `initInfrastructure` → `app.go:182` `MkdirAll`, `ValidateConfig` esa `app.go:146` da.
  Ulanmagan volume hech qanday start xatosi bermaydi — videolar doimiy bo'lmagan xotiraga yoziladi.
- Validator tekshiruvlarining uchtasi **faqat `app.env == "production"`** da ishlaydi
  (`validator.go:120, 179, 229, 238`).

### Yakuniy review topgan chok-orasidagi regressiya (eng muhim)

`${VAR}` larni o'chirish repo'ning **o'z** `deployments/docker/docker-compose.yml` idagi
prefikssiz env o'zgaruvchilarining yagona kanalini uzgan edi. Eng xavflisi:
`ADMIN_USERNAME`/`ADMIN_PASSWORD` e'tiborsiz qolib, `app.go:330-334` Debug'da log yozib
`return nil` qiladi — **admin user yaratilmaydi, server ko'tariladi, kirish mumkin emas,
hech qanday xato yo'q**. Compose'dagi 12 ta o'zgaruvchi `MKHLS_` shakliga o'tkazildi.

Task review'lari buni ko'ra olmasdi: biri YAML'ni, ikkinchisi hujjatni ko'rgan,
compose faylini hech kim ochmagan.

### Ochiq bandlar

- ~~**`.flv` / `.wmv` / `.m4v` uchun DOIMIY 404 hamon jonli.**~~ **YOPILDI**
  (Plan 5, mkhls `86651cf`, `beb9cb6`, `52172c7`). Yuklash ro'yxati beshtaga
  toraytirildi (`.flv`/`.wmv`/`.m4v` endi butunlay rad etiladi, foydalanuvchi
  qarori — pastdagi "Plan 5" bo'limiga qarang) va ikkala kirish nuqtasi —
  yuklash (`admin_handler.go` upload handler) ham, `ScanVideos` ham — endi
  qattiq yozilgan ro'yxat emas, `vod.allowed_extensions`ning o'zini o'qiydi.
  Ikki ro'yxatning mustaqil ajralib ketishi endi tuzilishi mumkin emas —
  yagona haqiqat manbai bitta joyda.
- `docker-compose.yml:25` `/data/videos` ni `:ro` qilib ulaydi, `admin_handler.go:819-820`
  esa unga yozadi.
- `deployments/PREFLIGHT.md` da bitta havola oralig'i qisqa: `338-360` → `338-387`
  (`validateLogging` 339-387). Bir qatorlik tuzatish, parklangan.
- `aidevixBackend/docker-compose.dev.yml:33-41` izohi endi yolg'on — prod config'da
  `${VAR:-default}` qolmagan.
- **`mkhls-streamer/CLAUDE.md`** "No Claude attribution in commits" deydi, bu reja esa
  `Co-Authored-By` trailer'ini majbur qilgan — ettala commitda ham bor. Hal qilinmagan.

### Bosqich 9 uchun qolgani

CORS hamon qattiq blokator: `configs/production/config.yaml` da `your-domain.com`
placeholder'lari. Kutilayotgan qiymat — **`stream.aidevix.uz`**. Foydalanuvchi uni
ulangandan keyin qaytishni so'radi.

---

## Plan 5 — beshta jonli xato (2026-08-13)

Spec: `docs/superpowers/specs/2026-08-12-plan5-live-bugs-design.md`. Ikkita repo:

- **`mkhls-streamer`**, branch `feat/plan5-extensions` — Band 1
  (`86651cf`, `beb9cb6`, `52172c7`, yuqoridagi "Ochiq bandlar"da yopilgan deb
  belgilandi).
- **`aidevixBackend`**, branch `feat/plan5-live-bugs` — Band 2-5: `398a56c`
  (bosh sahifa `motion`→`m`), `25c6ddc`+`15a463b` (`getVideo` proyeksiyasi),
  `1c6e4c3`+`3d7dc0c` (yuklash 5 GB chegarasi). Band 4
  (`markVideoWatched` a'zolik tekshiruvi) shu branch commitlari ichida —
  aniq commit uchun `git log --oneline` bilan `enrollmentController.js`ni
  qidiring.

Ikkala branch ham **merge qilinmagan, push qilinmagan** — mkhls'da sentinel
hamon joyida.

Whole-branch review (final) o'tkazildi va uchta topilma yopildi (kod
o'zgarishlari yuqoridagi ochiq band ro'yxatiga ta'sir qilmadi, bundan
mustasno — pastga qarang): mkhls'da extension-gate `header.Filename`ni emas,
saqlash yo'lini tekshirishi kerakligi (Minor) va normalizatsiya bitta
iste'molchida emas, config qatlamida bo'lishi kerakligi (Minor) tuzatildi.
Uchinchi topilma quyida yangi ochiq band sifatida yozildi — u tuzatilmadi,
chunki qamrovi shu spec'dan tashqarida (aidevix yuklash yo'li, mkhls emas).

### Yangi ochiq bandlar (Plan 5 spec §5.3, §6 va final review)

- **Eski `enrollment.watchedVideos` yozuvlari begona `videoId`larni hali ham
  ko'tarib yuribdi.** Band 4 (§5.1-5.2) faqat **yangi** yozuvlarni himoya
  qildi — `push`dan oldin a'zolik tekshiriladi. Bu tuzatishdan **oldin**
  yozilgan qatorlar tekshiruvsiz o'tib ketgan, ular hali bazada turibdi va
  bugun ham `progressPercent`ni shishirib turibdi. Tozalash **migratsiya**
  bo'ladi; spec §5.3 buni ataylab qamrovdan tashqarida qoldirdi (bosqich 8,
  Plan 4 bilan izchil — DB'ga tegmaslik qarori). Migratsiya yozilmagan.
- **mkhls'ning o'z yuklash hajmi chegarasi yo'q.** Band 5 (§6) faqat backend
  proxy'ni 5 GB bilan chegaraladi (`videoController.js`, `uploadVideoProxy`).
  Ilova mkhls'ga faqat shu proxy orqali boradi, shuning uchun amaliy
  bo'shliq **chegaralangan**, lekin mkhls'ning o'z admin API'siga
  to'g'ridan-to'g'ri murojaat qiladigan har qanday boshqa chaqiruvchi uchun
  haqiqiy bo'shliq qoladi. Spec bu holni ataylab tuzatmaslikka qaror qildi
  (YAGNI, §6).
- **Eng muhimi — aidevix yuklash yo'li mkhls'ga har doim `.mp4` deb
  taqdim etadi, admin nima tanlagani muhim emas.** Final review topdi.
  `backend/utils/mkhls.js:214` yuklashda `filename:
  streamPath.split('/').pop()` deb qo'yadi, `streamPath` esa
  `buildStreamPath` (`:54`) orqali doim `<namespace>/<videoId>.mp4`
  ko'rinishida quriladi — ya'ni haqiqiy fayl kengaytmasi (`.flv`, `.avi`,
  nima bo'lishidan qat'i nazar) mkhls'ga hech qachon yetib bormaydi, mkhls
  esa har doim `.mp4` ko'radi. Natijada Band 1'ning mkhls tomonidagi
  kengaytma darvozasi (yuqoridagi "YOPILDI" bandi) **aidevix admin panelidan
  kelgan yuklashlarni umuman ko'rmaydi** — admin `lesson.flv`ni admin panel
  orqali yuklasa, u baribir qabul qilinadi va `<id>.mp4` deb saqlanadi,
  keyin esa doimiy 404 (aynan Band 1 yopgan sinf xato) qaytadan sodir
  bo'ladi, faqat bu safar mkhls tomonidagi darvoza uni to'xtatolmaydi. Band
  1'ning spec'dagi asoslamasi — "admin darhol aniq xato oladi" (§2.2) — bu
  yo'l uchun **to'g'ri emas**: darvoza faqat mkhls admin API'sining
  to'g'ridan-to'g'ri chaqiruvchilarini himoya qiladi, aidevix oqimini emas.
  Tuzatish bu spec qamrovidan tashqarida qoldirildi — keyingi kishi
  `mkhls.js`da haqiqiy fayl kengaytmasini (masalan asl fayl nomidan yoki
  MIME turidan) `streamPath`/`filename`ga o'tkazish yo'lini ko'rib chiqsin.

---

## Ishlash uslubi (uch marta ketma-ket yaxshi ishladi, Plan 3'da to'rtinchi marta ham)

`superpowers` skill'lari: brainstorming → writing-plans → subagent-driven-development.

- **Har taskda qo'lda uchdan-uchgacha tekshirish.** Haqiqiy fayl/haqiqiy stack
  bilan ishlatish — unit test va code review tutolmaydigan narsani ochadi.
  Plan 3'da ham (masalan Task 5'ning noto'g'ri mock shakli, faqat jonli test
  bilan topildi) haqiqiy xatoliklarni ochdi.
- **Butun-branch review oxirida, alohida, implementator emas.** Bu Plan 1-2'da
  bir marta, Plan 2'da yana ikki marta chok-orasidagi bug'larni topdi — har
  biri alohida to'g'ri ko'ringan tasklar orasidan. Plan 3 oxirida ham xuddi
  shu tarzda rejalashtiring.

---

## Yangi suhbatni shu bilan boshlang

> `aidevixBackend/docs/superpowers/HANDOFF.md` ni oqing. "Bosqich 8" va "Plan 4"
> qilindi" bo'limiga alohida e'tibor bering. Bosqich 9 (deploy) ga o'ting.

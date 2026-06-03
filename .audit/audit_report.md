# 🛡️ Aidevix — Team Lead Audit Report

| | |
|---|---|
| **Loyiha** | Aidevix (Express 5 + Next.js 14 + MongoDB) |
| **Rejim** | full-review (butun repo) |
| **Sana** | 2026-06-02 |
| **Sub-agentlar** | security · api-design · performance · data-model · architecture · frontend · payment |
| **Tahlil qilingan fayllar** | ~50 maqsadli fayl (repo map: 953 imzo / 358 manba fayl) |
| **Umumiy baho** | **6.5 / 10** |

> Metodologiya: TeamLead repo map (faqat imzolar) tuzdi → 7 ta izolyatsiyalangan sub-agent
> o'z sohasidagi fayllarni chuqur o'qib `findings/*.json` ga yozdi → TeamLead dedup + confidence
> filtr bilan jamladi. TeamLead raw kodni o'qimadi (context tekis qoldi).

---

## 📊 Baho taqsimoti

| Soha | Baho | Kritik | Ogohlantirish | Tavsiya |
|------|:----:|:------:|:-------------:|:-------:|
| 🔐 Security | 8/10 | 0 | 2 | 6 |
| 💳 Payment | 5/10 | 1 | 4 | 3 |
| 🔌 API Design | 6/10 | 0 | 5 | 6 |
| ⚡ Performance | 6/10 | 1 | 5 | 5 |
| 🗄️ Data Model | 7/10 | 0 | 6 | 5 |
| 🏛️ Architecture | 6/10 | 0 | 6 | 7 |
| 🎨 Frontend | 7/10 | 0 | 3 | 6 |

**Asosiy xulosa:** Auth yadrosi (enumeration-safe login, tokenVersion, hashed reset
token, CSRF double-submit, TMA HMAC) va `index.js` middleware tartibi **namunaviy**.
Eng katta xavf — **to'lov webhook autentifikatsiyasi** (fail-open misconfig) va keng
tarqalgan **error-handling anti-pattern** (controller-local `try/catch` markaziy
`errorMiddleware`ni chetlab o'tib, prod'da ham xom `err.message` leak qiladi).

---

## 🔴 KRITIK (2 ta) — darhol tuzatish

### C-1 · To'lov webhook auth secret yo'q bo'lsa FAIL-OPEN
`backend/controllers/paymentController.js:16` · confidence **0.85** · `payment` + `security`

`verifyPaymeAuth()` va `verifyClickSignature()` merchant secret env o'rnatilmagan bo'lsa
`return process.env.NODE_ENV !== 'production'` qaytaradi. Prodda `PAYME_MERCHANT_KEY` /
`CLICK_SECRET_KEY` yetishmasa **yoki** `NODE_ENV` noto'g'ri/o'rnatilmagan bo'lsa (Railway'da
oson xato) webhook autentifikatsiyasi **butunlay o'chadi**. Bu holatda istalgan odam
`POST /api/payments/payme PerformTransaction` yuborib, to'lovsiz kursni `completed` qilib
**enrollment + abadiy PRO subscription** olishi mumkin. Pul oqimi **fail-closed** bo'lishi shart.

```js
// HOZIR (fail-open):
if (!merchantKey) { return process.env.NODE_ENV !== 'production'; }

// TUZATISH (fail-closed + boot-time guard):
if (!merchantKey) {
  logger.error('PAYME_MERCHANT_KEY missing — denying all webhooks');
  return false; // hech qachon true emas
}
// + index.js boot'da: agar prod va secret yo'q -> process.exit(1) (fail-fast)
```

### C-2 · Weekly digest — N+1 + to'liq serial broadcast (event-loop bloklash)
`backend/utils/digestScheduler.js:139` · confidence **0.95** · `performance`

Har faol user uchun loop ichida `Enrollment.findOne().populate()` (N+1) + serial `await
sendDigestToUser` (email + Telegram, har biri ~10s timeout). Minglab userda bu minglab
ketma-ket round-trip — sxeduler **bir necha daqiqa** ishlaydi va DB connection'ni ushlab
turadi. Throttle faqat har 25-userda uxlaydi. Qo'shimcha (C-2b): `UserStats.find({})` butun
kolleksiyani xotiraga yuklaydi (rank map uchun), faqat faol userlar digest olsa ham.

```js
// nextCourse'ni 100-user slice uchun bitta aggregation bilan oling;
// email/Telegram'ni p-limit(5) bilan controlled-concurrency yuboring;
// rankMap uchun: UserStats.find({ xp: { $gt: 0 } }) + { xp: -1 } index.
```

---

## 🟡 OGOHLANTIRISH (yuqori ishonch ≥ 0.8)

### W-1 · Controller-local `try/catch` → `errorMiddleware` chetlab o'tiladi, xom `err.message` leak
`promptController.js:31` (+ videoController, adminController, courseController, uploadController, paymentController) · confidence **0.95** · `api-design` + `architecture` + `security`

**Eng keng tarqalgan tizimli muammo.** 27 controllerdan faqat 4 tasi `asyncHandler` ishlatadi;
qolganlarida **~174 ta** qo'lda `} catch (err) { res.status(500).json({ message: err.message }) }`
bloki bor. Oqibati: (1) yaxshi qurilgan `errorMiddleware` (CastError→404, ValidationError→400,
prod'da generic message) bu yo'llarda **o'lik kod**; (2) yaroqsiz ObjectId → 500 (404 emas);
(3) **prod'da ham** xom Mongoose/internal xato matni client'ga sizadi (2026-05-11 hardening regressi).

> **Fix (eng yuqori ROI):** Barcha controllerni `asyncHandler()` bilan o'rab, ichki `try/catch`'ni
> olib tashlash → `next(err)` markaziy handler'ga. `backend/middleware/asyncHandler.js` allaqachon mavjud.

### W-2 · `validateObjectId` ko'p route'larda yo'q + faqat `req.params.id` ni tekshiradi
`middleware/validateObjectId.js:5`, `routes/promptRoutes.js`, `routes/adminRoutes.js` · confidence **0.9** · `api-design` + `architecture`

Middleware faqat `courseRoutes`/`videoRoutes`da. Bundan tashqari middleware **hardcoded
`req.params.id`** ni tekshiradi — `:courseId`, `:videoId`, `:userId`, `:sectionId` nomli
param'lar uchun **umuman ishlamaydi**. Javob ham `{message}` (global `{success,message}` emas).

> **Fix:** Parametrik qilish — `module.exports = (param='id') => (req,res,next) => {...req.params[param]...}`;
> barcha `:id/:courseId/...` route'larda mos nom bilan qo'llash; javobni `{success:false}` ga keltirish.

### W-3 · To'lov credential/imzo taqqoslash timing-safe emas
`paymentController.js:25, 52` · confidence **0.85** · `security` + `payment`

`password === merchantKey` va `providedSign === expectedSign` native `===` bilan — first-byte
short-circuit timing side-channel. CSRF-exempt, internetdan ochiq pul webhook'lari uchun bu
asosiy auth chegarasi.

> **Fix:** `crypto.timingSafeEqual` (yoki mavjud `safeEqual`/`hashToken`) bilan equal-length buffer taqqoslash.

### W-4 · Promo kod `usedCount` hech qachon oshirilmaydi → `maxUses` bypass
`promoController.js:101` · confidence **0.9** · `payment`

`validatePromoCode` `usedCount >= maxUses` ni tekshiradi, lekin codebase'da `usedCount` hech
qaerda `$inc` qilinmaydi (grep tasdiqladi). Bir martalik / cheklangan promo kod **cheksiz**
ishlatilishi mumkin.

> **Fix:** To'lov muvaffaqiyatli yakunlanganda atomic `findOneAndUpdate({$expr:{$lt:[usedCount,maxUses]}},{$inc:{usedCount:1}})`.

### W-5 · JSON-LD `dangerouslySetInnerHTML` — `</script>` breakout (stored XSS)
`frontend/src/app/u/[username]/page.tsx:97` · confidence **0.8** · `frontend`

User-controlled `bio/firstName/lastName/username` `JSON.stringify` orqali `<script type=ld+json>`
ga injekt qilinadi. `JSON.stringify` `</script>` ni escape qilmaydi — bio'da
`</script><img src=x onerror=...>` har tashrifchida JS bajaradi. CSP **Report-Only** + `unsafe-inline`
bo'lgani uchun himoya yo'q.

> **Fix:** `JSON.stringify(schema).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026')`.
> Barcha JSON-LD bloklarga (u/[username], courses/[id]/layout, videos/[id]/layout, layout.tsx).

### W-6 · CSP Report-Only + `unsafe-inline` — enforced XSS himoyasi yo'q
`frontend/next.config.mjs:54` · confidence **0.95** · `frontend`

CSP faqat `Content-Security-Policy-Report-Only` — brauzer hech narsa bloklamaydi. `script-src`'da
`unsafe-inline` + keng `https:`. W-5 bilan birga runtime XSS containment qatlami yo'q.

> **Fix:** Enforcing `Content-Security-Policy`ga o'tish; `unsafe-inline` o'rniga per-request nonce.

### W-7 · `register` thunk'da o'lik auto-login tarmog'i → `isLoggedIn=true` undefined user bilan
`frontend/src/store/slices/authSlice.ts:18` · confidence **0.9** · `frontend`

Register endi sessiya bermaydi (har doim `requiresEmailVerification`), lekin thunk'da eski
auto-login tarmog'i qolgan. Envelope drift bo'lsa `data.data.user` throw qiladi yoki
`registerFulfilled` `user=undefined` bilan `isLoggedIn=true` qiladi (alohida reducer, email-verify'ni honor qilmaydi).

> **Fix:** `data?.data?.user` guard; register'ni shared `fulfilled` reducer orqali o'tkazish; o'lik tarmoqni olib tashlash.

### W-8 · Cheksiz o'suvchi embedded array'lar (16MB doc limit + lost-update)
`Prompt.likes` (`models/Prompt.js:36`), `User.knownDevices:76`, `Enrollment.watchedVideos:39` · confidence **0.85–0.9** · `data-model`

`likes` har like uchun ObjectId push qiladi (mashhur prompt → 16MB limit + har query'da to'liq
yuklash). `knownDevices` cap'siz (`passwordHistory` 5-cap bilan farqli). `watchedVideos` dedupe
kafolatisiz o'sadi.

> **Fix:** `likes`'ni alohida `PromptLike` collection'ga (`{promptId,userId}` unique) ko'chirish,
> prompt'da faqat `likesCount`; `knownDevices`'ga `$push:{$slice:-20}` cap; `watchedVideos` `$addToSet`.

### W-9 · Payment idempotency: `providerTransactionId`/`clickTransId` unique constraint yo'q
`models/Payment.js:77` · confidence **0.85** · `data-model`

Faqat sparse non-unique index. Provayder webhook'ni qayta yuborsa (retry) bir tranzaksiya
uchun ikki Payment yoki double enrollment/PRO grant xavfi. Idempotency faqat controller logikasiga tayanadi.

> **Fix:** `{provider, providerTransactionId}` compound `unique:true, sparse:true`.

### W-10 · `Payment.providerResponse/providerData` Mixed — sanitatsiyasiz tashqi payload
`models/Payment.js:42` · confidence **0.85** · `data-model`

Webhook'dan kelgan to'liq payload to'g'ridan saqlanadi. `$`/`.`/`__proto__` kalitlari →
prototype-pollution / operator-injection xavfi.

> **Fix:** Saqlashdan oldin kerakli field'larni pluck yoki `JSON.parse(JSON.stringify(...))`.

### W-11 · XP→rank tier logikasi 6+ modulda takror (single source of truth yo'q)
`xpController.js:8`, `authController.js:56`, `awardXp.js:4`, `rankingController.js:9`, `userController.js:94` · confidence **0.95** · `architecture`

`calculateRank`/`getRankTitle` mustaqil ravishda qayta yozilgan. Rank chegaralari o'zgarsa
leaderboard/profil/bot/XP-award orasida tafovut.

> **Fix:** Bitta `utils/rank.js` (kanonik), hamma joyda import.

### W-12 · Service layer yo'q + god controllerlar (SRP)
`telegramBot.js:12` (1489 q.), `adminController.js` (~590 q., 22 fn), `videoController.js` (~700 q., 21 fn) · confidence **0.8–0.85** · `architecture`

Controller'lar va `telegramBot` DB + biznes + tashqi API (Bunny/Groq/Resend/Telegram/Payme)'ni
inline bajaradi. Q&A logikasi `videoController`da, challenge/payment admin `adminController`da aralash.

> **Fix:** `services/` qatlami; `videoController`'dan Q&A'ni, `adminController`'dan challenge/stats'ni ajratish.

### W-13 · Performance: `.lean()` yo'q + indekslanmagan rank count + serial count
`rankingController.js:70` (getTopUsers), `adminController.js`, `userController.js:71` · confidence **0.85** · `performance`

Public leaderboard `getTopUsers` `.lean()`siz to'liq Mongoose hydration; rank
`countDocuments({xp:$gt})` indekssiz full-scan; `countDocuments` + `find` ketma-ket (`Promise.all` emas).

> **Fix:** Read-only query'larga `.lean()`; `UserStats`'ga `{xp:-1}`,`{weeklyXp:-1}` index; count+find'ni `Promise.all`.

### W-14 · `newsScheduler` har post'da sinxron fs read-modify-write (event-loop bloklash)
`utils/newsScheduler.js:79` · confidence **0.8** · `performance`

`markAsSent()` har yuborishda `fs.existsSync`+`readFileSync`+`writeFileSync` — bloklovchi,
JSON haftalik o'sadi, atomik emas (multi-instance unsafe).

> **Fix:** `fs.promises` + in-memory Set + debounced flush, yoki dedupe holatini DB/Redis'ga.

### W-15 · Pagination envelope shakli endpointlar bo'ylab izchil emas + `getPrompts` limit cap'siz
`promptController.js:8,29`, `courseController.js` · confidence **0.8–0.85** · `api-design`

3 xil pagination shakli; `getPrompts`/`getAllCourses` `limit`'da yuqori cap yo'q
(`?limit=100000` → DoS/memory), `page=0` → manfiy skip.

> **Fix:** Bitta envelope helper; `limit = Math.min(50, Math.max(1, +limit||20))`, `page = Math.max(1,...)`.

### W-16 · `reorderVideos` 500 ta alohida `findByIdAndUpdate` (atomik emas + pool saturatsiya)
`adminController.js:362` · confidence **0.85** · `performance` + `api-design`

`Promise.all`da 500 ta alohida update; bitta xato butun batch'ni reject qiladi, oldingilari
allaqachon commit (transaction yo'q) → yarim qo'llangan tartib.

> **Fix:** `Video.bulkWrite([...updateOne...])` (bitta round-trip).

### W-17 · `continueLearning` loop ichida `Video.findOne` (N+1, hot home widget)
`enrollmentController.js:168` · confidence **0.85** · `performance`

5 enrollment'ga 5 ketma-ket query. limit 5 da chidasa-da, `Promise.all` bilan fan-out yaxshiroq.

> **Fix:** 5 `Video.findOne`'ni `Promise.all` bilan; `{course:1,isActive:1,order:1}` compound index.

### W-18 · Scheduler/bot/email `require()` `connectDB().then()` ichida lazy
`index.js:43` · confidence **0.8** · `architecture`

Lazy require — circular-dep / init-tartib muammosini yashirish signali; modul yuklash xatosi
boot'da emas, server ishga tushgandan keyin chiqadi (fail-fast emas).

> **Fix:** `require`'larni top-level'ga; faqat `start*()` chaqiruvlarini `connectDB().then()`da qoldirish.

---

## 🟢 EHTIMOLIY / TAVSIYA (confidence 0.5–0.8)

| ID | Soha | Joy | Muammo (qisqa) | Conf |
|----|------|-----|----------------|:----:|
| PAY-003 | payment | paymentController.js:121 | Promo chegirma server-side qo'llanmaydi (`validate` route'ga ulanmagan) | 0.75 |
| PAY-004 | payment | paymentController.js:57 | PRO grant faqat amount/category asosida, abadiy (`expiresAt:null`), idempotent emas | 0.70 |
| PAY-006 | payment | paymentController.js:201 | Payme `order_id` yaroqsiz ObjectId → CastError, spec `-31050` emas | 0.60 |
| PAY-007 | payment | paymentController.js:385 | Click amount birligi (UZS vs tiyin) Payme bilan mos kelmasligi | 0.55 |
| PAY-008 | payment | enrollmentController.js:19 | `enrollCourse` poyga: `studentsCount` 2x oshishi mumkin | 0.50 |
| SEC-004 | security | index.js:212 | `express-mongo-sanitize` `req.query`ni qoplamaydi (NoSQL injection vektori) | 0.70 |
| SEC-005 | security | paymentRoutes.js:8 | Webhook'larda source-IP allowlist yo'q | 0.55 |
| SEC-007 | security | index.js:179 | Backend CSP `unsafe-eval` (Swagger uchun) app-wide | 0.50 |
| API-004 | api-design | promptController.js:8 | `getPrompts` limit cap'siz (W-15 bilan) | 0.80 |
| API-006 | api-design | promptController.js:167 | View count ikki marta (`GET /:id` + `POST /:id/view`) | 0.70 |
| API-007 | api-design | promptController.js:5 | JSDoc `@access Public` route auth bilan zid | 0.65 |
| API-008 | api-design | xpController.js:173 | `submitQuiz` `answers[]` shaklini validatsiya qilmaydi → 500 | 0.60 |
| API-009 | api-design | courseController.js:201 | `createCourse/updateCourse` derived stat (rating/studentsCount) mass-assignment | 0.60 |
| DM-006 | data-model | Course.js:9 | `title/description` `maxlength` yo'q (unbounded string) | 0.75 |
| DM-007 | data-model | Prompt.js:30 | `tags`/`skills` array uzunligi cap'siz | 0.70 |
| DM-008 | data-model | Enrollment.js:13 | Cascade/orphan himoyasi yo'q (Course delete → dangling refs) | 0.80 |
| DM-009 | data-model | Prompt.js:37 | Denormalizatsiya counter drift + `min:0` yo'q | 0.70 |
| DM-010 | data-model | User.js:197 | `telegramUserId` index yo'q (bot lookup full-scan) | 0.70 |
| API-005 | api-design | promptController.js:221 | `likePrompt` read-modify-write → lost-update race | 0.75 |
| PERF-006 | performance | rankingController.js:33 | Bir nechta admin/ranking read `.lean()`siz | 0.80 |
| PERF-007 | performance | userController.js:71 | Rank `countDocuments({xp:$gt})` indekssiz | 0.75 |
| PERF-011 | performance | enrollmentController.js:72 | `markVideoWatched` har watch'da to'liq `Course.videos` yuklaydi | 0.60 |
| ARCH-005 | architecture | index.js:288 | `/api/v1` versioning yo'q | 0.85 |
| ARCH-012 | architecture | telegramBot.js:136 | Hardcoded admin Telegram ID `697727022` ×15 fallback | 0.95 |
| FE-003 | frontend | LoginForm.tsx:62 | `ProtectedRoute` `?next=` yozadi, `LoginForm` o'qimaydi (o'lik redirect) | 0.90 |
| FE-004 | frontend | AdminRoute.tsx:9 | Client-only guard — backend `requireAdmin` har `/api/admin/*`da bo'lishi shart | 0.85 |
| FE-008 | frontend | authSlice.ts / route guards | Keng `any` + `@ts-nocheck` route guard'larda (W-7 ildizi) | 0.85 |
| FE-009 | frontend | authSlice.ts:100 | `checkAuthStatus` localStorage cache'ni `/auth/me` uchun shart qiladi (cookie authoritative) | 0.55 |
| FE-007 | frontend | TelegramMiniAppBridge.tsx:113 | Effect `isLoggedIn`ga bog'liq → butun async body qayta ishga tushadi | 0.80 |

---

## ✅ Tasdiqlangan kuchli tomonlar (regress qilmang)

- **Auth yadrosi:** enumeration-safe login (DUMMY_HASH constant-time), `tokenVersion` gating,
  single-use hashed reset token (15-min TTL), step-up reauth, deactivated/deleted-account guard.
- **CSRF double-submit** to'g'ri; JWT secret prod'da fail-fast; CORS deny'da `callback(null,false)` (throw emas).
- **TMA HMAC validatsiya** mustahkam: timing-safe equality, length-check, 24h replay window.
- **`index.js` middleware tartibi namunaviy:** compression→CORS→OPTIONS→helmet→body(100kb)→
  mongo-sanitize→logger→apiLimiter→csrf→routes→404→errorHandler.
- **Cookie-only auth rule HONORED** — frontend hech qachon token'ni localStorage'ga saqlamaydi.
- **Data model** umuman sog'lom: sezgir field'lar `select:false`, `passwordHistory(5)`/`totpBackupCodes(10)` cap,
  password pre-save tokenVersion-guard, asosiy compound unique index'lar o'rnida, duplicate-index oldini olingan.
- **rateLimiter** granulyar + Redis-store bilan multi-instance'ga tayyor.

---

## 🎯 Tavsiya etilgan harakat tartibi (ROI bo'yicha)

1. **C-1** — To'lov webhook fail-closed + boot-time secret guard *(xavfsizlik, ~30 daqiqa)*.
2. **W-1** — `asyncHandler`'ni barcha controllerga universal qo'llash *(eng katta ROI: info-leak + 404 + DRY bir vaqtda)*.
3. **W-3 + W-4** — Timing-safe taqqoslash + promo `usedCount` atomic increment *(pul/biznes integrity)*.
4. **W-5 + W-6** — JSON-LD escape + CSP enforcing *(stored XSS)*.
5. **C-2 + W-13/W-14** — Digest batch + `.lean()` + index'lar + async fs *(performance, user o'sishi bilan kritiklashadi)*.
6. **W-8 + W-9 + W-10** — Embedded array cap + payment idempotency unique index + Mixed sanitatsiya.
7. **W-2, W-11, W-12, W-18** — `validateObjectId` parametrik, `utils/rank.js`, service layer, top-level require.

> To'liq mashina-o'qiydigan ro'yxat: `.audit/audit_report.json`. Har sub-agent xom natijasi: `.audit/findings/*.json`.

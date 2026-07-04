# CLAUDE.md

Repo summary for agents and contributors. Read this before any work.

## Model Selection (Prompt Murakkabligiga Qarab)

| Daraja | Model | Qachon ishlatish |
|--------|-------|-----------------|
| Tez/Oddiy | `claude-haiku-4-5` | Savolga javob, typo fix, kichik o'zgarish, tushuntirish |
| O'rta (default) | `claude-sonnet-4-6` | Feature qo'shish, bug fix, ko'p fayl tahrirlash |
| Murakkab | `claude-opus-4-7` | Arxitektura dizayn, katta refactor, security review, multi-agent task |

> Agent yoki `/model` bilan model almashtiring. Shubha bo'lsa — Sonnet 4.6 default.

## Stack

| Layer    | Tech                                              |
|----------|---------------------------------------------------|
| Backend  | Express 5, MongoDB/Mongoose, JWT (cookie-based), Swagger |
| Frontend | Next.js 14 (App Router), React 18, Redux Toolkit, Tailwind |
| Hosting  | Backend: Railway / Frontend: Vercel (`aidevix.uz`) |
| Video    | Bunny.net Stream (token-authenticated)            |
| Bot      | Telegram Bot API (long polling, no webhook)       |
| AI       | Groq API (llama-3.3-70b) — news generation, AI coach |
| Email    | **Resend** (HTTPS API, port 443) — DKIM+SPF on `aidevix.uz` (2026-05-15) |

## Architecture

```
backend/
├── index.js                          # Express app entry, all routes registered
├── controllers/                      # 28+ controllers
│   ├── authController.js             # register, login, daily-reward, forgot/reset, **telegramMiniAppAuth**
│   ├── courseController.js           # CRUD, categories, recommend (aiStack-based), rate
│   ├── videoController.js            # CRUD, Bunny.net, questions
│   ├── xpController.js               # XP, quiz submit, profile update (aiStack), leaderboard
│   ├── rankingController.js          # Top users (with aiStack), top courses, weekly
│   ├── challengeController.js        # Daily challenges CRUD + progress
│   ├── promptController.js           # Prompt Library CRUD, like, featured
│   ├── subscriptionController.js     # Telegram/Instagram verify, token linking
│   ├── paymentController.js          # Payme/Click payment processing
│   ├── enrollmentController.js       # Course enrollment + progress + continueLearning
│   ├── certificateController.js      # Certificate generate, verify, download
│   ├── projectController.js          # Practical projects per course
│   ├── playgroundController.js       # ← 2026-05-11 AI Code Playground review (Groq)
│   ├── adminController.js            # Admin stats, manage users/courses/payments
│   ├── followController.js           # User follow/unfollow
│   ├── userController.js             # public profile (certs/prompts/follow), homeStats
│   ├── wishlistController.js         # Course wishlist
│   ├── sectionController.js          # Course sections
│   └── uploadController.js           # File/avatar upload (Vercel Blob, 2026-07-04)
├── middleware/
│   ├── auth.js                       # JWT authenticate + requireAdmin
│   ├── subscriptionCheck.js          # Real-time Telegram+Instagram gate (403 if not subscribed)
│   ├── rateLimiter.js                # API + auth rate limiting
│   ├── errorMiddleware.js            # Global error handler
│   └── swaggerAuth.js                # Basic auth for Swagger UI
├── models/                           # 20+ Mongoose schemas
│   ├── User.js                       # aiStack[], socialSubscriptions, gamification, referral
│   ├── Prompt.js                     # Prompt Library
│   ├── Course.js / Video.js / Section.js / VideoLink.js
│   ├── DailyChallenge.js / UserChallengeProgress.js
│   ├── Quiz.js / QuizResult.js
│   ├── UserStats.js                  # XP, level, streak, badges, skills
│   ├── Enrollment.js / Certificate.js / Project.js
│   ├── Payment.js / Wishlist.js / Follow.js
│   ├── CourseRating.js / VideoQuestion.js
│   └── BotChannel.js / VerifyToken.js
├── routes/                           # 17 route files (1-to-1 with controllers)
│   └── promptRoutes.js               # /api/prompts
├── config/
│   ├── database.js                   # Mongoose connect
│   ├── swagger.js                    # Public Swagger spec
│   └── swaggerAdmin.js               # Admin Swagger spec
└── utils/
    ├── newsScheduler.js              # Kunlik AI news (10:00, 16:00, 20:00 Toshkent)
    ├── challengeScheduler.js         # Kunlik DailyChallenge + bot announce (00:00) — atomic upsert
    ├── digestScheduler.js            # ← 2026-05-11 Haftalik digest (Yakshanba 09:00)
    ├── telegramBot.js                # Bot + /postnews admin command
    ├── telegramWebAppAuth.js         # ← 2026-05-11 TMA initData HMAC validate
    ├── socialVerification.js         # Telegram getChatMember API
    ├── checkSubscriptions.js         # performSubscriptionCheck()
    ├── subscriptionCache.js          # Subscription result caching (MAX_ENTRIES=50000, LRU prune)
    ├── schedulerState.js             # Scheduler run state tracking
    ├── bunny.js                      # Bunny.net signed URL generator
    ├── jwt.js                        # Token sign/verify
    ├── emailService.js               # Resend HTTPS API (2026-05-15) — 11 ta premium brand template via renderLayout()
    ├── badgeService.js               # Auto badge award
    ├── authSecurity.js               # Auth security helpers
    ├── errorResponse.js              # Standardized error response helper
    └── logger.js                     # Structured HTTP request logger (sensitive param mask)

frontend/
├── src/api/
│   ├── axiosInstance.ts              # Axios + cookie auth (withCredentials: true)
│   ├── authApi.ts                    # register, login, logout, me, daily-reward, telegramMiniAppAuth
│   ├── courseApi.ts                  # getAllCourses, getCourse, top, rate, getForUser (aiStack tavsiya)
│   ├── videoApi.ts                   # getCourseVideos, getVideo, search, questions
│   ├── subscriptionApi.ts            # status, verifyTelegram, generateToken, checkToken
│   ├── rankingApi.ts                 # topCourses, topUsers, userPosition, weekly
│   ├── userApi.ts                    # getUserStats, submitQuiz, updateProfile, getContinueLearning
│   ├── promptApi.ts                  # getAll, getFeatured, getOne, create, like, delete
│   ├── playgroundApi.ts              # ← 2026-05-11 AI Code Playground review
│   ├── adminApi.ts                   # getDashboardStats, getUsers, getRecentPayments, CRUD
│   ├── forgotPasswordApi.ts
│   └── uploadApi.ts                  # uploadFile, uploadAvatar
├── src/store/slices/
│   ├── authSlice.ts / courseSlice.ts / videoSlice.ts
│   ├── subscriptionSlice.ts / rankingSlice.ts
│   └── userStatsSlice.ts
├── src/hooks/
│   ├── useAuth.ts / useCourses.ts / useVideos.ts
│   ├── useSubscription.ts / useRanking.ts / useUserStats.ts
├── src/config/
│   └── adminNav.tsx                  # ADMIN_NAV sections/items — sidebar config
├── src/components/
│   ├── auth/         LoginForm, RegisterForm, ProtectedRoute, AdminRoute
│   ├── common/
│   │   ├── AICoach.tsx               # Floating AI assistant (calls Next.js /api/coach)
│   │   ├── PwaInstallPrompt.tsx      # PWA install banner + SW update notification (2026-05-11)
│   │   ├── TelegramMiniAppBridge.tsx # ← 2026-05-11 TMA auto-login
│   │   └── DailyRewardModal, Badge, Button, Input, Loader, Modal, StarRating...
│   ├── courses/      CourseCard, CourseFilter, CourseGrid, CourseSkeleton, RecommendedCarousel
│   ├── home/         HomeClient, ContinueWatching, RecommendedForYou (2026-05-11)
│   ├── videos/       VideoCard, VideoLinkModal, VideoRating
│   ├── subscription/ SubscriptionGate, TelegramVerify, InstagramVerify
│   ├── leaderboard/  LeaderboardTable (AI Stack icons), LevelUpModal, UserXPCard
│   ├── layout/       Navbar (⚡ Prompts link), Footer, ScrollToTop, ClientLayoutWrapper
│   └── ranking/      CourseRankCard
├── src/app/                          # Next.js App Router
│   ├── page.tsx                      # Homepage (+ ContinueWatching + RecommendedForYou)
│   ├── courses/[id]/page.tsx         # Course detail
│   ├── videos/[id]/page.tsx          # Video player
│   ├── profile/page.tsx              # Profile + AI Stack tab (4th tab)
│   ├── prompts/page.tsx              # Prompt Library
│   ├── leaderboard/page.tsx          # XP leaderboard
│   ├── challenges/page.tsx           # Daily challenges
│   ├── playground/page.tsx           # ← 2026-05-11 AI Code Playground (Monaco)
│   ├── u/[username]/page.tsx         # Public profile (SSR + SEO metadata)
│   ├── offline/page.tsx              # PWA offline fallback
│   ├── referral/page.tsx             # Referral program
│   ├── pricing/page.tsx
│   ├── blog/page.tsx / about/page.tsx / careers/page.tsx / contact/page.tsx
│   ├── help/page.tsx / verify-code/page.tsx / level-up/page.tsx
│   └── admin/                        # Admin panel (AdminRoute protected)
│       ├── layout.tsx                # Sidebar nav (ADMIN_NAV), mobile drawer
│       ├── page.tsx                  # Dashboard: stats cards, top students, top courses
│       ├── courses/page.tsx          # Course CRUD list + create form
│       ├── courses/[id]/page.tsx     # Course detail editor (videos, sections)
│       ├── users/page.tsx            # User list: search, role toggle, block/unblock, delete
│       ├── payments/page.tsx         # Payment history (paginated)
│       ├── tools/page.tsx            # Admin: create daily challenge
│       └── settings/page.tsx         # Swagger links + Bunny.net info
└── src/utils/
    ├── constants.ts   # BACKEND_ORIGIN, API_BASE_URL, ROUTES, CATEGORIES, SOCIAL_LINKS
    ├── i18n.ts
    └── xpLevel.ts
```

## Admin Panel (`/admin`)

Faqat `role: 'admin'` foydalanuvchilar kiradi (`AdminRoute` component).

| Sahifa | URL | Funksiya |
|--------|-----|----------|
| Dashboard | `/admin` | Stats, top students, top courses |
| Kurslar | `/admin/courses` | List, create, delete |
| Kurs tahriri | `/admin/courses/[id]` | Full course editor: videos, sections |
| Foydalanuvchilar | `/admin/users` | Search, role toggle, block, delete |
| To'lovlar | `/admin/payments` | Payment history (paginated) |
| Vazifalar | `/admin/tools` | Kunlik challenge yaratish |
| Sozlamalar | `/admin/settings` | Swagger links, Bunny.net info |

## Subscription Flow (business-critical)

```
User opens course → subscriptionCheck middleware → checkTelegramSubscription()
                                                   ├── Public channel only (@aidevix)
                                                   ├── Uses Telegram Bot API getChatMember
                                                   ├── checked=true  → result is reliable
                                                   └── checked=false → network error, DB fallback

Frontend (TelegramVerify.tsx):
  Step 1: User subscribes to @aidevix channel
  Step 2: User clicks "BOT ORQALI BOG'LASH" → bot links Telegram ID
  Polling: checkVerifyToken every 3s until linked+subscribed
```

## Auth Flow — Email Verification Gate (2026-05-15 yangi)

Ro'yxatdan o'tish endi **email tasdiqlanmaguncha sessiya yaratmaydi**. Eski flow auto-login qilardi, hozir foydalanuvchi kodni kiritmaguncha cookie/token olmaydi.

```
1. RegisterForm submit → POST /api/auth/register
   ├── validator.isEmail() — format check
   ├── emailDomainHasMx() — DNS MX lookup (3s timeout, soft-fail on transient errors)
   │     ENOTFOUND / NXDOMAIN / ENODATA → 400 "Email manzili mavjud emas"
   ├── HIBP password breach check
   ├── existingUser check:
   │     ├── verified bo'lsa  → 400 "Email or username already exists"
   │     └── unverified bo'lsa → kod qayta yuboriladi + 200 requiresEmailVerification (UX fix)
   ├── User.create({ emailVerified: false, emailVerificationCode: hash(code), ... })
   ├── sendEmailVerificationCode() — fire-and-forget (Resend)
   └── 201 { requiresEmailVerification: true, email } — NO COOKIES, NO SESSION

2. Frontend → router.push('/auth/verify-email?email=...')

3. User kod kiritadi → POST /api/auth/verify-email-public { email, code }
   ├── safeEqual(hash(code), user.emailVerificationCode) + expiry + attempt cap (5)
   ├── emailVerified=true, kod tozalanadi
   ├── Referral bonus payout (deferred): +1000 XP referrer, +500 XP new user, referralRewarded=true
   ├── sendWelcomeEmail() + telegramBot.notifyNewRegistration() (faqat shu yerda)
   └── 200 "Email tasdiqlandi. Endi login qiling."

4. Frontend → router.push('/login')

5. Login (POST /api/auth/login) — emailVerified=true bo'lgani uchun normal cookie session
```

### Login gate (Email Verification)

Agar user emailini tasdiqlamasdan login urinsa (ya'ni eski unverified hisob):

```
POST /api/auth/login → bcrypt OK → user.emailVerified === false
  ├── Yangi kod generatsiya + DB ga saqlash
  ├── sendEmailVerificationCode() fire-and-forget
  └── 403 { requiresEmailVerification: true, email }
```

Frontend `LoginForm` / Redux `register` thunk `requiresEmailVerification` ni `pendingEmailVerification` state'iga yozadi va `/auth/verify-email`'ga redirect qiladi.

### Forgot Password Flow

```
1. POST /api/auth/forgot-password { identifier, method: 'email'|'telegram' }
   ├── Generic response always (no enumeration): "If account exists, reset code sent"
   ├── 6-digit code, hashed in DB, 10-min expire
   └── sendResetCodeEmail() yoki sendOtpTelegram()
2. POST /api/auth/verify-code { identifier, method, code }
   ├── Attempt cap 5 (exceeded → kod tozalanadi)
   └── resetToken JWT (15-min) + resetTokenHash DB'ga saqlanadi
3. POST /api/auth/reset-password { resetToken, newPassword }
   ├── deletedAt/isActive guard (2026-05-15)
   ├── HIBP + passwordHistory(5) reuse check
   ├── tokenVersion++ (pre-save hook), refreshToken=null
   └── Session.deleteMany({ userId }) — barcha sessiyalar bekor qilinadi
```

## News Scheduler (newsScheduler.js)

- **Vaqt:** 10:00, 16:00, 20:00 Toshkent
- **Fokus:** Claude, Codex, Cursor, Copilot, Windsurf — professional AI tools
- **RSS:** Anthropic, OpenAI, GitHub, HackerNews (AI filter), TechCrunch, Wired
- **AI Post:** Groq llama-3.3-70b → o'zbekcha tahlil + amaliy skill tip
- **Env:** `NEWS_ENABLED=true` yoki `SEND_NEWS=true`

## Challenge Scheduler (challengeScheduler.js)

- **Vaqt:** Har kuni 00:00 Toshkent
- **Challenge turlari:** watch_video, complete_quiz, streak, share_prompt
- **Pool:** Hafta kuni bo'yicha navbat bilan
- **Env:** `CHALLENGE_SCHEDULER_ENABLED=false` — o'chirish
- **Race-condition fix (2026-05-11):** `findOne → create` o'rniga atomic `create` + duplicate-key catch. `date` unique index multi-instance restart'da duplicate post oldini oladi.

## Email Infrastructure (Resend) — 2026-05-15 yangi

**Migration:** Gmail SMTP → **Resend HTTPS API**. Sabab — Railway konteynerlari outbound SMTP portlarini (25/465/587) bloklaydi. Hatto IPv4 force qilingach `ETIMEDOUT` qaytarardi. Resend port 443 (HTTPS) orqali ishlaydi → har doim ishlonadi.

### Sozlash

| Komponent | Qiymat |
|-----------|--------|
| Provider | [resend.com](https://resend.com) |
| Plan | Free (3,000 email/oy, 100/kun) |
| Region | `eu-west-1` (Ireland) |
| Domain | `aidevix.uz` — DKIM + SPF + MX `send` subdomain'da |
| DNS hosted at | **ahost.uz** (`rdns1/2/3.ahost.uz` nameservers) |

### DNS yozuvlari (ahost.uz panelida)

| Type | Name | Value | Priority |
|------|------|-------|----------|
| TXT | `resend._domainkey` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCi...` (DKIM public key) | — |
| MX | `send` | `feedback-smtp.eu-west-1.amazonses.com` | 10 |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` | — |

> ⚠️ DNS yozuvlarni o'chirmang. Mavjud `default._domainkey`, root `@` SPF/MX `aidevix.uz` ga, `_dmarc` — boshqa email tizimi uchun. Resend'niki **alohida `send` subdomain'da** turadi, konflikt yo'q.

### `emailService.js` arxitekturasi

```js
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

// Public API (har bir send funksiya shu signaturedan foydalanadi):
sendMail({ from, to, subject, html })  // returns { messageId, accepted, rejected, response }
```

**Premium brand layout** — barcha 11 ta email `renderLayout()` orqali tuziladi:
- AIDEVIX gradient wordmark pill
- 4px gradient accent strip (har email turi uchun alohida rang)
- Dark mode awareness (`@media (prefers-color-scheme: dark)`)
- Mobile breakpoint @600px
- Hidden preheader text (Gmail preview snippet'ni boshqaradi)
- Footer (tagline, Telegram/Instagram/site, copyright)

Helper primitives: `h1()`, `greeting()`, `lede()`, `button()`, `codeBox()`, `statCard()`, `divider()`, `securityNote()`, `escapeHtml()`.

### 11 ta transactional email

| Funksiya | Maqsad | Trigger |
|----------|--------|---------|
| `sendEmailVerificationCode` | 6-digit kod | Register + Login (unverified) |
| `sendResetCodeEmail` | 6-digit kod (orange accent) | Forgot password |
| `sendWelcomeEmail` | Tabrik | **Faqat verifikatsiyadan keyin** |
| `sendLevelUpEmail` | Daraja yutuq | Level up |
| `sendCertificateEmail` | Sertifikat | Kurs yakunlash |
| `sendEnrollmentEmail` | Yozildim | Kursga yozilish |
| `sendStreakReminderEmail` | Streak xavf | Cron — streak risk |
| `sendQuizResultEmail` | Kviz natijasi | Quiz submit |
| `sendNewDeviceLoginEmail` | Yangi qurilma | Login yangi device'dan |
| `sendAccountDeletedEmail` | GDPR o'chirish | DELETE /me |
| `sendWeeklyDigestEmail` | Haftalik xulosa | Cron — Yakshanba 09:00 |

### Verify Transport (boot probe)

`verifyTransport()` server start'ida `/domains` endpoint'iga uradi. Restricted API key (Sending Access only) 401 `restricted_api_key` qaytaradi — buni "OK, sending-only key" deb qabul qiladi (false-positive emas).

### Migration uchun olib tashlangan kod

- `nodemailer` dependency (uninstalled)
- IPv4-only DNS hacks (`dns.setDefaultResultOrder('ipv4first')`, `net.setDefaultAutoSelectFamily(false)`, `family:4`, custom `lookup`, `autoSelectFamily:false`, pre-resolve to IPv4) — Resend bilan kerak emas
- Connection timeouts (Resend SDK o'zi boshqaradi)
- `publicController.js` da nodemailer transport ham olib tashlandi (contact form `sendMail()`ga ko'chirildi)

## Weekly Digest Scheduler (digestScheduler.js) — 2026-05-11 yangi

- **Vaqt:** Har yakshanba 09:00 Toshkent (15min interval ichida tekshiriladi)
- **Maqsad:** Faol foydalanuvchilarga haftalik xulosa — email + Telegram bot orqali
- **Tarkib:** Bu hafta XP, streak, jami XP, ranking, yangi badgelar, davom ettirish CTA
- **Filter:** Faqat `UserStats.weeklyXp > 0 || xp > 0` bo'lganlar (faol user)
- **Batch:** 100tadan, throttle 50ms (Telegram rate limit himoyasi)
- **Idempotent:** `lastDigestDate` — bir kunda ikki marta jo'natilmaydi
- **Env:** `DIGEST_ENABLED=false` — o'chirish (default: true)

## Telegram Mini App (TMA) — 2026-05-11 yangi

```
POST /api/auth/telegram-init { initData }   # HMAC validate + auto login/register
```

- **HMAC validate:** `utils/telegramWebAppAuth.js` — Telegram WebApp.initData (24h replay window, timing-safe equality)
- **Auto-register:** TG user mavjud bo'lmasa username/photo/firstName Telegram'dan olinadi, `telegramUserId` ulanadi, placeholder email (`tg_<id>@tg.aidevix.local`)
- **Rate limit:** `telegramAuthLimiter` 30/15min per IP
- **CSRF exempt:** `/api/auth/telegram-init` (login analoglari kabi)
- **Frontend:** `TelegramMiniAppBridge.tsx` `ClientLayoutWrapper` ichida, Telegram WebApp SDK + initData → backend → cookie auth. Faqat Telegram useragent yoki `tgWebAppData` paramda yuklanadi.

## AI Code Playground (`/playground`) — 2026-05-11 yangi

```
POST /api/playground/review { code, language, prompt? }
```

- **Til:** 18 ta (JS/TS/Python/Go/Rust/Java/C++/SQL/HTML/CSS va h.k.)
- **AI:** Groq `llama-3.3-70b-versatile`, JSON response (score, summary, issues[], improvements[], rewrite)
- **Rate limit:** 15/15min per user
- **Timeout:** 25s (AbortSignal). Groq mavjud bo'lmasa → fallback heuristic javob
- **Frontend:** `/playground` sahifa — Monaco editor + real-time AI review panel (severity-coded issues, "Qo'llash" tugmasi rewrite uchun)

## Prompt Library

```
GET    /api/prompts             # List (filter: category, tool, sort, search)
GET    /api/prompts/featured    # Featured prompts
GET    /api/prompts/:id         # Single + views++
POST   /api/prompts             # Create (auth) — +30 XP
POST   /api/prompts/:id/like    # Toggle like (auth)
DELETE /api/prompts/:id         # Delete (owner or admin)
PATCH  /api/prompts/:id/feature # Feature/unfeature (admin)
```

Categories: `coding, debugging, vibe_coding, claude, cursor, copilot, architecture, refactoring, testing, documentation, other`
Tools: `Claude Code, Cursor, GitHub Copilot, ChatGPT, Gemini, Windsurf, Any`

## AI Tool Skills — Sozlash qo'llanmasi

Quyida Aidevix platformasida qo'llab-quvvatlanadigan har bir AI tool uchun skill (ko'nikma va konfiguratsiya) qanday o'rnatilishi keltirilgan.

---

### 🤖 Claude Code

**Skill fayllar:**
| Fayl | Maqsad |
|------|--------|
| `CLAUDE.md` | Loyiha konteksti — agent har doim o'qiydi |
| `.claude/settings.json` | Ruxsatlar, hooks, model tanlash |
| `.claude/commands/*.md` | Custom slash commands (`/review`, `/deploy` va h.k.) |

**Skill o'rnatish:**
```bash
# 1. CLAUDE.md — loyiha ildizida yoki har bir papkada
#    Agent bu faylni avtomatik o'qiydi

# 2. Custom slash command qo'shish
mkdir -p .claude/commands
cat > .claude/commands/review.md << 'EOF'
Ushbu PR ni security, performance va best practices nuqtai nazaridan tekshir.
EOF

# 3. MCP server ulash (qo'shimcha qobiliyat)
# settings.json → mcpServers bo'limiga qo'shing
```

**Asosiy slash commandlar:**
```
/review          — Kodni tekshirish
/security-review — Xavfsizlik auditi
/model           — Model almashtirish (Haiku / Sonnet / Opus)
/clear           — Kontekstni tozalash
/init            — CLAUDE.md yaratish
```

---

### ⚡ Cursor

**Skill fayllar:**
| Fayl | Maqsad |
|------|--------|
| `.cursorrules` | Global project qoidalari (barcha fayllar uchun) |
| `.cursor/rules/*.mdc` | Papka yoki fayl turiga qarab qoidalar |

**Skill o'rnatish:**
```bash
# 1. Global qoidalar — loyiha ildizida
cat > .cursorrules << 'EOF'
Siz Aidevix loyihasi uchun senior full-stack dasturchiysiz.
Stack: Next.js 14, Express 5, MongoDB, Tailwind.
- Auth uchun faqat secure cookie ishlatiladi
- localStorage ga token SAQLANMAYDI
- Har qanday DB so'rovidan keyin .exec().catch() bilan xatolik ushlang
EOF

# 2. Papkaga xos qoidalar
mkdir -p .cursor/rules
cat > .cursor/rules/frontend.mdc << 'EOF'
---
globs: ["frontend/**/*.tsx", "frontend/**/*.ts"]
---
Next.js 14 App Router ishlatiladi. Server Components default.
"use client" faqat zarur bo'lganda.
EOF
```

**Cursor Composer & Chat:**
```
@codebase    — Butun loyiha konteksti
@file        — Aniq fayl
@web         — Internetdan qidirish
@docs        — Dokumentatsiya
```

---

### 🐙 GitHub Copilot

**Skill fayllar:**
| Fayl | Maqsad |
|------|--------|
| `.github/copilot-instructions.md` | Repo darajasidagi custom instructions |
| `.copilotignore` | Copilot ko'rmaydigan fayllar |

**Skill o'rnatish:**
```bash
mkdir -p .github
cat > .github/copilot-instructions.md << 'EOF'
## Aidevix Loyihasi

Stack: Next.js 14 + Express 5 + MongoDB + Tailwind CSS

### Qoidalar
- Cookie-based JWT auth: localStorage FORBIDDEN
- Subscription gate bypass qilish TAQIQLANGAN
- GSAP animatsiyalar faqat desktop (reduceMotion tekshir)
- API error: errorResponse() util ishlatiladi
- Backend: `node --check` bilan sintaksis tekshir
- Frontend: `npx tsc --noEmit` bilan typecheck
EOF
```

---

### 💬 ChatGPT (Custom GPT / Projects)

**Skill o'rnatish:**
```
ChatGPT → Settings → Custom Instructions:

[What you'd like ChatGPT to know:]
Men Aidevix platformasi (aidevix.uz) ni ishlab chiqyapman.
Stack: Next.js 14, Express 5, MongoDB, Tailwind, JWT (cookie).
O'zbek tilidagi AI + dasturlash ta'lim platformasi.

[How you'd like ChatGPT to respond:]
- Kod misollari bilan javob ber
- Har doim security (XSS, injection) ni ko'zda tut
- Cookie-based auth — localStorage ISHLATMA
```

---

### 🌊 Windsurf (Codeium)

**Skill fayllar:**
| Fayl | Maqsad |
|------|--------|
| `.windsurfrules` | Global qoidalar |
| `.codeiumignore` | Ignore qilinadigan fayllar |

**Skill o'rnatish:**
```bash
cat > .windsurfrules << 'EOF'
# Aidevix Project Rules
- Framework: Next.js 14 App Router + Express 5
- Auth: JWT in httpOnly cookies (NEVER localStorage)
- DB: MongoDB/Mongoose — always handle .catch()
- Styles: Tailwind CSS utility classes only
- Mobile: check reduceMotion before GSAP animations
EOF
```

---

### 🔮 Gemini (Google AI Studio / Vertex AI)

**Skill o'rnatish — System Instruction:**
```
Siz Aidevix (aidevix.uz) loyihasi uchun AI yordamchisiz.
Stack: Next.js 14 (App Router), Express 5, MongoDB, JWT (httpOnly cookie),
Tailwind CSS, Bunny.net video, Telegram Bot API, Groq AI.

Muhim cheklovlar:
- localStorage'da token saqlash TAQIQLANGAN
- Subscription gate (Telegram @aidevix) hech qachon bypass qilinmaydi
- Backend o'zgarishlardan keyin: node --check index.js
- Frontend o'zgarishlardan keyin: npx tsc --noEmit
```

---

### Prompt Library kategoriyalari va skill tavsiyalari

| Kategoriya | Qaysi tool uchun | Skill maslahat |
|------------|-----------------|----------------|
| `claude` | Claude Code | CLAUDE.md + slash commands |
| `cursor` | Cursor | `.cursorrules` + `.cursor/rules/` |
| `copilot` | GitHub Copilot | `.github/copilot-instructions.md` |
| `vibe_coding` | Har qanday | Tezkor prototiplash uchun |
| `architecture` | Opus 4.7 | Murakkab dizayn — katta model ishlatiladi |
| `debugging` | Har qanday | Stack trace + kontekst bilan |
| `testing` | Har qanday | Test faylini ham birga bering |

## AI Stack (User Model)

`User.aiStack: ['Claude Code', 'Cursor', 'GitHub Copilot', ...]`

- Profile → "AI Stack" tab (4th tab)
- `PUT /api/xp/profile` body: `{ aiStack: string[] }`
- Leaderboard da AI tool ikonlari (🤖⚡🐙)
- Enum: `Claude Code, Cursor, GitHub Copilot, ChatGPT, Gemini, Windsurf, Devin, Replit AI, Codeium, Other`

## XP & Gamification

| Harakat | XP |
|---------|-----|
| Video ko'rish | +50 |
| Quiz to'g'ri javob | +10 (per question) |
| Quiz o'tish (bonus) | +100 |
| Daily challenge | +80–250 |
| Prompt yaratish | +30 |
| Project yakunlash | +200 |

Rank: `AMATEUR → CANDIDATE → JUNIOR → MIDDLE → SENIOR → MASTER → LEGEND`

## Important Rules

- Auth: **secure cookies only** — localStorage token storage FORBIDDEN
- Subscription gate: **business-critical** — never bypass or weaken
- `socialVerification.js` checks **only public channel** (@aidevix)
- Instagram: soft-check (always true if username provided)
- `backend/seeders/seedCourses.js`: destructive — requires `ALLOW_DESTRUCTIVE_SEED=true`

## Security Hardening (2026-05-11 audit)

Quyidagi xato/zaifliklar shu kuni tuzatildi — kelajakda regresslarga yo'l qo'ymaslik kerak:

- **`errorMiddleware.js`** — CastError `err.value` clientga qaytarilmaydi (ID enumeration himoyasi); stack trace **hech qachon** response'da emas, faqat logger'da; 500'lar prod'da generic message
- **`logger.js`** — HTTP request log'larda `?token=`, `?code=`, `?password=`, `?secret=`, `?access_token=`, `?refresh_token=`, `?authorization=`, `?api_key=` qiymatlari `***` bilan maskalanadi
- **`Session.refreshTokenHash`** — `select: false` (tasodifiy log/serializatsiyaga tushmaslik uchun). Refresh comparison: `.select('+refreshTokenHash')` zarur (`authController.refresh`)
- **`subscriptionCache.js`** — `MAX_ENTRIES=50000` LRU-style prune (unbounded DoS himoyasi)
- **`/2fa/disable` + `/2fa/backup-codes`** — `requireRecentReauth` middleware (account takeover himoyasi)
- **`courseRoutes`** — barcha `:id` parametrlarda `validateObjectId()` (yaroqsiz ID → 404, CastError → 500 emas)
- **`challengeScheduler` race fix** — atomic `create` + duplicate-key catch (multi-instance restart safety)
- **`courseController.getCourse`** — background `findByIdAndUpdate(...).exec().catch()` (unhandledRejection oldini olish)
- **`PromoCode.js`** — `code` field'da `unique:true` + `.index({code:1})` duplicate index olib tashlandi (Mongoose warning)

## Auth Audit (2026-05-15) — production `aidevix.uz` review

Methodology: code review + Playwright smoke test (login/register/forgot/verify/reset sahifalari) + 14 ta curl API edge case probe.

Topilgan va shu kuni tuzatilgan muammolar:

- **`index.js` CORS** — disallowed origin uchun `callback(new Error(...))` → HTTP 500 (Railway log'larda noise + scanner'ga 500 leak). Fix: `callback(null, false)` — `cors` lib ACAO header'ni qo'shmaydi, brauzer o'zi bloklaydi
- **`authController.register` referral abuse** — `referredBy` + `+1000 XP` referrer'ga **darhol** to'lanardi. Soxta signup'lar bilan XP farming mumkin edi. Fix: payout `verifyEmailPublic` ga ko'chirildi, `User.referralRewarded` boolean flag double-pay'dan saqlaydi
- **`authController.register` stuck signup** — mavjud lekin tasdiqlanmagan email bilan qayta register → "already exists" → user holatga tushib qoladi (login ham qila olmaydi, register ham). Fix: unverified+same-email case'da kod qayta yuboriladi va `requiresEmailVerification:true` qaytariladi
- **`authController.resetPassword` deactivated user** — `deletedAt`/`isActive` tekshirilmasdi. Eski reset link orqali GDPR-deleted accountni qayta tiklash mumkin edi. Fix: 403 guard qo'shildi
- **`authController.register` MX check** — `dns.resolveMx()` (3s timeout, soft-fail on SERVFAIL/timeout) — soxta domenli signuplarni DB write'gacha bloklaydi
- **`frontend/next.config.mjs`** — CSP Report-Only'da `upgrade-insecure-requests` direktivi — har sahifada console warning. Fix: olib tashlandi (no-op in report-only)
- **`LoginForm.tsx` + `forgot-password/page.tsx`** — email regex `[a-zA-Z]{2,4}` — modern TLD'lar (`.engineering`, `.museum`) rad etilardi. Fix: `{2,}` ga o'zgartirildi
- **`reset-password/page.tsx` ReferenceError** — useEffect deps array'da `email` (rename'dan keyin qolib ketgan, `identifier` bo'lishi kerak edi). Forgot password flow'ni butunlay buzgan edi. Fix: stale ref olib tashlandi

### Tasdiqlangan (yaxshi holatda, regress yo'l qo'ymang)

- Login enumeration safety: DUMMY_HASH constant-time bcrypt, generic 401 (state faqat parol to'g'ri bo'lgach reveal qilinadi)
- Forgot password: har doim generic "If account exists" javob
- verify-code / verify-email-public: generic "Invalid or expired code" javob
- Lockout, attempt cap (5), HIBP breach check, passwordHistory (5 oldingi parol)
- Reset token: hashed in DB (single-use), JWT integrity, 15-min TTL, `Session.deleteMany` + `tokenVersion++` on success
- Cookie-based JWT (no localStorage), CSRF whitelist correct
- Backend security headers (Helmet enforcing): HSTS preload, X-Frame-Options DENY, X-CTO nosniff, CSP enforcing
- Frontend Vercel headers: HSTS preload, X-Frame-Options DENY, X-CTO nosniff, Permissions-Policy
- Rate limits: alohida `loginLimiter`, `registerLimiter`, `otpLimiter`, `refreshLimiter`, `totpLimiter`, `verifyEmailLimiter`

## Key Env Vars (Railway — backend)

```
TELEGRAM_BOT_TOKEN                       # Bot + TMA HMAC validate (telegramWebAppAuth.js)
TELEGRAM_CHANNEL_USERNAME=aidevix        # Public channel (subscription gate)
TELEGRAM_ADMIN_CHAT_ID=697727022         # Admin Telegram ID
GROQ_API_KEY                             # Groq AI (news + coach + playground review)
RESEND_API_KEY                           # Email (2026-05-15) — re_xxx, "Sending Access" key
EMAIL_FROM=Aidevix <noreply@aidevix.uz>  # Resend sender — domain Resend'da verified (2026-05-15)
NEWS_ENABLED=true                        # AI news scheduler
CHALLENGE_SCHEDULER_ENABLED=true         # Daily challenge scheduler
DIGEST_ENABLED=true                      # Weekly digest scheduler (2026-05-11 yangi)
BUNNY_STREAM_API_KEY, BUNNY_LIBRARY_ID, BUNNY_TOKEN_KEY
FRONTEND_URL                             # CORS allowed origins (comma-separated)
BACKEND_URL                              # Self URL (Railway)
REDIS_URL                                # Multi-instance rate limit uchun (Upstash). Yo'q bo'lsa per-instance.
```

> ⚠️ `TELEGRAM_BOT_TOKEN`, `GROQ_API_KEY`, `RESEND_API_KEY` — **secret kalitlar**. Vercel (frontend)'ga HECH QACHON qo'ymang.

> ❌ **Eski Gmail SMTP env'lari (`EMAIL_HOST`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_PORT`) — endi ishlatilmaydi.** Resend migration'dan keyin (2026-05-15) `emailService.js` ularni o'qimaydi. Railway env'da qolib ketgan bo'lsa o'chirish mumkin.

## High-signal Files

**Backend:**
- `backend/index.js` — entry, routes, middleware order (CORS first! `callback(null, false)` on deny — never throw)
- `backend/controllers/authController.js` — register (MX check + no-auto-login), login, forgot/reset, verifyEmailPublic (referral payout + welcome + bot notify deferred here)
- `backend/controllers/adminController.js` — admin stats, users, payments
- `backend/controllers/xpController.js` — XP, quiz, profile (aiStack)
- `backend/controllers/promptController.js` — Prompt Library
- `backend/controllers/userController.js` — public profile (certs/prompts/follow counts)
- `backend/controllers/playgroundController.js` — AI Code Playground Groq integration
- `backend/middleware/subscriptionCheck.js` — subscription gate
- `backend/middleware/csrfProtection.js` — CSRF whitelist (include `/api/auth/telegram-init`)
- `backend/utils/emailService.js` — **Resend HTTPS API** + `renderLayout()` premium brand layout (2026-05-15)
- `backend/utils/newsScheduler.js` — AI news
- `backend/utils/challengeScheduler.js` — daily challenge + bot
- `backend/utils/digestScheduler.js` — weekly digest (Yakshanba 09:00)
- `backend/utils/telegramWebAppAuth.js` — TMA initData HMAC validate
- `backend/models/User.js` — aiStack, socialSubscriptions, gamification, `referralRewarded` flag (2026-05-15)
- `backend/models/Session.js` — `refreshTokenHash: select:false` (refresh logic'da `+refreshTokenHash` zarur)

**Frontend:**
- `frontend/src/store/slices/authSlice.ts` — register thunk handles `requiresEmailVerification`, login also (2026-05-15)
- `frontend/src/components/auth/RegisterForm.tsx` — on register fulfilled → if `requiresEmailVerification` → `/auth/verify-email`
- `frontend/src/components/auth/LoginForm.tsx` — handles `requires2FA` va `requiresEmailVerification` redirect
- `frontend/src/app/auth/verify-email/page.tsx` — public email verify (after register or login gate)
- `frontend/src/app/forgot-password/page.tsx` — forgot password (email/telegram method)
- `frontend/src/app/verify-code/page.tsx` — reset code verify (forgot password flow)
- `frontend/src/app/reset-password/page.tsx` — new password input (2026-05-14 fix: stale `email` ref olib tashlandi)
- `frontend/next.config.mjs` — CSP Report-Only (`upgrade-insecure-requests` olib tashlandi, 2026-05-15)
- `frontend/src/api/adminApi.ts` — admin API calls + `unwrapAdmin<T>` helper
- `frontend/src/api/playgroundApi.ts` — AI Code Playground API
- `frontend/src/config/adminNav.tsx` — ADMIN_NAV sidebar config
- `frontend/src/app/admin/layout.tsx` — AdminRoute wrapper, sidebar
- `frontend/src/app/u/[username]/PublicProfileClient.tsx` — public profile UI
- `frontend/src/app/playground/PlaygroundClient.tsx` — Monaco editor + AI review
- `frontend/src/api/axiosInstance.ts` — Axios + cookie auth
- `frontend/src/components/common/TelegramMiniAppBridge.tsx` — TMA auto-login
- `frontend/src/components/common/PwaInstallPrompt.tsx` — install banner + SW update prompt
- `frontend/src/components/home/ContinueWatching.tsx` — keyingi video widget
- `frontend/src/components/home/RecommendedForYou.tsx` — aiStack-based tavsiyalar
- `frontend/public/sw.js` — Service Worker v3 (network-first nav, SWR static)
- `frontend/public/manifest.json` — PWA manifest (4 shortcut)
- `frontend/src/utils/constants.ts` — ROUTES, BACKEND_ORIGIN, API_BASE_URL

## Verification Commands

```bash
node --check backend/index.js                              # Backend syntax check
cd frontend && npx tsc --noEmit                            # TypeScript check
cd frontend && npx eslint src --ext .ts,.tsx               # ESLint
```

## Deploy

```bash
git push origin main          # Backend auto-deploys on Railway
cd frontend && npx vercel --prod   # Frontend → aidevix.uz (Vercel)
```

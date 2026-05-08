# Aidevix — Professional AI & Dasturlash O'quv Platformasi

O'zbek tilidagi zamonaviy IT o'quv platformasi. Claude, Cursor, Codex va AI tools bo'yicha kurslar, kunlik challengelar, prompt kutubxonasi va community.

**Live:** [aidevix.uz](https://aidevix.uz) | **Bot:** [@aidevix_bot](https://t.me/aidevix_bot) | **Kanal:** [@aidevix](https://t.me/aidevix)

---

## Stack

| | Texnologiya | Hosting |
|--|--|--|
| **Backend** | Express 5, MongoDB, JWT, Swagger | Railway |
| **Frontend** | Next.js 14 (App Router), Redux Toolkit, Tailwind | Vercel |
| **Video** | Bunny.net Stream | CDN |
| **Bot** | Telegram Bot API (long polling) | Railway (bilan birga) |
| **AI** | Groq API (llama-3.3-70b) | — |

---

## Asosiy Feature'lar

### 🎓 Kurs Tizimi
- Video kurslar (Bunny.net CDN orqali)
- Seksiya va bo'limlar
- Quiz tizimi (XP bilan)
- Sertifikat generatsiya
- Praktik loyihalar

### ⚡ AI Tools & Vibe Coding
- **Prompt Kutubxonasi** (`/prompts`) — Claude, Cursor, Copilot va boshqa AI tools uchun professional promptlar. Community yaratadi, like bosadi, copy qiladi. Yaratganda +30 XP.
- **AI Stack** (Profil) — Foydalanuvchi qaysi AI toollardan foydalanishini belgilaydi (leaderboard da ko'rinadi)
- **Kunlik AI News** — Telegram kanalga avtomatik Claude/Codex/Cursor yangiliklari (10:00, 16:00, 20:00)

### 🏆 Gamification
- XP tizimi: video ko'rish (+50), quiz (+10/javob), challenge, prompt yaratish (+30)
- Rank: AMATEUR → CANDIDATE → JUNIOR → MIDDLE → SENIOR → MASTER → LEGEND
- Streak + Streak Freeze
- Badges (auto-award)
- Global va haftalik leaderboard

### 📅 Kunlik Challengelar
- Har kuni yarim tunda avtomatik challenge yaratiladi
- Telegram kanalga e'lon yuboriladi
- Turlar: video ko'rish, quiz, streak, prompt yozish
- Mukofot: 80–250 XP

### 🤖 Telegram Bot (@aidevix_bot)
- `/start` — platformaga kirish (Mini App)
- `/stats` — shaxsiy statistika
- `/referral` — taklifnoma havola
- `/login` — Magic login (parolsiz kirish)
- `/postnews` — admin: kanal uchun AI yangilik yuborish

### 💳 To'lov Tizimi
- Payme va Click integratsiya
- Kurs to'lovlari

### 🔐 Obuna Gate
- Telegram kanali (@aidevix) obunasi tekshiriladi (real-time getChatMember)
- Video ko'rishdan oldin har safar tekshiriladi

---

## Tezkor Ishga Tushirish

```bash
# Backend
cd backend && npm install && npm run dev   # localhost:5000

# Frontend
cd frontend && npm install && npm run dev  # localhost:3000
```

**Muhim env o'zgaruvchilar** (`backend/.env`):

```
MONGODB_URI=
JWT_SECRET=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHANNEL_USERNAME=aidevix
TELEGRAM_ADMIN_CHAT_ID=
GROQ_API_KEY=
NEWS_ENABLED=true
FRONTEND_URL=http://localhost:3000
```

---

## Loyiha Dokumentatsiyasi

| Hujjat | Mazmuni |
|--------|---------|
| [`docs/AUTOFIX.md`](docs/AUTOFIX.md) | AutoFix sistemasi — chokidar + Claude CLI orqali avtomatik bug fix |
| [`docs/PERFORMANCE.md`](docs/PERFORMANCE.md) | Lighthouse 40% → 75%+ optimizatsiyalari |
| [`CLAUDE.md`](CLAUDE.md) | Agent va contributor uchun arxitektura xulosasi |
| [`VIDEO_INTEGRATION.md`](VIDEO_INTEGRATION.md) | Bunny.net video integratsiyasi |
| [`mobile.md`](mobile.md) | Mobil yondashuv qaydlari |

---

## API Dokumentatsiya

- **Swagger UI:** `http://localhost:5000/api-docs` (login: Aidevix / sunnatbee)
- **Production:** `https://aidevix-backend-production.up.railway.app/api-docs`

### Asosiy Endpointlar

```
POST   /api/auth/register         # Ro'yxatdan o'tish
POST   /api/auth/login            # Kirish
GET    /api/courses               # Kurslar ro'yxati
GET    /api/prompts               # Prompt kutubxonasi
POST   /api/prompts               # Prompt yaratish (+30 XP, auth)
GET    /api/challenges/today      # Bugungi challenge
GET    /api/ranking/users         # Leaderboard (aiStack bilan)
GET    /api/xp/stats              # Foydalanuvchi statistikasi
PUT    /api/xp/profile            # Profil yangilash (bio, skills, aiStack)
```

---

## Deploy

```bash
git push origin main     # Backend → Railway avtomatik
npx vercel --prod        # Frontend → Vercel (aidevix.uz)
```

---

## Loyiha Tuzilmasi

```
AidevixBackend/
├── backend/
│   ├── controllers/   # 17 controller
│   ├── models/        # 19 Mongoose schema (User, Prompt, ...)
│   ├── routes/        # Express routers
│   ├── middleware/    # auth, subscriptionCheck, rateLimiter
│   └── utils/         # telegramBot, newsScheduler, challengeScheduler, bunny
└── frontend/
    ├── src/api/       # Axios API modules (promptApi ← yangi)
    ├── src/store/     # Redux slices
    ├── src/app/       # Next.js pages (prompts/ ← yangi)
    └── src/components/
```

---

## O'quvchilar uchun

- **Umumiy yo'riqnoma:** [frontend/docs/STUDENTS_GUIDE.md](./frontend/docs/STUDENTS_GUIDE.md)
- **Backend:** [backend/OQUVCHILAR_UCHUN.md](./backend/OQUVCHILAR_UCHUN.md)
- **Deploy:** [backend/DEPLOY.md](./backend/DEPLOY.md)

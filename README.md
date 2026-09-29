<div align="center">

<img src="https://aidevix.uz/Logo.jpg" alt="Aidevix" width="96" />

# Aidevix Platform

**AI-first programming education platform for Uzbek-speaking developers**

Courses, an AI coach, gamified progress, real-time code battles and a developer community — web app, REST/WebSocket API and admin console in one repository.

[![CI](https://github.com/SunnatbekYusupovTech/aidevixBackend/actions/workflows/ci.yml/badge.svg)](https://github.com/SunnatbekYusupovTech/aidevixBackend/actions/workflows/ci.yml)
[![E2E](https://github.com/SunnatbekYusupovTech/aidevixBackend/actions/workflows/playwright.yml/badge.svg)](https://github.com/SunnatbekYusupovTech/aidevixBackend/actions/workflows/playwright.yml)
![Next.js](https://img.shields.io/badge/Next.js-14-000000?logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose%208-47A248?logo=mongodb&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-ioredis-DC382D?logo=redis&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-4-010101?logo=socketdotio&logoColor=white)

**[aidevix.uz](https://aidevix.uz)**

</div>

---

## Overview

Aidevix teaches developers to build real products with modern tooling and AI assistants. The platform combines structured video courses with practice (quizzes, a browser playground with AI code review, 1v1 code battles), motivation (XP, streaks, badges, leaderboards, daily challenges) and community (forum, public profiles, projects, jobs, mentorship).

This repository contains the full web stack:

- **`backend/`** — Express 5 REST + Socket.io API on MongoDB and Redis
- **`frontend/`** — Next.js 14 App Router web application and admin console

The mobile client lives in a separate repository: [AidevixApp](https://github.com/SunnatbekYusupovTech/AidevixApp).

## Features

| Area | What's inside |
|---|---|
| **Learning** | Course catalog with categories, autocomplete and recommendations; sections and lessons; Bunny.net Stream video; enrollments, wishlist, ratings; certificates; per-video Q&A; quizzes |
| **AI** | AI coach chat (Anthropic / OpenAI / Groq via an optional AI gateway); AI code review in the Monaco-based playground; AI-generated project feedback |
| **Gamification** | XP and levels, weekly leaderboard, streaks with streak-freeze, daily check-in and daily challenges, badges, spaced repetition |
| **Code battles** | Real-time matchmaking queue and live code sync over Socket.io |
| **Community** | Forum (questions, answers, votes, accepted answers), follow system, public profiles at `/u/[username]`, projects, job board, mentorship bookings, team accounts, prompt library |
| **Payments** | Payme and Click integrations, Pro subscription, promo codes |
| **Accounts & security** | Email/password, Google and Telegram sign-in, email verification, 2FA (TOTP + backup codes), session management, CAPTCHA (Turnstile / hCaptcha), breached-password check (HIBP) |
| **Operations** | Admin console with real-time presence dashboard, web push (VAPID), Telegram bot, weekly digest, scheduled DB backups, Swagger docs behind basic auth |

## Tech stack

| Layer | Technologies |
|---|---|
| Frontend | Next.js 14 (App Router), React 18, TypeScript, Redux Toolkit, Tailwind CSS, daisyUI, Framer Motion, GSAP, Lenis, Recharts, Monaco Editor, socket.io-client |
| Backend | Node.js 20, Express 5, Mongoose 8, ioredis, Socket.io 4, Swagger (OpenAPI) |
| Security | JWT access/refresh tokens in httpOnly cookies, CSRF protection, Helmet, Redis-backed rate limiting, mongo-sanitize, TOTP 2FA |
| Integrations | Bunny.net Stream, Vercel Blob, Resend (email), Payme, Click, Groq, Anthropic, Google OAuth, Telegram, web-push |
| Observability | Sentry (backend + frontend), structured and security logging |
| Testing | Jest + Supertest (API), Playwright E2E on Chromium, Firefox and WebKit |
| Delivery | GitHub Actions, Railway (API, health-checked), Vercel (web, `fra1`), Docker |

## Architecture

```
aidevixBackend/
├── backend/
│   ├── config/          # database, JWT, Redis, Swagger
│   ├── controllers/     # request handlers per domain
│   ├── models/          # 36 Mongoose models
│   ├── routes/          # REST routes under /api
│   ├── middleware/      # auth, CSRF, CAPTCHA, rate limiting, validation
│   ├── sockets/         # code-battle and admin-presence events
│   ├── utils/           # schedulers, video, email, badges, logging
│   ├── seeders/         # course and prompt seed data
│   └── __tests__/       # unit + integration tests
├── frontend/
│   ├── src/app/         # App Router pages (courses, battle, playground, forum, admin, …)
│   ├── src/api/         # typed API clients (axios)
│   ├── src/store/       # Redux Toolkit slices
│   ├── src/components/  # UI components
│   └── e2e/             # Playwright specs
└── .github/workflows/   # CI + E2E pipelines
```

**Request flow:** the browser calls `/api/proxy/*` on the Next.js app, which rewrites to the Express API. Auth cookies therefore stay first-party, and the API URL never needs to be exposed to the client. Mobile clients authenticate with bearer tokens via the `X-Client-Type: mobile` header.

## Getting started

**Prerequisites:** Node.js 20 (`.nvmrc`), MongoDB, Redis (optional; enables distributed rate limiting).

```bash
git clone https://github.com/SunnatbekYusupovTech/aidevixBackend.git
cd aidevixBackend
npm run install:all

# API
cp backend/.env.example backend/.env
cd backend && npm run seed && npm run dev      # http://localhost:5000

# Web (new terminal)
cd frontend && npm run dev                     # http://localhost:3000
```

API documentation is available at `/api-docs` once the backend is running.

### Key environment variables

| Scope | Variables |
|---|---|
| Core | `MONGODB_URI`, `REDIS_URL`, `FRONTEND_URL`, `BACKEND_URL` |
| Auth | `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`, `CSRF_SECRET`, `TOTP_ENC_KEY`, `GOOGLE_CLIENT_ID`, `TELEGRAM_BOT_TOKEN` |
| Media & email | `BUNNY_STREAM_API_KEY`, `BUNNY_LIBRARY_ID`, `BLOB_READ_WRITE_TOKEN`, `RESEND_API_KEY` |
| Payments | `PAYME_MERCHANT_ID`, `PAYME_MERCHANT_KEY`, `CLICK_SERVICE_ID`, `CLICK_SECRET_KEY` |
| AI | `GROQ_API_KEY` (backend), `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` (frontend coach route) |
| Monitoring | `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` |

See `backend/.env.example` for the full list.

## Testing & quality

```bash
# backend
npm test                 # Jest unit + integration
npm run test:coverage

# frontend
npm run lint
npm run typecheck
npm run test:e2e         # Playwright (all browsers)
```

On every push and pull request, CI runs backend syntax checks and tests, then lints, type-checks and builds the frontend. A separate workflow runs the Playwright suite on three browser engines.

## Author

**Sunnatbek Yusupov**, Founder & CEO of Aidevix — [LinkedIn](https://www.linkedin.com/in/sunnatbee/) · [sunnatbekyusupov.uz](https://sunnatbekyusupov.uz)

© Aidevix. All rights reserved.

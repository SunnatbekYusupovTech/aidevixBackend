require('dotenv').config();
// Railway containers have no IPv6 outbound route. Two separate Node behaviors
// have to be disarmed:
//   1. dns.lookup ordering (Node 18+ defaults to "verbatim" → AAAA first)
//   2. net.connect happy-eyeballs (Node 20+ defaults autoSelectFamily=true,
//      which races A and AAAA in parallel and ignores setDefaultResultOrder)
// Without (2), every outbound socket attempts IPv6 first and dies ENETUNREACH.
try { require('dns').setDefaultResultOrder('ipv4first'); } catch (_) {}
try { require('net').setDefaultAutoSelectFamily(false); } catch (_) {}
// Sentry — loaded before express so the SDK can instrument http/express.
// No-op unless SENTRY_DSN is set (see instrument.js).
const Sentry = require('./instrument');
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const { sanitize: mongoSanitizeValue } = require('express-mongo-sanitize');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const swaggerAdminSpec = require('./config/swaggerAdmin');
const swaggerAuth = require('./middleware/swaggerAuth');
const connectDB = require('./config/database');
const { apiLimiter } = require('./middleware/rateLimiter');
const csrfProtection = require('./middleware/csrfProtection');

// Initialize Express app
const app = express();


// Trust proxy — Railway/Render uchun. Production'da aniq hop count, dev'da loopback.
// `true` ishlatish X-Forwarded-For spoofing'ga ochiq qoldiradi.
// FIX [LOW]: TRUST_PROXY env NaN bo'lsa fallback 1 ga qaytadi.
const _trustProxyRaw = process.env.TRUST_PROXY !== undefined ? Number(process.env.TRUST_PROXY) : 1;
const _trustProxyVal = Number.isFinite(_trustProxyRaw) ? _trustProxyRaw : 1;
if (process.env.TRUST_PROXY !== undefined && !Number.isFinite(_trustProxyRaw)) {
  console.warn('⚠️  TRUST_PROXY env var yaroqsiz qiymat — 1 ga qaytarildi:', process.env.TRUST_PROXY);
}
app.set('trust proxy', _trustProxyVal);

// Connect to database (async - won't block server start)
connectDB().then(async () => {
  console.log('📦 Starting background services...');
  
  // Telegram Bot initialization
  try {
    const { initTelegramBot } = require('./utils/telegramBot');
    initTelegramBot();
  } catch (botError) {
    console.error('⚠️ Telegram Bot initialization failed:', botError.message);
  }

  // Claude Tips Scheduler — kuniga 1 marta 13:00 da Claude haqida educational post
  // (Eski RSS-based News scheduler o'rniga — curated Claude topics: skills, MCP,
  // Obsidian, .md, plugins, hooks, slash commands va h.k.)
  try {
    const { startClaudeTipsScheduler } = require('./utils/claudeTipsScheduler');
    startClaudeTipsScheduler();
  } catch (tipsError) {
    console.error('⚠️ Claude Tips Scheduler initialization failed:', tipsError.message);
  }

  // Daily Challenge Scheduler
  try {
    const { startChallengeScheduler } = require('./utils/challengeScheduler');
    startChallengeScheduler();
  } catch (challengeError) {
    console.error('⚠️ Challenge Scheduler initialization failed:', challengeError.message);
  }

  // Weekly Digest Scheduler — yakshanba 09:00 Toshkent
  try {
    const { startDigestScheduler } = require('./utils/digestScheduler');
    startDigestScheduler();
  } catch (digestError) {
    console.error('⚠️ Digest Scheduler initialization failed:', digestError.message);
  }

  // SMTP credential + connectivity check (logs to Railway at boot)
  try {
    const { verifyTransport } = require('./utils/emailService');
    verifyTransport().catch((e) => console.error('[email] verifyTransport threw:', e.message));
  } catch (emailError) {
    console.error('⚠️ Email transport verify failed to start:', emailError.message);
  }
}).catch(err => {
  console.error('❌ CRITICAL: Failed to connect to database or initialize core services');
  console.error('   Reason:', err.message);
  process.exit(1);
});

// ═══════════════════════════════════════════════════════════════════
// CORS Configuration — BIRINCHI middleware bo'lishi SHART
// ═══════════════════════════════════════════════════════════════════
// FRONTEND_URL env'da takror origin bo'lsa ham (masalan www.aidevix.uz ikki
// marta) — Set bilan dedupe. Funksionalga ta'sir qilmaydi, log'ni tozalaydi.
const allowedOrigins = [
  ...new Set(
    (process.env.FRONTEND_URL || '')
      .split(',')
      .map(o => o.trim())
      .filter(Boolean)
  ),
];

const devOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

const isProd = process.env.NODE_ENV === 'production';

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman, direct navigation)
    if (!origin) return callback(null, true);
    // Allow opaque origins only in non-production (Telegram webview, file://, etc.)
    if (origin === 'null' && !isProd) return callback(null, true);
    // Explicit wildcard is only valid in non-production; never allow '*' with credentials in prod
    if (allowedOrigins.includes('*')) {
      if (!isProd) return callback(null, true);
      console.warn('⛔ CORS: wildcard * rejected in production (credentials incompatible)');
      // false → cors lib omits ACAO so the browser blocks. Throwing an Error
      // here would surface as a 500 in Railway logs and confuse monitoring.
      return callback(null, false);
    }
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (!isProd && devOrigins.includes(origin)) return callback(null, true);
    const backendUrl = process.env.BACKEND_URL || 'https://aidevix-backend-production.up.railway.app';
    if (origin === backendUrl) return callback(null, true);

    console.warn(`⛔ CORS BLOCKED: origin="${origin}" — allowedOrigins:`, allowedOrigins);
    // Same as above — don't throw; let the browser enforce by omission of ACAO.
    callback(null, false);
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-CSRF-Token',
    'X-Client-Type',
    'Accept',
    'Origin',
  ],
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
  ],
  maxAge: 86400, // Preflight cache 24 soat (brauzer qayta so'rov yubormaydi)
};

// ═══════════════════════════════════════════════════════════════════
// MIDDLEWARE TARTIBI MUHIM! CORS → Helmet → Body parsers
// ═══════════════════════════════════════════════════════════════════

// 0️⃣ Gzip compression — katta JSON javoblarni 3-5x kichraytiradi
app.use(compression({
  level: 6,           // Tezlik/siqish muvozanati (1=tez, 9=kichik)
  threshold: 1024,    // 1KB dan kichik javoblarni siqmaslik
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
}));

// 1️⃣ CORS — BIRINCHI bo'lishi kerak (preflight OPTIONS javob berish uchun)
app.use(cors(corsOptions));

// 2️⃣ Explicit preflight handler — barcha OPTIONS so'rovlarga 200 qaytarish
//    Express 5 da '*' wildcard ishlamaydi, shuning uchun custom middleware ishlatamiz
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// 3️⃣ Helmet — Security headers (CORS dan KEYIN)
// FIX [HIGH]: contentSecurityPolicy: false o'rniga explicit directives.
// Swagger UI uchun: unsafe-inline skript/stil, data: URI rasm — minimal ochiq.
// Frame/object embed'lar to'sib qo'yildi (XSS himoyasi).
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'", "'unsafe-inline'", "'unsafe-eval'"],  // Swagger UI talab qiladi
      styleSrc:   ["'self'", "'unsafe-inline'"],                   // Swagger UI inline-style
      imgSrc:     ["'self'", "data:", "https:"],                   // Swagger logo + favicon
      fontSrc:    ["'self'", "data:"],
      connectSrc: ["'self'"],
      frameSrc:   ["'none'"],   // Clickjacking himoyasi
      objectSrc:  ["'none'"],   // Plugin exploit himoyasi
      baseUri:    ["'self'"],
      formAction: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' }, // Google OAuth popup uchun
}));

// 4️⃣ Body parsers — strict limits (DoS via large body himoyasi)
// JSON API uchun 100KB yetarli. Upload routelar Multer'dan o'tadi, body parser'siz.
// `verify` callback — body parse bo'lmasdan oldin Content-Length tekshiriladi.
const STRICT_JSON_LIMIT = '100kb';   // standart JSON
const FORM_LIMIT        = '100kb';   // form-urlencoded

app.use(express.json({
  limit: STRICT_JSON_LIMIT,
  strict: true,                       // faqat object/array — JSON nuqtai nazaridan to'g'ri
}));
app.use(express.urlencoded({
  extended: true,
  limit: FORM_LIMIT,
  parameterLimit: 200,                // prototype pollution / param flood himoyasi
}));

// MongoDB injection sanitize — faqat body va params (Express 5 da req.query read-only getter)
app.use((req, res, next) => {
  if (req.body) mongoSanitizeValue(req.body);
  if (req.params) mongoSanitizeValue(req.params);
  next();
});

// HTTP request logger (production-ready structured logs)
const logger = require('./utils/logger');
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    if (req.path !== '/health') {
      logger.request(req, res.statusCode, Date.now() - start);
    }
  });
  next();
});

// Global API rate limiter
app.use('/api/', apiLimiter);

// ═══════════════════════════════════════════════════════════════════
// Swagger UI Documentation — ALOHIDA serve instansiyalar
// swagger-ui-express 5.x + Express 5 da bitta swaggerUi.serve ni
// ikki marta mount qilish conflict yaratadi. Har biriga alohida
// serve middleware kerak.
// ═══════════════════════════════════════════════════════════════════

// API Docs — Parol bilan himoyalangan
app.use('/api-docs', swaggerAuth, swaggerUi.serveFiles(swaggerSpec), swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Aidevix API Documentation',
  customfavIcon: '/favicon.ico',
}));

// Swagger JSON endpoint
app.get('/api-docs.json', swaggerAuth, (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Admin Panel Swagger UI — Alohida serve instance
app.use('/admin-docs', swaggerAuth, swaggerUi.serveFiles(swaggerAdminSpec), swaggerUi.setup(swaggerAdminSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Aidevix Admin Panel API',
  customfavIcon: '/favicon.ico',
}));

// Admin Panel Swagger JSON endpoint
app.get('/admin-docs.json', swaggerAuth, (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerAdminSpec);
});

// Security headers (qo'shimcha)
app.use((req, res, next) => {
  res.removeHeader('X-Powered-By');

  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  // X-XSS-Protection '0' — zamonaviy tavsiya (eski brauzerlar aggressive filter ishlatib XSS yaratardi)
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  next();
});

// CSRF protection — barcha mutating requestlar uchun (auth cookie mavjud bo'lsa)
app.use(csrfProtection);

// Routes — auth'da per-endpoint limitlar aniq belgilangan
app.use('/api/auth',         require('./routes/authRoutes'));
app.use('/api/sessions',     require('./routes/sessionRoutes'));
app.use('/api/subscriptions', require('./routes/subscriptionRoutes'));
app.use('/api/courses',      require('./routes/courseRoutes'));
app.use('/api/videos',       require('./routes/videoRoutes'));
app.use('/api/ranking',      require('./routes/rankingRoutes'));
app.use('/api/xp',           require('./routes/xpRoutes'));
app.use('/api/projects',     require('./routes/projectRoutes'));
app.use('/api/enrollments',  require('./routes/enrollmentRoutes'));
app.use('/api/wishlist',     require('./routes/wishlistRoutes'));
app.use('/api/certificates', require('./routes/certificateRoutes'));
app.use('/api/sections',     require('./routes/sectionRoutes'));
app.use('/api/follow',       require('./routes/followRoutes'));
app.use('/api/challenges',   require('./routes/challengeRoutes'));
app.use('/api/prompts',      require('./routes/promptRoutes'));
app.use('/api/bug-reports',  require('./routes/bugReportRoutes'));
app.use('/api/public',       require('./routes/publicRoutes'));
app.use('/api/payments',     require('./routes/paymentRoutes'));
app.use('/api/promos',       require('./routes/promoRoutes'));
app.use('/api/admin',        require('./routes/adminRoutes'));
app.use('/api/upload',       require('./routes/uploadRoutes'));
app.use('/api/users',        require('./routes/userRoutes'));
app.use('/api/jobs',         require('./routes/jobRoutes'));
app.use('/api/mentorship',   require('./routes/mentorshipRoutes'));
app.use('/api/teams',        require('./routes/teamRoutes'));
app.use('/api/spaced-repetition', require('./routes/spacedRepetitionRoutes'));
app.use('/api/playground',   require('./routes/playgroundRoutes'));

// Health check route
/**
 * @swagger
 * /health:
 *   get:
 *     summary: 💓 Server holati tekshiruvi (Ochiq — token shart emas)
 *     description: |
 *       ## 🇺🇿 O'ZBEKCHA
 *
 *       Server va database ishlayotganligini tekshiradi.
 *       Bu endpoint monitoring uchun ishlatiladi.
 *       Token kerak emas — hamma foydalana oladi.
 *
 *       ### 💻 Frontend da qanday ishlatish:
 *       ```javascript
 *       // Server ishlayaptimi tekshirish
 *       const checkServer = async () => {
 *         try {
 *           const res = await fetch('http://localhost:5000/health');
 *           const data = await res.json();
 *           console.log('Server holati:', data.success ? '✅ Ishlayapti' : '❌ Ishlamayapti');
 *         } catch (err) {
 *           console.log('❌ Server ulanmadi!');
 *         }
 *       };
 *       ```
 *
 *       ---
 *
 *       ## 🇷🇺 РУССКИЙ
 *
 *       Проверяет работоспособность сервера и базы данных.
 *       Эндпоинт используется для мониторинга. Токен не нужен.
 *
 *       ### 📊 Status kodlar / Коды статусов:
 *       | Kod | Ma'no (O'z) | Значение (Рус) |
 *       |-----|------------|----------------|
 *       | 200 | ✅ Server va database ishlayapti | ✅ Сервер и БД работают |
 *       | 500 | ❌ Server xatosi | ❌ Ошибка сервера |
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200:
 *         description: ✅ Server ishlayapti / ✅ Сервер работает
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Server is running"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2026-03-11T10:00:00.000Z"
 *             example:
 *               success: true
 *               message: "Server is running"
 *               timestamp: "2026-03-11T10:00:00.000Z"
 */
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// security.txt — vulnerability disclosure (RFC 9116)
const securityTxt = [
  'Contact: mailto:security@aidevix.uz',
  'Expires: 2027-01-01T00:00:00.000Z',
  'Preferred-Languages: uz, en, ru',
  `Canonical: ${process.env.BACKEND_URL || 'https://aidevix-backend-production.up.railway.app'}/.well-known/security.txt`,
  'Policy: https://aidevix.uz/security',
  '',
].join('\n');
app.get(['/.well-known/security.txt', '/security.txt'], (req, res) => {
  res.type('text/plain').send(securityTxt);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Sentry must capture errors before our handler turns them into a response.
// No-op unless SENTRY_DSN is set.
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

// Global error handler
const errorHandler = require('./middleware/errorMiddleware');
app.use(errorHandler);

// Global process handlers for stability (Senior approach)
process.on('unhandledRejection', (err) => {
  // Log qilamiz lekin darhol o'ldiirmaymiz — bitta xato butun serverni yoqmaslik
  // Production: Railway restart qiladi (health check fail bolsa)
  console.error('💥 Unhandled Rejection:', err?.message ?? err);
  if (process.env.NODE_ENV !== 'production') process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error(`💥 Uncaught Exception: ${err.message}`);
  // If this happens, the app state might be corrupted - usually best to restart nicely
  process.exit(1);
});

// Start server
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 Server is running on ${HOST}:${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 API Base URL: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  console.log(`🌍 CORS allowed origins: ${allowedOrigins.length > 0 ? allowedOrigins.join(', ') : '(all — no FRONTEND_URL set)'}`);
  if (process.env.NODE_ENV === 'production') {
    console.log(`✅ Production mode enabled`);
  }
});

// ═══════════════════════════════════════════════════════════════════
// Slowloris / Slow-POST DDoS himoyasi
// Hujumchi sekin asta byte yuborib socket'larni egallashga uringanida
// kerakli timeoutlar bilan ulanish uziladi.
// ═══════════════════════════════════════════════════════════════════
server.keepAliveTimeout = 65_000;        // 65s — Railway proxy idle limit dan kichik
server.headersTimeout   = 70_000;        // headers'ni shu vaqt ichida olib bo'lish kerak
server.requestTimeout   = 60_000;        // butun so'rov 60s ichida tugashi kerak
server.timeout          = 60_000;        // legacy socket timeout
server.maxConnections   = 10_000;        // bitta instansiyada max connection (DoS himoyasi)

// Graceful shutdown — Railway restart paytida ochiq so'rovlarni tugatish
const shutdown = (signal) => {
  console.log(`⏬ ${signal} received — closing server gracefully`);
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
  // 15s ichida tugamasa — force exit
  setTimeout(() => {
    console.error('⚠️ Forced shutdown after 15s');
    process.exit(1);
  }, 15_000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

module.exports = app;

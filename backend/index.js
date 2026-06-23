require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { sanitize: mongoSanitizeValue } = require('express-mongo-sanitize');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const swaggerAdminSpec = require('./config/swaggerAdmin');
const swaggerAuth = require('./middleware/swaggerAuth');
const connectDB = require('./config/database');
const { apiLimiter, authLimiter } = require('./middleware/rateLimiter');

// Initialize Express app
const app = express();


// Trust proxy — REQUIRED on Render/Railway (otherwise all IPs look the same → rate limit breaks)
app.set('trust proxy', 1);

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

  // News Scheduler initialization
  try {
    const { startNewsScheduler } = require('./utils/newsScheduler');
    startNewsScheduler();
  } catch (newsError) {
    console.error('⚠️ News Scheduler initialization failed:', newsError.message);
  }

  // Daily Challenge Scheduler
  try {
    const { startChallengeScheduler } = require('./utils/challengeScheduler');
    startChallengeScheduler();
  } catch (challengeError) {
    console.error('⚠️ Challenge Scheduler initialization failed:', challengeError.message);
  }
}).catch(err => {
  console.error('❌ CRITICAL: Failed to connect to database or initialize core services');
  console.error('   Reason:', err.message);
  process.exit(1);
});

// ═══════════════════════════════════════════════════════════════════
// CORS Configuration — BIRINCHI middleware bo'lishi SHART
// ═══════════════════════════════════════════════════════════════════
const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const devOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman, direct navigation)
    if (!origin) return callback(null, true);
    // Allow opaque origins (Telegram webview, file://, etc.)
    if (origin === 'null' && process.env.NODE_ENV !== 'production') return callback(null, true);
    // Allow if wildcard '*' configured
    if (allowedOrigins.includes('*')) return callback(null, true);
    // Allow if explicitly listed
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Allow local frontend during development only
    if (process.env.NODE_ENV !== 'production' && devOrigins.includes(origin)) return callback(null, true);
    // Allow Railway backend URL itself (Swagger UI "Try it out" feature)
    const backendUrl = process.env.BACKEND_URL || 'https://aidevix-backend-production.up.railway.app';
    if (origin === backendUrl) return callback(null, true);

    // CORS reject — logga yozish (debug uchun)
    console.warn(`⛔ CORS BLOCKED: origin="${origin}" — allowedOrigins:`, allowedOrigins);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
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
app.use(helmet({
  contentSecurityPolicy: false, // Swagger UI uchun o'chirilgan
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Cross-origin resurslarga ruxsat
}));

// 4️⃣ Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
  // Remove X-Powered-By header
  res.removeHeader('X-Powered-By');
  
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  next();
});

// Routes
app.use('/api/auth',         authLimiter, require('./routes/authRoutes'));
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
app.use('/api/payments',     require('./routes/paymentRoutes'));
app.use('/api/admin',        require('./routes/adminRoutes'));
app.use('/api/upload',       require('./routes/uploadRoutes'));
app.use('/api/users',        require('./routes/userRoutes'));
app.use('/api/ai',           require('./routes/aiRoutes'));

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

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Global error handler
const errorHandler = require('./middleware/errorMiddleware');
app.use(errorHandler);

// Global process handlers for stability (Senior approach)
process.on('unhandledRejection', (err, promise) => {
  console.error(`💥 Unhandled Rejection at: ${promise}\nReason: ${err.message}`);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error(`💥 Uncaught Exception: ${err.message}`);
  // If this happens, the app state might be corrupted - usually best to restart nicely
  process.exit(1);
});

// Start server
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`🚀 Server is running on ${HOST}:${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 API Base URL: http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  console.log(`🌍 CORS allowed origins: ${allowedOrigins.length > 0 ? allowedOrigins.join(', ') : '(all — no FRONTEND_URL set)'}`);
  if (process.env.NODE_ENV === 'production') {
    console.log(`✅ Production mode enabled`);
  }
});

module.exports = app;

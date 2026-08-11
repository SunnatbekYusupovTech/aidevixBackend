const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '📚 Aidevix Backend API',
      version: '2.0.0',
      description: `
## 🇺🇿 O'ZBEKCHA TUSHUNTIRISH

**Aidevix** — onlayn kurs platformasi uchun backend API.
Bu dokumentatsiya orqali siz barcha endpointlarni brauzerda sinab ko'rishingiz mumkin.

### ⚡ Qanday boshlash kerak?
1. **Register** yoki **Login** qiling → \`accessToken\` oling
2. Yuqoridagi **"Authorize"** tugmasini bosing → \`Bearer YOUR_TOKEN\` kiriting
3. Istalgan endpointni **"Try it out"** → **"Execute"** orqali sinab ko'ring

### 🔐 Token tizimi:
- **accessToken** — 15 daqiqa ishlaydi (har so'rovda yuboriladi)
- **refreshToken** — 7 kun ishlaydi (accessToken yangilash uchun)

### 👁 Obuna talabi:
Video ko'rish uchun **Telegram** kanaliga obuna bo'lish MAJBURIY.
Real-time tekshiruv: har safar video ko'rganda obuna holati tekshiriladi.

### 🎬 Video tizimi (mkhls):
Videolar **o'z serverimizdagi mkhls** orqali uzatiladi.
\`GET /api/videos/:id\` → **tokenli HLS master playlist URL** qaytaradi.
Frontend uni Vidstack + hls.js bilan o'ynatadi — iframe emas, Telegram link emas!

---

## 🇷🇺 ОПИСАНИЕ НА РУССКОМ

**Aidevix** — Backend API для платформы онлайн-курсов.
Через эту документацию вы можете протестировать все эндпоинты прямо в браузере.

### ⚡ Как начать?
1. **Register** или **Login** → получите \`accessToken\`
2. Нажмите **"Authorize"** вверху → введите \`Bearer YOUR_TOKEN\`
3. Любой эндпоинт → **"Try it out"** → **"Execute"**

### 🔐 Система токенов:
- **accessToken** — живёт 15 минут (отправляется в каждом запросе)
- **refreshToken** — живёт 7 дней (для обновления accessToken)

### 👁 Требование подписки:
Для просмотра видео подписка на **Telegram** ОБЯЗАТЕЛЬНА.
Проверка в реальном времени: при каждом просмотре статус подписки проверяется.

### 🎬 Видео система (mkhls):
Видео стримятся через **собственный сервер mkhls**.
\`GET /api/videos/:id\` → возвращает **подписанный URL HLS master playlist**.
Frontend воспроизводит его через Vidstack + hls.js — не iframe, не Telegram!

---

### 📚 Mavjud kurslar / Доступные курсы:
| Kategoriya | Kurs nomi | Narxi |
|-----------|-----------|-------|
| html | HTML Asoslari | 99,000 so'm |
| css | CSS Stillar va Dizayn | 129,000 so'm |
| javascript | JavaScript Dasturlash | 299,000 so'm |
| tailwind | Tailwind CSS Framework | 149,000 so'm |
| react | React.js Frontend | 349,000 so'm |
| redux | Redux Holat Boshqaruvi | 199,000 so'm |
      `,
      contact: {
        name: 'Aidevix Support',
        email: 'support@aidevix.com',
        url: 'https://aidevix.com',
      },
      license: {
        name: 'ISC',
        url: 'https://opensource.org/licenses/ISC',
      },
    },
    servers: [
      {
        url: 'https://aidevix-backend-production.up.railway.app',
        description: '🚀 Production Server — Railway (ishchi server)',
      },
      {
        url: 'http://localhost:5000',
        description: '🖥️ Local Development Server (mahalliy server)',
      },
    ],
    tags: [
      {
        name: 'Health',
        description: '💓 Server holati tekshiruvi / Проверка состояния сервера',
      },
      {
        name: 'Authentication',
        description: '🔐 Ro\'yxatdan o\'tish, kirish, token boshqaruvi / Регистрация, вход, управление токенами',
      },
      {
        name: 'Courses',
        description: '📚 Kurslarni ko\'rish (ochiq) / Просмотр курсов (открыто)',
      },
      {
        name: 'Videos',
        description: '🎥 Videolarni ko\'rish (obuna talab qilinadi) / Просмотр видео (требуется подписка)',
      },
      {
        name: 'Subscriptions',
        description: '📡 Instagram va Telegram obuna tekshiruvi / Проверка подписок Instagram и Telegram',
      },
      {
        name: 'Admin Panel - Courses',
        description: '👑 Admin: Kurs boshqaruvi / Управление курсами (только для администраторов)',
      },
      {
        name: 'Admin Panel - Videos',
        description: '👑 Admin: Video boshqaruvi / Управление видео (только для администраторов)',
      },
      {
        name: 'XP & Gamification',
        description: '🎮 XP tizimi, streak, badge, level / Система XP, серии, значки, уровни',
      },
      {
        name: 'Enrollment',
        description: '📚 Kursga yozilish va progress / Запись на курс и прогресс',
      },
      {
        name: 'Payments',
        description: '💳 To\'lov tizimi — Payme va Click / Система оплаты',
      },
      {
        name: 'Certificates',
        description: '🎓 Sertifikatlar — PDF yuklab olish va tekshirish / Сертификаты',
      },
      {
        name: 'Ranking',
        description: '🏆 Reyting — top kurslar, top foydalanuvchilar, haftalik / Рейтинги',
      },
      {
        name: 'Projects',
        description: '🏗️ Kurs loyihalari — amaliy mashqlar / Практические проекты курса',
      },
      {
        name: 'Sections',
        description: '📂 Kurs bo\'limlari — videolarni guruhlash / Секции курса',
      },
      {
        name: 'Follow',
        description: '👥 Foydalanuvchilar o\'rtasida obuna / Подписки между пользователями',
      },
      {
        name: 'Wishlist',
        description: '❤️ Saqlangan kurslar / Список желаний',
      },
      {
        name: 'Prompt Library',
        description: '⚡ AI Prompt kutubxonasi — yaratish, like, featured / Библиотека AI промптов',
      },
      {
        name: 'Challenges',
        description: '🎯 Kunlik vazifalar / Ежедневные задания',
      },
      {
        name: 'Upload',
        description: '📸 Fayl yuklash (Cloudinary) / Загрузка файлов',
      },
      {
        name: 'Telegram',
        description: '🤖 Telegram bot webhook / Вебхук Telegram бота',
      },
      {
        name: 'Admin Panel - Projects',
        description: '👑 Admin: Loyiha boshqaruvi / Управление проектами',
      },
      {
        name: 'Admin Panel - Sections',
        description: '👑 Admin: Bo\'lim boshqaruvi / Управление секциями',
      },
      {
        name: 'Admin Panel - Challenges',
        description: '👑 Admin: Kunlik vazifalar boshqaruvi / Управление заданиями',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: `
**🇺🇿 O'ZBEKCHA:**
JWT access token kiriting. Login yoki register qilib token oling.
Format: \`Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\`

**🇷🇺 РУССКИЙ:**
Введите JWT access token. Получите токен через login или register.
Формат: \`Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...\`
          `,
        },
      },
      schemas: {
        // ─── ERROR ───────────────────────────────────────────
        Error: {
          type: 'object',
          description: 'Xato javob / Ответ с ошибкой',
          properties: {
            success: {
              type: 'boolean',
              example: false,
              description: 'Har doim false (xato bo\'lsa) / Всегда false (при ошибке)',
            },
            message: {
              type: 'string',
              example: 'Xato xabari / Сообщение об ошибке',
              description: 'Xato tavsifi / Описание ошибки',
            },
          },
        },

        // ─── USER ─────────────────────────────────────────────
        User: {
          type: 'object',
          description: 'Foydalanuvchi modeli / Модель пользователя',
          properties: {
            _id: {
              type: 'string',
              example: '65f1a2b3c4d5e6f7a8b9c0d1',
              description: 'MongoDB unique ID',
            },
            username: {
              type: 'string',
              example: 'ahmadjondev',
              description: 'Foydalanuvchi nomi / Имя пользователя',
            },
            email: {
              type: 'string',
              example: 'ahmadjon@gmail.com',
              description: 'Email manzil / Email адрес',
            },
            role: {
              type: 'string',
              enum: ['user', 'admin'],
              example: 'user',
              description: 'user = oddiy foydalanuvchi, admin = administrator',
            },
            isActive: {
              type: 'boolean',
              example: true,
              description: 'Hisob faol yoki yo\'q / Активен ли аккаунт',
            },
            subscriptions: {
              $ref: '#/components/schemas/Subscriptions',
            },
            xp: {
              type: 'number',
              example: 4250,
              description: 'Jami XP / Всего XP',
            },
            streak: {
              type: 'number',
              example: 7,
              description: 'Ketma-ket faol kunlar / Дней подряд',
            },
            rankTitle: {
              type: 'string',
              enum: ['AMATEUR', 'CANDIDATE', 'JUNIOR', 'MIDDLE', 'SENIOR', 'MASTER', 'LEGEND'],
              example: 'MIDDLE',
              description: 'Rank darajasi / Ранг',
            },
            aiStack: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['Claude Code', 'Cursor', 'GitHub Copilot', 'ChatGPT', 'Gemini', 'Windsurf', 'Devin', 'Replit AI', 'Codeium', 'Other'],
              },
              example: ['Claude Code', 'Cursor', 'GitHub Copilot'],
              description: 'Foydalanuvchi ishlataydigan AI toollar / AI инструменты пользователя',
            },
            avatar: {
              type: 'string',
              example: 'https://res.cloudinary.com/aidevix/image/upload/v1/avatars/user.jpg',
              nullable: true,
            },
            referralCode: {
              type: 'string',
              example: 'A1B2C3',
              description: 'Unikal referral kodi / Уникальный реферальный код',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2026-01-15T08:30:00.000Z',
            },
          },
        },

        // ─── SUBSCRIPTIONS ────────────────────────────────────
        Subscriptions: {
          type: 'object',
          description: 'Foydalanuvchi obuna holati / Статус подписок пользователя',
          properties: {
            instagram: {
              type: 'object',
              properties: {
                subscribed: {
                  type: 'boolean',
                  example: true,
                  description: 'Instagram kanalga obuna bo\'lganmi / Подписан на Instagram',
                },
                username: {
                  type: 'string',
                  example: 'ahmadjon_dev',
                  description: 'Instagram username',
                },
                verifiedAt: {
                  type: 'string',
                  format: 'date-time',
                  example: '2026-01-15T10:00:00.000Z',
                  description: 'Qachon tekshirilgan / Когда проверено',
                },
              },
            },
            telegram: {
              type: 'object',
              properties: {
                subscribed: {
                  type: 'boolean',
                  example: true,
                  description: 'Telegram kanalga obuna bo\'lganmi / Подписан на Telegram',
                },
                username: {
                  type: 'string',
                  example: 'ahmadjon_dev',
                  description: 'Telegram username',
                },
                telegramUserId: {
                  type: 'string',
                  example: '987654321',
                  description: 'Telegram User ID (real-time tekshiruv uchun / для проверки в реальном времени)',
                },
                verifiedAt: {
                  type: 'string',
                  format: 'date-time',
                  example: '2026-01-15T10:05:00.000Z',
                },
              },
            },
          },
        },

        // ─── AUTH RESPONSE ────────────────────────────────────
        AuthResponse: {
          type: 'object',
          description: 'Login/Register javobi / Ответ на Login/Register',
          properties: {
            success: {
              type: 'boolean',
              example: true,
            },
            message: {
              type: 'string',
              example: 'Login successful.',
            },
            data: {
              type: 'object',
              properties: {
                user: {
                  $ref: '#/components/schemas/User',
                },
                accessToken: {
                  type: 'string',
                  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY1ZjFhMmIzYzRkNWU2ZjdhOGI5YzBkMSIsImlhdCI6MTcwNjAwMDAwMCwiZXhwIjoxNzA2MDAwOTAwfQ.SIGNATURE',
                  description: '⏰ 15 daqiqa amal qiladi / Действует 15 минут',
                },
                refreshToken: {
                  type: 'string',
                  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY1ZjFhMmIzYzRkNWU2ZjdhOGI5YzBkMSIsImlhdCI6MTcwNjAwMDAwMCwiZXhwIjoxNzA2NjA0ODAwfQ.SIGNATURE',
                  description: '⏰ 7 kun amal qiladi / Действует 7 дней',
                },
              },
            },
          },
        },

        // ─── COURSE ───────────────────────────────────────────
        Course: {
          type: 'object',
          description: 'Kurs modeli / Модель курса',
          properties: {
            _id: {
              type: 'string',
              example: '65f1a2b3c4d5e6f7a8b9c0d2',
              description: 'MongoDB unique ID',
            },
            title: {
              type: 'string',
              example: 'React.js Frontend Development',
              description: 'Kurs nomi / Название курса',
            },
            description: {
              type: 'string',
              example: 'React.js yordamida zamonaviy veb-ilovalar yaratishni o\'rganasiz. Hooks, Redux, Router va boshqa mavzular.',
              description: 'Kurs tavsifi / Описание курса',
            },
            thumbnail: {
              type: 'string',
              example: 'https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg',
              description: 'Kurs rasmi URL / URL изображения курса',
            },
            price: {
              type: 'number',
              example: 349000,
              description: 'Kurs narxi (so\'mda) / Стоимость курса (в сумах)',
            },
            category: {
              type: 'string',
              enum: ['html', 'css', 'javascript', 'react', 'typescript', 'nodejs', 'general', 'ai', 'telegram', 'security', 'career', 'nocode', 'web3'],
              example: 'react',
              description: 'Kurs kategoriyasi / Категория курса',
            },
            instructor: {
              type: 'object',
              properties: {
                _id:      { type: 'string', example: '65f1a2b3c4d5e6f7a8b9c0d0' },
                username: { type: 'string', example: 'aidevix_admin' },
                email:    { type: 'string', example: 'admin@aidevix.com' },
                jobTitle: { type: 'string', example: 'Senior Python Developer', description: 'Instruktor kasbi / Должность инструктора' },
                position: { type: 'string', example: 'Tech Lead @ Epam', description: 'Lavozim va ish joyi / Позиция и место работы' },
              },
              description: 'Kurs muallifi / Автор курса',
            },
            videos: {
              type: 'array',
              items: { $ref: '#/components/schemas/VideoShort' },
              description: 'Kurs videolari / Видео курса',
            },
            isActive: {
              type: 'boolean',
              example: true,
              description: 'true = faol, false = yashirin / true = активен, false = скрыт',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2026-01-01T00:00:00.000Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2026-03-01T12:00:00.000Z',
            },
          },
        },

        // ─── COURSE SHORT (list uchun) ─────────────────────────
        CourseShort: {
          type: 'object',
          description: 'Kurs qisqa ma\'lumoti (ro\'yxat uchun) / Краткая информация курса (для списка)',
          properties: {
            _id: { type: 'string', example: '65f1a2b3c4d5e6f7a8b9c0d2' },
            title: { type: 'string', example: 'HTML Asoslari' },
            description: { type: 'string', example: 'HTML teglar, atributlar, formalar va zamonaviy HTML5 elementlarini o\'rganasiz.' },
            thumbnail: { type: 'string', example: 'https://upload.wikimedia.org/wikipedia/commons/6/61/HTML5_logo_and_wordmark.svg' },
            price: { type: 'number', example: 99000 },
            category: { type: 'string', example: 'html' },
            instructor: {
              type: 'object',
              properties: {
                username: { type: 'string', example: 'aidevix_admin' },
                email: { type: 'string', example: 'admin@aidevix.com' },
              },
            },
            videos: {
              type: 'array',
              description: 'Kurs videolari soni / Количество видео',
            },
          },
        },

        // ─── VIDEO SHORT ──────────────────────────────────────
        VideoShort: {
          type: 'object',
          description: 'Video qisqa ma\'lumoti / Краткая информация видео',
          properties: {
            _id: { type: 'string', example: '65f1a2b3c4d5e6f7a8b9c0d3' },
            title: { type: 'string', example: '1-dars: HTML nima?' },
            description: { type: 'string', example: 'HTML haqida umumiy ma\'lumot va tarix.' },
            order: { type: 'number', example: 0, description: 'Video tartibi / Порядок видео (0 dan boshlanadi)' },
            duration: { type: 'number', example: 1200, description: 'Davomiylik soniyalarda / Длительность в секундах (1200 = 20 daqiqa)' },
            thumbnail: { type: 'string', example: 'https://example.com/thumb.jpg' },
          },
        },

        // ─── VIDEO FULL ───────────────────────────────────────
        Video: {
          type: 'object',
          description: 'Video to\'liq ma\'lumoti / Полная информация видео',
          properties: {
            _id: { type: 'string', example: '65f1a2b3c4d5e6f7a8b9c0d3' },
            title: { type: 'string', example: '1-dars: React nima?' },
            description: { type: 'string', example: 'React asoslari haqida kirish darsi.' },
            course: {
              type: 'object',
              description: 'Kurs ma\'lumotlari / Данные курса',
              properties: {
                _id: { type: 'string', example: '65f1a2b3c4d5e6f7a8b9c0d2' },
                title: { type: 'string', example: 'React.js kursi' },
              },
            },
            order: { type: 'number', example: 1, description: 'Video tartibi (1 dan boshlanadi) / Порядок видео' },
            duration: { type: 'number', example: 3137, description: 'Davomiylik soniyalarda / Длительность в секундах' },
            thumbnail: { type: 'string', example: 'https://vz-abc.b-cdn.net/guid/thumbnail.jpg', nullable: true },
            materials: {
              type: 'array',
              description: 'Qo\'shimcha materiallar (PDF, ZIP va h.k.) / Дополнительные материалы',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: '1-dars-materiallar.pdf' },
                  url: { type: 'string', example: 'https://res.cloudinary.com/aidevix/raw/upload/v1/docs/react1.pdf' },
                },
              },
            },
            viewCount: { type: 'number', example: 142, description: 'Ko\'rishlar soni / Количество просмотров' },
            isActive: { type: 'boolean', example: true, description: 'true=ko\'rinadi, false=yashirilgan / true=виден, false=скрыт' },
            createdAt: { type: 'string', format: 'date-time', example: '2026-01-05T08:00:00.000Z' },
          },
        },

        // ─── STREAM PLAYER (GET /videos/:id → player) ────────
        StreamPlayer: {
          type: 'object',
          description: `
**🇺🇿 mkhls video player ma'lumoti**

\`GET /api/videos/:id\` muvaffaqiyatli bo'lganda \`player\` ob'ekti qaytariladi.
Video hali tayyor bo'lmasa \`player\` — \`null\`.

\`hlsUrl\` — token bilan imzolangan HLS master playlist. Token muddati
\`MKHLS_STREAM_TOKEN_TTL\` bilan belgilanadi (standart 14400 soniya).
Master playlist ichidagi rung playlist'lari va segmentlar ham xuddi shu
tokenni tashiydi.

**Frontend ishlatish:** Vidstack + hls.js. \`<iframe>\` ISHLATILMAYDI —
brauzer playlist va segmentlarni \`fetch()\` bilan to'g'ridan-to'g'ri oladi,
shuning uchun mkhls tomonda CORS sozlanishi shart.

---

**🇷🇺 Данные видеоплеера mkhls**

Объект \`player\` возвращается при успешном \`GET /api/videos/:id\`,
или \`null\`, если видео ещё не готово. \`hlsUrl\` — подписанный HLS
master playlist.
          `,
          properties: {
            type: {
              type: 'string',
              enum: ['hls'],
              example: 'hls',
              description: 'Player turi / Тип плеера',
            },
            hlsUrl: {
              type: 'string',
              example: 'https://stream.aidevix.uz/vod/aidevix/65f1a2b3c4d5e6f7a8b9c0d3.mp4/master.m3u8?token=eyJhbGci',
              description: '🎬 Tokenli HLS master playlist URL / Подписанный URL HLS master playlist',
            },
            expiresAt: {
              type: 'string',
              format: 'date-time',
              example: '2026-03-23T00:00:00.000Z',
              description: 'Token muddati tugash vaqti — shundan keyin yangi so\'rov kerak / Время истечения токена',
            },
          },
        },

        // ─── VIDEO LINK (eskirgan — legacy) ──────────────────
        VideoLink: {
          type: 'object',
          description: '⚠️ ESKIRGAN (legacy) — Endi ishlatilmaydi. \`StreamPlayer\` dan foydalaning. / ⚠️ УСТАРЕЛО — Больше не используется. Используйте \`StreamPlayer\`.',
          properties: {
            _id: { type: 'string', example: '65f1a2b3c4d5e6f7a8b9c0d4' },
            isUsed: {
              type: 'boolean',
              example: false,
              description: 'Eski tizim uchun — hozir ishlatilmaydi / Для старой системы — сейчас не используется',
            },
            expiresAt: {
              type: 'string',
              format: 'date-time',
              example: '2026-03-12T10:00:00.000Z',
            },
          },
        },

        // ─── VIDEO RESPONSE (GET /videos/:id) ─────────────────
        VideoResponse: {
          type: 'object',
          description: `
**🇺🇿 \`GET /api/videos/:id\` javobi**

Muvaffaqiyatli bo'lganda \`video\` va \`player\` qaytariladi.
\`player.hlsUrl\` — mkhls uchun tokenli HLS master playlist URL.

**Frontend:**
\`\`\`jsx
const { video, player } = response.data.data
// video — sarlavha, tavsif, davomiylik, materiallar
// player.hlsUrl — Vidstack/hls.js uchun
\`\`\`

---

**🇷🇺 Ответ на \`GET /api/videos/:id\`**

При успехе возвращает \`video\` и \`player\`.
\`player.hlsUrl\` — подписанный URL HLS master playlist mkhls.
          `,
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                video: { $ref: '#/components/schemas/Video' },
                player: { $ref: '#/components/schemas/StreamPlayer' },
              },
            },
          },
        },

        // ─── PAYMENT ─────────────────────────────────────────────
        Payment: {
          type: 'object',
          description: 'To\'lov modeli / Модель оплаты',
          properties: {
            _id: { type: 'string', example: '65f1a2b3c4d5e6f7a8b9c0d5' },
            userId: { type: 'string', example: '65f1a2b3c4d5e6f7a8b9c0d1' },
            courseId: {
              type: 'object',
              properties: {
                _id: { type: 'string', example: '65f1a2b3c4d5e6f7a8b9c0d2' },
                title: { type: 'string', example: 'React.js Frontend Development' },
                thumbnail: { type: 'string', example: 'https://example.com/react.jpg' },
              },
            },
            amount: { type: 'number', example: 349000, description: 'Narxi so\'mda / Сумма в сумах' },
            currency: { type: 'string', example: 'UZS', default: 'UZS' },
            provider: { type: 'string', enum: ['payme', 'click', 'manual'], example: 'payme' },
            status: { type: 'string', enum: ['pending', 'completed', 'failed', 'refunded', 'cancelled', 'expired'], example: 'completed' },
            paidAt: { type: 'string', format: 'date-time', example: '2026-03-17T10:00:00.000Z' },
            createdAt: { type: 'string', format: 'date-time', example: '2026-03-17T09:55:00.000Z' },
          },
        },

        // ─── ENROLLMENT ──────────────────────────────────────────
        Enrollment: {
          type: 'object',
          description: 'Kursga yozilish / Запись на курс',
          properties: {
            _id: { type: 'string', example: '65f1a2b3c4d5e6f7a8b9c0d6' },
            userId: { type: 'string', example: '65f1a2b3c4d5e6f7a8b9c0d1' },
            courseId: {
              type: 'object',
              properties: {
                _id: { type: 'string', example: '65f1a2b3c4d5e6f7a8b9c0d2' },
                title: { type: 'string', example: 'HTML Asoslari' },
                thumbnail: { type: 'string', example: 'https://example.com/html.jpg' },
                category: { type: 'string', example: 'html' },
                level: { type: 'string', example: 'beginner' },
                rating: { type: 'number', example: 4.8 },
                price: { type: 'number', example: 99000 },
                instructor: {
                  type: 'object',
                  properties: {
                    username: { type: 'string', example: 'aidevix_admin' },
                    jobTitle: { type: 'string', example: 'Senior Developer' },
                  },
                },
              },
            },
            paymentStatus: { type: 'string', enum: ['free', 'pending', 'paid', 'refunded'], example: 'free' },
            progressPercent: { type: 'number', example: 65, description: '0-100 foiz / 0-100 процентов' },
            isCompleted: { type: 'boolean', example: false },
            watchedVideos: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  videoId: { type: 'string', example: '65f1a2b3c4d5e6f7a8b9c0d3' },
                  watchedAt: { type: 'string', format: 'date-time' },
                  watchedSeconds: { type: 'number', example: 720 },
                },
              },
            },
            completedAt: { type: 'string', format: 'date-time', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },

        // ─── CERTIFICATE ─────────────────────────────────────────
        Certificate: {
          type: 'object',
          description: 'Sertifikat / Сертификат',
          properties: {
            _id: { type: 'string', example: '65f1a2b3c4d5e6f7a8b9c0d7' },
            certificateCode: { type: 'string', example: 'A1B2C3D4E5F6G7H8', description: 'Unikal tekshiruv kodi / Уникальный код проверки' },
            recipientName: { type: 'string', example: 'Jamshid K.' },
            courseName: { type: 'string', example: 'React.js Frontend Development' },
            courseId: {
              type: 'object',
              properties: {
                _id: { type: 'string', example: '65f1a2b3c4d5e6f7a8b9c0d2' },
                title: { type: 'string', example: 'React.js Frontend Development' },
                thumbnail: { type: 'string', example: 'https://example.com/react.jpg' },
                category: { type: 'string', example: 'react' },
              },
            },
            issuedAt: { type: 'string', format: 'date-time', example: '2026-03-17T10:00:00.000Z' },
            pdfUrl: { type: 'string', example: 'https://res.cloudinary.com/aidevix/raw/upload/v1/certificates/A1B2C3D4.pdf', nullable: true },
            isVerified: { type: 'boolean', example: true },
          },
        },

        // ─── PROJECT ─────────────────────────────────────────────
        Project: {
          type: 'object',
          description: 'Amaliy loyiha / Практический проект',
          properties: {
            _id: { type: 'string', example: '65f1a2b3c4d5e6f7a8b9c0d8' },
            courseId: { type: 'string', example: '65f1a2b3c4d5e6f7a8b9c0d2' },
            title: { type: 'string', example: 'Portfolio Sahifasi' },
            description: { type: 'string', example: 'HTML va CSS bilan shaxsiy portfolio yarating' },
            level: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'], example: 'beginner' },
            order: { type: 'number', example: 0 },
            technologies: { type: 'array', items: { type: 'string' }, example: ['HTML5', 'CSS3', 'JavaScript'] },
            requirements: { type: 'array', items: { type: 'string' }, example: ['HTML asoslari darslarini ko\'ring'] },
            tasks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  order: { type: 'number', example: 0 },
                  title: { type: 'string', example: 'index.html yarating' },
                  description: { type: 'string', example: 'Asosiy HTML strukturasi' },
                  hint: { type: 'string', example: '<!DOCTYPE html> bilan boshlang' },
                  xpReward: { type: 'number', example: 60 },
                },
              },
            },
            estimatedTime: { type: 'number', example: 120, description: 'Daqiqalarda / В минутах' },
            xpReward: { type: 'number', example: 300 },
            isCompleted: { type: 'boolean', example: false, description: 'Faqat login bo\'lgan user uchun / Только для авторизованных' },
            isActive: { type: 'boolean', example: true },
          },
        },

        // ─── SECTION ─────────────────────────────────────────────
        Section: {
          type: 'object',
          description: 'Kurs bo\'limi / Секция курса',
          properties: {
            _id: { type: 'string', example: '65f1a2b3c4d5e6f7a8b9c0d9' },
            courseId: { type: 'string', example: '65f1a2b3c4d5e6f7a8b9c0d2' },
            title: { type: 'string', example: '1-Bo\'lim: Python asoslari' },
            description: { type: 'string', example: 'Asosiy tushunchalar' },
            order: { type: 'number', example: 0 },
            videos: {
              type: 'array',
              items: { $ref: '#/components/schemas/VideoShort' },
            },
            isActive: { type: 'boolean', example: true },
          },
        },

        // ─── PROMPT ──────────────────────────────────────────────
        Prompt: {
          type: 'object',
          description: 'AI Prompt modeli / Модель AI промпта',
          properties: {
            _id: { type: 'string', example: '65f1a2b3c4d5e6f7a8b9c0f0' },
            title: {
              type: 'string',
              example: 'React componentni lazy load qilish',
              description: 'Prompt sarlavhasi (max 150) / Заголовок (макс. 150)',
            },
            content: {
              type: 'string',
              example: 'Menga React componentni React.lazy va Suspense bilan lazy load qilib beruvchi kod yoz...',
              description: 'Prompt matni (max 5000) / Текст промпта (макс. 5000)',
            },
            description: {
              type: 'string',
              example: 'React.lazy va Suspense yordamida performance yaxshilash',
              description: 'Qisqa tavsif (max 300) / Краткое описание (макс. 300)',
            },
            category: {
              type: 'string',
              enum: ['coding', 'debugging', 'vibe_coding', 'claude', 'cursor', 'copilot', 'architecture', 'refactoring', 'testing', 'documentation', 'system', 'other'],
              example: 'coding',
            },
            tool: {
              type: 'string',
              enum: ['Claude Code', 'Cursor', 'GitHub Copilot', 'ChatGPT', 'Gemini', 'Windsurf', 'Any'],
              example: 'Claude Code',
            },
            tags: {
              type: 'array',
              maxItems: 5,
              items: { type: 'string' },
              example: ['react', 'lazy-load', 'performance'],
            },
            author: {
              type: 'object',
              description: 'Prompt muallifi / Автор промпта',
              properties: {
                _id: { type: 'string', example: '65f1a2b3c4d5e6f7a8b9c0d1' },
                username: { type: 'string', example: 'jasurbek_dev' },
                firstName: { type: 'string', example: 'Jasurbek' },
                avatar: { type: 'string', example: 'https://res.cloudinary.com/aidevix/image/upload/v1/avatars/user.jpg', nullable: true },
                rankTitle: { type: 'string', example: 'MIDDLE' },
                aiStack: {
                  type: 'array',
                  items: { type: 'string' },
                  example: ['Claude Code', 'Cursor'],
                },
              },
            },
            likes: {
              type: 'array',
              items: { type: 'string' },
              description: 'Like bosgan user ID lari / ID пользователей, поставивших лайк',
            },
            likesCount: { type: 'number', example: 15 },
            viewsCount: { type: 'number', example: 142 },
            isPublic: { type: 'boolean', example: true },
            isFeatured: { type: 'boolean', example: false },
            createdAt: { type: 'string', format: 'date-time', example: '2026-04-15T10:00:00.000Z' },
            updatedAt: { type: 'string', format: 'date-time', example: '2026-04-20T14:30:00.000Z' },
          },
        },

        // ─── DAILY CHALLENGE ─────────────────────────────────────
        DailyChallenge: {
          type: 'object',
          description: 'Kunlik vazifa / Ежедневное задание',
          properties: {
            _id: { type: 'string', example: '65f1a2b3c4d5e6f7a8b9c0e0' },
            title: { type: 'string', example: '3 ta video ko\'r' },
            description: { type: 'string', example: 'Bugun kamida 3 ta video ko\'ring' },
            type: { type: 'string', enum: ['watch_video', 'complete_quiz', 'streak', 'enroll_course', 'rate_course', 'use_ai_tool', 'share_prompt'], example: 'watch_video' },
            targetCount: { type: 'number', example: 3 },
            xpReward: { type: 'number', example: 100 },
            date: { type: 'string', example: '2026-03-26', description: 'YYYY-MM-DD formatda' },
            isActive: { type: 'boolean', example: true },
          },
        },

        // ─── CHALLENGE PROGRESS ──────────────────────────────────
        ChallengeProgress: {
          type: 'object',
          description: 'Foydalanuvchi vazifa progressi / Прогресс задания',
          properties: {
            currentCount: { type: 'number', example: 2 },
            isCompleted: { type: 'boolean', example: false },
            completedAt: { type: 'string', format: 'date-time', nullable: true },
            xpEarned: { type: 'number', example: 0 },
          },
        },

        // ─── USER STATS ─────────────────────────────────────────
        UserStats: {
          type: 'object',
          description: 'Foydalanuvchi statistikasi / Статистика пользователя',
          properties: {
            xp: { type: 'number', example: 4250 },
            level: { type: 'number', example: 12 },
            levelProgress: { type: 'number', example: 65, description: 'Keyingi levelgacha foiz / Процент до следующего уровня' },
            streak: { type: 'number', example: 7, description: 'Ketma-ket faol kunlar / Дней подряд' },
            weeklyXp: { type: 'number', example: 850 },
            videosWatched: { type: 'number', example: 45 },
            quizzesCompleted: { type: 'number', example: 12 },
            badges: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'Birinchi video' },
                  icon: { type: 'string', example: '🏆' },
                  earnedAt: { type: 'string', format: 'date-time' },
                },
              },
            },
            bio: { type: 'string', example: 'Frontend developer | Aidevix student', nullable: true },
            skills: { type: 'array', items: { type: 'string' }, example: ['javascript', 'react', 'css'] },
            avatar: { type: 'string', example: 'https://res.cloudinary.com/aidevix/image/upload/v1/avatars/user123.jpg', nullable: true },
            streakFreezes: { type: 'number', example: 3, description: 'Qolgan streak freeze soni (max 5)' },
          },
        },

        // ─── RANKED USER ─────────────────────────────────────────
        RankedUser: {
          type: 'object',
          description: 'Reyting foydalanuvchisi / Пользователь в рейтинге',
          properties: {
            rank: { type: 'number', example: 1 },
            rankTitle: { type: 'string', enum: ['GRANDMASTER', 'VICE-ADMIRAL', 'COMMANDER', 'CAPTAIN', 'LIEUTENANT', 'SERGEANT', 'CORPORAL', 'RECRUIT'], example: 'GRANDMASTER' },
            user: {
              type: 'object',
              properties: {
                _id: { type: 'string', example: '65f1a2b3c4d5e6f7a8b9c0d1' },
                username: { type: 'string', example: 'jamshid_k' },
                email: { type: 'string', example: 'jamshid@example.com' },
              },
            },
            xp: { type: 'number', example: 145200 },
            level: { type: 'number', example: 99 },
            streak: { type: 'number', example: 84 },
            badges: { type: 'array', items: { type: 'object' } },
            videosWatched: { type: 'number', example: 450 },
            quizzesCompleted: { type: 'number', example: 120 },
            skills: { type: 'array', items: { type: 'string' }, example: ['javascript', 'react'] },
            aiStack: {
              type: 'array',
              items: { type: 'string' },
              example: ['Claude Code', 'Cursor', 'GitHub Copilot'],
              description: 'AI toollar (leaderboard da icon sifatida ko\'rinadi) / AI инструменты (отображаются как иконки)',
            },
          },
        },

        // ─── PAGINATION ──────────────────────────────────────────
        Pagination: {
          type: 'object',
          description: 'Sahifalash ma\'lumotlari / Данные пагинации',
          properties: {
            total: { type: 'number', example: 150 },
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 20 },
            pages: { type: 'number', example: 8 },
          },
        },

        // ─── SUBSCRIPTION STATUS ──────────────────────────────
        SubscriptionStatus: {
          type: 'object',
          description: 'Obuna holati javobi / Ответ статуса подписки',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                subscriptions: { $ref: '#/components/schemas/Subscriptions' },
                hasAllSubscriptions: {
                  type: 'boolean',
                  example: true,
                  description: 'true = ikkala obuna ham bor, video ko\'rish mumkin / true = обе подписки есть, видео можно смотреть',
                },
              },
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: [
    path.join(__dirname, '../routes/*.js'),
    path.join(__dirname, '../docs/swagger/*.js'),
    path.join(__dirname, '../index.js')
  ],
};

const swaggerSpec = swaggerJsdoc(options);
module.exports = swaggerSpec;

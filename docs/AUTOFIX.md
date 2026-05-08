# AutoFix Sistemasi

Avtomatlashtirilgan kod xatolarini aniqlash va Claude Code CLI orqali fix qilish tizimi.

## Maqsad

Foydalanuvchi Cursor IDE'da kod yozadi va saqlaydi. Sistema:
1. Faylni avtomatik kuzatadi (chokidar)
2. Syntax va TypeScript xatolarini topadi
3. Topilgan xatolarni Claude Code CLI'ga uzatadi
4. Claude xatolarni o'zi tahlil qilib fix qiladi
5. Qayta tekshirib loop davom etadi (max 3 iteratsiya)

Foydalanuvchidan **hech qanday manual aralashuv** talab qilmaydi.

---

## Arxitektura

```
tools/autofix/
├── index.js       # Watcher entry — chokidar + debounce + lock
├── once.js        # Bir martalik run — orchestrator
├── detector.js    # Xato aniqlash (node --check + tsc --noEmit)
├── fixer.js       # Claude CLI invoker — smart prompt yaratish
├── git-safe.js    # Git stash/commit safety
├── notifier.js    # Telegram bot integration
├── state.js       # Budget tracking + concurrent lock + cache
├── logger.js      # Structured JSON logs + rangli console
├── config.js      # Config loader (deep merge)
└── report.js      # Kunlik statistika
```

### Runtime ma'lumotlari (`.autofix/`)

```
.autofix/
├── logs/YYYY-MM-DD.log   # JSON structured log per day
├── state.json            # Token sarfi, fix qilingan xatolar hash
└── lock                  # Concurrent runlardan himoya
```

`.autofix/` papka `.gitignore`'ga qo'shilgan.

---

## Buyruqlar

| Buyruq | Vazifa |
|--------|--------|
| `npm run autofix:watch` | Doimiy watcher — fayl saqlaganda auto fix |
| `npm run autofix` | Bir martalik to'liq tekshiruv |
| `npm run autofix:report` | Bugungi statistika |

### Watch rejimi

Cursor'da kod yozasiz, `Ctrl+S` saqlaysiz, sistema avtomatik:

```
[INFO]  Fayl o'zgardi (1 ta) — autofix ishga tushmoqda
[INFO]  → Backend syntax...
[INFO]  → Frontend TypeScript...
[WARN]  2 ta yangi xato topildi
[INFO]  Claude CLI chaqirilmoqda — 2 ta xato
... Claude fix qiladi ...
[OK]    Barcha xatolar fix qilindi (2 ta)
```

---

## Konfiguratsiya — `autofix.config.json`

```json
{
  "watch": {
    "paths": ["backend", "frontend/src"],
    "extensions": ["js", "ts", "tsx", "jsx"],
    "debounceMs": 1500
  },
  "checks": {
    "backendSyntax": true,
    "frontendTypecheck": true,
    "frontendLint": false
  },
  "fixer": {
    "model": "claude-sonnet-4-6",
    "maxIterations": 3,
    "timeoutMs": 180000
  },
  "git": {
    "autoStashBeforeFix": false,
    "autoCommitOnFix": false,
    "commitPrefix": "autofix:"
  },
  "notify": {
    "telegram": false,
    "onErrorOnly": true
  }
}
```

### Sozlamalar tushuntirishi

| Bo'lim | Maqsad |
|--------|--------|
| `watch.paths` | Kuzatiladigan papkalar |
| `watch.debounceMs` | Fayl o'zgarishidan keyin kutish vaqti (jamlash uchun) |
| `checks.*` | Qaysi tekshiruvlarni yoqish |
| `fixer.model` | Claude modeli (`sonnet-4-6` tavsiya, `haiku-4-5` arzon) |
| `fixer.maxIterations` | Bitta sikl ichida nechta marta urinish |
| `git.autoStashBeforeFix` | Fix oldidan auto stash (xavfsizlik) |
| `git.autoCommitOnFix` | Fix muvaffaqiyatli bo'lsa avtomatik commit |
| `notify.telegram` | Mavjud Telegram bot orqali xabar |

---

## Senior darajadagi xususiyatlar

### 1. Smart deduplication
Bir xil xato (hash bo'yicha) 2 marta fix qilinmaydi. Oxirgi 200 ta xato hashi cache'da saqlanadi (`state.json`).

### 2. Concurrent safety
`.autofix/lock` fayl orqali parallel runlar to'qnashmaydi. Lock 10 daqiqa ichida avtomatik bekor qilinadi (jarayon tushib qolsa).

### 3. Iterative fixing
Bir prompt'da hamma xatolar fix bo'lmasa — qolgan xatolar bilan qayta urinish. Max 3 iteratsiya.

### 4. Debounced watching
`debounceMs: 1500` + chokidar `awaitWriteFinish` — yarim saqlangan faylga reaktsiya yo'q.

### 5. Targeted detection
Watcher rejimida faqat o'zgargan faylni tekshiradi (tezroq). Manual `npm run autofix` rejimida butun proyekt.

### 6. Git safety
`autoStashBeforeFix: true` qilsangiz, fix oldidan ish-stash olinadi. Xato bo'lsa qaytarish oson.

### 7. Telegram notifications
`TELEGRAM_BOT_TOKEN` va `TELEGRAM_ADMIN_CHAT_ID` env'da bo'lsa, kritik xatolarda Telegram'ga xabar yuboriladi.

### 8. Structured JSON logs
Har kuni alohida fayl: `.autofix/logs/2026-04-30.log`. Har satr — JSON. Parse qilish va monitoring oson.

```json
{"ts":"2026-04-30T08:54:19.123Z","level":"info","message":"AutoFix sikli boshlandi","changedFiles":3}
{"ts":"2026-04-30T08:54:21.456Z","level":"success","message":"Barcha xatolar fix qilindi (2 ta)"}
```

### 9. Daily state rollover
Kun almashganda `state.json` qayta tiklanadi. Token va statistika kunlik.

### 10. Timeout protection
Claude CLI 3 daqiqa ichida javob bermasa avtomatik to'xtatiladi.

---

## Token tejash strategiyasi

| Vazifa | Tavsiya etilgan model | Sabab |
|--------|----------------------|-------|
| Syntax fix, kichik o'zgarish | `claude-haiku-4-5` | ~4x arzon |
| TypeScript murakkab xato | `claude-sonnet-4-6` | Default |
| Arxitektura xato (kam holat) | `claude-opus-4-7` | Faqat zarur bo'lsa |

`autofix.config.json` → `fixer.model` orqali almashtiriladi.

---

## Texnik talablar

- **Node.js** 18+ (ishlab chiqilgan: Node 24 LTS)
- **Claude Code CLI** o'rnatilgan: `claude --version`
- **chokidar** package (devDependency, root package.json)

---

## Cheklov va kelajak takomillashtirish

- ESLint check default `false` — yoqsangiz ko'p false-positive bo'lishi mumkin
- Frontend lint qo'shish — `checks.frontendLint: true`
- Custom check qo'shish — `detector.js`'ga yangi metod
- Telegram bot orqali manual trigger — `notifier.js`'ni kengaytirish

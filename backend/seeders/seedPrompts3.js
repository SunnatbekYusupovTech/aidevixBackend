/**
 * Aidevix — Prompt Library Seed v3
 * Har bir AI uchun: konfiguratsiya, MD fayllar, agentlar,
 * toollar, MCP, to'g'ri prompt yozish, modellarni to'g'ri ishlatish.
 *
 * node backend/seeders/seedPrompts3.js
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const connectDB = require('../config/database');
const Prompt = require('../models/Prompt');
const User = require('../models/User');

const PROMPTS = [

  // ════════════════════════════════════════════════
  // CLAUDE — Konfiguratsiya va Setup
  // ════════════════════════════════════════════════

  {
    title: 'Claude Code — To\'liq Settings.json Sozlash',
    description: 'Claude Code uchun professional settings.json konfiguratsiyasi',
    category: 'claude',
    tool: 'Claude Code',
    tags: ['settings', 'config', 'permissions', 'hooks'],
    isFeatured: true,
    content: `Claude Code settings.json — to'liq professional konfiguratsiya:

JOYLASHUV:
- Global: ~/.claude/settings.json
- Project: .claude/settings.json (loyiha uchun)

TO'LIQ KONFIGURATSIYA:
\`\`\`json
{
  "permissions": {
    "allow": [
      "Bash(npm run *)",
      "Bash(git add *)",
      "Bash(git commit *)",
      "Bash(git push origin main)",
      "Bash(node *)",
      "Bash(npx *)",
      "Read(**)",
      "Write(src/**)",
      "Edit(src/**)"
    ],
    "deny": [
      "Bash(rm -rf *)",
      "Bash(DROP TABLE *)",
      "Bash(sudo *)"
    ]
  },
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [{
          "type": "command",
          "command": "npx prettier --write $CLAUDE_TOOL_RESULT_FILE 2>/dev/null || true"
        }]
      }
    ],
    "Stop": [{
      "type": "command",
      "command": "echo 'Session tugadi. Git status:' && git status --short"
    }]
  },
  "env": {
    "NODE_ENV": "development",
    "FORCE_COLOR": "1"
  }
}
\`\`\`

PERMISSIONS SYNTAX:
- \`Bash(npm *)\` — npm bilan boshlanuvchi buyruqlar
- \`Read(**)\` — barcha fayllarni o'qish
- \`Write(src/**)\` — faqat src/ ichida yozish
- \`!Write(*.env)\` — .env fayllariga yozish taqiq

Menga loyiham uchun settings.json yoz:
Stack: [YOUR_STACK]
Ruxsat berilsin: [ALLOWED_COMMANDS]
Taqiqlansın: [DENIED_COMMANDS]`,
  },

  {
    title: 'Claude Code — MCP Pluginlar: Qaysi, Nima Uchun',
    description: 'Eng foydali MCP serverlar va ularning maqsadi',
    category: 'claude',
    tool: 'Claude Code',
    tags: ['mcp', 'plugins', 'tools', 'servers'],
    isFeatured: true,
    content: `MCP (Model Context Protocol) — Claude ga tashqi toollarni ulash tizimi.

QAYSI MCP SERVER NIMA UCHUN:

1. FILESYSTEM (@modelcontextprotocol/server-filesystem)
   Nima: Loyiha fayllarini to'liq o'qish/yozish
   Kerak: Katta codebase bilan ishlashda
   \`\`\`json
   "filesystem": {
     "command": "npx",
     "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/project"]
   }
   \`\`\`

2. GITHUB (@modelcontextprotocol/server-github)
   Nima: Issues, PRs, commits, repos bilan ishlash
   Kerak: GitHub workflow avtomatlashtirishda
   \`\`\`json
   "github": {
     "command": "npx",
     "args": ["-y", "@modelcontextprotocol/server-github"],
     "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_..." }
   }
   \`\`\`

3. POSTGRESQL (@modelcontextprotocol/server-postgres)
   Nima: DB query, schema explore, migration
   Kerak: Backend development va DB debugging
   \`\`\`json
   "postgres": {
     "command": "npx",
     "args": ["-y", "@modelcontextprotocol/server-postgres",
              "postgresql://user:pass@localhost/db"]
   }
   \`\`\`

4. BRAVE SEARCH (@modelcontextprotocol/server-brave-search)
   Nima: Real-time web search
   Kerak: Yangi docs, package versions tekshirishda
   \`\`\`json
   "brave-search": {
     "command": "npx",
     "args": ["-y", "@modelcontextprotocol/server-brave-search"],
     "env": { "BRAVE_API_KEY": "..." }
   }
   \`\`\`

5. MEMORY (@modelcontextprotocol/server-memory)
   Nima: Sessiyalar orasida ma'lumot saqlash
   Kerak: Uzoq muddatli loyiha konteksti uchun

6. PUPPETEER (@modelcontextprotocol/server-puppeteer)
   Nima: Browser automation, screenshot
   Kerak: UI test, web scraping

7. SLACK (@modelcontextprotocol/server-slack)
   Nima: Slack xabarlar, kanallar
   Kerak: Team notification automation

BARCHA MCP NI ULASH (~/.claude/settings.json):
\`\`\`json
{
  "mcpServers": {
    "filesystem": { ... },
    "github": { ... },
    "brave-search": { ... }
  }
}
\`\`\`

Menga [USE_CASE] uchun MCP konfiguratsiyani yoz.`,
  },

  {
    title: 'Claude Code — Built-in Tools: Qaysi Tool Nima Uchun',
    description: 'Claude Code toollarini to\'g\'ri tanlash va ishlatish',
    category: 'claude',
    tool: 'Claude Code',
    tags: ['tools', 'bash', 'read', 'write', 'grep', 'glob'],
    isFeatured: false,
    content: `Claude Code built-in toollar va qachon ishlatish:

READ — Fayl o'qish
  Ishlat: Mavjud kodni tushunish uchun
  Misol: "index.js ni o'qi va auth middleware qayerda ekanini ko'rsat"

WRITE — Yangi fayl yaratish
  Ishlat: Faqat yangi fayl yaratishda
  ESLATMA: Mavjud faylni Write bilan yozma (Edit ishlat)

EDIT — Fayl o'zgartirish
  Ishlat: Mavjud faylga o'zgartirish kiritishda
  AFZALLIGI: Faqat diff yuboriladi, to'liq fayl emas

BASH — Terminal buyruqlar
  Ishlat: npm install, git, test ishlatish
  EHTIYOT: Destructive buyruqlarga ruxsat berma

GLOB — Fayl qidirish (pattern bilan)
  Ishlat: "**/*.test.ts" kabi pattern topish
  Misol: "barcha controller fayllarini top"

GREP — Kontent qidirish
  Ishlat: Kodni ichidan ma'lumot qidirish
  Misol: "authMiddleware qaysi fayllarda import qilingan?"

TASK AGENT — Parallel ish
  Ishlat: Katta taskni bo'laklarga ajratishda
  Misol: "3 ta faylni parallel refactor qil"

TO'G'RI PROMPT YOZISH:

YOMON:
"Bu loyihani tuzat"

YAXSHI:
"src/controllers/authController.js ni o'qi,
login funksiyasidagi token expiry logikasini topib,
refresh token ni 7 kundan 30 kunga o'zgartir.
Faqat shu o'zgarishni qil."

QOIDALAR:
1. Aniq scope bering (qaysi fayl, qaysi funksiya)
2. Cheklov bering (faqat X ni o'zgartir)
3. Maqsad bering (nima uchun)
4. Kutilgan natija bering (qanday bo'lishi kerak)`,
  },

  {
    title: 'Claude Code — Agent Mode: Professional Ishlatish',
    description: 'Claude Code agentini maksimal samarali boshqarish',
    category: 'claude',
    tool: 'Claude Code',
    tags: ['agent', 'autonomous', 'workflow', 'best-practices'],
    isFeatured: true,
    content: `Claude Code Agent Mode — professional workflow:

AGENT NIMA:
Claude Code "auto" rejimda o'zi fayl o'qiydi, yozadi,
buyruqlar ishlatadi va taskni oxirigacha bajaradi.

QACHON AGENT ISHLATISH:
✅ Katta feature implement qilish (30+ daqiqa ish)
✅ Refactor (bir nechta fayl)
✅ Bug topib tuzatish
✅ Test yozish
✅ Dokumentatsiya yaratish

QACHON AGENT ISHLATMASLIK:
❌ Kichik o'zgarish (1-2 qator)
❌ Noaniq task ("kodni yaxshila")
❌ Tajribada noma'lum natija kutilsa

SAMARALI AGENT PROMPT TEMPLATE:
\`\`\`
TASK: [ANIQ VA TO'LIQ TAVSIF]

SCOPE:
- Fayllar: [QAYSI FAYLLAR]
- Tegma: [QAYSI FAYLLARNI O'ZGARTIRMA]

ACCEPTANCE CRITERIA:
- [ ] [BIRINCHI SHART]
- [ ] [IKKINCHI SHART]
- [ ] Testlar o'tsin
- [ ] TypeScript xatosi yo'q

MUHIM QOIDALAR:
- [LOYIHA SPETSIFIK QOIDA]
- Mavjud patternlarga mos yoz

NATIJA: [NIMA DELIVERABLE BO'LISHI KERAK]
\`\`\`

CHECKPOINT PATTERN:
Katta taskni qismlarga bo'l:
1. "Avval faqat tahlil qil, kod yozma"
2. "Endi faqat backend qismini yoz"
3. "Frontend qismiga o't"
4. "Test yoz"

WORKTREE (izolyatsiya):
\`\`\`bash
# Yangi branch da agent ishlaydi
claude --worktree feature/new-feature "implement [TASK]"
\`\`\``,
  },

  {
    title: 'Claude API — Modellarni To\'g\'ri Tanlash va Ishlatish',
    description: 'Claude modellar oilasi: qaysi model nima uchun optimal',
    category: 'claude',
    tool: 'Claude Code',
    tags: ['api', 'models', 'claude-opus', 'claude-sonnet', 'claude-haiku'],
    isFeatured: true,
    content: `Claude modellar oilasi — qaysi model nima uchun:

MODELLAR TAQQOSLASH:
| Model | Tezlik | Narx | Kuch | Ishlatish |
|-------|--------|------|------|-----------|
| claude-opus-4-6 | Sekin | $$$ | ⭐⭐⭐⭐⭐ | Murakkab reasoning |
| claude-sonnet-4-6 | O'rtacha | $$ | ⭐⭐⭐⭐ | Kunlik dev tasks |
| claude-haiku-4-5 | Tez | $ | ⭐⭐⭐ | Simple tasks, production |

QAYSI MODEL NIMA UCHUN:

OPUS — Kerak bo'lganda:
- Arxitektura qarorlari
- Murakkab algoritmlar
- Security audit
- Complex debugging

SONNET (DEFAULT) — Ko'p hollarda:
- Feature development
- Code review
- Refactoring
- Documentation

HAIKU — Production API uchun:
- Simple classification
- Short completions
- High-throughput tasks
- Cost optimization kerak bo'lganda

API ISHLATISH (optimal):
\`\`\`javascript
const Anthropic = require('@anthropic-ai/sdk')
const client = new Anthropic()

// Streaming (UX uchun yaxshi)
const stream = await client.messages.stream({
  model: 'claude-sonnet-4-6',
  max_tokens: 4096,
  system: 'Sen [ROLE] siz. [QOIDALAR]',
  messages: [{ role: 'user', content: prompt }]
})

for await (const chunk of stream) {
  if (chunk.type === 'content_block_delta') {
    process.stdout.write(chunk.delta.text)
  }
}
\`\`\`

SYSTEM PROMPT YOZISH:
\`\`\`
Sen [ROLE] siz.
Foydalanuvchi: [USER_DESCRIPTION]
Qoidalar:
1. [QOIDA_1]
2. [QOIDA_2]
Format: [JAVOB_FORMATI]
Til: O'zbek
\`\`\`

TEMPERATURE:
- 0.0 — Deterministic (code, analysis)
- 0.3 — Balanced (documentation)
- 0.7 — Creative (brainstorming)
- 1.0 — Very creative (storytelling)`,
  },

  {
    title: 'Claude — Prompt Engineering: Professional Yozish',
    description: 'Claude dan maksimal sifatli javob olish texnikalari',
    category: 'claude',
    tool: 'Claude Code',
    tags: ['prompt-engineering', 'techniques', 'best-practices', 'tips'],
    isFeatured: true,
    content: `Claude bilan professional prompt yozish texnikalari:

1. CHAIN OF THOUGHT (CoT):
\`\`\`
[MURAKKAB SAVOL]

Qadamlar bilan fikrla:
1. Avval muammoni tushun
2. Yechim variantlarini ko'rib chiq
3. Eng yaxshisini tanla
4. Implement qil
\`\`\`

2. FEW-SHOT EXAMPLES:
\`\`\`
Quyidagi formatda yoz:

MISOL KIRISH: [example_input]
MISOL CHIQISH: [example_output]

HAQIQIY KIRISH: [your_input]
\`\`\`

3. ROLE ASSIGNMENT:
\`\`\`
Sen 10 yillik tajribali [ROLE] (masalan: Node.js arxitektori) siz.
[Keyin o'z savolingni ber]
\`\`\`

4. CONSTRAINED OUTPUT:
\`\`\`
Faqat quyidagilarni ber:
- [FIELD_1]: ...
- [FIELD_2]: ...
Boshqa izoh yozma.
\`\`\`

5. ITERATION PATTERN:
\`\`\`
1-qadam: "Bu haqida fikrla (kod yozma)"
2-qadam: "Yaxshi. [CORRECTION]. Endi kod yoz."
3-qadam: "[REVIEW]. Faqat X ni o'zgartir."
\`\`\`

6. XML TAGS (Claude uchun eng samarali):
\`\`\`xml
<task>
  [NIMA QILISH KERAK]
</task>

<context>
  [LOYIHA HAQIDA]
</context>

<constraints>
  - [CHEKLOV_1]
  - [CHEKLOV_2]
</constraints>

<format>
  [JAVOB FORMATI]
</format>
\`\`\`

XATOLAR:
❌ "Kodni yaxshila" — juda noaniq
❌ "Hamma narsani qil" — scope yo'q
❌ "Tez yoz" — sifat pasayadi
✅ Aniq scope + maqsad + cheklov + format`,
  },

  // ════════════════════════════════════════════════
  // CURSOR — Professional Konfiguratsiya
  // ════════════════════════════════════════════════

  {
    title: 'Cursor — To\'liq Sozlash: Settings, Models, Keybindings',
    description: 'Cursor IDE ni professional darajada konfiguratsiya qilish',
    category: 'cursor',
    tool: 'Cursor',
    tags: ['settings', 'models', 'config', 'keybindings'],
    isFeatured: true,
    content: `Cursor IDE professional konfiguratsiyasi:

1. MODEL TANLASH (qaysi task uchun):

COMPOSER (katta task):
- claude-sonnet-4-6 — murakkab feature
- gpt-4o — alternativa, tez
- o3-mini — reasoning kerak bo'lganda

CHAT (tushuntirish, debug):
- claude-haiku — tez javob
- gpt-4o-mini — cost-effective

INLINE (Ctrl+K):
- cursor-small — eng tez, autocomplete
- gpt-4o-mini — murakkab inline

2. CURSOR SETTINGS (Preferences):
\`\`\`json
{
  "cursor.general.enableShadowWorkspace": true,
  "cursor.composer.shouldAutoScrollToBottom": true,
  "cursor.chat.smoothStreaming": true,
  "editor.inlineSuggest.enabled": true,
  "editor.acceptSuggestionOnCommitCharacter": false,
  "editor.suggestSelection": "first"
}
\`\`\`

3. KEYBINDINGS (eng foydalilar):
- Ctrl+K — Inline edit
- Ctrl+L — Chat ochish
- Ctrl+I — Composer
- Ctrl+Shift+L — Faylni chatga qo'shish
- Tab — Suggest qabul qilish
- Escape — Suggest rad etish

4. CONTEXT QO'SHISH (@):
- @file — aniq fayl
- @folder — papka
- @codebase — butun loyiha
- @web — internet qidirish
- @docs — dokumentatsiya
- @git — git history

5. CURSOR RULES JOYLASHUVI:
- Global: Settings > Rules for AI
- Project: .cursorrules fayl (root da)
- Notepad: Ctrl+Shift+P > "Open Notepad"

OPTIMAL WORKFLOW:
1. .cursorrules yoz (bir marta)
2. Katta task → Composer + @Codebase
3. Kichik fix → Inline (Ctrl+K)
4. Tushuntirish → Chat + @file`,
  },

  {
    title: 'Cursor — .cursorrules Mega Template (Next.js + Express)',
    description: 'Production-ready .cursorrules fayl — barcha qoidalar',
    category: 'cursor',
    tool: 'Cursor',
    tags: ['cursorrules', 'nextjs', 'express', 'typescript', 'template'],
    isFeatured: true,
    content: `Next.js 14 + Express.js loyiha uchun to'liq .cursorrules:

\`\`\`
# ═══════════════════════════════════════
# PROJECT: [YOUR_PROJECT_NAME]
# Stack: Next.js 14 App Router + Express + MongoDB
# ═══════════════════════════════════════

## PERSONALITY
- Professional, ixcham kod yoz
- Over-engineering qilma
- Kerak bo'lmagan comment yozma

## TECH STACK
- Frontend: Next.js 14 (App Router), TypeScript, Tailwind CSS, Redux Toolkit, Framer Motion
- Backend: Express.js 5, MongoDB/Mongoose, JWT (cookie-based)
- Testing: Jest, Supertest, React Testing Library
- Deploy: Vercel (frontend), Railway (backend)

## TYPESCRIPT
- Strict mode (no "any" — unknown ishlat)
- Har funksiyada return type
- Interface > Type (objects uchun)
- Generics API response uchun: ApiResponse<T>

## REACT & NEXT.JS
- Server Components by default
- 'use client' faqat zarurda
- Image: next/image
- Font: next/font
- Loading: Suspense + skeleton
- Error: error.tsx boundary

## NAMING
- Components: PascalCase (UserCard.tsx)
- Hooks: useCamelCase (useAuth.ts)
- Utils: camelCase (formatDate.ts)
- Constants: UPPER_SNAKE_CASE
- CSS classes: Tailwind only (no inline style)

## FILE STRUCTURE
\`\`\`
src/
├── app/          # Pages (Next.js)
├── components/   # UI components
│   ├── common/   # Shared
│   └── [feature]/ # Feature-specific
├── hooks/        # Custom hooks
├── api/          # API clients (axiosInstance)
├── store/        # Redux slices
└── utils/        # Helpers
\`\`\`

## API PATTERNS
- baseURL: '/api/proxy/' (proxy through Next.js)
- Auth: withCredentials: true (cookie)
- Response: { success: boolean, data: T }
- Error: { success: false, message: string }

## AVOID ALWAYS
- localStorage for auth tokens
- any type
- console.log in production code
- Inline styles
- Default exports for utils/hooks
- Magic numbers (use named constants)
- Direct DOM manipulation in React
\`\`\``,
  },

  {
    title: 'Cursor — Notepads: Tezkor Context Bloklari',
    description: 'Har kuni ishlatadigan context bloklarni Notepads da saqlash',
    category: 'cursor',
    tool: 'Cursor',
    tags: ['notepads', 'context', 'productivity', 'workflow'],
    isFeatured: false,
    content: `Cursor Notepads — qayta ishlatiladigan context bloklari:

QANDAY OCHISH: Ctrl+Shift+P → "Cursor: Open Notepad"

NOTEPAD 1 — Loyiha Konteksti:
\`\`\`markdown
# [PROJECT_NAME] Context

## Stack
Next.js 14 + Express + MongoDB + Railway/Vercel

## Auth
Cookie-based JWT. accessToken (15min) + refreshToken (7d).
Auth middleware: req.user = decoded JWT.

## API Format
Request: axiosInstance (baseURL: '/api/proxy/')
Response: { success: boolean, data: T, message?: string }
Error: 401 → refresh, 403 → subscription gate

## Key Patterns
- Redux: createAsyncThunk + extraReducers
- Components: loading/error/empty states majburiy
- Tailwind: dark mode first (bg-[#0a0e1a])
\`\`\`

NOTEPAD 2 — Code Review Checklist:
\`\`\`markdown
# Review Checklist
- [ ] TypeScript errors yo'q
- [ ] console.log yo'q
- [ ] Error handling bor
- [ ] Loading state bor
- [ ] Mobile responsive
- [ ] Auth check kerakmi?
\`\`\`

NOTEPAD 3 — Commit Template:
\`\`\`markdown
# Commit Format
feat: yangi feature
fix: bug tuzatish
refactor: refactoring
docs: dokumentatsiya
test: test
style: formatting

Example: feat(auth): add refresh token rotation
\`\`\`

NOTEPAD DA ISHLATISH:
Chat da @notepad-name deb yozsang, Cursor shu kontekstni oladi.
Masalan: "@Project Context ni hisobga olib, [TASK] qil"`,
  },

  {
    title: 'Cursor — Qaysi Model Nima Uchun Optimal',
    description: 'Cursor dagi modellarni to\'g\'ri tanlash va foydalanish',
    category: 'cursor',
    tool: 'Cursor',
    tags: ['models', 'gpt4', 'claude', 'selection', 'optimization'],
    isFeatured: false,
    content: `Cursor modellarini to'g'ri tanlash:

COMPOSER UCHUN (katta task):
┌─────────────────────────────────────────┐
│ claude-sonnet-4-6  → Best overall       │
│ Kerak: Feature, refactor, architecture  │
├─────────────────────────────────────────┤
│ gpt-4o             → Alternativa        │
│ Kerak: Parallel tasks, tez response     │
├─────────────────────────────────────────┤
│ o3                 → Complex reasoning  │
│ Kerak: Algorithm, math, complex logic   │
└─────────────────────────────────────────┘

CHAT UCHUN (tushuntirish):
┌─────────────────────────────────────────┐
│ claude-haiku       → Tez javob          │
│ Kerak: Oddiy savol, explain             │
├─────────────────────────────────────────┤
│ gpt-4o-mini        → Cost-effective     │
│ Kerak: Ko'p savol, brainstorm           │
└─────────────────────────────────────────┘

INLINE (Ctrl+K) UCHUN:
┌─────────────────────────────────────────┐
│ cursor-small       → Eng tez            │
│ Kerak: Autocomplete, small edits        │
├─────────────────────────────────────────┤
│ claude-haiku       → Smart inline       │
│ Kerak: Complex inline generation        │
└─────────────────────────────────────────┘

QOIDALAR:
1. Bug fix → claude-sonnet (reasoning yaxshi)
2. Boilerplate → gpt-4o (tez yozadi)
3. Algorithm → o3 (step-by-step)
4. Autocomplete → cursor-small (latency 0)
5. Cost muhim → haiku yoki mini

CONTEXT WINDOW:
- claude-sonnet: 200K tokens → katta codebase
- gpt-4o: 128K tokens → o'rtacha
- cursor-small: kichik → faqat current file

MASLAHAT: Composer da claude-sonnet default qilib qo'y.
Settings > Models > Composer Default Model`,
  },

  // ════════════════════════════════════════════════
  // COPILOT — Professional Konfiguratsiya
  // ════════════════════════════════════════════════

  {
    title: 'GitHub Copilot — To\'liq Sozlash va Konfiguratsiya',
    description: 'Copilot ni maksimal samarali sozlash — settings, extensions, models',
    category: 'copilot',
    tool: 'GitHub Copilot',
    tags: ['setup', 'vscode', 'settings', 'extensions', 'config'],
    isFeatured: true,
    content: `GitHub Copilot professional konfiguratsiyasi:

1. VSCODE SETTINGS (settings.json):
\`\`\`json
{
  "github.copilot.enable": {
    "*": true,
    "markdown": true,
    "plaintext": false,
    "yaml": true
  },
  "github.copilot.editor.enableAutoCompletions": true,
  "github.copilot.chat.codeGeneration.useInstructionFiles": true,
  "github.copilot.chat.codeGeneration.instructions": [
    {
      "file": ".github/copilot-instructions.md"
    }
  ],
  "editor.inlineSuggest.enabled": true,
  "editor.inlineSuggest.suppressSuggestions": false
}
\`\`\`

2. COPILOT MODELS (2025):
- GPT-4o — default, balanced
- Claude Sonnet 4 — kodni yaxshi tushunadi
- o3 — complex reasoning
- Gemini 2.0 Flash — tez

MODEL QACHON ALMASHTIRISH:
Chat panel → model dropdown → tanlash

3. .github/copilot-instructions.md:
\`\`\`markdown
# Copilot Instructions

## Stack
[YOUR_TECH_STACK]

## Code Style
- TypeScript strict
- async/await (no .then)
- Error handling: try/catch
- Response: { success: boolean, data: T }

## Avoid
- console.log
- any type
- inline styles
\`\`\`

4. COPILOT EXTENSIONS (GitHub Marketplace):
- Copilot for Azure — cloud resources
- Copilot for Jira — issue management
- Copilot for Sentry — error analysis

5. SHORTCUTS (VS Code):
- Tab — accept
- Escape — reject
- Alt+] / Alt+[ — keyingi/oldingi suggest
- Ctrl+Enter — all suggestions panel
- Ctrl+I — inline chat
- Ctrl+Shift+I — chat panel
- Ctrl+Alt+I — agent mode`,
  },

  {
    title: 'Copilot — Agent Mode: Autonomous Coding',
    description: 'Copilot Agent Mode bilan katta tasklar bajarish',
    category: 'copilot',
    tool: 'GitHub Copilot',
    tags: ['agent', 'autonomous', 'workspace', 'tasks'],
    isFeatured: true,
    content: `GitHub Copilot Agent Mode — professional ishlatish:

AGENT MODE NIMA:
Copilot o'zi terminal buyruqlar ishlatadi, fayllar yaratadi,
xatolarni tuzatadi — to'liq autonomous.

QANDAY YOQISH:
Chat panel → "Agent" ni tanlang (drop-down)

AGENT UCHUN SAMARALI PROMPT:
\`\`\`
#codebase ni ko'rib,
[FEATURE_NAME] ni implement qil:

Maqsad: [CLEAR_GOAL]

Bajar:
1. [STEP_1] — [EXPECTED_OUTPUT]
2. [STEP_2] — [EXPECTED_OUTPUT]
3. Testlar yoz va ishga tushir
4. Linting xatolarini tuzat

Cheklov:
- Faqat src/ papkasida ishlat
- Mavjud patternlarga mos yoz
- console.log qoldirma
\`\`\`

TOOLS AGENT ISHLATADI:
- #read_file — fayl o'qish
- #create_file — fayl yaratish
- #edit_file — fayl tahrirlash
- #run_in_terminal — buyruqlar
- #list_dir — papka ko'rish
- #search_codebase — kod qidirish

SLASH COMMANDS:
- /explain — kod tushuntirish
- /fix — bug tuzatish
- /tests — test yozish
- /doc — dokumentatsiya
- /optimize — optimize qilish

CONTEXT REFERENCES:
- #file:path — aniq fayl
- #codebase — butun loyiha
- #terminal — terminal output
- #selection — tanlangan kod
- #problems — VS Code errors

AGENT CHECKPOINT:
"Hozircha to'xta. Nima qilganingni tushuntir,
keyin davom etishdan oldin tasdiqlaymin."`,
  },

  {
    title: 'Copilot — Model Tanlash: GPT-4o vs Claude vs Gemini',
    description: 'Copilot Chat da qaysi model nima uchun',
    category: 'copilot',
    tool: 'GitHub Copilot',
    tags: ['models', 'gpt4', 'claude', 'gemini', 'comparison'],
    isFeatured: false,
    content: `GitHub Copilot Chat modellari — qaysi biri qachon:

MODELLAR VA KUCHLI TOMONLARI:

GPT-4o (DEFAULT):
✅ Umumiy kod yozish
✅ Quick completions
✅ Boilerplate generation
✅ JSON/YAML/config fayllar
Kamchiligi: Murakkab reasoning zaifligi

Claude Sonnet (Anthropic):
✅ Kodni tushunish va refactoring
✅ Uzoq context (200K tokens)
✅ Katta codebase tahlili
✅ Nuanced code review
Kamchiligi: GPT-4o dan biroz sekinroq

o3 (OpenAI):
✅ Algorithm va matematik muammolar
✅ Complex debugging
✅ Architecture decisions
Kamchiligi: Juda sekin, qimmat

Gemini 2.0 Flash:
✅ Eng tez response
✅ Multimodal (screenshot + kod)
✅ Cost-effective
Kamchiligi: Code quality pastroq

QOIDALAR:
| Task | Model |
|------|-------|
| Autocomplete | GPT-4o (default) |
| Refactor katta fayl | Claude Sonnet |
| Bug debug | Claude Sonnet |
| Algorithm | o3 |
| Quick question | Gemini Flash |
| Screenshot → Code | Gemini |
| PR review | Claude Sonnet |

MODEL ALMASHTIRISH:
Copilot Chat panel → yuqori o'ngdagi model dropdown`,
  },

  // ════════════════════════════════════════════════
  // CHATGPT — Professional Konfiguratsiya
  // ════════════════════════════════════════════════

  {
    title: 'ChatGPT — Custom Instructions va Profil Sozlash',
    description: 'ChatGPT ni shaxsiy kodlash assistent sifatida sozlash',
    category: 'coding',
    tool: 'ChatGPT',
    tags: ['custom-instructions', 'profile', 'setup', 'personalization'],
    isFeatured: true,
    content: `ChatGPT Custom Instructions — professional developer uchun:

Settings → Custom Instructions → Ikki maydon:

MAYDON 1: "Men haqimda" (background):
\`\`\`
Men full-stack developer man. Stack: [YOUR_STACK].
Tajribam: [YEARS] yil.
Darajam: [Junior/Middle/Senior].
Hozir ishlayotgan loyiha: [PROJECT_TYPE].
Sevimli patterns: [PATTERNS].
Til: O'zbek tilida javob ber.
\`\`\`

MAYDON 2: "Qanday javob ber":
\`\`\`
- Doimo TypeScript ishlat (JavaScript emas)
- Kod bloklarida til ko'rsat: \`\`\`typescript
- Avval tushuntir, keyin kod ber
- Qisqacha izohlar yoz (ko'p emas)
- Best practice va modern syntax ishlat
- Xato bo'lsa tuzatishni ham ko'rsat
- Production-ready kod yoz
- console.log qoldirma
\`\`\`

MODELLAR:
| Model | Nima uchun |
|-------|------------|
| GPT-4o | Kunlik dev tasks |
| o3 | Complex reasoning, algorithms |
| GPT-4o mini | Tez, cost-effective |
| o1 | Multi-step problems |

GPTs (Custom GPT) FOYDALILAR:
- Diagrams (er/flowchart) — arxitektura
- Code Interpreter — data analysis
- API Reference Search — docs
- SQL Expert — query optimization

PROJECT UCHUN CHATGPT:
"Bu suhbat uchun kontekst:
[LOYIHA HAQIDA QISQA MA'LUMOT]

Barcha javoblarda shu kontekstni hisobga ol."`,
  },

  {
    title: 'ChatGPT — GPT-4o vs o3: Qaysi Vaqt Ishlatish',
    description: 'ChatGPT modellarini to\'g\'ri tanlash',
    category: 'coding',
    tool: 'ChatGPT',
    tags: ['models', 'gpt4o', 'o3', 'o1', 'selection'],
    isFeatured: false,
    content: `ChatGPT modellarini to'g'ri tanlash:

GPT-4o — Kunlik ish:
✅ Feature kodlash
✅ Refactoring
✅ Dokumentatsiya
✅ Code review
✅ Multimodal (screenshot, image)
⏱️ Tez (~5s)
💰 O'rtacha narx

o3 — Murakkab muammolar:
✅ Algorithm design
✅ System architecture
✅ Complex debugging
✅ Mathematical problems
✅ Multi-step reasoning
⏱️ Sekin (30s+)
💰 Qimmat

GPT-4o mini — Oddiy tasklar:
✅ Simple questions
✅ Text transformation
✅ Quick explanations
⏱️ Eng tez
💰 Eng arzon

o1 — STEM va research:
✅ Scientific problems
✅ Proof checking
✅ Complex analysis
⏱️ Sekin
💰 Qimmat

QOIDA:
- Bug topib tuzatish → GPT-4o
- "Qanday arxitektura?" → o3
- Screenshot dan kod → GPT-4o
- Simple question → GPT-4o mini
- Matematik algoritm → o3

TEMPERATURE TRICK:
ChatGPT da to'g'ridan temperature yo'q,
lekin prompt bilan boshqarsa bo'ladi:
"Faqat bitta aniq javob ber" → low temp
"Bir nechta variant ber" → high temp`,
  },

  // ════════════════════════════════════════════════
  // GEMINI — Professional Konfiguratsiya
  // ════════════════════════════════════════════════

  {
    title: 'Gemini — Google AI Studio Setup va System Instructions',
    description: 'Gemini API va AI Studio ni developer uchun sozlash',
    category: 'coding',
    tool: 'Gemini',
    tags: ['ai-studio', 'system-instructions', 'setup', 'api'],
    isFeatured: true,
    content: `Google AI Studio + Gemini — professional developer setup:

1. SYSTEM INSTRUCTIONS (AI Studio):
\`\`\`
Sen tajribali full-stack developer assistenti san.
Stack: [YOUR_STACK]

Qoidalar:
- Kod bloklarida har doim til ko'rsat
- TypeScript ishlat
- Production-ready kod yoz
- Qisqa izohlar (har satriga emas)
- O'zbek tilida javob ber
- Xatoni ko'rsang tuzat va tushuntir
\`\`\`

2. MODELLAR:
| Model | Context | Nima uchun |
|-------|---------|------------|
| Gemini 2.0 Flash | 1M token | Tez, katta files |
| Gemini 2.5 Pro | 1M token | Eng kuchli, reasoning |
| Gemini 2.0 Flash Lite | 1M token | Cost-effective |

3. GEMINI API ISHLATISH:
\`\`\`javascript
const { GoogleGenerativeAI } = require('@google/generative-ai')
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash',
  systemInstruction: 'Sen [ROLE] san...',
  generationConfig: {
    temperature: 0.2,      // Kod uchun past
    maxOutputTokens: 8192,
    responseMimeType: 'text/plain'
  }
})

// Multimodal (rasm + tekst)
const imagePart = {
  inlineData: {
    data: base64Image,
    mimeType: 'image/png'
  }
}

const result = await model.generateContent([
  imagePart,
  'Bu UI ni React + Tailwind da yoz'
])
\`\`\`

4. 1M TOKEN CONTEXT ISHLATISH:
Butun codebase ni context ga bering:
\`\`\`javascript
const files = await readAllProjectFiles()  // ~500KB
const prompt = \`
\${files.map(f => \`// \${f.path}\n\${f.content}\`).join('\n\n')}

Yuqoridagi loyihada [TASK] ni qil.
\`
\`\`\``,
  },

  {
    title: 'Gemini — 1M Token Context: Katta Codebase Tahlili',
    description: 'Gemini ning 1M token kontekstidan maksimal foydalanish',
    category: 'claude',
    tool: 'Gemini',
    tags: ['long-context', 'codebase', 'analysis', '1m-tokens'],
    isFeatured: false,
    content: `Gemini 1M token kontekstini to'g'ri ishlatish:

NIMA MUMKIN (1M ≈ 750K so'z ≈ katta loyiha):
- Butun Next.js loyihani bir vaqtda tahlil
- 100+ fayl bir promptda
- Uzoq conversation history
- Ko'p PDF/doc birga

OPTIMAL FAYL YUKLASH FORMATI:
\`\`\`
=== FILE: src/app/page.tsx ===
[content]

=== FILE: src/components/Navbar.tsx ===
[content]

=== FILE: backend/index.js ===
[content]
\`\`\`

SAMARALI PROMPTING:
\`\`\`
Yuqoridagi [N] ta faylni ko'rdim.

Quyidagilarni tahlil qil:
1. Arxitektura: [SPECIFIC_QUESTION]
2. Security: [SPECIFIC_QUESTION]
3. Performance: [SPECIFIC_QUESTION]

Har topilgan muammo uchun:
- Fayl nomi + qator
- Muammo nima
- Fix (kod bilan)
\`\`\`

GROUNDING (real-time ma'lumot):
Gemini 2.0 da Google Search grounding yoqsa:
"[PACKAGE_NAME] ning oxirgi versiyasi va
breaking changes ni topib, mening kodimga tatbiq et"

CACHE (takroriy so'rovlar uchun):
\`\`\`javascript
// Katta fayl bir marta upload, ko'p marta ishlatish
const cachedContent = await cacheManager.create({
  model: 'gemini-2.0-flash',
  contents: largeCodebase,
  ttl: '3600s'
})
\`\`\``,
  },

  // ════════════════════════════════════════════════
  // WINDSURF — Professional Konfiguratsiya
  // ════════════════════════════════════════════════

  {
    title: 'Windsurf — Cascade AI: To\'liq Sozlash va Qoidalar',
    description: 'Windsurf Cascade ni professional sozlash',
    category: 'vibe_coding',
    tool: 'Windsurf',
    tags: ['cascade', 'rules', 'setup', 'windsurf'],
    isFeatured: true,
    content: `Windsurf Cascade — professional konfiguratsiya:

1. GLOBAL RULES (Settings → Cascade → Custom Rules):
\`\`\`
Sen full-stack developer assistenti san.

QOIDALAR:
- TypeScript strict ishlat
- Mavjud patternlarga mos yoz
- Har o'zgarishdan keyin test yoz
- O'zbek tilida tushuntir, ingliz kod
- console.log qoldirma
- any type ishlatma
\`\`\`

2. .windsurfrules (loyiha root da):
\`\`\`markdown
# Windsurf Rules — [PROJECT_NAME]

## Stack
- Frontend: [STACK]
- Backend: [STACK]
- DB: [DB]

## Architecture
[KEY_PATTERNS]

## DO
- Path aliases ishlat: @/components
- Error boundaries qo'sh
- Loading states har doim

## DON'T
- localStorage da token saqla
- Direct DOM manipulation
- Synchronous DB calls
\`\`\`

3. CASCADE MODES:
- Write Mode — kod yozish
- Chat Mode — savol-javob
- Flow Mode — autonomous (agent-like)

4. FLOW MODE UCHUN PROMPT:
\`\`\`
Quyidagi taskni bajar:
[CLEAR_TASK]

Files scope: [SPECIFIC_FILES]
Avoid: [WHAT_NOT_TO_TOUCH]
When done: git status ko'rsat
\`\`\`

5. MODELLAR:
- claude-sonnet-4-6 — default, best
- gpt-4o — alternativa
- deepseek — cost-effective

KEYBOARD SHORTCUTS:
- Ctrl+L — Cascade ochish
- Ctrl+I — Inline edit
- Ctrl+Shift+L — Flow mode`,
  },

  // ════════════════════════════════════════════════
  // UNIVERSAL — Prompt Engineering
  // ════════════════════════════════════════════════

  {
    title: 'Prompt Engineering — Barcha AI Uchun Universal Qoidalar',
    description: 'Har qanday AI dan maksimal natija olish texnikalari',
    category: 'other',
    tool: 'Any',
    tags: ['prompt-engineering', 'universal', 'techniques', 'tips'],
    isFeatured: true,
    content: `Har qanday AI (Claude, GPT, Gemini, Copilot) uchun universal prompt qoidalari:

ASOSIY FORMULA:
[ROL] + [KONTEKST] + [TASK] + [FORMAT] + [CHEKLOV]

MISOL:
\`\`\`
Sen tajribali Node.js backend developer san.  ← ROL

Mening loyiham Express + MongoDB stack da.    ← KONTEKST
Auth cookie-based JWT ishlaydi.

Quyidagi controllerni refactor qil:           ← TASK
[KOD]

Natija formati:                               ← FORMAT
- Refactored kod (to'liq)
- O'zgarishlar tavsifi (3-5 ta bullet)

Cheklov:                                      ← CHEKLOV
- Funksionallik o'zgarmasin
- TypeScript ishlat
- 50 satırdan uzun bo'lmasin
\`\`\`

10 TA TEXNIKA:

1. SPECIFICITY — Aniqlik:
   ❌ "Kodni yaxshila"
   ✅ "login() funksiyasidagi token validation ni tuzat"

2. EXAMPLES — Misol ber:
   "Quyidagi formatda chiqar: [EXAMPLE]"

3. STEP-BY-STEP:
   "Qadamlar bilan fikrla, keyin kod yoz"

4. NEGATIVE PROMPTING:
   "X ni qilma, Y ishlatma, Z o'zgartirma"

5. PERSONA:
   "Sen 10 yillik [DOMAIN] expertisan"

6. OUTPUT FORMAT:
   "Faqat kod ber, izoh yozma"
   "Markdown formatda ber"
   "JSON formatda qaytart"

7. ITERATION:
   "Yana bir bor, bu safar [IMPROVEMENT]"

8. VALIDATION:
   "Javob berishdan oldin tekshir: [CRITERIA]"

9. DECOMPOSITION:
   Katta taskni kichik qismlarga bo'l

10. CONTEXT WINDOW:
    Muhim ma'lumot BOSHIDA va OXIRIDA tur`,
  },

  {
    title: 'AI Modellar Taqqoslash — Qaysi Task Uchun Qaysi AI',
    description: 'Claude vs GPT vs Gemini vs Copilot: to\'g\'ri tanlash jadvali',
    category: 'other',
    tool: 'Any',
    tags: ['comparison', 'models', 'selection', 'guide'],
    isFeatured: true,
    content: `Qaysi task uchun qaysi AI modeli optimal:

KOD YOZISH:
┌──────────────────────────────────────────────┐
│ Task              │ Model        │ Sabab      │
│───────────────────│──────────────│────────────│
│ Feature dev       │ Claude Sonnet│ Best code  │
│ Quick boilerplate │ GPT-4o       │ Tez        │
│ Algorithm         │ o3           │ Reasoning  │
│ Screenshot → Code │ Gemini 2.0   │ Multimodal │
│ Autocomplete      │ Copilot      │ IDE native │
└──────────────────────────────────────────────┘

DEBUGGING:
┌──────────────────────────────────────────────┐
│ Bug type          │ Model        │ Sabab      │
│───────────────────│──────────────│────────────│
│ Logic bug         │ Claude Sonnet│ Nuanced    │
│ Performance       │ Claude/GPT4o │ Analysis   │
│ Error logs        │ Gemini       │ Long ctx   │
│ Complex bug       │ o3           │ Reasoning  │
└──────────────────────────────────────────────┘

ARXITEKTURA:
┌──────────────────────────────────────────────┐
│ Task              │ Model        │ Sabab      │
│───────────────────│──────────────│────────────│
│ System design     │ o3/Claude    │ Deep think │
│ DB schema         │ GPT-4o       │ Structured │
│ API design        │ Claude Sonnet│ Consistent │
│ Codebase audit    │ Gemini 2.0   │ 1M context │
└──────────────────────────────────────────────┘

MAXSUS:
- O'zbek tilida javob → Claude yaxshiroq
- Hisob-kitob → Gemini/o3
- Ijodiy nomlash → GPT-4o
- Security audit → Claude Sonnet
- Test generation → Copilot yoki Claude

NARX/SIFAT:
1. Eng yaxshi: Claude Sonnet 4.6
2. Tez va arzon: GPT-4o mini / Gemini Flash
3. Complex reasoning: o3 (qimmat, sekin)
4. Free alternativa: Gemini 2.0 Flash`,
  },

  {
    title: 'System Prompt — Har Qanday AI uchun Shaxsiy Asistent',
    description: 'Har bir AI platformasida shaxsiy developer asistent yaratish',
    category: 'other',
    tool: 'Any',
    tags: ['system-prompt', 'assistant', 'personalization', 'setup'],
    isFeatured: false,
    content: `Har qanday AI platformasi uchun shaxsiy coding asistent system prompt:

UNIVERSAL SYSTEM PROMPT TEMPLATE:
\`\`\`
Sen [YOUR_NAME] ning shaxsiy full-stack developer assistenti san.

FOYDALANUVCHI HAQIDA:
- Ism: [NAME]
- Daraja: [Junior/Middle/Senior]
- Asosiy stack: [STACK]
- Loyiha: [CURRENT_PROJECT]
- Til: O'zbek (texnik terminlar inglizcha)

TEXNIK STANDARTLAR:
- TypeScript strict mode (any = xato)
- async/await (no .then chains)
- Error: try/catch + meaningful message
- API: { success: boolean, data: T }
- Test: har feature uchun unit test

KOD USLUBI:
- Clean code: kichik funksiyalar (<20 qator)
- DRY: takrorlanishni yo'q qil
- SOLID principlesga rioya qil
- Meaningful naming (x, data emas)

JAVOB FORMATI:
- Avval qisqa tushuntirish
- Keyin kod (to'liq, ishlaydigan)
- Kerak bo'lsa: muqobil yondashuv

DOIM:
- Production-ready kod yoz
- Edge casesni ko'zda tut
- Security vulnerabilities ko'rsa ogohlantir
- Performance muammosi ko'rsa ayt

HECH QACHON:
- console.log qoldirma
- Placeholder (// TODO) qoldirma
- Incomplete kod berma
- "Qolganini o'zing yoz" dema
\`\`\`

PLATFORMALARGA QO'SHISH:
- Claude.ai: Settings → Custom Instructions
- ChatGPT: Settings → Custom Instructions
- Gemini: AI Studio → System Instructions
- Cursor: Settings → Rules for AI
- Copilot: .github/copilot-instructions.md`,
  },

  {
    title: 'Context Window — Katta Fayllar bilan Ishlash',
    description: 'AI context limitlarini to\'g\'ri boshqarish strategiyasi',
    category: 'other',
    tool: 'Any',
    tags: ['context-window', 'tokens', 'strategy', 'large-files'],
    isFeatured: false,
    content: `AI context window ni to'g'ri boshqarish:

MODELLAR CONTEXT LIMITI:
| Model | Max Tokens | ~Kod satrlari |
|-------|------------|---------------|
| Claude Sonnet | 200K | ~150,000 |
| GPT-4o | 128K | ~95,000 |
| Gemini 2.0 Flash | 1M | ~750,000 |
| Copilot | 64K | ~48,000 |

KATTA LOYIHADA ISHLASH:

STRATEGIYA 1 — Chunking:
\`\`\`
Avval: "Bu loyihaning arxitekturasini tushuntiraman: [HIGH_LEVEL]"
Keyin: "Endi faqat auth modulini ko'ramiz: [AUTH_FILES]"
Keyin: "Endi faqat API layer: [API_FILES]"
\`\`\`

STRATEGIYA 2 — Ixcham context:
\`\`\`
// Butun fayl emas, faqat kerakli qism:
// File: src/controllers/authController.js
// Lines 45-89 (login function only):
[PASTE_ONLY_RELEVANT_CODE]
\`\`\`

STRATEGIYA 3 — Summary + Detail:
\`\`\`
LOYIHA SUMMARY:
[2-3 jumlada loyiha haqida]

MAVJUD PATTERN:
[Eng muhim kodning qisqa versiyasi]

MUAMMO:
[SPECIFIC_QUESTION]
\`\`\`

TOKEN TEJASH:
- Faqat kerakli fayllarni paste qiling
- Type definitions ni import path bilan ko'rsating
- Uzun kommentariylarni olib tashlang
- Test fayllarini paste qilmang (keraksiz)

GEMINI 1M TOKEN UCHUN:
Butun codebase yuklash mumkin:
\`\`\`bash
find src backend -name "*.ts" -o -name "*.js" |
  xargs awk 'FNR==1{print "=== " FILENAME " ==="} {print}' > context.txt
\`\`\``,
  },

  {
    title: 'AI Coding Workflow — Kunlik Developer Rutini',
    description: 'AI toollarni kunlik ish jarayoniga integratsiya qilish',
    category: 'vibe_coding',
    tool: 'Any',
    tags: ['workflow', 'daily', 'routine', 'productivity'],
    isFeatured: true,
    content: `AI bilan professional developer kundalik workflow:

ERTALAB (Planning):
\`\`\`
ChatGPT/Claude ga:
"Bugun [FEATURE] implement qilaman.
Eng yaxshi yondashuv qanday?
Xavfli joylar? Edge cases?"
\`\`\`

KODLASH (Implementation):
\`\`\`
KICHIK TASK (1 soat):
→ Cursor Inline (Ctrl+K) yoki Copilot

O'RTA TASK (2-4 soat):
→ Cursor Composer + @Codebase

KATTA TASK (kun):
→ Claude Code Agent Mode
→ Worktree da (izolyatsiya)
\`\`\`

DEBUG:
\`\`\`
1. Error message → Claude/GPT ga paste
2. "Bu xatoning root cause nima?"
3. Tuzatish → test
4. Agar hal bo'lmasa: Gemini (uzoq context)
\`\`\`

CODE REVIEW (PR):
\`\`\`
Copilot Chat: "@workspace Bu PR ni review qil:
- Security
- Performance
- Code quality"
\`\`\`

KECHQURUN (Retrospektiv):
\`\`\`
"Bugun [NIMA QILDIM].
Yaxshilash mumkin bo'lgan joylar?
Ertaga nimadan boshlashim kerak?"
\`\`\`

TOOLLAR BO'LINISHI:
| Vaqt | Tool | Maqsad |
|------|------|--------|
| Planning | Claude/ChatGPT | Tafakkur |
| Coding | Cursor/Copilot | IDE native |
| Debug | Claude Sonnet | Nuanced |
| Big task | Claude Code | Autonomous |
| Review | Copilot/Claude | Quality |
| Learn | ChatGPT o3 | Understanding |`,
  },
];

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function seed() {
  await connectDB();

  const admin = await User.findOne({ role: 'admin' });
  if (!admin) { console.error('❌ Admin topilmadi'); process.exit(1); }

  console.log(`✅ Admin: ${admin.username}\n📝 ${PROMPTS.length} ta prompt...\n`);

  let added = 0, skipped = 0;

  for (const p of PROMPTS) {
    const exists = await Prompt.findOne({ title: p.title });
    if (exists) { console.log(`⏭️  ${p.title}`); skipped++; continue; }

    await Prompt.create({
      ...p,
      author: admin._id,
      isPublic: true,
      likesCount: Math.floor(Math.random() * 80) + 15,
      viewsCount: Math.floor(Math.random() * 400) + 80,
    });
    console.log(`✅ [${p.category}] ${p.title}`);
    added++;
  }

  console.log(`\n🎉 Qo'shildi: ${added} | Skip: ${skipped}`);

  const cats = ['claude','cursor','copilot','coding','architecture','vibe_coding','other'];
  console.log('\n📊 Jami:');
  for (const c of cats) {
    const n = await Prompt.countDocuments({ category: c, isPublic: true });
    console.log(`   ${c}: ${n} ta`);
  }
  process.exit(0);
}

seed().catch(e => { console.error('❌', e.message); process.exit(1); });

/**
 * AIDEVIX CLAUDE TIPS SCHEDULER
 *
 * Kuniga 1 marta (default 13:00 Toshkent vaqtida) Telegram kanal(lar)ga
 * Claude AI tools haqida qiziq, professional educational post yuboradi.
 *
 * Mavzular pooli — curated, RSS emas:
 *   skills, MCP, Obsidian, .md fayllar, plugins, slash commands, hooks,
 *   subagents, memory, prompt caching, model selection, plan mode va h.k.
 *
 * AI tahlil: Groq llama-3.3-70b → o'zbekcha qisqa, professional post.
 * Dublikat himoya: .sent_tips.json — 14 kun ichida ishlatilgan mavzu qaytarilmaydi.
 *
 * On/off: schedulerState.isNewsEnabled() — eski "news" flag bilan birga ishlaydi,
 * shu sababli bot /toggle news bilan boshqaradi.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const schedulerState = require('./schedulerState');

const STATE_FILE = path.join(__dirname, '..', '.sent_tips.json');

// ─── Curated Claude topic pool ────────────────────────────────────────────

const CLAUDE_TOPICS = [
  // Skills & Core Features
  { id: 'skills', emoji: '🧠', title: 'Claude Skills',
    brief: 'Claude Code skill tizimi — qachon avtomatik yuklanadi, qaysi voqealar (sessionStart, prompt) ishga tushiradi, custom skill qanday yoziladi.' },
  { id: 'subagents', emoji: '🤖', title: 'Subagents — Task tool',
    brief: 'Claude Code subagents (Explore, Plan, general-purpose). Konteksni asosiy thread\'dan ajratish, parallel ishlash, qachon ishlatish kerak.' },
  { id: 'memory', emoji: '💾', title: 'Auto Memory tizimi',
    brief: 'MEMORY.md indeks fayli, user/feedback/project/reference memory turlari. Sessiyalar orasida nima eslab qolinadi va nima eslanmasligi kerak.' },
  { id: 'thinking', emoji: '🧩', title: 'Extended Thinking',
    brief: 'Claude\'ning extended thinking rejimi. "ultrathink", "think harder" trigger so\'zlari. Murakkab masalalarda 2-5x sifat oshishi.' },
  { id: 'plan-mode', emoji: '📐', title: 'Plan Mode',
    brief: 'ExitPlanMode tool — avval reja, keyin amal. Refactor va arxitektura o\'zgarishlarida foydalanuvchi tasdig\'idan keyin yozish.' },

  // MCP (Model Context Protocol)
  { id: 'mcp-intro', emoji: '🔌', title: 'MCP — Model Context Protocol',
    brief: 'MCP nima va nima uchun u "AI uchun USB-C". Lokal va remote MCP serverlar, transport (stdio vs HTTP), permission tizimi.' },
  { id: 'mcp-obsidian', emoji: '📓', title: 'Obsidian MCP + Claude',
    brief: 'Obsidian vault\'ni Claude\'ga ulash. Note yaratish, qidiruv, link grafigini boshqarish, kunlik notalarni AI bilan tahlil qilish.' },
  { id: 'mcp-github', emoji: '🐙', title: 'GitHub MCP server',
    brief: 'Claude Code\'dan GitHub PR, issue, repo\'larni boshqarish. gh CLI o\'rnida ishlatish — kod review, merge, label boshqaruvi.' },
  { id: 'mcp-figma', emoji: '🎨', title: 'Figma MCP — Design-to-Code',
    brief: 'Figma faylidan to\'g\'ridan-to\'g\'ri React komponent yaratish, design system token\'lariga link qilish, code connect mapping.' },
  { id: 'mcp-context7', emoji: '📚', title: 'Context7 MCP — Live Docs',
    brief: 'Context7 MCP serveri orqali kutubxonalar (Next.js, Prisma, React) so\'nggi versiyalarining dokumentatsiyasini realtime olish.' },

  // CLAUDE.md & Configuration
  { id: 'claude-md', emoji: '📄', title: 'CLAUDE.md — Loyiha xotirasi',
    brief: 'CLAUDE.md fayli — har sessiyada Claude o\'qiydigan loyiha konteksti. Stack, qoidalar, fayl yo\'llari, do\'s & don\'ts.' },
  { id: 'slash-commands', emoji: '⚡', title: 'Custom slash commands',
    brief: '.claude/commands/*.md — /review, /deploy, /test kabi custom buyruqlar yaratish. Argument o\'tkazish va frontmatter konfiguratsiya.' },
  { id: 'hooks', emoji: '🪝', title: 'Claude Code hooks',
    brief: 'settings.json hooks tizimi — preToolUse, postToolUse, sessionStart, userPromptSubmit. Avtomatik lint, test, format trigger.' },
  { id: 'settings', emoji: '⚙️', title: 'settings.json — Permissions',
    brief: 'allowedTools va denyTools — Claude\'ga ruxsat ham va cheklov ham. Project / user / local settings hierarchiyasi.' },

  // .md files workflow
  { id: 'md-workflow', emoji: '📝', title: 'AI bilan .md fayllar workflow',
    brief: 'Markdown — AI uchun universal til. README, ADR (architecture decision record), RFC, prompt fayllarini .md\'da saqlash.' },
  { id: 'prompt-md', emoji: '📋', title: 'Promptlarni .md\'da saqlash',
    brief: 'Murakkab promptlarni reusable .md fayl sifatida saqlash. Versiyalash, jamoa bilan ulashish, A/B test qilish.' },
  { id: 'agents-md', emoji: '🗂', title: 'AGENTS.md — Agent yo\'riqnomasi',
    brief: 'AGENTS.md fayli — Cursor, Claude Code, Copilot uchun yagona agent qoidalari. CLAUDE.md alternativasi yoki to\'ldiruvchisi.' },

  // Plugins & IDE
  { id: 'plugins', emoji: '🧩', title: 'Claude Code plugins',
    brief: 'IDE plugin tizimi (Vercel, Figma, Telegram, GitHub plugins). Komandalar, skill\'lar, MCP serverlarni bitta paket sifatida tarqatish.' },
  { id: 'ide-integration', emoji: '💻', title: 'VS Code + JetBrains integratsiya',
    brief: 'Claude Code IDE plugin — fayl ochish, diff ko\'rish, terminal bilan birgalikda ishlash. Keyboard shortcuts va inline edit.' },

  // API & Cost optimization
  { id: 'prompt-cache', emoji: '⚡', title: 'Prompt Caching — 90% arzon',
    brief: 'Anthropic API prompt cache: katta system prompt yoki document\'ni keshlash. 5 daqiqalik TTL, cache_control marker.' },
  { id: 'model-select', emoji: '🎯', title: 'Haiku vs Sonnet vs Opus',
    brief: 'Qaysi vazifaga qaysi model. Haiku — tez/oddiy, Sonnet — default, Opus — arxitektura va murakkab refactor. Narx va sifat muvozanati.' },
  { id: 'tool-use', emoji: '🛠', title: 'Tool Use / Function Calling',
    brief: 'Claude API tool use — agent qurishning poydevori. JSON schema, parallel tool calls, tool_choice strategiyasi.' },
  { id: 'streaming', emoji: '🌊', title: 'Streaming — real-time javob',
    brief: 'SSE streaming bilan Claude javobini token-by-token ko\'rsatish. UX 3x yaxshilanishi, time-to-first-token < 1s.' },

  // Workflows & Advanced
  { id: 'multi-agent', emoji: '👥', title: 'Multi-agent workflow',
    brief: 'Orchestrator + worker agents. Bitta katta vazifani parallel subagent\'larga taqsimlash. Kontekst tejash strategiyasi.' },
  { id: 'ultraview', emoji: '🔍', title: 'Ultrareview — multi-agent code review',
    brief: '/ultrareview — bir nechta AI agent parallel ravishda PR\'ni tahlil qiladi (security, performance, style, tests).' },
  { id: 'fewer-prompts', emoji: '🚀', title: 'Fewer permission prompts',
    brief: 'Tranzakt log\'idan keng ishlatiladigan read-only buyruqlarni topib settings.json allowlist\'iga qo\'shish — workflow tezligi.' },
];

// ─── State (dublikat boshqaruvi) ──────────────────────────────────────────

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      if (Array.isArray(data?.sent)) return data;
    }
  } catch (err) {
    console.error('[ClaudeTips] state read error:', err.message);
  }
  return { sent: [] };
}

function saveState(state) {
  try {
    // 30 kundan eski yozuvlarni tozalaymiz
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    state.sent = state.sent.filter(e => e.ts > cutoff);
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch (err) {
    console.error('[ClaudeTips] state write error:', err.message);
  }
}

function pickTopic(state) {
  // 14 kun ichida ishlatilganlarni saralaymiz
  const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
  const recentlyUsed = new Set(state.sent.filter(e => e.ts > twoWeeksAgo).map(e => e.id));
  const available = CLAUDE_TOPICS.filter(t => !recentlyUsed.has(t.id));
  const pool = available.length > 0 ? available : CLAUDE_TOPICS;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── AI post generatsiya ──────────────────────────────────────────────────

async function generatePost(topic) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.warn('[ClaudeTips] GROQ_API_KEY topilmadi — fallback static post');
    return {
      title: topic.title,
      content: topic.brief,
      tip: '💡 Aidevix Prompt Library\'da shu mavzuga oid promptlarni ko\'ring.',
    };
  }

  const prompt =
    `Sen Aidevix platformasining Claude AI tools ekspertisan. O'zbek tilida Telegram kanal uchun professional educational post yozasan.\n\n` +
    `Bugungi mavzu: ${topic.title}\n` +
    `Asosiy g'oya: ${topic.brief}\n\n` +
    `POST FORMATI (qat'iy):\n` +
    `1. title — qiziqarli, o'tkir o'zbekcha sarlavha (emoji yo'q — emoji alohida qo'shiladi)\n` +
    `2. content — 4-6 jumla: bu nima, qachon ishlatiladi, qanday qo'llaniladi, qanday foyda beradi. Aniq, professional, qiziqarli. Texnik atamalarni saqlab qol (MCP, hook, subagent, skill va h.k.).\n` +
    `3. tip — 1 ta amaliy maslahat yoki misol. "💡" bilan boshlanadi.\n\n` +
    `Cheklovlar:\n` +
    `- Sarlavha qisqa, vibe-bro emas, professional\n` +
    `- Markdown belgilari ishlatma (#, *, **). Faqat oddiy matn yoki HTML <b>...</b> ishlat.\n` +
    `- Texnik atamalarni o'zbekchaga zo'rg'a tarjima qilmagin (MCP, hook, subagent — o'zicha qoldir)\n` +
    `- Audience: o'rta darajadagi dasturchilar va AI tools bilan tanish bo'lganlar\n\n` +
    `FAQAT JSON qaytar:\n` +
    `{"title":"...","content":"...","tip":"💡 ..."}`;

  try {
    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.8,
    }, {
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: 30000,
    });

    const parsed = JSON.parse(response.data.choices[0].message.content);
    if (!parsed?.title || !parsed?.content) throw new Error('AI response incomplete');
    if (!parsed.tip) parsed.tip = '💡 Bu mavzuda chuqurroq bilim uchun Aidevix Prompt Library\'ga qarang.';
    return parsed;
  } catch (err) {
    console.error('[ClaudeTips] AI generation error:', err.message);
    return null;
  }
}

// ─── Telegram'ga yuborish ─────────────────────────────────────────────────

async function sendTipToChat(botToken, chatId, topic, aiData) {
  const tgChannel     = process.env.TELEGRAM_CHANNEL_USERNAME || 'aidevix';
  const tgChannelLink = `https://t.me/${tgChannel.replace('@', '')}`;
  const igLink        = process.env.INSTAGRAM_URL || 'https://instagram.com/aidevix.uz';
  const siteLink      = process.env.SITE_URL || 'https://aidevix.uz';

  const message =
    `${topic.emoji} <b>${aiData.title}</b>\n\n` +
    `${aiData.content}\n\n` +
    `${aiData.tip}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `<b>Aidevix</b> — AI & Dasturlash O'quv Platformasi 🇺🇿\n\n` +
    `📢 Kanal: <a href="${tgChannelLink}">@${tgChannel.replace('@', '')}</a>\n` +
    `📸 Instagram: <a href="${igLink}">@aidevix.uz</a>\n` +
    `🌐 Sayt: <a href="${siteLink}">aidevix.uz</a>\n\n` +
    `#Claude #ClaudeCode #MCP #AItools #skills #plugins`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '🔥', callback_data: 'tip_react_fire' },
        { text: '🚀', callback_data: 'tip_react_rocket' },
        { text: '💡', callback_data: 'tip_react_bulb' },
      ],
      [
        { text: "📢 Kanalga obuna bo'l", url: tgChannelLink },
        { text: '🎓 Kurslar', url: siteLink },
      ],
      [{ text: "↗️ Do'stlarga ulash", url: `https://t.me/share/url?url=${encodeURIComponent(siteLink)}&text=${encodeURIComponent(aiData.title + ' | Aidevix')}` }],
    ],
  };

  await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    chat_id: chatId,
    text: message,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup: keyboard,
  });
}

// ─── Maqsadli kanallar ────────────────────────────────────────────────────

async function getTargetChannels() {
  try {
    const BotChannel = require('../models/BotChannel');
    const dbChannels = await BotChannel.find({ isActive: true });
    const result = dbChannels.filter(c => c.wantsNews());

    // Asosiy kanal DB da yo'q bo'lsa fallback
    const mainCh = process.env.TELEGRAM_CHANNEL_USERNAME;
    if (mainCh) {
      const mainId = mainCh.startsWith('@') ? mainCh : `@${mainCh}`;
      if (!result.find(c => c.chatId === mainId || c.chatId === mainCh)) {
        result.unshift({
          chatId: mainId,
          title: 'Asosiy kanal',
          scheduleHours: [13],
        });
      }
    }
    return result;
  } catch {
    const ch = process.env.TELEGRAM_CHANNEL_USERNAME;
    return ch
      ? [{ chatId: ch.startsWith('@') ? ch : `@${ch}`, scheduleHours: [13] }]
      : [];
  }
}

// ─── Scheduler tick ───────────────────────────────────────────────────────

const lastPostedSlots = new Map(); // chatId → 'YYYY-MM-DD-HH' (retry spam himoyasi)

async function runSchedulerTick() {
  if (!schedulerState.isNewsEnabled()) return;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return;

  const now          = new Date();
  const tashkentHour = (now.getUTCHours() + 5) % 24;
  const todayStr     = now.toISOString().split('T')[0];

  const channels = await getTargetChannels();
  if (channels.length === 0) return;

  // Hozirgi soatda post kutayotgan kanallar
  const pending = channels.filter(ch => {
    const hours   = ch.scheduleHours?.length > 0 ? ch.scheduleHours : [13];
    const slotKey = `${todayStr}-${tashkentHour}`;
    return hours.includes(tashkentHour) && lastPostedSlots.get(ch.chatId) !== slotKey;
  });
  if (pending.length === 0) return;

  const state = loadState();

  for (const channel of pending) {
    const slotKey = `${todayStr}-${tashkentHour}`;
    lastPostedSlots.set(channel.chatId, slotKey); // oldindan belgilab qo'yamiz

    try {
      const topic  = pickTopic(state);
      const aiData = await generatePost(topic);
      if (!aiData) continue;

      await sendTipToChat(botToken, channel.chatId, topic, aiData);
      state.sent.push({ id: topic.id, ts: Date.now() });
      saveState(state);
      schedulerState.addLog('news', channel.chatId, `[ClaudeTip] ${topic.title}`, true);

      console.log(`[ClaudeTips] ✅ ${channel.title || channel.chatId} (${tashkentHour}:00) → "${topic.title}"`);
      await new Promise(r => setTimeout(r, 1500));
    } catch (err) {
      schedulerState.addLog('news', channel.chatId, 'Xatolik: ' + (err.response?.data?.description || err.message), false);
      console.error(`[ClaudeTips] ❌ ${channel.chatId}:`, err.response?.data?.description || err.message);
    }
  }
}

// ─── Manual trigger (bot /postnews uchun ham foydalanish mumkin) ──────────

async function postTipToChannel() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return false;

  const channels = await getTargetChannels();
  if (channels.length === 0) return false;

  const state = loadState();
  let totalSent = 0;

  for (const channel of channels) {
    try {
      const topic  = pickTopic(state);
      const aiData = await generatePost(topic);
      if (!aiData) continue;

      await sendTipToChat(botToken, channel.chatId, topic, aiData);
      state.sent.push({ id: topic.id, ts: Date.now() });
      saveState(state);
      totalSent++;
      schedulerState.addLog('news', channel.chatId, `[ClaudeTip] ${topic.title}`, true);
      console.log(`[ClaudeTips] ✅ ${channel.title || channel.chatId} → "${topic.title}"`);

      await new Promise(r => setTimeout(r, 1500));
    } catch (err) {
      schedulerState.addLog('news', channel.chatId, 'Xatolik: ' + (err.response?.data?.description || err.message), false);
      console.error(`[ClaudeTips] ❌ ${channel.chatId}:`, err.response?.data?.description || err.message);
    }
  }

  console.log(`[ClaudeTips] Jami: ${totalSent}/${channels.length} kanalga yuborildi`);
  return totalSent > 0;
}

// ─── Boot ─────────────────────────────────────────────────────────────────

function startClaudeTipsScheduler() {
  if (!schedulerState.isNewsEnabled()) {
    console.log('[ClaudeTips] Scheduler o\'chirilgan (NEWS_ENABLED=false). Bot /toggle news bilan yoqish mumkin.');
  }
  console.log('[ClaudeTips] Kunlik Claude Tips ishga tushdi — har kuni 13:00 Toshkent (har 10 daqiqada tekshiriladi)');

  // Ishga tushganda 15 soniya kutib tekshiramiz
  setTimeout(runSchedulerTick, 15000);
  // Har 10 daqiqada tick
  setInterval(runSchedulerTick, 10 * 60 * 1000);
}

module.exports = { startClaudeTipsScheduler, postTipToChannel };

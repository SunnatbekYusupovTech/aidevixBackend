/**
 * AIDEVIX AI NEWS & TIPS SCHEDULER
 *
 * Har bir kanal/guruh O'Z jadvaliga ko'ra post oladi:
 *   - scheduleHours: [10, 16, 20]  → kuniga 3 marta (default)
 *   - scheduleHours: [9, 18]       → kuniga 2 marta
 *   - scheduleHours: [12]          → kuniga 1 marta
 *
 * Har kanal o'z mavzusini (topics) va post turini (postTypes) ham tanlaydi.
 *
 * Manba filtri: faqat Claude/Codex/Cursor/AI tools professional yangiliklari.
 * AI tahlil: Groq llama-3.3-70b → o'zbekcha professional post.
 * Dublikat himoya: .sent_news.json (7 kun saqlanadi).
 */

const RssParser = require('rss-parser');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const schedulerState = require('./schedulerState');

const parser = new RssParser({
  timeout: 15000,
  headers: { 'User-Agent': 'Aidevix-NewsBot/4.0' },
});

const SENT_FILE = path.join(__dirname, '..', '.sent_news.json');

// Kalit so'zlar — shu so'zlar bo'lsa QABUL qilinadi
const FOCUS_KEYWORDS = [
  'claude', 'anthropic', 'codex', 'openai', 'cursor', 'antigravity',
  'copilot', 'github copilot', 'chatgpt', 'gpt-4', 'gpt-5', 'o3', 'o4',
  'gemini', 'llm', 'vibe coding', 'ai coding', 'ai code', 'code generation',
  'ai agent', 'agentic', 'mcp', 'model context protocol', 'prompt engineering',
  'ai tools', 'ai ide', 'devin', 'windsurf', 'replit ai', 'codeium',
];

const RSS_FEEDS = [
  // --- Claude / Anthropic ---
  { name: 'Anthropic Blog',  url: 'https://www.anthropic.com/feed',                                                         category: 'CLAUDE' },
  { name: 'TechCrunch AI',   url: 'https://techcrunch.com/category/artificial-intelligence/feed/',                          category: 'CLAUDE' },
  { name: 'The Verge AI',    url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml',                      category: 'CLAUDE' },

  // --- OpenAI / Codex ---
  { name: 'OpenAI Blog',     url: 'https://openai.com/news/rss.xml',                                                        category: 'CODEX' },
  { name: 'Wired AI',        url: 'https://www.wired.com/feed/tag/ai/latest/rss',                                           category: 'CODEX' },

  // --- Cursor / AI Coding Tools ---
  { name: 'GitHub Blog',     url: 'https://github.blog/feed/',                                                              category: 'CURSOR' },
  { name: 'HN AI Tools',     url: 'https://hnrss.org/newest?q=Cursor+OR+Codex+OR+Claude+OR+Copilot+OR+Antigravity&points=50', category: 'CURSOR' },
  { name: 'Dev.to AI',       url: 'https://dev.to/feed/tag/ai',                                                             category: 'CURSOR' },

  // --- Professional AI Skills ---
  { name: 'Hugging Face',    url: 'https://huggingface.co/blog/feed.xml',                                                   category: 'SKILLS' },
  { name: 'InfoQ AI',        url: 'https://feed.infoq.com/ai-ml-data-eng/',                                                 category: 'SKILLS' },
  { name: 'Ars Technica',    url: 'https://feeds.arstechnica.com/arstechnica/technology-lab',                               category: 'SKILLS' },
  { name: 'MIT Tech Review', url: 'https://www.technologyreview.com/feed/',                                                 category: 'SKILLS' },
];

// ─── Dublikat boshqaruvi ───────────────────────────────────────────────────

// Atomic write — temp faylga yozib, rename qilamiz (partial-write/korrupsiya oldini olish)
function atomicWriteJson(file, obj) {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2));
  fs.renameSync(tmp, file);
}

function loadSentLinks() {
  try {
    if (fs.existsSync(SENT_FILE)) {
      const data = JSON.parse(fs.readFileSync(SENT_FILE, 'utf8'));
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const filtered = data.filter(e => e.ts > weekAgo);
      if (filtered.length !== data.length) {
        atomicWriteJson(SENT_FILE, filtered);
      }
      return new Set(filtered.map(e => e.link));
    }
  } catch (err) {
    console.error('[News] Sent file read error:', err.message);
  }
  return new Set();
}

function markAsSent(link) {
  try {
    let data = [];
    if (fs.existsSync(SENT_FILE)) data = JSON.parse(fs.readFileSync(SENT_FILE, 'utf8'));
    data.push({ link, ts: Date.now() });
    atomicWriteJson(SENT_FILE, data);
  } catch (err) {
    console.error('[News] Sent file write error:', err.message);
  }
}

// ─── Kalit so'z filtri ────────────────────────────────────────────────────

function isRelevantItem(item) {
  const text = `${item.title || ''} ${item.contentSnippet || ''}`.toLowerCase();
  return FOCUS_KEYWORDS.some(kw => text.includes(kw));
}

// ─── Yordamchi funksiyalar ────────────────────────────────────────────────

function extractImage(item) {
  const isHttps = (u) => typeof u === 'string' && u.startsWith('https://');
  if (isHttps(item.enclosure?.url)) return item.enclosure.url;
  const content = item.content || item.contentSnippet || '';
  const match = content.match(/<img[^>]+src="([^">]+)"/);
  if (isHttps(match?.[1])) return match[1];
  if (isHttps(item['media:content']?.$?.url)) return item['media:content'].$.url;
  return null;
}

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

// ─── News cache (30 daqiqa) ───────────────────────────────────────────────

let _newsCache = null;
let _newsCacheTime = 0;
const CACHE_TTL = 30 * 60 * 1000;

async function getNewsCache() {
  if (_newsCache && Date.now() - _newsCacheTime < CACHE_TTL) return _newsCache;
  _newsCache = await fetchLatestNews();
  _newsCacheTime = Date.now();
  return _newsCache;
}

function invalidateNewsCache() {
  _newsCache = null;
  _newsCacheTime = 0;
}

// ─── AI Post generatsiya ──────────────────────────────────────────────────

async function generateAIPost(item) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  try {
    const snippet = stripHtml(item.contentSnippet || '').substring(0, 500);
    const prompt =
      `Sen Aidevix platformasining professional AI tools ekspertisan.\n` +
      `Vazifang: Claude, Codex, Cursor, Antigravity, GitHub Copilot va professional AI tools yangiliklari haqida o'zbek tilida Telegram kanal uchun post yozish.\n\n` +
      `Yangilik:\nSarlavha: ${item.title}\nTafsilot: ${snippet}\nManba: ${item.source}\n\n` +
      `POST FORMATI (qat'iy):\n` +
      `1. Qiziqarli o'zbekcha sarlavha (emoji bilan)\n` +
      `2. Tahlil — bu yangilik nima beradi (3-4 jumla, aniq, professional)\n` +
      `3. Amaliy skill/tip — 1 ta konkret maslahat\n\n` +
      `Javobni FAQAT JSON formatda ber:\n` +
      `{"title":"...","content":"...","prompt_tip":"💡 ..."}`;

    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    }, {
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: 30000,
    });

    return JSON.parse(response.data.choices[0].message.content);
  } catch (error) {
    console.error('[News] AI generation error:', error.message);
    return null;
  }
}

// ─── RSS fetch ────────────────────────────────────────────────────────────

async function fetchLatestNews() {
  const results = await Promise.allSettled(
    RSS_FEEDS.map(async (feed) => {
      try {
        const parsed = await parser.parseURL(feed.url);
        return (parsed.items || []).map(i => ({
          title: i.title,
          content: i.content,
          contentSnippet: i.contentSnippet,
          link: i.link,
          image: extractImage(i),
          pubDate: new Date(i.pubDate || Date.now()),
          source: feed.name,
          category: feed.category,
        }));
      } catch {
        return [];
      }
    })
  );

  const allItems = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);

  const relevant = allItems.filter(isRelevantItem);
  const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const recent = relevant.filter(i => i.pubDate > twoDaysAgo);

  if (recent.length < 2) {
    return allItems.filter(i => i.pubDate > twoDaysAgo).sort((a, b) => b.pubDate - a.pubDate);
  }
  return recent.sort((a, b) => b.pubDate - a.pubDate);
}

// ─── Yangilik tanlash ─────────────────────────────────────────────────────

function pickBestItem(newsList, sentLinks) {
  const unsent = newsList.filter(item => !sentLinks.has(item.link));
  if (unsent.length === 0) return newsList[0] || null;

  const byCategory = {};
  for (const item of unsent) {
    if (!byCategory[item.category]) byCategory[item.category] = [];
    byCategory[item.category].push(item);
  }

  const categories = Object.keys(byCategory);
  if (categories.length === 0) return unsent[0];

  const tashkentHour = (new Date().getUTCHours() + 5) % 24;
  const selectedCategory = categories[tashkentHour % categories.length];
  return byCategory[selectedCategory][0];
}

// ─── Faol kanallar (topic + jadval sozlamalari bilan) ─────────────────────

async function getNewsChannels() {
  try {
    const BotChannel = require('../models/BotChannel');
    const dbChannels = await BotChannel.find({ isActive: true });
    const result = dbChannels.filter(c => c.wantsNews());

    // Asosiy kanal DB da yo'q bo'lsa ham fallback sifatida qo'shamiz
    const mainCh = process.env.TELEGRAM_CHANNEL_USERNAME;
    if (mainCh) {
      const mainId = mainCh.startsWith('@') ? mainCh : `@${mainCh}`;
      if (!result.find(c => c.chatId === mainId || c.chatId === mainCh)) {
        result.unshift({
          chatId: mainId,
          title: 'Asosiy kanal',
          scheduleHours: [10, 16, 20],
          wantsTopic: () => true,
        });
      }
    }
    return result;
  } catch {
    const ch = process.env.TELEGRAM_CHANNEL_USERNAME;
    return ch
      ? [{ chatId: ch.startsWith('@') ? ch : `@${ch}`, scheduleHours: [10, 16, 20], wantsTopic: () => true }]
      : [];
  }
}

// ─── Bitta kanalga post yuborish ──────────────────────────────────────────

async function sendNewsToChat(botToken, chatId, item, aiData) {
  const tgChannel     = process.env.TELEGRAM_CHANNEL_USERNAME || 'aidevix';
  const tgChannelLink = `https://t.me/${tgChannel.replace('@', '')}`;
  const igLink        = process.env.INSTAGRAM_URL || 'https://instagram.com/aidevix.uz';
  const siteLink      = process.env.SITE_URL || 'https://aidevix.uz';

  const message =
    `🚀 <b>${aiData.title}</b>\n\n` +
    `${aiData.content}\n\n` +
    `${aiData.prompt_tip}\n\n` +
    `🔗 <a href="${item.link}">To'liq o'qish</a> | 📡 ${item.source}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `<b>Aidevix</b> — AI & Dasturlash O'quv Platformasi 🇺🇿\n\n` +
    `📢 Kanal: <a href="${tgChannelLink}">@${tgChannel.replace('@', '')}</a>\n` +
    `📸 Instagram: <a href="${igLink}">@aidevix.uz</a>\n` +
    `🌐 Sayt: <a href="${siteLink}">aidevix.uz</a>\n\n` +
    `#Claude #Codex #Cursor #Copilot #AItools #vibecoding #yangiliklar`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '🔥', callback_data: 'news_react_fire' },
        { text: '🚀', callback_data: 'news_react_rocket' },
        { text: '💡', callback_data: 'news_react_bulb' },
      ],
      [
        { text: "📢 Kanalga obuna bo'l", url: tgChannelLink },
        { text: '📸 Instagram', url: igLink },
      ],
      [{ text: '🎓 Kurslar — aidevix.uz', url: siteLink }],
      [{ text: "↗️ Do'stlarga ulash", url: `https://t.me/share/url?url=${encodeURIComponent(item.link)}&text=${encodeURIComponent(aiData.title + ' | Aidevix')}` }],
    ],
  };

  if (item.image) {
    await axios.post(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
      chat_id: chatId, photo: item.image, caption: message,
      parse_mode: 'HTML', reply_markup: keyboard,
    });
  } else {
    await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      chat_id: chatId, text: message, parse_mode: 'HTML',
      disable_web_page_preview: false, reply_markup: keyboard,
    });
  }
}

// ─── Per-channel scheduler tick ───────────────────────────────────────────

// Har kanal uchun oxirgi post slot kuzatiladi (restart'dan keyin sıfırlanadi)
const lastPostedSlots = new Map(); // chatId → 'YYYY-MM-DD-HH'

async function runSchedulerTick() {
  if (!schedulerState.isNewsEnabled()) return;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return;

  const now = new Date();
  const tashkentHour = (now.getUTCHours() + 5) % 24;
  const todayStr     = now.toISOString().split('T')[0];

  const channels = await getNewsChannels();
  if (channels.length === 0) return;

  // Hozirgi soatda post kutayotgan kanallar
  const pending = channels.filter(ch => {
    const hours    = ch.scheduleHours?.length > 0 ? ch.scheduleHours : [10, 16, 20];
    const slotKey  = `${todayStr}-${tashkentHour}`;
    return hours.includes(tashkentHour) && lastPostedSlots.get(ch.chatId) !== slotKey;
  });

  if (pending.length === 0) return;

  let newsList;
  try {
    newsList = await getNewsCache();
  } catch (err) {
    console.error('[News] RSS fetch error:', err.message);
    return;
  }

  if (!newsList || newsList.length === 0) {
    console.log('[News] Yangilik topilmadi');
    return;
  }

  const sentLinks = loadSentLinks();

  for (const channel of pending) {
    const slotKey = `${todayStr}-${tashkentHour}`;
    lastPostedSlots.set(channel.chatId, slotKey); // oldin belgilab qo'yamiz (retry spam oldini olish)

    try {
      const filtered = newsList.filter(item => channel.wantsTopic(item.category));
      const pool     = filtered.length > 0 ? filtered : newsList;
      const item     = pickBestItem(pool, sentLinks);

      if (!item) {
        console.log(`[News] ${channel.chatId}: yuborish uchun yangilik yo'q`);
        continue;
      }

      const aiData = await generateAIPost(item);
      if (!aiData) continue;

      await sendNewsToChat(botToken, channel.chatId, item, aiData);
      markAsSent(item.link);
      sentLinks.add(item.link); // lokal set ham yangilash (bir tickda dublikat oldini olish)
      schedulerState.addLog('news', channel.chatId, item.title, true);

      const hours = channel.scheduleHours?.length > 0 ? channel.scheduleHours : [10, 16, 20];
      console.log(`[News] ✅ ${channel.title || channel.chatId} (${tashkentHour}:00, jadval: ${hours.join('/')}:00) → "${item.title.substring(0, 50)}..." [${item.category}]`);

      await new Promise(r => setTimeout(r, 1500));
    } catch (err) {
      schedulerState.addLog('news', channel.chatId, 'Xatolik: ' + (err.response?.data?.description || err.message), false);
      console.error(`[News] ❌ ${channel.chatId}:`, err.response?.data?.description || err.message);
    }
  }
}

// ─── Manual trigger (bot /postnews buyrug'i uchun) ────────────────────────

async function postNewsToChannel() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return false;

  const channels = await getNewsChannels();
  if (channels.length === 0) return false;

  try {
    invalidateNewsCache();
    const newsList = await getNewsCache();

    if (!newsList || newsList.length === 0) {
      console.log('[News] Yangilik topilmadi');
      return false;
    }

    const sentLinks = loadSentLinks();
    let totalSent = 0;

    for (const channel of channels) {
      try {
        const filtered = newsList.filter(item => channel.wantsTopic(item.category));
        const pool     = filtered.length > 0 ? filtered : newsList;
        const item     = pickBestItem(pool, sentLinks);

        if (!item) {
          console.log(`[News] ${channel.chatId}: yangilik yo'q`);
          continue;
        }

        const aiData = await generateAIPost(item);
        if (!aiData) continue;

        await sendNewsToChat(botToken, channel.chatId, item, aiData);
        markAsSent(item.link);
        sentLinks.add(item.link);
        totalSent++;
        schedulerState.addLog('news', channel.chatId, item.title, true);
        console.log(`[News] ✅ ${channel.title || channel.chatId} → "${item.title.substring(0, 50)}..." [${item.category}]`);

        await new Promise(r => setTimeout(r, 1500));
      } catch (err) {
        schedulerState.addLog('news', channel.chatId, 'Xatolik: ' + (err.response?.data?.description || err.message), false);
        console.error(`[News] ❌ ${channel.chatId}:`, err.response?.data?.description || err.message);
      }
    }

    console.log(`[News] Jami: ${totalSent}/${channels.length} kanalga yuborildi`);
    return totalSent > 0;
  } catch (error) {
    console.error('[News] Post error:', error.message);
    return false;
  }
}

// ─── Scheduler ───────────────────────────────────────────────────────────

let _tickRunning = false;
async function runSchedulerTickGuarded() {
  if (_tickRunning) return; // overlap oldini olish (sekin Groq javoblari tick'larni ustma-ust qo'ymasin)
  _tickRunning = true;
  try {
    await runSchedulerTick();
  } catch (err) {
    console.error('[News] tick error:', err.message);
  } finally {
    _tickRunning = false;
  }
}

function startNewsScheduler() {
  // State env dan boshlanib, runtime da /toggle bilan o'zgartiriladi
  if (!schedulerState.isNewsEnabled()) {
    console.log('[News] Scheduler o\'chirilgan (NEWS_ENABLED=false). /toggle news bilan yoqish mumkin.');
  }

  console.log('[News] Kunlik AI News ishga tushdi (har kanal o\'z jadvaliga ko\'ra, har 10 daqiqada tekshiriladi)');

  // Ishga tushganda 15 soniya kutib tekshiramiz
  setTimeout(runSchedulerTickGuarded, 15000);

  // Har 10 daqiqada tick
  setInterval(runSchedulerTickGuarded, 10 * 60 * 1000);
}

module.exports = { startNewsScheduler, postNewsToChannel };

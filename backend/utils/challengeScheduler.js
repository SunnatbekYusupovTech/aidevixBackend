/**
 * AIDEVIX DAILY CHALLENGE SCHEDULER
 *
 * Har kuni yarim tunda (00:00 Toshkent) avtomatik AI-challenge yaratadi
 * va Telegram kanalga e'lon yuboradi.
 *
 * Challenge turlari:
 * - watch_video   — Bugun N ta video ko'r
 * - complete_quiz — N ta quizni yakunla
 * - streak        — Streakni davom ettir
 * - use_ai_tool   — AI tool bilan loyiha qur (shaxsiy bajarish)
 * - share_prompt  — Prompt kutubxonasiga N ta prompt qo'sh
 */

const axios = require('axios');
const schedulerState = require('./schedulerState');

// Kunlik challenge variantlari (navbat bilan)
const CHALLENGE_POOL = [
  {
    title: '🎬 Video Marathon',
    description: 'Bugun 3 ta video dars ko\'ring va bilimingizni mustahkamlang!',
    type: 'watch_video',
    targetCount: 3,
    xpReward: 150,
  },
  {
    title: '🧠 Quiz Champion',
    description: 'Bugun 2 ta quizni muvaffaqiyatli yakunlang va prolingizni oshiring!',
    type: 'complete_quiz',
    targetCount: 2,
    xpReward: 120,
  },
  {
    title: '🔥 Streak Warrior',
    description: 'Bugun ham platformaga kiring va streak zanjirini uzmasligi kuzating!',
    type: 'streak',
    targetCount: 1,
    xpReward: 80,
  },
  {
    title: '⚡ Vibe Coder Challenge',
    description: 'Claude Code yoki Cursor yordamida bugun biror loyiha yoki komponent yozing! Prompt kutubxonasiga natijangizni qo\'shing.',
    type: 'share_prompt',
    targetCount: 1,
    xpReward: 200,
  },
  {
    title: '📚 AI Tools Explorer',
    description: 'Bugun 5 ta video ko\'ring. AI tools haqidagi bilimingizni kengaytiring!',
    type: 'watch_video',
    targetCount: 5,
    xpReward: 250,
  },
  {
    title: '💡 Prompt Master',
    description: 'Prompt kutubxonasiga 2 ta sifatli prompt yozing va hamjamiyatga ulashing!',
    type: 'share_prompt',
    targetCount: 2,
    xpReward: 180,
  },
  {
    title: '🚀 Knowledge Sprint',
    description: 'Bugun 3 ta quizni muvaffaqiyatli yakunlang!',
    type: 'complete_quiz',
    targetCount: 3,
    xpReward: 160,
  },
];

function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

function getTashkentHour() {
  return (new Date().getUTCHours() + 5) % 24;
}

async function createDailyChallenge() {
  try {
    const { DailyChallenge } = require('../models/DailyChallenge');
    const todayStr = getTodayStr();

    // Pool dan ketma-ket tanlash (hafta kuni bo'yicha)
    const dayOfWeek = new Date().getDay(); // 0=Sunday
    const challenge = CHALLENGE_POOL[dayOfWeek % CHALLENGE_POOL.length];

    // Atomic upsert — bir nechta instance ishga tushsa ham faqat bittasi insertni "yutadi".
    // `date` unique index borligi sababli MongoDB duplicate'ni o'zi cheklab beradi.
    let created;
    let isNew = false;
    try {
      created = await DailyChallenge.create({
        ...challenge,
        date: todayStr,
        isActive: true,
      });
      isNew = true;
    } catch (err) {
      // 11000 = duplicate key — boshqa instance allaqachon yaratgan, mavjudni qaytaramiz
      if (err && err.code === 11000) {
        created = await DailyChallenge.findOne({ date: todayStr });
        if (!created) throw err;
      } else {
        throw err;
      }
    }

    if (isNew) {
      console.log(`[ChallengeScheduler] Kunlik vazifa yaratildi: "${created.title}" (${todayStr})`);
      await sendChallengeToChannel(created);
    } else {
      console.log(`[ChallengeScheduler] Bugungi challenge allaqachon mavjud: "${created.title}" (${todayStr})`);
    }
    return created;
  } catch (err) {
    console.error('[ChallengeScheduler] Challenge yaratishda xato:', err.message);
    return null;
  }
}

async function getActiveChallengeChannels() {
  try {
    const BotChannel = require('../models/BotChannel');
    const dbChannels = await BotChannel.find({ isActive: true, sendChallenges: true });
    const channels = dbChannels.map(c => c.chatId);

    const mainChannel = process.env.TELEGRAM_CHANNEL_USERNAME;
    if (mainChannel) {
      const mainId = mainChannel.startsWith('@') ? mainChannel : `@${mainChannel}`;
      if (!channels.includes(mainId) && !channels.includes(mainChannel)) {
        channels.unshift(mainId);
      }
    }
    return channels;
  } catch {
    const ch = process.env.TELEGRAM_CHANNEL_USERNAME;
    return ch ? [ch.startsWith('@') ? ch : `@${ch}`] : [];
  }
}

async function sendChallengeToChannel(challenge) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return;

  const channels = await getActiveChallengeChannels();
  if (channels.length === 0) return;

  const categoryEmoji = {
    watch_video: '🎬',
    complete_quiz: '🧠',
    streak: '🔥',
    share_prompt: '💡',
    use_ai_tool: '⚡',
  };

  const emoji = categoryEmoji[challenge.type] || '🚀';

  const tgChannel     = process.env.TELEGRAM_CHANNEL_USERNAME || 'aidevix';
  const tgChannelLink = `https://t.me/${tgChannel.replace('@', '')}`;
  const igLink        = process.env.INSTAGRAM_URL || 'https://instagram.com/aidevix.uz';
  const siteLink      = process.env.SITE_URL || 'https://aidevix.uz';
  const dateStr       = new Date().toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long' });

  const message =
    `${emoji} <b>KUNLIK VAZIFA — ${dateStr}</b>\n\n` +
    `🏆 <b>${challenge.title}</b>\n\n` +
    `${challenge.description}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `⚡ Mukofot: <b>+${challenge.xpReward} XP</b>\n` +
    `🎯 Maqsad: <b>${challenge.targetCount} ta</b>\n\n` +
    `<b>Aidevix</b> — AI & Dasturlash O'quv Platformasi 🇺🇿\n\n` +
    `📢 Kanal: <a href="${tgChannelLink}">@${tgChannel.replace('@', '')}</a>\n` +
    `📸 Instagram: <a href="${igLink}">@aidevix.uz</a>\n` +
    `🌐 Sayt: <a href="${siteLink}">aidevix.uz</a>\n\n` +
    `#DailyChallenge #Aidevix #VibeCoding #AI`;

  const keyboard = {
    inline_keyboard: [
      [{ text: `${emoji} Vazifani boshlash`, url: `${siteLink}/challenges` }],
      [
        { text: '📢 Kanalga obuna bo\'l', url: tgChannelLink },
        { text: '📸 Instagram', url: igLink },
      ],
      [
        { text: '🔥', callback_data: 'news_react_fire' },
        { text: '💡', callback_data: 'news_react_bulb' },
        { text: '🚀', callback_data: 'news_react_rocket' },
      ],
    ],
  };

  let sentCount = 0;
  for (const chatId of channels) {
    try {
      await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: chatId, text: message, parse_mode: 'HTML', reply_markup: keyboard,
      });
      sentCount++;
      schedulerState.addLog('challenge', chatId, challenge.title, true);
    } catch (err) {
      schedulerState.addLog('challenge', chatId, 'Xatolik: ' + (err.response?.data?.description || err.message), false);
      console.error(`[ChallengeScheduler] Kanal xatosi (${chatId}):`, err.response?.data?.description || err.message);
    }
  }
  console.log(`[ChallengeScheduler] Challenge yuborildi → ${sentCount}/${channels.length} kanal: "${challenge.title}"`);
}

// Haftalik XP resetlash va top 3 ga badge berish (Yakshanba 00:00 Toshkent = Shanba 19:00 UTC)
async function weeklyReset() {
  try {
    const UserStats = require('../models/UserStats');
    const User      = require('../models/User');

    const top3 = await UserStats.find({ weeklyXp: { $gt: 0 } })
      .sort({ weeklyXp: -1 })
      .limit(3)
      .populate('userId', 'username telegramChatId telegramUserId')
      .lean();

    const prizes = [
      { xp: 500, badge: { name: 'Hafta Chempioni', icon: '🥇' } },
      { xp: 300, badge: { name: 'Kumush O\'rin',   icon: '🥈' } },
      { xp: 150, badge: { name: 'Bronza O\'rin',   icon: '🥉' } },
    ];

    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    for (let i = 0; i < top3.length; i++) {
      const prize = prizes[i];
      const s = top3[i];
      await UserStats.findByIdAndUpdate(s._id, {
        $inc: { xp: prize.xp },
        $push: { badges: { name: prize.badge.name, icon: prize.badge.icon, earnedAt: new Date() } },
        weeklyXp: 0,
      });

      const chatId = s.userId?.telegramChatId || s.userId?.telegramUserId;
      if (botToken && chatId) {
        const msg =
          `${prize.badge.icon} <b>Tabriklaymiz, ${s.userId?.username || 'Foydalanuvchi'}!</b>\n\n` +
          `Siz bu hafta ${s.weeklyXp} XP to'plash bilan <b>${i + 1}-o'rin</b>ni egalladin!\n` +
          `Mukofot: <b>+${prize.xp} XP</b> va <b>${prize.badge.name}</b> badge 🎉\n\n` +
          `Keyingi haftada ham faol bo'ling! 💪\n#Aidevix #HaftalikTurnir`;
        axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          chat_id: chatId, text: msg, parse_mode: 'HTML',
        }).catch(() => {});
      }
    }

    // Barchaning weeklyXp ni 0 ga tushirish
    await UserStats.updateMany({}, { weeklyXp: 0 });
    // Har hafta 1 ta streak freeze sovg'a (max 5 ta gacha)
    await UserStats.updateMany({ streakFreezes: { $lt: 5 } }, { $inc: { streakFreezes: 1 } });

    console.log(`[ChallengeScheduler] Haftalik reset bajarildi. Top ${top3.length} ta foydalanuvchi mukofotlandi.`);
  } catch (err) {
    console.error('[ChallengeScheduler] Haftalik reset xatosi:', err.message);
  }
}

// Streak reminder — Har kuni 23:00 Toshkent = 18:00 UTC
async function sendStreakReminders() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return;

  try {
    const UserStats = require('../models/UserStats');
    const User      = require('../models/User');

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Streak > 0, bugun faol bo'lmagan foydalanuvchilar
    const atRisk = await UserStats.find({
      streak: { $gt: 0 },
      $or: [
        { lastActivityDate: { $lt: startOfToday } },
        { lastActivityDate: null },
      ],
    }).lean();

    for (const stats of atRisk) {
      const user = await User.findById(stats.userId)
        .select('telegramChatId telegramUserId username')
        .lean();

      const chatId = user?.telegramChatId || user?.telegramUserId;
      if (!chatId) continue;

      const hasFreeze = (stats.streakFreezes || 0) > 0;
      const msg = hasFreeze
        ? `🛡️ <b>${user.username}</b>, bugun hali faol bo'lmadingiz!\n\n` +
          `Sizda <b>${stats.streakFreezes} ta Streak Shield</b> mavjud — agar bugun kirmasangiz, shield avtomatik ishlatiladi.\n` +
          `Streak: 🔥 <b>${stats.streak} kun</b>\n\n` +
          `<a href="https://aidevix.uz">aidevix.uz</a> ga kiring!`
        : `⚠️ <b>${user.username}</b>, streakingiz xavf ostida!\n\n` +
          `Bugun faol bo'lmasangiz, <b>${stats.streak} kunlik streak</b> yo'qoladi!\n\n` +
          `Hoziroq bir video ko'ring yoki quiz ishlang 👇\n` +
          `<a href="https://aidevix.uz">aidevix.uz</a>`;

      axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        chat_id: chatId,
        text: msg,
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [[{ text: '▶ Hoziroq o\'rganish', url: 'https://aidevix.uz/courses' }]],
        },
      }).catch(() => {});
    }

    if (atRisk.length > 0) {
      console.log(`[ChallengeScheduler] Streak reminder yuborildi: ${atRisk.length} ta foydalanuvchi`);
    }
  } catch (err) {
    console.error('[ChallengeScheduler] Streak reminder xatosi:', err.message);
  }
}

function startChallengeScheduler() {
  if (!schedulerState.isChallengeEnabled()) {
    console.log('[ChallengeScheduler] O\'chirilgan (CHALLENGE_SCHEDULER_ENABLED=false). /toggle challenge bilan yoqish mumkin.');
  }

  console.log('[ChallengeScheduler] Kunlik challenge scheduler ishga tushdi (00:05 Toshkent)');

  // Ishga tushganda darhol tekshirish (agar kechagi process restart bo'lgan bo'lsa)
  setTimeout(() => {
    if (schedulerState.isChallengeEnabled()) createDailyChallenge();
  }, 5000);

  // Har 10 daqiqada tekshirish
  let lastCreatedDate = '';
  let lastWeeklyReset = '';
  let lastReminderDate = '';

  setInterval(async () => {
    if (!schedulerState.isChallengeEnabled()) return;
    const hour = getTashkentHour();
    const todayStr = getTodayStr();
    const dayOfWeek = new Date().getDay(); // 0 = Yakshanba

    // Kunlik challenge — 00:00 Toshkent
    if (hour === 0 && lastCreatedDate !== todayStr) {
      lastCreatedDate = todayStr;
      await createDailyChallenge();
    }

    // Haftalik reset — Yakshanba 00:00 Toshkent
    if (hour === 0 && dayOfWeek === 0 && lastWeeklyReset !== todayStr) {
      lastWeeklyReset = todayStr;
      await weeklyReset();
    }

    // Streak reminder — 23:00 Toshkent
    if (hour === 23 && lastReminderDate !== todayStr) {
      lastReminderDate = todayStr;
      await sendStreakReminders();
    }
  }, 10 * 60 * 1000);
}

module.exports = { startChallengeScheduler, createDailyChallenge };

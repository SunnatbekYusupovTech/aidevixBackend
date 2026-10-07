/**
 * AIDEVIX WEEKLY DIGEST SCHEDULER
 *
 * Har yakshanba 09:00 (Toshkent) faol foydalanuvchilarga:
 *   - Email orqali haftalik xulosa (XP, streak, rank, next course)
 *   - Agar telegramUserId bor bo'lsa — bot orqali ham yuboradi
 *
 * Bekor qilish: DIGEST_ENABLED=false (env)
 */

const axios = require('axios');
const { runWithLock } = require('./schedulerLock');

const DIGEST_ENABLED = () => process.env.DIGEST_ENABLED !== 'false';

const getTashkentHour = () => (new Date().getUTCHours() + 5) % 24;
const getTodayStr = () => {
  const d = new Date();
  d.setUTCHours(d.getUTCHours() + 5);
  return d.toISOString().slice(0, 10);
};

// Pattern: Telegram API ga kechiktirilgan navbat bilan yuborish (rate limit himoyasi)
const TG_THROTTLE_MS = 50;

async function sendDigestToUser(user, stats, nextCourse) {
  const { sendWeeklyDigestEmail } = require('./emailService');

  // Email yuborish — har bir user uchun alohida try/catch, broadcast davom etadi
  if (user.email && !user.email.endsWith('@deleted.aidevix.local')) {
    try {
      await sendWeeklyDigestEmail(user.email, {
        username: user.username,
        weeklyXp: stats?.weeklyXp || 0,
        totalXp: stats?.xp || 0,
        streak: stats?.streak || 0,
        rank: stats?.rank || null,
        newBadges: (stats?.newBadges || []).slice(0, 5),
        nextCourse,
      });
    } catch (err) {
      console.error(`[Digest] email send failed for ${user.email}:`, err.message);
    }
  }

  // Telegram orqali ham yuborish — agar bog'langan bo'lsa
  const tgId =
    user.telegramUserId ||
    user.telegramChatId ||
    user.socialSubscriptions?.telegram?.telegramUserId;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (tgId && botToken && stats) {
    const msg =
      `📊 <b>Haftalik xulosa</b>\n` +
      `━━━━━━━━━━━━━━━\n` +
      `Salom, <b>${user.username}</b>!\n\n` +
      `🏆 Bu hafta: <b>+${(stats.weeklyXp || 0).toLocaleString()} XP</b>\n` +
      `⚡ Jami: ${(stats.xp || 0).toLocaleString()} XP\n` +
      `🔥 Streak: ${stats.streak || 0} kun\n` +
      (stats.rank ? `📍 Ranking: #${stats.rank}\n` : '') +
      (nextCourse
        ? `\n📚 Davom etish: <b>${nextCourse.title}</b>\n`
        : '\n💡 Bugun yangi kurs boshlasangiz, streak buzilmaydi!');

    const buttons = [];
    if (nextCourse) {
      buttons.push([{
        text: '▶ Davom etish',
        url: `${process.env.FRONTEND_URL || 'https://aidevix.uz'}/courses/${nextCourse._id}`,
      }]);
    }
    buttons.push([{ text: '👤 Profil', url: `${process.env.FRONTEND_URL || 'https://aidevix.uz'}/profile` }]);

    try {
      await axios.post(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          chat_id: tgId,
          text: msg,
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: buttons },
        },
        { timeout: 10000 }
      );
    } catch (err) {
      // Bloklangan, chat o'chirilgan va boshqa xatolarni jim qoldiramiz
      if (err.response?.status !== 403 && err.response?.status !== 400) {
        console.error(`[Digest] telegram send failed for ${user.username}:`, err.message);
      }
    }
  }

  // Web Push (FEAT-1) — obuna bo'lgan bo'lsa. Konfiguratsiya yo'q bo'lsa no-op.
  if (stats) {
    try {
      const { sendPushToUser } = require('./pushService');
      await sendPushToUser(user._id, {
        title: '📊 Haftalik xulosa tayyor',
        body: `Bu hafta +${(stats.weeklyXp || 0).toLocaleString()} XP. Streakni davom ettiring!`,
        url: '/profile',
        tag: 'weekly-digest',
      });
    } catch (_) { /* push xatolarini jim qoldiramiz */ }
  }
}

async function runWeeklyDigest() {
  const User = require('../models/User');
  const UserStats = require('../models/UserStats');
  const Enrollment = require('../models/Enrollment');
  const Course = require('../models/Course');

  console.log('[Digest] Haftalik digest broadcast boshlandi...');
  const startedAt = Date.now();

  let sent = 0;
  let skipped = 0;

  try {
    // Rank hisoblash uchun — faqat xp>0 userlar (0-XP userlar digestda baribir yo'q,
    // bu memory'ni katta userbase'da sezilarli kamaytiradi, rank to'g'ri qoladi).
    // Cursor bilan o'qiladi — faqat userId->rank Map xotirada qoladi.
    const rankMap = new Map();
    let rankPos = 0;
    for await (const s of UserStats.find({ xp: { $gt: 0 } }).select('userId').sort({ xp: -1 }).lean().cursor({ batchSize: 1000 })) {
      rankMap.set(String(s.userId), ++rankPos);
    }

    // Faqat faol foydalanuvchilar — bu hafta yoki o'tgan hafta XP olganlar.
    // P-B11: butun to'plam xotiraga yuklanmaydi (cursor), har partiya uchun bitta
    // User.find va bitta Enrollment.aggregate ($in) — per-user N+1 yo'q.
    const activeCursor = UserStats.find({
      $or: [{ weeklyXp: { $gt: 0 } }, { xp: { $gt: 0 } }],
    })
      .select('userId xp weeklyXp streak newBadges')
      .lean()
      .cursor({ batchSize: 500 });

    const BATCH = 100;
    const processSlice = async (slice) => {
      const userIds = slice.map((s) => s.userId);

      const [users, lastEnrollments] = await Promise.all([
        User.find({ _id: { $in: userIds }, isActive: true })
          .select('username email telegramUserId telegramChatId socialSubscriptions')
          .lean(),
        // Davom etayotgan eng oxirgi kurs — har user uchun bitta (batch)
        Enrollment.aggregate([
          { $match: { userId: { $in: userIds }, isCompleted: false } },
          { $sort: { updatedAt: -1 } },
          { $group: { _id: '$userId', courseId: { $first: '$courseId' } } },
        ]).catch(() => []),
      ]);

      const userMap = new Map(users.map((u) => [String(u._id), u]));
      const courseIds = lastEnrollments.map((e) => e.courseId).filter(Boolean);
      const courses = courseIds.length
        ? await Course.find({ _id: { $in: courseIds } }).select('title').lean().catch(() => [])
        : [];
      const courseMap = new Map(courses.map((c) => [String(c._id), c]));
      const nextCourseByUser = new Map();
      for (const e of lastEnrollments) {
        const c = courseMap.get(String(e.courseId));
        if (c) nextCourseByUser.set(String(e._id), { _id: c._id, title: c.title });
      }

      for (const stat of slice) {
        const user = userMap.get(String(stat.userId));
        if (!user) {
          skipped++;
          continue;
        }

        const nextCourse = nextCourseByUser.get(String(stat.userId)) || null;

        await sendDigestToUser(user, {
          xp: stat.xp,
          weeklyXp: stat.weeklyXp,
          streak: stat.streak,
          rank: rankMap.get(String(stat.userId)) || null,
        }, nextCourse);

        sent++;
        if (sent % 25 === 0) await new Promise((r) => setTimeout(r, TG_THROTTLE_MS * 25));
      }
    };

    let slice = [];
    let total = 0;
    for await (const stat of activeCursor) {
      total++;
      slice.push(stat);
      if (slice.length >= BATCH) {
        await processSlice(slice);
        slice = [];
      }
    }
    if (slice.length > 0) await processSlice(slice);

    if (total === 0) {
      console.log('[Digest] Faol user yo\'q — broadcast tugadi');
      return;
    }
  } catch (err) {
    console.error('[Digest] broadcast xato:', err.message);
  }

  const elapsedSec = Math.round((Date.now() - startedAt) / 1000);
  console.log(`[Digest] Tugadi: yuborildi=${sent}, o'tkazib yuborildi=${skipped}, ${elapsedSec}s`);
}

function startDigestScheduler() {
  if (!DIGEST_ENABLED()) {
    console.log('[Digest] O\'chirilgan (DIGEST_ENABLED=false). Yoqish: env');
    return;
  }

  console.log('[Digest] Weekly digest scheduler ishga tushdi (Yakshanba 09:00 Toshkent)');

  let lastDigestDate = '';

  // Har 15 daqiqada tekshirish — yakshanba 09:00 oynasini ushlash uchun
  const interval = setInterval(async () => {
    const hour = getTashkentHour();
    // Toshkent vaqti bo'yicha kun olish
    const tashkentDate = new Date();
    tashkentDate.setUTCHours(tashkentDate.getUTCHours() + 5);
    const dayInTashkent = tashkentDate.getUTCDay(); // 0 = Yakshanba (Toshkent)
    const todayStr = getTodayStr();

    if (dayInTashkent === 0 && hour === 9 && lastDigestDate !== todayStr) {
      lastDigestDate = todayStr;
      // P-B04: distributed lock — bir nechta instance bo'lsa digest bir marta yuboriladi
      runWithLock(`weeklyDigest:${todayStr}`, 36 * 60 * 60 * 1000, runWeeklyDigest)
        .catch((err) => console.error('[Digest] unhandled error:', err.message));
    }
  }, 15 * 60 * 1000);

  if (interval.unref) interval.unref();
}

module.exports = { startDigestScheduler, runWeeklyDigest };

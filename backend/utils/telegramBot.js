const axios = require('axios');
const schedulerState = require('./schedulerState');

/**
 * ═══════════════════════════════════════════════════════════════════
 * AIDEVIX TELEGRAM BOT — Senior Professional Implementation
 * ═══════════════════════════════════════════════════════════════════
 */

let botInstance = null;

class AidevixBot {
  constructor(token) {
    this.token = token;
    this.apiUrl = `https://api.telegram.org/bot${token}`;
    this.offset = 0;
    this.channelCache = []; // inline panel uchun kanal indekslari
  }

  /** Long Polling ishga tushirish */
  async startPolling() {
    try {
      // 409 Conflict xatosini oldini olish uchun webhookni o'chirib tashlaymiz
      await axios.get(`${this.apiUrl}/deleteWebhook`, { params: { drop_pending_updates: true } });
      console.log('✅ Webhook o\'chirildi, polling boshlanmoqda...');
    } catch (e) {
      console.warn('⚠️ Webhook o\'chirishda xatolik (lekin davom etamiz):', e.message);
    }

    // Telegramdagi "/" menyusiga buyruqlarni o'rnatish — UX uchun muhim
    this._registerBotCommands().catch(() => {});

    console.log('🤖 Aidevix Senior Bot ishga tushdi...');
    while (true) {
      try {
        const response = await axios.get(`${this.apiUrl}/getUpdates`, {
          params: { offset: this.offset, timeout: 30, allowed_updates: JSON.stringify(['message', 'callback_query', 'my_chat_member']) },
        });

        const updates = response.data.result;
        for (const update of updates) {
          this.offset = update.update_id + 1;
          await this._handleUpdate(update);
        }
      } catch (error) {
        console.error('Polling error:', error.message);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  async _handleUpdate(update) {
    if (update.message) {
      const { chat, from, text } = update.message;
      const chatId = chat.id;
      const userId = from.id;
      const firstName = from.first_name;
      const username = from.username;

      if (!text) return;

      if (text.startsWith('/start')) {
        const parts = text.split(' ');
        if (parts.length > 1) {
          return this._handleVerifyToken(chatId, userId, username, parts[1]);
        }
        return this._cmdStart(chatId, userId, firstName, username);
      }

      // Reply-keyboard tugmalari (matn orqali) — buyruq sifatida normallashtiramiz
      const aliased = this._aliasReplyButton(text);
      const effectiveText = aliased || text;

      const [cmd, ...args] = effectiveText.split(' ');
      switch (cmd) {
        case '/id': await this.sendMessage(chatId, `🆔 Sizning Telegram ID: <code>${userId}</code>`, { parse_mode: 'HTML' }); break;
        case '/login': await this._cmdLogin(chatId, userId, firstName); break;
        case '/stats': await this._cmdStats(chatId, userId, firstName); break;
        case '/referral': await this._cmdReferral(chatId, userId, firstName); break;
        case '/menu': await this._cmdMenu(chatId, userId, firstName); break;
        case '/courses': await this._cmdCourses(chatId, firstName); break;
        case '/news': await this._cmdNewsForUser(chatId); break;
        case '/leaderboard': await this._cmdLeaderboard(chatId); break;
        case '/postnews': await this._cmdPostNews(chatId, userId); break;
        case '/channels': await this._cmdChannels(chatId, userId); break;
        case '/settopic':    await this._cmdSetTopic(chatId, userId, args); break;
        case '/settype':     await this._cmdSetType(chatId, userId, args); break;
        case '/setschedule': await this._cmdSetSchedule(chatId, userId, args); break;
        case '/toggle':  await this._cmdToggle(chatId, userId, args); break;
        case '/status':  await this._cmdStatus(chatId, userId); break;
        case '/logs':    await this._cmdLogs(chatId, userId, args); break;
        case '/admin':   await this._cmdAdminPanel(chatId, userId); break;
        case '/help': await this._cmdHelp(chatId, userId, firstName); break;
      }
    }

    // Bot kanal/guruhga admin qilingan yoki o'chirilgan
    if (update.my_chat_member) {
      await this._handleMyChatMember(update.my_chat_member);
    }

    if (update.callback_query) {
      const { id, data, from, message } = update.callback_query;
      const chatId = message?.chat?.id;
      const userId = from.id;
      const firstName = from.first_name;

      // Admin inline panel callbacklari
      if (data && data.startsWith('adm_')) {
        await this._handleAdminCallback(id, data, chatId, userId, message);
        return;
      }

      switch (data) {
        case 'cb_magic_login': await this._cmdLogin(chatId, userId, firstName); break;
        case 'cb_get_stats': await this._cmdStats(chatId, userId, firstName); break;
        case 'cb_get_referral': await this._cmdReferral(chatId, userId, firstName); break;
        case 'cb_check_sub': return this._cmdCheckSub(chatId, userId, id);
        case 'cb_main_menu': await this._cmdMenu(chatId, userId, firstName); break;
        case 'cb_help': await this._cmdHelp(chatId, userId, firstName); break;
        case 'cb_courses': await this._cmdCourses(chatId, firstName); break;
        case 'cb_leaderboard': await this._cmdLeaderboard(chatId); break;
        case 'news_react_fire': await this.answerCallbackQuery(id, 'Olov bo\'ldi! 🔥'); break;
        case 'news_react_rocket': await this.answerCallbackQuery(id, 'Rahmat! 🚀'); break;
        case 'news_react_bulb': await this.answerCallbackQuery(id, 'Foydali bo\'ldi! 💡'); break;
      }
      await this.answerCallbackQuery(id, '');
    }
  }

  // ═══════════════════════════ CHANNEL AUTO-REGISTER ═══════════════════════════

  async _handleMyChatMember(update) {
    const { chat, new_chat_member } = update;
    const BotChannel = require('../models/BotChannel');
    const adminId = (process.env.TELEGRAM_ADMIN_CHAT_ID || '697727022').trim();

    const chatId   = String(chat.id);
    const username = chat.username ? `@${chat.username}` : null;
    const title    = chat.title || chat.username || 'Nomsiz';
    const type     = chat.type; // channel, supergroup, group

    const status = new_chat_member?.status;

    if (status === 'administrator') {
      // Bot admin qilindi → ro'yxatga qo'shish
      await BotChannel.findOneAndUpdate(
        { chatId },
        { chatId, username, title, type, isActive: true },
        { upsert: true, new: true }
      );
      console.log(`[Bot] Yangi kanal qo'shildi: ${title} (${chatId})`);

      // Adminga xabar
      await this.sendMessage(adminId,
        `✅ <b>Yangi kanal ro'yxatga qo'shildi!</b>\n\n` +
        `📢 <b>${title}</b>\n` +
        `🆔 ID: <code>${chatId}</code>\n` +
        `🔗 Username: ${username || 'Yo\'q (private)'}\n` +
        `📁 Turi: ${type}\n\n` +
        `Endi bu kanalga ham yangiliklar va challengelar yuboriladi.`,
        { parse_mode: 'HTML' }
      );
    } else if (['kicked', 'left', 'restricted'].includes(status)) {
      // Bot o'chirildi → deactivate
      await BotChannel.findOneAndUpdate({ chatId }, { isActive: false });
      console.log(`[Bot] Kanal o'chirildi: ${title} (${chatId})`);

      await this.sendMessage(adminId,
        `⚠️ <b>Kanal ro'yxatdan chiqdi</b>\n\n` +
        `📢 <b>${title}</b> (${chatId})\n` +
        `Sabab: Bot adminlikdan olib tashlandi.`,
        { parse_mode: 'HTML' }
      );
    }
  }

  // ═══════════════════════════ COMMANDS ═══════════════════════════

  async _cmdStart(chatId, userId, firstName) {
    const frontendUrl = this._getFrontendUrl();
    const { tgChannelLink, igLink } = this._getLinks();

    const msg =
      `👋 Salom, <b>${firstName}</b>!\n\n` +
      `<b>Aidevix Akademiyasi</b> — AI va dasturlash bo'yicha o'zbek tilidagi eng to'liq o'quv platforma 🇺🇿\n\n` +
      `🎯 <b>Nima qila olasiz:</b>\n` +
      `   📚 Kurslar va amaliy loyihalar\n` +
      `   🤖 AI Coach — har qanday savol\n` +
      `   🏆 XP, daraja va sertifikatlar\n` +
      `   🎁 Do'stlaringizni taklif qilib bonus oling\n\n` +
      `Pastdagi menyu doimiy turadi — tezkor harakat uchun ishlating 👇`;

    // Inline (qisqa) — birinchi tezkor harakatlar
    const inlineKeyboard = {
      inline_keyboard: [
        [{ text: '🚀 Akademiyaga kirish', web_app: { url: frontendUrl } }],
        [
          { text: '📊 Statistikam', callback_data: 'cb_get_stats' },
          { text: '🎁 Taklif et', callback_data: 'cb_get_referral' },
        ],
        [
          { text: '📢 Kanal', url: tgChannelLink },
          { text: '📸 Instagram', url: igLink },
        ],
      ],
    };

    await this.sendMessage(chatId, msg, {
      parse_mode: 'HTML',
      reply_markup: inlineKeyboard,
    });

    // Doimiy reply keyboard — har doim pastda turadi
    await this._showMainMenu(chatId, userId);
  }

  /** /menu — bosh menyuga qaytish */
  async _cmdMenu(chatId, userId, firstName) {
    await this.sendMessage(
      chatId,
      `🏠 <b>Bosh menyu</b>\n\nQuyidagi tugmalar orqali tezkor harakat qiling.`,
      { parse_mode: 'HTML' }
    );
    await this._showMainMenu(chatId, userId);
  }

  /** Doimiy reply keyboard'ni ko'rsatish */
  async _showMainMenu(chatId, userId) {
    const adminId = (process.env.TELEGRAM_ADMIN_CHAT_ID || '697727022').trim();
    const isAdmin = String(userId) === adminId;

    const rows = [
      [{ text: '👤 Profilim' }, { text: '🏆 Reyting' }],
      [{ text: '📚 Kurslar' }, { text: '🔥 Yangiliklar' }],
      [{ text: '🎁 Do\'st taklif et' }, { text: '🌐 Saytga kirish' }],
      [{ text: 'ℹ️ Yordam' }],
    ];
    if (isAdmin) rows.push([{ text: '🎛 Admin Panel' }]);

    await this.sendMessage(chatId, '⌨️ Menyu yangilandi', {
      reply_markup: {
        keyboard: rows,
        resize_keyboard: true,
        is_persistent: true,
      },
    });
  }

  /** Reply keyboard tugmasi matnini buyruqqa o'giradi */
  _aliasReplyButton(text) {
    if (!text) return null;
    const t = text.trim();
    const map = {
      '👤 Profilim': '/stats',
      '🏆 Reyting': '/leaderboard',
      '📚 Kurslar': '/courses',
      '🔥 Yangiliklar': '/news',
      "🎁 Do'st taklif et": '/referral',
      '🌐 Saytga kirish': '/login',
      'ℹ️ Yordam': '/help',
      '🎛 Admin Panel': '/admin',
      '🏠 Bosh menyu': '/menu',
    };
    return map[t] || null;
  }

  /** Telegramning "/" menyusiga buyruqlarni o'rnatadi */
  async _registerBotCommands() {
    const userCommands = [
      { command: 'start', description: '🚀 Botni ishga tushirish' },
      { command: 'menu', description: '🏠 Bosh menyu' },
      { command: 'stats', description: '📊 Statistikam' },
      { command: 'courses', description: '📚 Kurslar' },
      { command: 'leaderboard', description: '🏆 TOP foydalanuvchilar' },
      { command: 'news', description: '🔥 So\'nggi AI yangiliklari' },
      { command: 'referral', description: "🎁 Do'st taklif et" },
      { command: 'login', description: '🔐 Saytga kirish (parolsiz)' },
      { command: 'help', description: 'ℹ️ Yordam va buyruqlar' },
    ];
    const adminId = (process.env.TELEGRAM_ADMIN_CHAT_ID || '697727022').trim();

    try {
      // Hammaga ko'rinadigan buyruqlar
      await axios.post(`${this.apiUrl}/setMyCommands`, {
        commands: userCommands,
        scope: { type: 'default' },
      });

      // Adminga qo'shimcha buyruqlar
      if (adminId) {
        const adminCommands = [
          ...userCommands,
          { command: 'admin', description: '🎛 Admin Panel' },
          { command: 'status', description: '📡 Schedulerlar holati' },
          { command: 'channels', description: '📢 Bot kanallari' },
          { command: 'logs', description: '📋 So\'nggi habarlar' },
          { command: 'postnews', description: '🧠 Claude Tip yuborish' },
        ];
        await axios.post(`${this.apiUrl}/setMyCommands`, {
          commands: adminCommands,
          scope: { type: 'chat', chat_id: Number(adminId) },
        });
      }
    } catch (e) {
      console.warn('[Bot] setMyCommands xatoligi:', e.message);
    }
  }

  /**
   * /start <token> orqali foydalanuvchini Telegram ID bilan bog'laydi.
   * Bog'langandan keyin obuna haqiqatan tekshiriladi va aniq feedback beriladi.
   */
  async _handleVerifyToken(chatId, userId, username, token) {
    try {
      const { linkTelegramByToken } = require('../controllers/subscriptionController');
      const linked = await linkTelegramByToken(token, String(userId), username || null);

      if (!linked) {
        await this.sendMessage(
          chatId,
          `❌ <b>Bog'lash amalga oshmadi.</b>\n\nToken eskirgan yoki noto'g'ri.\nIltimos, saytdan qayta urinib ko'ring.`,
          { parse_mode: 'HTML' }
        );
        return;
      }

      // Profil bog'landi — endi haqiqiy obuna holatini Telegram API orqali tekshiramiz
      const { checkTelegramSubscription } = require('./socialVerification');
      const subResult = await checkTelegramSubscription(String(userId));

      if (subResult.subscribed) {
        await this._sendSubscribedMessage(chatId);
        return;
      }

      await this._sendNotSubscribedMessage(chatId, /* firstAttempt */ true);
    } catch (e) {
      await this.sendMessage(
        chatId,
        `❌ <b>Xatolik yuz berdi.</b>\n\nIltimos, birozdan keyin qayta urinib ko'ring.`,
        { parse_mode: 'HTML' }
      );
    }
  }

  /** "Obunani tekshirish" tugmasi bosilganda ishlaydi */
  async _cmdCheckSub(chatId, userId, queryId) {
    try {
      const { checkTelegramSubscription } = require('./socialVerification');
      const subResult = await checkTelegramSubscription(String(userId));

      if (subResult.subscribed) {
        // DB da subscribed=true qilish (frontend polling darhol tasdiqlay olsin)
        try {
          const User = require('../models/User');
          const { invalidate } = require('./subscriptionCache');
          const user = await User.findOne({
            $or: [
              { telegramUserId: String(userId) },
              { 'socialSubscriptions.telegram.telegramUserId': String(userId) },
            ],
          });
          if (user) {
            user.socialSubscriptions = user.socialSubscriptions || {};
            user.socialSubscriptions.telegram = user.socialSubscriptions.telegram || {};
            if (!user.socialSubscriptions.telegram.subscribed) {
              user.socialSubscriptions.telegram.subscribed = true;
              user.socialSubscriptions.telegram.verifiedAt = new Date();
              await user.save();
              invalidate(user._id);
              try { this.notifySubscriptionVerified(user, 'telegram'); } catch (_) {}
            }
          }
        } catch (_) {}

        await this._sendSubscribedMessage(chatId);
        return this.answerCallbackQuery(queryId, '✅ Obuna tasdiqlandi!');
      }

      await this._sendNotSubscribedMessage(chatId, /* firstAttempt */ false);
      return this.answerCallbackQuery(queryId, '❌ Hali obuna emassiz');
    } catch (e) {
      return this.answerCallbackQuery(queryId, '❌ Xatolik');
    }
  }

  async _sendSubscribedMessage(chatId) {
    await this.sendMessage(
      chatId,
      `✅ <b>Tabriklaymiz! Obuna tasdiqlandi.</b>\n\n` +
        `Profilingiz Aidevix bilan bog'landi va kanal obunasi tekshirildi.\n` +
        `Endi saytga qaytib, barcha imkoniyatlardan foydalanishingiz mumkin.`,
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🌐 Saytga qaytish', url: this._getFrontendUrl() }],
          ],
        },
      }
    );
  }

  async _sendNotSubscribedMessage(chatId, firstAttempt) {
    const { tgChannel, tgChannelLink } = this._getLinks();
    const headline = firstAttempt
      ? `📢 <b>So'nggi qadam: kanalga obuna bo'ling</b>`
      : `❌ <b>Hali kanalga obuna bo'lmagansiz</b>`;

    await this.sendMessage(
      chatId,
      `${headline}\n\n` +
        `Davom etish uchun <b>@${tgChannel}</b> kanaliga obuna bo'ling:\n\n` +
        `1️⃣ Pastdagi tugma orqali kanalga o'ting\n` +
        `2️⃣ Telegramda <b>"Obuna bo'lish"</b> tugmasini bosing\n` +
        `3️⃣ Botga qayting va <b>"Obunani tekshirish"</b> tugmasini bosing`,
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: `📢 @${tgChannel} kanaliga o'tish`, url: tgChannelLink }],
            [{ text: '✅ Obunani tekshirish', callback_data: 'cb_check_sub' }],
          ],
        },
      }
    );
  }

  async _cmdStats(chatId, userId) {
    try {
      const User = require('../models/User');
      const UserStats = require('../models/UserStats');
      const user = await User.findOne({
        $or: [
          { telegramUserId: String(userId) },
          { 'socialSubscriptions.telegram.telegramUserId': String(userId) },
        ],
      });

      if (!user) {
        return this.sendMessage(
          chatId,
          `⚠️ <b>Hisob topilmadi.</b>\n\nAvval <b>aidevix.uz</b> saytida ro'yxatdan o'ting va Telegramni bog'lang.`,
          {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [
                [{ text: '🌐 Ro\'yxatdan o\'tish', url: this._getFrontendUrl() + '/register' }],
                [{ text: '🏠 Bosh menyu', callback_data: 'cb_main_menu' }],
              ],
            },
          }
        );
      }

      const stats = await UserStats.findOne({ userId: user._id });
      const rankEmoji = {
        AMATEUR: '🥉', CANDIDATE: '🥈', JUNIOR: '🥇',
        MIDDLE: '⭐', SENIOR: '🌟', MASTER: '💎', LEGEND: '👑',
      };

      const xp = user.xp || 0;
      const level = stats?.level || 1;
      // Keyingi darajagacha real progress (har 1000 XP — yangi level)
      const xpPerLevel = 1000;
      const xpInLevel = xp % xpPerLevel;
      const filled = Math.min(10, Math.round((xpInLevel / xpPerLevel) * 10));
      const bar = '▰'.repeat(filled) + '▱'.repeat(10 - filled);
      const pct = Math.round((xpInLevel / xpPerLevel) * 100);

      const aiStack = (user.aiStack || []).slice(0, 4).join(' • ') || '—';
      const name = user.firstName || user.username || 'Foydalanuvchi';

      const msg =
        `📊 <b>${name}</b>\n` +
        `<i>Aidevix profili</i>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `${rankEmoji[user.rankTitle] || '🏅'} <b>Daraja:</b> ${user.rankTitle || 'AMATEUR'}\n` +
        `📈 <b>Level ${level}</b>  ${bar}  ${pct}%\n` +
        `⚡ <b>XP:</b> ${xp.toLocaleString()} / ${(level * xpPerLevel).toLocaleString()}\n` +
        `🔥 <b>Streak:</b> ${user.streak || 0} kun\n\n` +
        `📝 <b>Aktivlik</b>\n` +
        `   🎬 Darslar: <b>${stats?.videosWatched || 0}</b>\n` +
        `   🧪 Testlar: <b>${stats?.quizzesCompleted || 0}</b>\n` +
        `   🎓 Sertifikatlar: <b>${stats?.certificatesEarned || 0}</b>\n\n` +
        `🤖 <b>AI Stack:</b> ${aiStack}`;

      const keyboard = {
        inline_keyboard: [
          [{ text: '🌐 Profilni ochish', url: this._getFrontendUrl() + '/profile' }],
          [
            { text: '🏆 Reyting', callback_data: 'cb_leaderboard' },
            { text: '📚 Kurslar', callback_data: 'cb_courses' },
          ],
          [{ text: '🏠 Bosh menyu', callback_data: 'cb_main_menu' }],
        ],
      };

      await this.sendMessage(chatId, msg, { parse_mode: 'HTML', reply_markup: keyboard });
    } catch (e) {
      this.sendMessage(chatId, '❌ Statistikani olishda xatolik yuz berdi.');
    }
  }

  /** /courses — kurslar qisqa ko'rinishi */
  async _cmdCourses(chatId, firstName) {
    const url = this._getFrontendUrl();
    const msg =
      `📚 <b>Aidevix kurslari</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Saytdagi to'liq kurslar katalogini oching:\n` +
      `   • AI va Prompt Engineering\n` +
      `   • Claude Code, Cursor, Copilot\n` +
      `   • Vibe Coding va Architecture\n` +
      `   • Amaliy loyihalar bilan\n\n` +
      `Har bir kurs oxirida — sertifikat 🎓`;

    await this.sendMessage(chatId, msg, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🚀 Kurslarni ochish', web_app: { url: url + '/courses' } }],
          [{ text: '🌐 Brauzerda ochish', url: url + '/courses' }],
          [{ text: '🏠 Bosh menyu', callback_data: 'cb_main_menu' }],
        ],
      },
    });
  }

  /** /news — foydalanuvchi uchun yangiliklar */
  async _cmdNewsForUser(chatId) {
    const { tgChannel, tgChannelLink } = this._getLinks();
    const msg =
      `🔥 <b>So'nggi AI yangiliklari</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Har kuni 3 marta — Claude, Codex, Cursor, Copilot va Windsurf bo'yicha yangiliklar <b>@${tgChannel}</b> kanaliga jo'natiladi.\n\n` +
      `🕐 Jadval: 10:00, 16:00, 20:00 (Toshkent)\n` +
      `🤖 AI tahlil: o'zbek tilida + amaliy maslahat`;

    await this.sendMessage(chatId, msg, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: `📢 @${tgChannel} ga obuna`, url: tgChannelLink }],
          [{ text: '🏠 Bosh menyu', callback_data: 'cb_main_menu' }],
        ],
      },
    });
  }

  /** /leaderboard — TOP foydalanuvchilar */
  async _cmdLeaderboard(chatId) {
    try {
      const User = require('../models/User');
      const top = await User.find({ isBlocked: { $ne: true } })
        .sort({ xp: -1 })
        .limit(10)
        .select('firstName username xp rankTitle');

      const medals = ['🥇', '🥈', '🥉'];
      const lines = top.map((u, i) => {
        const place = medals[i] || `${i + 1}.`;
        const name = (u.firstName || u.username || 'Foydalanuvchi').substring(0, 22);
        const xp = (u.xp || 0).toLocaleString();
        return `${place} <b>${name}</b> — ${xp} XP`;
      });

      const msg =
        `🏆 <b>TOP-10 foydalanuvchilar</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        (lines.join('\n') || 'Hali statistika yo\'q.');

      await this.sendMessage(chatId, msg, {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🌐 To\'liq reyting', url: this._getFrontendUrl() + '/leaderboard' }],
            [{ text: '🏠 Bosh menyu', callback_data: 'cb_main_menu' }],
          ],
        },
      });
    } catch (e) {
      this.sendMessage(chatId, '❌ Reytingni olishda xatolik.');
    }
  }

  async _cmdReferral(chatId, userId) {
    try {
      const User = require('../models/User');
      const user = await User.findOne({
        $or: [
          { telegramUserId: String(userId) },
          { 'socialSubscriptions.telegram.telegramUserId': String(userId) },
        ],
      });
      if (!user) {
        return this.sendMessage(chatId, "⚠️ Avval aidevix.uz da ro'yxatdan o'ting.", {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🌐 Ro\'yxatdan o\'tish', url: this._getFrontendUrl() + '/register' }],
              [{ text: '🏠 Bosh menyu', callback_data: 'cb_main_menu' }],
            ],
          },
        });
      }

      const refCode = user.referralCode || user._id;
      const refLink = `${this._getFrontendUrl()}/register?ref=${refCode}`;
      const count = user.referralsCount || 0;
      const bonus = count * 500;

      // Foydalanuvchi pastdagi share tugmasini bossa, do'stiga yuboradigan matn
      const shareText =
        `🚀 Aidevix Akademiyasiga qo'shiling — AI va dasturlash bo'yicha eng yaxshi o'zbekcha platforma!\n\n` +
        `Mening havolam orqali ro'yxatdan o'tsangiz, ikkalamizga ham bonus XP beriladi 🎁\n\n${refLink}`;

      const msg =
        `🎁 <b>Do'st taklif et — XP yutib ol</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `🤝 <b>Taklif qilinganlar:</b> ${count} ta\n` +
        `⚡ <b>Yig'ilgan bonus:</b> ${bonus.toLocaleString()} XP\n\n` +
        `Har bir do'st uchun — <b>+500 XP</b> 🎯\n\n` +
        `🔗 <b>Sizning havolangiz:</b>\n<code>${refLink}</code>\n\n` +
        `Pastdagi tugma orqali do'stlaringizga bir bosishda yuboring 👇`;

      const keyboard = {
        inline_keyboard: [
          [{ text: "📤 Do'stga yuborish", switch_inline_query: shareText }],
          [{ text: '🌐 Referal sahifasi', url: this._getFrontendUrl() + '/referral' }],
          [{ text: '🏠 Bosh menyu', callback_data: 'cb_main_menu' }],
        ],
      };

      await this.sendMessage(chatId, msg, { parse_mode: 'HTML', reply_markup: keyboard });
    } catch (e) {}
  }

  /** /channels — Admin: barcha ro'yxatdagi kanallar */
  async _cmdChannels(chatId, userId) {
    const adminId = (process.env.TELEGRAM_ADMIN_CHAT_ID || '697727022').trim();
    if (String(userId) !== adminId) return;

    try {
      const BotChannel = require('../models/BotChannel');
      const channels = await BotChannel.find().sort({ addedAt: -1 });

      if (channels.length === 0) {
        return this.sendMessage(chatId, '📭 Hali hech qanday kanal ro\'yxatda yo\'q.', { parse_mode: 'HTML' });
      }

      const list = channels.map((c, i) => {
        const status    = c.isActive ? '✅' : '❌';
        const topics    = (c.topics || ['all']).join(', ');
        const postTypes = (c.postTypes || ['all']).join(', ');
        const hours     = (c.scheduleHours?.length > 0 ? c.scheduleHours : [10, 16, 20]).map(h => `${h}:00`).join(', ');
        return `${i + 1}. ${status} <b>${c.title}</b>\n` +
               `   ID: <code>${c.chatId}</code> | ${c.username || 'private'} | ${c.type}\n` +
               `   📰 Mavzu: <code>${topics}</code> | 🎯 Post: <code>${postTypes}</code>\n` +
               `   🕐 Jadval: <code>${hours}</code> (Toshkent)`;
      }).join('\n\n');

      const active = channels.filter(c => c.isActive).length;
      await this.sendMessage(chatId,
        `📡 <b>Bot Kanallari Ro'yxati</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `Jami: ${channels.length} | Faol: ${active}\n\n` +
        list,
        { parse_mode: 'HTML' }
      );
    } catch (e) {
      this.sendMessage(chatId, '❌ Xatolik: ' + e.message);
    }
  }

  /**
   * /settopic [chatId|@username] [topics]
   * Mavzularni o'rnatish: claude,codex,cursor,general,all
   * Misol: /settopic @mychannel claude,cursor
   */
  async _cmdSetTopic(chatId, userId, args) {
    const adminId = (process.env.TELEGRAM_ADMIN_CHAT_ID || '697727022').trim();
    if (String(userId) !== adminId) return;

    if (args.length < 2) {
      return this.sendMessage(chatId,
        `⚠️ <b>Foydalanish:</b>\n` +
        `<code>/settopic [chatId yoki @username] [mavzular]</code>\n\n` +
        `<b>Mavzular:</b> claude, codex, cursor, general, all\n\n` +
        `<b>Misol:</b>\n` +
        `<code>/settopic @mychannel claude,cursor</code>\n` +
        `<code>/settopic -1001234567 all</code>`,
        { parse_mode: 'HTML' }
      );
    }

    const [targetId, topicsStr] = args;
    const VALID_TOPICS = ['claude', 'codex', 'cursor', 'general', 'all'];
    const topics = topicsStr.split(',').map(t => t.trim().toLowerCase()).filter(t => VALID_TOPICS.includes(t));

    if (topics.length === 0) {
      return this.sendMessage(chatId,
        `❌ Noto'g'ri mavzular: <code>${topicsStr}</code>\n` +
        `Ruxsat etilgan: claude, codex, cursor, general, all`,
        { parse_mode: 'HTML' }
      );
    }

    try {
      const BotChannel = require('../models/BotChannel');
      const channel = await BotChannel.findOneAndUpdate(
        { $or: [{ chatId: targetId }, { username: targetId }, { username: targetId.startsWith('@') ? targetId : `@${targetId}` }] },
        { topics },
        { new: true }
      );

      if (!channel) {
        return this.sendMessage(chatId,
          `❌ Kanal topilmadi: <code>${targetId}</code>\n` +
          `Avval botni admin qiling va /channels buyrug'ini tekshiring.`,
          { parse_mode: 'HTML' }
        );
      }

      await this.sendMessage(chatId,
        `✅ <b>${channel.title}</b> mavzulari yangilandi!\n\n` +
        `📰 Yangi mavzular: <code>${topics.join(', ')}</code>\n` +
        `🆔 ID: <code>${channel.chatId}</code>`,
        { parse_mode: 'HTML' }
      );
    } catch (e) {
      this.sendMessage(chatId, '❌ Xatolik: ' + e.message);
    }
  }

  /**
   * /settype [chatId|@username] [types]
   * Post turlarini o'rnatish: news,challenges,all
   * Misol: /settype @mychannel news
   */
  async _cmdSetType(chatId, userId, args) {
    const adminId = (process.env.TELEGRAM_ADMIN_CHAT_ID || '697727022').trim();
    if (String(userId) !== adminId) return;

    if (args.length < 2) {
      return this.sendMessage(chatId,
        `⚠️ <b>Foydalanish:</b>\n` +
        `<code>/settype [chatId yoki @username] [turlar]</code>\n\n` +
        `<b>Turlar:</b> news, challenges, all\n\n` +
        `<b>Misol:</b>\n` +
        `<code>/settype @mychannel news</code>\n` +
        `<code>/settype -1001234567 news,challenges</code>`,
        { parse_mode: 'HTML' }
      );
    }

    const [targetId, typesStr] = args;
    const VALID_TYPES = ['news', 'challenges', 'all'];
    const postTypes = typesStr.split(',').map(t => t.trim().toLowerCase()).filter(t => VALID_TYPES.includes(t));

    if (postTypes.length === 0) {
      return this.sendMessage(chatId,
        `❌ Noto'g'ri turlar: <code>${typesStr}</code>\n` +
        `Ruxsat etilgan: news, challenges, all`,
        { parse_mode: 'HTML' }
      );
    }

    try {
      const BotChannel = require('../models/BotChannel');
      const channel = await BotChannel.findOneAndUpdate(
        { $or: [{ chatId: targetId }, { username: targetId }, { username: targetId.startsWith('@') ? targetId : `@${targetId}` }] },
        { postTypes },
        { new: true }
      );

      if (!channel) {
        return this.sendMessage(chatId,
          `❌ Kanal topilmadi: <code>${targetId}</code>\n` +
          `Avval botni admin qiling va /channels buyrug'ini tekshiring.`,
          { parse_mode: 'HTML' }
        );
      }

      await this.sendMessage(chatId,
        `✅ <b>${channel.title}</b> post turlari yangilandi!\n\n` +
        `🎯 Yangi turlar: <code>${postTypes.join(', ')}</code>\n` +
        `🆔 ID: <code>${channel.chatId}</code>`,
        { parse_mode: 'HTML' }
      );
    } catch (e) {
      this.sendMessage(chatId, '❌ Xatolik: ' + e.message);
    }
  }

  /**
   * /setschedule [chatId|@username] [soatlar]
   * News yuborish vaqtini (Toshkent) o'rnatish
   * Misol: /setschedule @mychannel 9,18      → kuniga 2 marta
   *        /setschedule @mychannel 10,16,20  → kuniga 3 marta (default)
   *        /setschedule @mychannel 12        → kuniga 1 marta
   */
  async _cmdSetSchedule(chatId, userId, args) {
    const adminId = (process.env.TELEGRAM_ADMIN_CHAT_ID || '697727022').trim();
    if (String(userId) !== adminId) return;

    if (args.length < 2) {
      return this.sendMessage(chatId,
        `⚠️ <b>Foydalanish:</b>\n` +
        `<code>/setschedule [chatId yoki @username] [soatlar]</code>\n\n` +
        `<b>Soatlar:</b> Toshkent vaqti (0-23), vergul bilan ajrating\n` +
        `<b>Limit:</b> 1 dan 6 tagacha soat\n\n` +
        `<b>Misollar:</b>\n` +
        `<code>/setschedule @mychannel 10,16,20</code>  → 3 marta/kun\n` +
        `<code>/setschedule @mychannel 9,18</code>       → 2 marta/kun\n` +
        `<code>/setschedule @mychannel 12</code>         → 1 marta/kun`,
        { parse_mode: 'HTML' }
      );
    }

    const [targetId, hoursStr] = args;
    const parsed = hoursStr.split(',').map(h => parseInt(h.trim(), 10));
    const scheduleHours = [...new Set(parsed)].filter(h => Number.isInteger(h) && h >= 0 && h <= 23).sort((a, b) => a - b);

    if (scheduleHours.length === 0) {
      return this.sendMessage(chatId,
        `❌ Noto'g'ri soatlar: <code>${hoursStr}</code>\n` +
        `Misol: <code>10,16,20</code>`,
        { parse_mode: 'HTML' }
      );
    }

    if (scheduleHours.length > 6) {
      return this.sendMessage(chatId, `❌ Maksimal 6 ta soat belgilash mumkin.`, { parse_mode: 'HTML' });
    }

    try {
      const BotChannel = require('../models/BotChannel');
      const channel = await BotChannel.findOneAndUpdate(
        {
          $or: [
            { chatId: targetId },
            { username: targetId },
            { username: targetId.startsWith('@') ? targetId : `@${targetId}` },
          ],
        },
        { scheduleHours },
        { new: true }
      );

      if (!channel) {
        return this.sendMessage(chatId,
          `❌ Kanal topilmadi: <code>${targetId}</code>\n` +
          `Avval botni admin qiling va /channels buyrug'ini tekshiring.`,
          { parse_mode: 'HTML' }
        );
      }

      const formatted = scheduleHours.map(h => `${h}:00`).join(', ');
      await this.sendMessage(chatId,
        `✅ <b>${channel.title}</b> jadvali yangilandi!\n\n` +
        `🕐 Yangi jadval: <code>${formatted}</code> (Toshkent)\n` +
        `📅 Kuniga: <b>${scheduleHours.length} ta</b> post\n` +
        `🆔 ID: <code>${channel.chatId}</code>`,
        { parse_mode: 'HTML' }
      );
    } catch (e) {
      this.sendMessage(chatId, '❌ Xatolik: ' + e.message);
    }
  }

  /**
   * /toggle [news|challenge|all] — Scheduler yoqish/o'chirish
   */
  async _cmdToggle(chatId, userId, args) {
    const adminId = (process.env.TELEGRAM_ADMIN_CHAT_ID || '697727022').trim();
    if (String(userId) !== adminId) return;

    const target = (args[0] || '').toLowerCase();
    if (!['news', 'challenge', 'all'].includes(target)) {
      return this.sendMessage(chatId,
        `⚠️ <b>Foydalanish:</b>\n` +
        `<code>/toggle news</code> — Yangiliklar on/off\n` +
        `<code>/toggle challenge</code> — Kunlik vazifalar on/off\n` +
        `<code>/toggle all</code> — Ikkalasi birga`,
        { parse_mode: 'HTML' }
      );
    }

    const state = schedulerState.getState();
    let lines = [];

    if (target === 'news' || target === 'all') {
      const next = !state.newsEnabled;
      schedulerState.setNewsEnabled(next);
      lines.push(`📰 <b>Yangiliklar (news):</b> ${next ? '✅ YOQILDI' : '❌ O\'CHIRILDI'}`);
    }
    if (target === 'challenge' || target === 'all') {
      const next = !state.challengeEnabled;
      schedulerState.setChallengeEnabled(next);
      lines.push(`🏆 <b>Kunlik vazifalar (challenge):</b> ${next ? '✅ YOQILDI' : '❌ O\'CHIRILDI'}`);
    }

    await this.sendMessage(chatId,
      `🔄 <b>Holat yangilandi</b>\n\n${lines.join('\n')}\n\n` +
      `ℹ️ Server qayta ishga tushsa env sozlamasiga qaytadi.`,
      { parse_mode: 'HTML' }
    );
  }

  /**
   * /status — Barcha scheduler holati
   */
  async _cmdStatus(chatId, userId) {
    const adminId = (process.env.TELEGRAM_ADMIN_CHAT_ID || '697727022').trim();
    if (String(userId) !== adminId) return;

    const state = schedulerState.getState();
    const newsIcon      = state.newsEnabled      ? '✅' : '❌';
    const challengeIcon = state.challengeEnabled ? '✅' : '❌';

    let channelInfo = '';
    try {
      const BotChannel = require('../models/BotChannel');
      const total  = await BotChannel.countDocuments();
      const active = await BotChannel.countDocuments({ isActive: true });
      channelInfo = `📡 Kanallar: <b>${active} faol</b> / ${total} jami\n`;
    } catch {}

    const logs = schedulerState.getLogs(5);
    let logSection = '';
    if (logs.length > 0) {
      logSection = `\n\n📋 <b>So'nggi habarlar:</b>\n` +
        logs.map(l => {
          const icon = l.success ? '✅' : '❌';
          const time = l.ts.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
          const typeLabel = l.type === 'news' ? '📰' : '🏆';
          return `${icon} ${typeLabel} ${time} — ${l.title.substring(0, 40)}`;
        }).join('\n');
    }

    await this.sendMessage(chatId,
      `📊 <b>Aidevix Bot Status</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `${newsIcon} <b>News scheduler:</b> ${state.newsEnabled ? 'YOQIQ' : 'O\'CHIQ'}\n` +
      `${challengeIcon} <b>Challenge scheduler:</b> ${state.challengeEnabled ? 'YOQIQ' : 'O\'CHIQ'}\n\n` +
      channelInfo +
      `\n💡 Yoqish/o'chirish: /toggle [news|challenge|all]` +
      logSection,
      { parse_mode: 'HTML' }
    );
  }

  /**
   * /logs [n] — So'nggi yuborilgan habarlar
   * Misol: /logs 10
   */
  async _cmdLogs(chatId, userId, args) {
    const adminId = (process.env.TELEGRAM_ADMIN_CHAT_ID || '697727022').trim();
    if (String(userId) !== adminId) return;

    const limit = Math.min(parseInt(args[0]) || 15, 50);
    const logs  = schedulerState.getLogs(limit);

    if (logs.length === 0) {
      return this.sendMessage(chatId, '📭 Hali hech qanday habar yuborilmagan (server qayta ishga tushdi).', { parse_mode: 'HTML' });
    }

    const lines = logs.map((l, i) => {
      const icon      = l.success ? '✅' : '❌';
      const typeLabel = l.type === 'news' ? '📰 News' : '🏆 Challenge';
      const time      = l.ts.toLocaleString('uz-UZ', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      return `${i + 1}. ${icon} ${typeLabel}\n   📅 ${time}\n   📢 ${l.channelId}\n   📝 ${l.title}`;
    });

    await this.sendMessage(chatId,
      `📋 <b>Habarlar logi (so'nggi ${logs.length} ta)</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      lines.join('\n\n'),
      { parse_mode: 'HTML' }
    );
  }

  // ═══════════════════════════ ADMIN PANEL ═══════════════════════════

  /** /admin — Inline admin panel */
  async _cmdAdminPanel(chatId, userId) {
    const adminId = (process.env.TELEGRAM_ADMIN_CHAT_ID || '697727022').trim();
    if (String(userId) !== adminId) return;
    const { text, keyboard } = await this._buildAdminHome();
    await this.sendMessage(chatId, text, { parse_mode: 'HTML', reply_markup: keyboard });
  }

  /** Admin home panel matn + klaviatura */
  async _buildAdminHome() {
    const state = schedulerState.getState();
    const newsOn      = state.newsEnabled;
    const challengeOn = state.challengeEnabled;

    let channelInfo = '—';
    try {
      const BotChannel = require('../models/BotChannel');
      const total  = await BotChannel.countDocuments();
      const active = await BotChannel.countDocuments({ isActive: true });
      channelInfo = `${active} faol / ${total} jami`;
    } catch {}

    const logs = schedulerState.getLogs(3);
    const logsPreview = logs.length > 0
      ? logs.map(l => `${l.success ? '✅' : '❌'} ${l.type === 'news' ? '📰' : '🏆'} ${l.title.substring(0, 38)}`).join('\n')
      : 'Hali habar yuborilmagan';

    const text =
      `🎛 <b>Aidevix Admin Panel</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `📰 News: <b>${newsOn ? '✅ YOQIQ' : '❌ O\'CHIQ'}</b>\n` +
      `🏆 Challenge: <b>${challengeOn ? '✅ YOQIQ' : '❌ O\'CHIQ'}</b>\n` +
      `📡 Kanallar: <b>${channelInfo}</b>\n\n` +
      `📋 <b>So'nggi habarlar:</b>\n${logsPreview}`;

    const keyboard = {
      inline_keyboard: [
        [
          { text: `📰 News: ${newsOn ? 'O\'CHIR ❌' : 'YOQ ✅'}`, callback_data: 'adm_toggle_news' },
          { text: `🏆 Challenge: ${challengeOn ? 'O\'CHIR ❌' : 'YOQ ✅'}`, callback_data: 'adm_toggle_challenge' },
        ],
        [
          { text: '🧠 Claude Tip yuborish', callback_data: 'adm_postnews' },
          { text: '📋 Loglar', callback_data: 'adm_logs' },
        ],
        [
          { text: '📡 Kanallar', callback_data: 'adm_channels' },
          { text: '🔄 Yangilashtirish', callback_data: 'adm_home' },
        ],
        [{ text: '🏠 Bosh menyu', callback_data: 'cb_main_menu' }],
      ],
    };
    return { text, keyboard };
  }

  /** Barcha adm_* callbacklarni boshqarish */
  async _handleAdminCallback(queryId, data, chatId, userId, message) {
    const adminId = (process.env.TELEGRAM_ADMIN_CHAT_ID || '697727022').trim();
    if (String(userId) !== adminId) {
      return this.answerCallbackQuery(queryId, '⛔ Kirish taqiqlangan');
    }

    const msgId = message?.message_id;

    // ── NOOP (ajratuvchi tugmalar) ──
    if (data === 'adm_noop') {
      return this.answerCallbackQuery(queryId, '');
    }

    // ── HOME ──
    if (data === 'adm_home') {
      const { text, keyboard } = await this._buildAdminHome();
      await this.editMessage(chatId, msgId, text, { parse_mode: 'HTML', reply_markup: keyboard });
      return this.answerCallbackQuery(queryId, '');
    }

    // ── TOGGLE NEWS ──
    if (data === 'adm_toggle_news') {
      const was = schedulerState.getState().newsEnabled;
      schedulerState.setNewsEnabled(!was);
      const { text, keyboard } = await this._buildAdminHome();
      await this.editMessage(chatId, msgId, text, { parse_mode: 'HTML', reply_markup: keyboard });
      return this.answerCallbackQuery(queryId, !was ? '📰 News yoqildi ✅' : '📰 News o\'chirildi ❌');
    }

    // ── TOGGLE CHALLENGE ──
    if (data === 'adm_toggle_challenge') {
      const was = schedulerState.getState().challengeEnabled;
      schedulerState.setChallengeEnabled(!was);
      const { text, keyboard } = await this._buildAdminHome();
      await this.editMessage(chatId, msgId, text, { parse_mode: 'HTML', reply_markup: keyboard });
      return this.answerCallbackQuery(queryId, !was ? '🏆 Challenge yoqildi ✅' : '🏆 Challenge o\'chirildi ❌');
    }

    // ── POST CLAUDE TIP NOW ──
    if (data === 'adm_postnews') {
      await this.answerCallbackQuery(queryId, '⏳ Yuborilmoqda...');
      try {
        const { postTipToChannel } = require('./claudeTipsScheduler');
        const ok = await postTipToChannel();
        const { text, keyboard } = await this._buildAdminHome();
        await this.editMessage(chatId, msgId, text, { parse_mode: 'HTML', reply_markup: keyboard });
        await this.sendMessage(chatId, ok ? '✅ Claude Tip muvaffaqiyatli yuborildi!' : '⚠️ Yuborish uchun mavzu topilmadi.');
      } catch (e) {
        await this.sendMessage(chatId, '❌ Xatolik: ' + e.message);
      }
      return;
    }

    // ── LOGS ──
    if (data === 'adm_logs') {
      const logs = schedulerState.getLogs(20);
      const backKeyboard = { inline_keyboard: [[{ text: '◀️ Bosh panel', callback_data: 'adm_home' }]] };
      if (logs.length === 0) {
        await this.editMessage(chatId, msgId,
          '📭 <b>Hali hech qanday habar yuborilmagan.</b>\n\nServer qayta ishga tushsa log tozalanadi.',
          { parse_mode: 'HTML', reply_markup: backKeyboard }
        );
        return this.answerCallbackQuery(queryId, '');
      }
      const lines = logs.map((l, i) => {
        const icon      = l.success ? '✅' : '❌';
        const typeLabel = l.type === 'news' ? '📰' : '🏆';
        const time      = l.ts.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' });
        return `${icon} ${typeLabel} <b>${time}</b> — ${l.title.substring(0, 45)}`;
      });
      await this.editMessage(chatId, msgId,
        `📋 <b>Habarlar tarixi (${logs.length} ta)</b>\n━━━━━━━━━━━━━━━━━━━━━━\n\n` + lines.join('\n'),
        { parse_mode: 'HTML', reply_markup: backKeyboard }
      );
      return this.answerCallbackQuery(queryId, '');
    }

    // ── CHANNEL LIST ──
    if (data === 'adm_channels') {
      await this._adminShowChannels(chatId, msgId, queryId);
      return;
    }

    // ── CHANNEL DETAIL ──
    if (data.startsWith('adm_ch_')) {
      const idx = parseInt(data.replace('adm_ch_', ''), 10);
      await this._adminShowChannelDetail(chatId, msgId, queryId, idx);
      return;
    }

    // ── SET POST TYPE ──
    // format: adm_type_{type}_{idx}
    if (data.startsWith('adm_type_')) {
      const parts = data.split('_'); // ['adm','type',type,idx]
      const type  = parts[2];
      const idx   = parseInt(parts[3], 10);
      await this._adminSetChannelType(chatId, msgId, queryId, idx, type);
      return;
    }

    // ── SET SCHEDULE PRESET ──
    // format: adm_sched_{1|2|3}_{idx}
    if (data.startsWith('adm_sched_')) {
      const parts  = data.split('_'); // ['adm','sched',preset,idx]
      const preset = parseInt(parts[2], 10);
      const idx    = parseInt(parts[3], 10);
      await this._adminSetSchedule(chatId, msgId, queryId, idx, preset);
      return;
    }

    // ── TOGGLE CHANNEL ACTIVE ──
    // format: adm_active_{idx}
    if (data.startsWith('adm_active_')) {
      const idx = parseInt(data.replace('adm_active_', ''), 10);
      await this._adminToggleActive(chatId, msgId, queryId, idx);
      return;
    }

    this.answerCallbackQuery(queryId, '');
  }

  /** Kanallar ro'yxati paneli */
  async _adminShowChannels(chatId, msgId, queryId) {
    try {
      const BotChannel = require('../models/BotChannel');
      const channels = await BotChannel.find().sort({ addedAt: -1 }).limit(20);
      this.channelCache = channels;

      const backRow = [{ text: '◀️ Bosh panel', callback_data: 'adm_home' }];

      if (channels.length === 0) {
        await this.editMessage(chatId, msgId,
          '📭 <b>Hali hech qanday kanal yo\'q.</b>\n\nBotni kanalga admin qiling — avtomatik ro\'yxatga qo\'shiladi.',
          { parse_mode: 'HTML', reply_markup: { inline_keyboard: [backRow] } }
        );
        return this.answerCallbackQuery(queryId, '');
      }

      const lines = channels.map((c, i) => {
        const status = c.isActive ? '✅' : '❌';
        const types  = (c.postTypes || ['all']).join(',');
        const hours  = (c.scheduleHours?.length ? c.scheduleHours : [10, 16, 20]).map(h => `${h}:00`).join(',');
        return `${i + 1}. ${status} <b>${c.title}</b>\n   ${c.username || c.chatId} | ${types} | ${hours}`;
      });

      const chButtons = channels.map((c, i) => [{ text: `⚙️ ${c.title}`, callback_data: `adm_ch_${i}` }]);

      await this.editMessage(chatId, msgId,
        `📡 <b>Kanallar ro'yxati</b> (${channels.length} ta)\n━━━━━━━━━━━━━━━━━━━━━━\n\n` + lines.join('\n\n'),
        { parse_mode: 'HTML', reply_markup: { inline_keyboard: [...chButtons, backRow] } }
      );
      return this.answerCallbackQuery(queryId, '');
    } catch (e) {
      return this.answerCallbackQuery(queryId, '❌ ' + e.message);
    }
  }

  /** Bitta kanal sozlamalari paneli */
  async _adminShowChannelDetail(chatId, msgId, queryId, idx) {
    const ch = this.channelCache?.[idx];
    if (!ch) {
      return this.answerCallbackQuery(queryId, '❌ Kanal topilmadi. Kanallar ro\'yxatini qayta oching.');
    }

    const status  = ch.isActive ? '✅ Faol' : '❌ Nofaol';
    const types   = (ch.postTypes || ['all']).join(', ');
    const topics  = (ch.topics   || ['all']).join(', ');
    const hours   = (ch.scheduleHours?.length ? ch.scheduleHours : [10, 16, 20]).map(h => `${h}:00`).join(', ');

    const isAll       = ch.postTypes?.includes('all')        || ch.postTypes?.length === 0;
    const isNewsOnly  = !isAll && ch.postTypes?.includes('news') && !ch.postTypes?.includes('challenges');
    const isChalOnly  = !isAll && ch.postTypes?.includes('challenges') && !ch.postTypes?.includes('news');

    const text =
      `⚙️ <b>${ch.title}</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
      `🆔 ID: <code>${ch.chatId}</code>\n` +
      `📊 Holat: ${status}\n` +
      `🎯 Post turi: <code>${types}</code>\n` +
      `📰 Mavzu: <code>${topics}</code>\n` +
      `🕐 Jadval: <code>${hours}</code>\n\n` +
      `Quyidagi tugmalar orqali tez sozlang:`;

    const keyboard = {
      inline_keyboard: [
        // Post turi
        [{ text: '── Post turi ──────────', callback_data: 'adm_noop' }],
        [
          { text: `${isAll ? '✅ ' : ''}📰🏆 Hammasi`, callback_data: `adm_type_all_${idx}` },
          { text: `${isNewsOnly ? '✅ ' : ''}📰 Faqat news`, callback_data: `adm_type_news_${idx}` },
          { text: `${isChalOnly ? '✅ ' : ''}🏆 Faqat vazifa`, callback_data: `adm_type_challenges_${idx}` },
        ],
        // Jadval presetlari
        [{ text: '── Jadval ─────────────', callback_data: 'adm_noop' }],
        [
          { text: '🕐 1x (12:00)', callback_data: `adm_sched_1_${idx}` },
          { text: '🕑 2x (9,18)', callback_data: `adm_sched_2_${idx}` },
          { text: '🕒 3x (10,16,20)', callback_data: `adm_sched_3_${idx}` },
        ],
        // Faollashtirish
        [
          ch.isActive
            ? { text: '❌ Kanalga yuborishni to\'xtat', callback_data: `adm_active_${idx}` }
            : { text: '✅ Kanalga yuborishni yoq', callback_data: `adm_active_${idx}` },
        ],
        [{ text: '◀️ Kanallar', callback_data: 'adm_channels' }],
      ],
    };

    await this.editMessage(chatId, msgId, text, { parse_mode: 'HTML', reply_markup: keyboard });
    if (queryId) this.answerCallbackQuery(queryId, '');
  }

  async _adminSetChannelType(chatId, msgId, queryId, idx, type) {
    const ch = this.channelCache?.[idx];
    if (!ch) return this.answerCallbackQuery(queryId, '❌ Kanal topilmadi');
    try {
      const BotChannel = require('../models/BotChannel');
      const postTypes = type === 'all' ? ['all'] : type === 'news' ? ['news'] : ['challenges'];
      const updated = await BotChannel.findOneAndUpdate({ chatId: ch.chatId }, { postTypes }, { new: true });
      if (updated) {
        this.channelCache[idx] = updated;
        await this._adminShowChannelDetail(chatId, msgId, null, idx);
        return this.answerCallbackQuery(queryId, `✅ Post turi: ${postTypes.join(',')}`);
      }
    } catch (e) { return this.answerCallbackQuery(queryId, '❌ ' + e.message); }
  }

  async _adminSetSchedule(chatId, msgId, queryId, idx, preset) {
    const ch = this.channelCache?.[idx];
    if (!ch) return this.answerCallbackQuery(queryId, '❌ Kanal topilmadi');
    const PRESETS = { 1: [12], 2: [9, 18], 3: [10, 16, 20] };
    const scheduleHours = PRESETS[preset] || [10, 16, 20];
    try {
      const BotChannel = require('../models/BotChannel');
      const updated = await BotChannel.findOneAndUpdate({ chatId: ch.chatId }, { scheduleHours }, { new: true });
      if (updated) {
        this.channelCache[idx] = updated;
        await this._adminShowChannelDetail(chatId, msgId, null, idx);
        return this.answerCallbackQuery(queryId, `✅ Jadval: ${scheduleHours.map(h => h + ':00').join(', ')}`);
      }
    } catch (e) { return this.answerCallbackQuery(queryId, '❌ ' + e.message); }
  }

  async _adminToggleActive(chatId, msgId, queryId, idx) {
    const ch = this.channelCache?.[idx];
    if (!ch) return this.answerCallbackQuery(queryId, '❌ Kanal topilmadi');
    try {
      const BotChannel = require('../models/BotChannel');
      const updated = await BotChannel.findOneAndUpdate({ chatId: ch.chatId }, { isActive: !ch.isActive }, { new: true });
      if (updated) {
        this.channelCache[idx] = updated;
        await this._adminShowChannelDetail(chatId, msgId, null, idx);
        return this.answerCallbackQuery(queryId, updated.isActive ? '✅ Yoqildi' : '❌ O\'chirildi');
      }
    } catch (e) { return this.answerCallbackQuery(queryId, '❌ ' + e.message); }
  }

  /** /help — Kategoriya bo'yicha tartiblangan yordam */
  async _cmdHelp(chatId, userId) {
    const adminId = (process.env.TELEGRAM_ADMIN_CHAT_ID || '697727022').trim();
    const isAdmin = String(userId) === adminId;

    let msg =
      `ℹ️ <b>Aidevix Bot — Yordam</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `🚀 <b>Boshlash</b>\n` +
      `   /start — botni qayta ishga tushirish\n` +
      `   /menu — bosh menyu\n` +
      `   /login — saytga parolsiz kirish\n\n` +
      `📊 <b>Profil va o'sish</b>\n` +
      `   /stats — shaxsiy statistika\n` +
      `   /leaderboard — TOP-10 reyting\n` +
      `   /referral — do'st taklif et (+500 XP)\n\n` +
      `📚 <b>Ta'lim</b>\n` +
      `   /courses — kurslar katalogi\n` +
      `   /news — AI yangiliklari haqida\n\n` +
      `🛠 <b>Boshqa</b>\n` +
      `   /id — Telegram ID ko'rish\n` +
      `   /help — ushbu yordam\n\n` +
      `💡 <i>Maslahat:</i> pastdagi doimiy menyu orqali ham harakat qiling — bir bosishda barcha bo'limlar.`;

    if (isAdmin) {
      msg +=
        `\n\n━━━━━━━━━━━━━━━━━━━━\n` +
        `👑 <b>Admin uchun</b>\n\n` +
        `🎛 <b>Boshqaruv paneli</b>\n` +
        `   /admin — inline admin panel (tavsiya)\n` +
        `   /status — schedulerlar holati\n` +
        `   /logs [n] — so'nggi habarlar\n\n` +
        `📡 <b>Kanallar</b>\n` +
        `   /channels — barcha kanallar\n` +
        `   /settype @kanal news|challenges|all\n` +
        `   /settopic @kanal claude,cursor,...\n` +
        `   /setschedule @kanal 10,16,20\n\n` +
        `🧠 <b>Habar yuborish</b>\n` +
        `   /postnews — qo'lda Claude tip yuborish\n` +
        `   /toggle news|challenge|all`;
    }

    await this.sendMessage(chatId, msg, {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          isAdmin
            ? [{ text: '🎛 Admin Panel', callback_data: 'adm_home' }]
            : [{ text: '🚀 Akademiyaga kirish', web_app: { url: this._getFrontendUrl() } }],
          [{ text: '🏠 Bosh menyu', callback_data: 'cb_main_menu' }],
        ],
      },
    });
  }

  async _cmdLogin(chatId, userId) {
    try {
      const User = require('../models/User');
      const user = await User.findOne({
        $or: [
          { telegramUserId: String(userId) },
          { 'socialSubscriptions.telegram.telegramUserId': String(userId) },
        ],
      });
      if (!user) return this.sendMessage(chatId, "⚠️ Hisob topilmadi.");

      const jwt = require('jsonwebtoken');
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '15m' });
      const loginLink = `${this._getFrontendUrl()}/auth/telegram-login#token=${token}`;

      const keyboard = { inline_keyboard: [[{ text: '🔓 Saytga kirish', url: loginLink }]] };
      await this.sendMessage(chatId, `🔐 <b>Magic Login</b>\n\nTugmani bosing va tizimga parolsiz kiring.`, { parse_mode: 'HTML', reply_markup: keyboard });
    } catch (e) {}
  }

  async _cmdPostNews(chatId, userId) {
    const adminId = (process.env.TELEGRAM_ADMIN_CHAT_ID || '697727022').trim();
    if (String(userId) !== adminId) return this.sendMessage(chatId, "⛔ Kirish taqiqlangan.");
    
    try {
      const { postTipToChannel } = require('./claudeTipsScheduler');
      await this.sendMessage(chatId, "⏳ Claude Tip yuborilmoqda...");
      await postTipToChannel();
      await this.sendMessage(chatId, "✅ Muvaffaqiyatli yuborildi.");
    } catch (e) { this.sendMessage(chatId, "❌ Xatolik."); }
  }

  // ═══════════════════════════ NOTIFICATIONS ═══════════════════════════

  async notifySubscriptionVerified(user, platform) {
    const adminId = (process.env.TELEGRAM_ADMIN_CHAT_ID || '697727022').trim();
    const platformLabel = platform === 'telegram' ? '📱 Telegram' : '📸 Instagram';
    const username = user.username || user.firstName || user._id;
    try {
      await this.sendMessage(
        adminId,
        `✅ <b>Yangi obuna tasdiqlandi</b>\n\n${platformLabel}\nFoydalanuvchi: <b>${username}</b>`,
        { parse_mode: 'HTML' }
      );
    } catch (_) {}
  }

  _getLinks() {
    const tgChannel     = process.env.TELEGRAM_CHANNEL_USERNAME || 'aidevix';
    const tgChannelLink = `https://t.me/${tgChannel.replace('@', '')}`;
    const igLink        = process.env.INSTAGRAM_URL || 'https://instagram.com/aidevix.uz';
    const siteLink      = process.env.SITE_URL || 'https://aidevix.uz';
    return { tgChannel: tgChannel.replace('@', ''), tgChannelLink, igLink, siteLink };
  }

  async sendCertificateNotification(chatId, cert) {
    const { tgChannel, tgChannelLink, siteLink } = this._getLinks();

    // Foydalanuvchiga shaxsiy xabar
    const userMsg =
      `🎓 <b>Tabriklaymiz!</b>\n\n` +
      `Siz <b>"${cert.courseName}"</b> kursini yakunladingiz!\n` +
      `Sertifikat kodi: <code>${cert.certificateCode}</code>\n\n` +
      `📢 Kanalimizga obuna bo'lib yangiliklar oling: <a href="${tgChannelLink}">@${tgChannel}</a>`;
    await this.sendMessage(chatId, userMsg, { parse_mode: 'HTML' });

    // Barcha faol kanallarga e'lon
    try {
      const BotChannel = require('../models/BotChannel');
      const dbChannels = await BotChannel.find({ isActive: true });
      const extraChannels = dbChannels.map(c => c.chatId);
      const mainCh = process.env.TELEGRAM_CHANNEL_USERNAME;
      if (mainCh) {
        const mainId = mainCh.startsWith('@') ? mainCh : `@${mainCh}`;
        if (!extraChannels.includes(mainId)) extraChannels.unshift(mainId);
      }

      const { igLink } = this._getLinks();
      const cMsg =
        `🎉 <b>Yangi bitiruvchi!</b>\n\n` +
        `O'quvchimiz <b>${cert.recipientName}</b>\n` +
        `"${cert.courseName}" kursini muvaffaqiyatli tamomladi! 🏆\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `<b>Aidevix</b> — AI & Dasturlash O'quv Platformasi 🇺🇿\n\n` +
        `📢 Kanal: <a href="${tgChannelLink}">@${tgChannel}</a>\n` +
        `📸 Instagram: <a href="${igLink}">@aidevix.uz</a>\n` +
        `🌐 Sayt: <a href="${siteLink}">aidevix.uz</a>`;

      const keyboard = {
        inline_keyboard: [
          [{ text: '🎓 Men ham o\'qimoqchiman!', url: siteLink }],
          [
            { text: '📢 Kanalga obuna', url: tgChannelLink },
            { text: '📸 Instagram', url: igLink },
          ],
        ],
      };

      for (const chId of extraChannels) {
        try { await this.sendMessage(chId, cMsg, { parse_mode: 'HTML', reply_markup: keyboard }); } catch {}
      }
    } catch {}
  }

  // ═══════════════════════════ UTILS ═══════════════════════════

  _getFrontendUrl() {
    return (process.env.FRONTEND_URL || '').split(',')[0].trim() || 'https://aidevix.uz';
  }

  async sendMessage(chatId, text, opts = {}) {
    try { await axios.post(`${this.apiUrl}/sendMessage`, { chat_id: chatId, text, ...opts }); } catch (e) {}
  }

  async editMessage(chatId, messageId, text, opts = {}) {
    try {
      await axios.post(`${this.apiUrl}/editMessageText`, { chat_id: chatId, message_id: messageId, text, ...opts });
    } catch (e) {}
  }

  async answerCallbackQuery(id, text) {
    try { await axios.post(`${this.apiUrl}/answerCallbackQuery`, { callback_query_id: id, text }); } catch (e) {}
  }
}

const initTelegramBot = () => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  botInstance = new AidevixBot(token);
  botInstance.startPolling();
};

const getBot = () => botInstance;

module.exports = { initTelegramBot, getBot };

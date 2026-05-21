const mongoose = require('mongoose');

/**
 * Bot admin sifatida qo'shilgan kanallar/guruhlar
 *
 * Har bir kanal/guruh uchun to'liq alohida sozlama:
 *
 * topics (mavzular):
 *   claude   — Claude / Anthropic yangiliklari
 *   codex    — OpenAI / Codex / ChatGPT yangiliklari
 *   cursor   — Cursor / Copilot / AI coding tools
 *   general  — Umumiy AI / IT yangiliklari
 *   all      — Hammasi (default)
 *
 * postTypes (post turlari):
 *   news        — AI yangiliklar (newsScheduler)
 *   challenges  — Kunlik challengelar
 *   all         — Hammasi (default)
 *
 * scheduleHours (kun ichida necha marta va qachon):
 *   Toshkent vaqtida soatlar massivi (0-23)
 *   default: [13]          →  kuniga 1 marta (Claude Tips)
 *   [10, 16, 20]           →  kuniga 3 marta
 *   [9, 18]                →  kuniga 2 marta
 */
const botChannelSchema = new mongoose.Schema({
  chatId: {
    type: String,
    required: true,
    unique: true,
  },
  username: {
    type: String,
    default: null,
  },
  title: {
    type: String,
    default: 'Nomsiz',
  },
  type: {
    type: String,
    enum: ['channel', 'supergroup', 'group'],
    default: 'channel',
  },
  isActive: {
    type: Boolean,
    default: true,
  },

  // Qaysi mavzularda news kelsin
  topics: {
    type: [String],
    enum: ['claude', 'codex', 'cursor', 'general', 'all'],
    default: ['all'],
  },

  // Qaysi turdagi postlar kelsin
  postTypes: {
    type: [String],
    enum: ['news', 'challenges', 'all'],
    default: ['all'],
  },

  // News qaysi soatlarda yuborilsin (Toshkent vaqti, 0-23)
  scheduleHours: {
    type: [Number],
    default: [13],
    validate: {
      validator: function (arr) {
        return arr.length > 0 && arr.length <= 6 && arr.every(h => Number.isInteger(h) && h >= 0 && h <= 23);
      },
      message: 'scheduleHours: 1-6 ta soat, 0-23 oraligida bo\'lishi kerak',
    },
  },

  addedAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

// Qulaylik metodlari
botChannelSchema.methods.wantsNews = function () {
  return this.postTypes.includes('all') || this.postTypes.includes('news');
};

botChannelSchema.methods.wantsChallenges = function () {
  return this.postTypes.includes('all') || this.postTypes.includes('challenges');
};

botChannelSchema.methods.wantsTopic = function (topic) {
  if (this.topics.includes('all')) return true;
  // topic = 'CLAUDE' / 'CODEX' / 'CURSOR' / 'SKILLS' (RSS kategoriyalar)
  const t = topic.toLowerCase();
  if (t === 'claude' && this.topics.includes('claude')) return true;
  if (t === 'codex' && this.topics.includes('codex')) return true;
  if ((t === 'cursor' || t === 'skills') && this.topics.includes('cursor')) return true;
  if (t === 'skills' && this.topics.includes('general')) return true;
  return false;
};

module.exports = mongoose.model('BotChannel', botChannelSchema);

'use strict';

const WINDOW_MS = 60_000;

// Telegram bot polling has one designated owner (RUN_TELEGRAM_BOT). Keep the
// sender budget bounded even when many separate Telegram accounts send updates.
class TelegramActionBudget {
  constructor({ now = Date.now, maxEntries = 10_000 } = {}) {
    this.now = now;
    this.maxEntries = maxEntries;
    this.entries = new Map();
  }

  consume(key, limit) {
    const now = this.now();
    let entry = this.entries.get(key);
    if (!entry || entry.expiresAt <= now) {
      if (this.entries.size >= this.maxEntries) {
        // Under pressure remove expired entries, never evict a live restriction.
        for (const [existingKey, value] of this.entries) {
          if (value.expiresAt <= now) this.entries.delete(existingKey);
        }
        if (this.entries.size >= this.maxEntries && !entry) return false;
      }
      entry = { count: 0, expiresAt: now + WINDOW_MS };
      this.entries.set(key, entry);
    }
    if (entry.count >= limit) return false;
    entry.count++;
    return true;
  }

  allow(userId, action) {
    if (!this.consume(`user:${userId}`, 20)) return false;
    if (action === 'login' && !this.consume(`login:${userId}`, 3)) return false;
    if (action === 'subscription' && !this.consume(`subscription:${userId}`, 6)) return false;
    return true;
  }
}

const isTelegramActor = (actor) => Number.isSafeInteger(actor?.id) && actor.id > 0 && actor.is_bot !== true;
const isPrivateActorChat = (chat, actor) => isTelegramActor(actor) && chat?.type === 'private' && chat.id === actor.id;
const getTelegramAdminId = () => {
  const adminId = (process.env.TELEGRAM_ADMIN_CHAT_ID || '').trim();
  return /^[1-9]\d{0,15}$/.test(adminId) && Number.isSafeInteger(Number(adminId)) ? adminId : '';
};

// Applies to bot-issued messages only. This reduces supported-client forwarding
// and saving; it cannot stop a recipient from transcribing visible content.
const protectedTelegramPayload = (payload) => ({ ...payload, protect_content: true });

module.exports = { TelegramActionBudget, isTelegramActor, isPrivateActorChat, getTelegramAdminId, protectedTelegramPayload };

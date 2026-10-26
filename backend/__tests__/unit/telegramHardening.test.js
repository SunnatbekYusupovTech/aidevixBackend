jest.mock('axios', () => ({ post: jest.fn().mockResolvedValue({ data: { ok: true } }), get: jest.fn() }));
jest.mock('../../models/BotChannel', () => ({ findOneAndUpdate: jest.fn().mockResolvedValue({}) }));
jest.mock('../../models/User', () => ({ findOne: jest.fn().mockResolvedValue({ _id: 'test-user' }) }));
jest.mock('../../models/MagicLoginToken', () => ({ create: jest.fn().mockResolvedValue({}) }));

const axios = require('axios');
const BotChannel = require('../../models/BotChannel');
const User = require('../../models/User');
const MagicLoginToken = require('../../models/MagicLoginToken');
const { initTelegramBot, getBot } = require('../../utils/telegramBot');
const { TelegramActionBudget, getTelegramAdminId, protectedTelegramPayload } = require('../../utils/telegramSecurity');

const message = (text, userId = 42, type = 'private', chatId = userId) => ({
  message: { chat: { id: chatId, type }, from: { id: userId, is_bot: false, first_name: 'Test' }, text },
});

describe('Telegram action budget boundaries', () => {
  test('a sender budget resets after its minute expires', () => {
    let now = 1000;
    const budget = new TelegramActionBudget({ now: () => now });
    for (let i = 0; i < 20; i++) expect(budget.allow(42, 'command')).toBe(true);
    expect(budget.allow(42, 'command')).toBe(false);
    now += 60_000;
    expect(budget.allow(42, 'command')).toBe(true);
  });

  test('a full counter table never evicts an active sender restriction', () => {
    let now = 1000;
    const budget = new TelegramActionBudget({ now: () => now, maxEntries: 2 });
    for (let i = 0; i < 20; i++) expect(budget.allow(42, 'command')).toBe(true);
    expect(budget.allow(43, 'command')).toBe(true);
    expect(budget.allow(44, 'command')).toBe(false);
    expect(budget.allow(42, 'command')).toBe(false);
    expect(budget.entries.size).toBe(2);
    now += 60_000;
    expect(budget.allow(44, 'command')).toBe(true);
    expect(budget.entries.size).toBeLessThanOrEqual(2);
  });

  test('subscription verification is limited independently of ordinary navigation', () => {
    const budget = new TelegramActionBudget();
    for (let i = 0; i < 6; i++) expect(budget.allow(42, 'subscription')).toBe(true);
    expect(budget.allow(42, 'subscription')).toBe(false);
    expect(budget.allow(42, 'command')).toBe(true);
  });

  test('callers cannot accidentally disable message content protection', () => {
    expect(protectedTelegramPayload({ chat_id: 42, protect_content: false }).protect_content).toBe(true);
  });

  test.each(['', '-100', 'not-an-id', '9007199254740993'])('invalid administrator configuration %s disables privileges', (value) => {
    const previous = process.env.TELEGRAM_ADMIN_CHAT_ID;
    process.env.TELEGRAM_ADMIN_CHAT_ID = value;
    try { expect(getTelegramAdminId()).toBe(''); }
    finally { process.env.TELEGRAM_ADMIN_CHAT_ID = previous; }
  });
});
const callback = (data, userId = 42, type = 'private', chatId = userId) => ({
  callback_query: {
    id: 'callback-test', data, from: { id: userId, is_bot: false, first_name: 'Test' },
    message: { message_id: 1, chat: { id: chatId, type } },
  },
});

describe('Telegram private account boundary and flood protection', () => {
  let bot;
  const originalToken = process.env.TELEGRAM_BOT_TOKEN;
  const originalPolling = process.env.RUN_TELEGRAM_BOT;
  const originalAdmin = process.env.TELEGRAM_ADMIN_CHAT_ID;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TELEGRAM_BOT_TOKEN = 'test-only-bot-token';
    process.env.RUN_TELEGRAM_BOT = 'false';
    process.env.TELEGRAM_ADMIN_CHAT_ID = '123456';
    initTelegramBot();
    bot = getBot();
  });
  afterAll(() => {
    for (const [key, value] of Object.entries({ TELEGRAM_BOT_TOKEN: originalToken, RUN_TELEGRAM_BOT: originalPolling, TELEGRAM_ADMIN_CHAT_ID: originalAdmin })) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  });

  test('does not mint a login link in a group chat', async () => {
    await bot._handleUpdate(message('/login', 42, 'supergroup', -100));
    expect(MagicLoginToken.create).not.toHaveBeenCalled();
    expect(axios.post).not.toHaveBeenCalled();
  });

  test('does not mint a login link through a group callback', async () => {
    await bot._handleUpdate(callback('cb_magic_login', 42, 'supergroup', -100));
    expect(MagicLoginToken.create).not.toHaveBeenCalled();
  });

  test('allows a linked user to log in privately with a protected message', async () => {
    await bot._handleUpdate(message('/login'));
    expect(User.findOne).toHaveBeenCalledWith({ telegramUserId: '42' });
    expect(MagicLoginToken.create).toHaveBeenCalledTimes(1);
    expect(axios.post).toHaveBeenCalledWith(expect.stringContaining('/sendMessage'), expect.objectContaining({ chat_id: 42, protect_content: true }), expect.any(Object));
  });

  test('does not treat a legacy claimed Telegram ID as identity proof for login', async () => {
    await bot._cmdLogin(42, 42);
    expect(User.findOne).toHaveBeenCalledWith({ telegramUserId: '42' });
  });

  test('limits command work by Telegram sender before accessing database', async () => {
    bot._cmdCourses = jest.fn();
    for (let i = 0; i < 30; i++) await bot._handleUpdate(message('/courses'));
    expect(bot._cmdCourses).toHaveBeenCalledTimes(20);
  });

  test('login command and callback share a stricter sender budget', async () => {
    bot._cmdLogin = jest.fn();
    for (let i = 0; i < 8; i++) {
      await bot._handleUpdate(i % 2 ? callback('cb_magic_login') : message('/login'));
    }
    expect(bot._cmdLogin).toHaveBeenCalledTimes(3);
  });

  test('each legitimate sender has their own command allowance', async () => {
    bot._cmdCourses = jest.fn();
    for (let i = 0; i < 25; i++) await bot._handleUpdate(message('/courses', 42));
    await bot._handleUpdate(message('/courses', 43));
    expect(bot._cmdCourses).toHaveBeenCalledTimes(21);
  });

  test('rejects bots, malformed updates, and private chats with mismatched actors', async () => {
    bot._cmdCourses = jest.fn();
    const automated = message('/courses');
    automated.message.from.is_bot = true;
    for (const update of [null, {}, { message: {} }, automated, message('/courses', 42, 'private', 43)]) {
      await expect(bot._handleUpdate(update)).resolves.toBeUndefined();
    }
    expect(bot._cmdCourses).not.toHaveBeenCalled();
  });

  test('still allows reaction callbacks on channel posts', async () => {
    await bot._handleUpdate(callback('news_react_fire', 42, 'channel', -100));
    expect(axios.post).toHaveBeenCalledWith(expect.stringContaining('/answerCallbackQuery'), expect.objectContaining({ callback_query_id: 'callback-test' }), expect.any(Object));
  });

  test('unknown actor cannot auto-enroll a broadcast destination', async () => {
    await bot._handleUpdate({ my_chat_member: { chat: { id: -100, type: 'channel', title: 'Untrusted' }, from: { id: 42 }, new_chat_member: { status: 'administrator' } } });
    expect(BotChannel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  test('configured administrator can enroll a channel', async () => {
    await bot._handleUpdate({ my_chat_member: { chat: { id: -100, type: 'channel', title: 'Approved' }, from: { id: 123456 }, new_chat_member: { status: 'administrator' } } });
    expect(BotChannel.findOneAndUpdate).toHaveBeenCalledWith({ chatId: '-100' }, expect.objectContaining({ isActive: true }), expect.objectContaining({ upsert: true }));
  });

  test('channel removal remains possible when performed by a different actor', async () => {
    await bot._handleUpdate({ my_chat_member: { chat: { id: -100, type: 'channel', title: 'Approved' }, from: { id: 42 }, new_chat_member: { status: 'kicked' } } });
    expect(BotChannel.findOneAndUpdate).toHaveBeenCalledWith({ chatId: '-100' }, { isActive: false });
  });

  test('missing admin config never grants the former fallback account admin powers', async () => {
    delete process.env.TELEGRAM_ADMIN_CHAT_ID;
    bot._buildAdminHome = jest.fn().mockResolvedValue({ text: 'admin', keyboard: {} });
    await bot._handleUpdate(message('/admin', 697727022));
    expect(bot._buildAdminHome).not.toHaveBeenCalled();
  });
});

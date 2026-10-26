const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Load the unchanged module body and expose only its private sender to this
// isolated harness. All Telegram requests and database operations stay mocked.
function loadSender(file, functionName, axios) {
  const filename = path.resolve(__dirname, '../../utils', file);
  const sandbox = {
    module: { exports: {} }, __dirname: path.dirname(filename), process, console, URL,
    require: (id) => {
      if (id === 'axios') return axios;
      if (id === './emailService') return { sendWeeklyDigestEmail: jest.fn() };
      if (id === './pushService') return { sendPushToUser: jest.fn() };
      if (id === '../models/BotChannel') return { find: jest.fn().mockResolvedValue([{ chatId: '-100', wantsChallenges: () => true }]) };
      return require(id.startsWith('.') ? path.resolve(path.dirname(filename), id) : id);
    },
  };
  vm.runInNewContext(`${fs.readFileSync(filename, 'utf8')}\nmodule.exports.testSender = ${functionName};`, sandbox, { filename });
  return sandbox.module.exports.testSender;
}

describe('Telegram content protection is present on every outgoing scheduler path', () => {
  let axios;
  beforeEach(() => { axios = { post: jest.fn().mockResolvedValue({ data: { ok: true } }) }; });

  test('Claude tips and its HTML fallback both protect message content', async () => {
    axios.post.mockRejectedValueOnce({ response: { status: 400, data: { description: "Bad Request: can't parse entities" } } });
    const send = loadSender('claudeTipsScheduler.js', 'sendTipToChat', axios);
    await send('test-token', '-100', { emoji: 'Test' }, { title: 'Tip', content: 'Text', tip: 'Try it' });
    expect(axios.post).toHaveBeenCalledTimes(2);
    for (const [, payload] of axios.post.mock.calls) expect(payload.protect_content).toBe(true);
  });

  test.each([
    [{ link: 'https://example.com', source: 'Test' }, { title: 'News', content: 'Text', prompt_tip: 'Try it' }, '/sendMessage'],
    [{ link: 'https://example.com', source: 'Test', image: 'https://example.com/image.jpg' }, { title: 'N', content: 'T', prompt_tip: 'P' }, '/sendPhoto'],
  ])('RSS news and image posts protect content', async (item, ai, method) => {
    const send = loadSender('newsScheduler.js', 'sendNewsToChat', axios);
    await send('test-token', '-100', item, ai);
    expect(axios.post.mock.calls[0][0]).toContain(method);
    expect(axios.post.mock.calls[0][1].protect_content).toBe(true);
  });

  test('daily challenge posts protect content', async () => {
    const previousToken = process.env.TELEGRAM_BOT_TOKEN;
    process.env.TELEGRAM_BOT_TOKEN = 'test-token';
    try {
      const send = loadSender('challengeScheduler.js', 'sendChallengeToChannel', axios);
      await send({ title: 'Challenge', description: 'Learn', type: 'watch_video', xpReward: 10 });
      expect(axios.post).toHaveBeenCalled();
      for (const [, payload] of axios.post.mock.calls) expect(payload.protect_content).toBe(true);
    } finally { process.env.TELEGRAM_BOT_TOKEN = previousToken; }
  });

  test('personal weekly digests protect content', async () => {
    const previousToken = process.env.TELEGRAM_BOT_TOKEN;
    process.env.TELEGRAM_BOT_TOKEN = 'test-token';
    try {
      const send = loadSender('digestScheduler.js', 'sendDigestToUser', axios);
      await send({ telegramUserId: '42', username: 'Test' }, { xp: 100, weeklyXp: 10 }, null);
      expect(axios.post.mock.calls[0][1].protect_content).toBe(true);
    } finally { process.env.TELEGRAM_BOT_TOKEN = previousToken; }
  });
});

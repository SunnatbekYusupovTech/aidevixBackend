const nock = require('nock');

const BASE = 'http://mkhls.test';

// Env is read per call inside the client, so setting it here is enough.
process.env.MKHLS_BASE_URL = BASE;
process.env.MKHLS_PUBLIC_URL = 'https://stream.example.test';
process.env.MKHLS_ADMIN_USERNAME = 'admin';
process.env.MKHLS_ADMIN_PASSWORD = 'admin123';
process.env.MKHLS_NAMESPACE = 'aidevix';
process.env.MKHLS_STREAM_TOKEN_TTL = '14400';

const mkhls = require('../../utils/mkhls');

// A login reply whose token expires an hour out.
const loginReply = (token = 'jwt-1') => ({
  success: true,
  data: {
    token,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: '1', username: 'admin', role: 'admin' },
  },
});

beforeEach(() => {
  mkhls._resetAuthCache();
  nock.cleanAll();
});

afterAll(() => {
  nock.restore();
});

describe('pathToId', () => {
  it('collapses separators the way mkhls NormalizeVideoID does', () => {
    expect(mkhls.pathToId('aidevix/68f.mp4')).toBe('aidevix_68f.mp4');
    expect(mkhls.pathToId('a/b/c.mp4')).toBe('a_b_c.mp4');
  });

  it('leaves a flat filename alone', () => {
    expect(mkhls.pathToId('movie.mp4')).toBe('movie.mp4');
  });

  it('normalises leading, trailing and doubled separators', () => {
    expect(mkhls.pathToId('/aidevix//68f.mp4/')).toBe('aidevix_68f.mp4');
    expect(mkhls.pathToId('aidevix\\68f.mp4')).toBe('aidevix_68f.mp4');
  });

  it('refuses traversal segments instead of silently cleaning them', () => {
    expect(() => mkhls.pathToId('aidevix/../etc/passwd')).toThrow(/unsafe/);
  });

  it('refuses an empty path', () => {
    expect(() => mkhls.pathToId('')).toThrow(/required/);
  });

  it('refuses a path that normalises to nothing', () => {
    // A lone separator passes the empty-string and traversal checks but
    // collapses to '' once slashes are stripped — that must fail the same
    // way an empty input does, not silently produce an empty ID.
    expect(() => mkhls.pathToId('/')).toThrow(/required/);
  });
});

describe('buildStreamPath', () => {
  it('places the video under the configured namespace', () => {
    expect(mkhls.buildStreamPath('68f0011223344556677889900')).toBe(
      'aidevix/68f0011223344556677889900.mp4'
    );
  });
});

describe('parseStreamStatus', () => {
  it('maps every mkhls status the entity defines', () => {
    expect(mkhls.parseStreamStatus('pending')).toBe('pending');
    expect(mkhls.parseStreamStatus('draft')).toBe('pending');
    expect(mkhls.parseStreamStatus('processing')).toBe('processing');
    expect(mkhls.parseStreamStatus('ready')).toBe('ready');
    expect(mkhls.parseStreamStatus('error')).toBe('failed');
    expect(mkhls.parseStreamStatus('unavailable')).toBe('failed');
  });

  it('treats an unknown status as still processing, not failed', () => {
    // A status we do not recognise means "we cannot tell". processing polls
    // and self-heals; failed tells the user to contact an administrator.
    expect(mkhls.parseStreamStatus('queued')).toBe('processing');
  });
});

describe('buildHlsUrl', () => {
  it('uses the public URL and encodes the token', () => {
    expect(mkhls.buildHlsUrl('aidevix/68f.mp4', 'a+b/c')).toBe(
      'https://stream.example.test/vod/aidevix/68f.mp4/master.m3u8?token=a%2Bb%2Fc'
    );
  });
});

describe('getAdminToken', () => {
  it('logs in once and reuses the cached token', async () => {
    const scope = nock(BASE).post('/admin/login').once().reply(200, loginReply('jwt-1'));

    expect(await mkhls.getAdminToken()).toBe('jwt-1');
    expect(await mkhls.getAdminToken()).toBe('jwt-1');
    expect(scope.isDone()).toBe(true);
  });

  it('re-logs in when the cached token is inside the 60s expiry margin', async () => {
    nock(BASE)
      .post('/admin/login')
      .reply(200, {
        success: true,
        data: { token: 'about-to-expire', expires_at: Math.floor(Date.now() / 1000) + 30 },
      });
    expect(await mkhls.getAdminToken()).toBe('about-to-expire');

    nock(BASE).post('/admin/login').reply(200, loginReply('fresh'));
    expect(await mkhls.getAdminToken()).toBe('fresh');
  });

  it('surfaces a rejected login as a MkhlsError with the mkhls code', async () => {
    nock(BASE)
      .post('/admin/login')
      .reply(401, { success: false, error: { code: 'INVALID_CREDENTIALS', message: 'nope' } });

    await expect(mkhls.getAdminToken()).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
  });

  it('surfaces a success response with no data as a MkhlsError, not a raw TypeError', async () => {
    // {success: true} with no `data` is not a shape any caller here expects.
    // unwrap must turn it into a MkhlsError instead of letting the next line
    // (data.token) crash with a raw TypeError.
    nock(BASE).post('/admin/login').reply(200, { success: true });

    await expect(mkhls.getAdminToken()).rejects.toMatchObject({ code: 'MALFORMED_RESPONSE' });
  });
});

describe('generateStreamToken', () => {
  it('requests a path-scoped token and returns an absolute expiry', async () => {
    const expires = Math.floor(Date.now() / 1000) + 14400;
    nock(BASE).post('/admin/login').reply(200, loginReply());
    nock(BASE)
      .post('/admin/tokens/stream', {
        allowed_path: '/vod/aidevix/68f.mp4',
        client_ip: '',
        expires_in: 14400,
      })
      .matchHeader('authorization', 'Bearer jwt-1')
      .reply(200, { success: true, data: { token: 'stream-tok', expires_at: expires } });

    const result = await mkhls.generateStreamToken('aidevix/68f.mp4');
    expect(result.token).toBe('stream-tok');
    expect(result.expiresAt.getTime()).toBe(expires * 1000);
  });

  it('re-authenticates once on 401 and retries', async () => {
    nock(BASE).post('/admin/login').reply(200, loginReply('stale'));
    nock(BASE)
      .post('/admin/tokens/stream')
      .matchHeader('authorization', 'Bearer stale')
      .reply(401, { success: false, error: { code: 'UNAUTHORIZED', message: 'expired' } });
    nock(BASE).post('/admin/login').reply(200, loginReply('renewed'));
    nock(BASE)
      .post('/admin/tokens/stream')
      .matchHeader('authorization', 'Bearer renewed')
      .reply(200, { success: true, data: { token: 'stream-tok', expires_at: 1 } });

    await expect(mkhls.generateStreamToken('aidevix/68f.mp4')).resolves.toMatchObject({
      token: 'stream-tok',
    });
  });

  it('gives up after one retry rather than looping on 401', async () => {
    nock(BASE).post('/admin/login').twice().reply(200, loginReply());
    nock(BASE)
      .post('/admin/tokens/stream')
      .twice()
      .reply(401, { success: false, error: { code: 'UNAUTHORIZED', message: 'expired' } });

    await expect(mkhls.generateStreamToken('aidevix/68f.mp4')).rejects.toMatchObject({
      status: 401,
    });
  });

  it('reports an unreachable mkhls with a distinct code', async () => {
    nock(BASE).post('/admin/login').replyWithError({ code: 'ECONNREFUSED' });

    await expect(mkhls.generateStreamToken('aidevix/68f.mp4')).rejects.toMatchObject({
      code: 'UNREACHABLE',
    });
  });
});

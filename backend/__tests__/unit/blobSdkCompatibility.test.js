'use strict';

// Exercise the installed SDK and our upload wrapper; replace only its HTTP transport.
// No upstream requests or real storage credentials are used.
jest.mock('undici', () => ({ ...jest.requireActual('undici'), fetch: jest.fn() }));

const { fetch } = require('undici');
const originalToken = process.env.BLOB_READ_WRITE_TOKEN;
const fixtureToken = 'vercel_blob_rw_teststore_fixture';
process.env.BLOB_READ_WRITE_TOKEN = fixtureToken;
const { putToBlob, uploadAvatar, uploadThumbnail } = require('../../middleware/uploadMiddleware');

afterAll(() => {
  if (originalToken === undefined) delete process.env.BLOB_READ_WRITE_TOKEN;
  else process.env.BLOB_READ_WRITE_TOKEN = originalToken;
});

beforeEach(() => {
  fetch.mockReset();
  fetch.mockImplementation(async (input, init) => {
    const pathname = new URL(input).searchParams.get('pathname');
    return {
      ok: true,
      json: async () => ({
        url: `https://teststore.public.blob.vercel-storage.com/${pathname}`,
        downloadUrl: `https://teststore.public.blob.vercel-storage.com/${pathname}?download=1`,
        pathname,
        contentType: init.headers['x-content-type'],
        contentDisposition: 'inline',
        etag: 'fixture-etag',
      }),
    };
  });
});

test.each([
  ['avatars', 'image/jpeg', 'jpg'],
  ['thumbnails', 'image/png', 'png'],
  ['avatars', 'image/webp', 'webp'],
])('installed Blob SDK preserves %s upload contract (%s)', async (folder, mimetype, ext) => {
  const buffer = Buffer.from('fixture-image-bytes');
  const url = await putToBlob({ buffer, mimetype, originalname: '../../unsafe-name.html' }, folder);
  expect(url).toMatch(new RegExp(`/aidevix/${folder}/[0-9a-f-]+\\.${ext}$`));
  expect(fetch).toHaveBeenCalledTimes(1);
  const [input, init] = fetch.mock.calls[0];
  expect(new URL(input).protocol).toBe('https:');
  expect(init.method).toBe('PUT');
  expect(init.body).toBe(buffer);
  expect(init.headers.authorization).toBe(`Bearer ${fixtureToken}`);
  expect(init.headers['x-content-type']).toBe(mimetype);
  expect(typeof uploadAvatar.single).toBe('function');
  expect(typeof uploadThumbnail.single).toBe('function');
});

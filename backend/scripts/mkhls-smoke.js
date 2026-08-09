/**
 * Live check of utils/mkhls.js against a running mkhls container.
 *
 * Usage:
 *   docker compose -f ../docker-compose.dev.yml up -d mkhls
 *   node scripts/mkhls-smoke.js path/to/sample.mp4
 *
 * Uploads under a throwaway namespace, waits for transcoding, prints a
 * playable URL, then deletes the record.
 */
require('dotenv').config();
const fs = require('fs');
const mkhls = require('../utils/mkhls');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const file = process.argv[2];
  if (!file || !fs.existsSync(file)) {
    console.error('usage: node scripts/mkhls-smoke.js <path-to-mp4>');
    process.exit(1);
  }

  const size = fs.statSync(file).size;
  const streamPath = `smoke/${Date.now()}.mp4`;

  console.log(`login → ${mkhls.pathToId(streamPath)}`);
  await mkhls.getAdminToken();

  console.log(`upload ${size} bytes → ${streamPath}`);
  await mkhls.uploadVideo(streamPath, fs.createReadStream(file), size);

  console.log('transcode', await mkhls.startTranscode(streamPath));

  for (let i = 0; i < 60; i++) {
    const info = await mkhls.getVideoInfo(streamPath);
    console.log(
      `  [${i}] ${info.status} (mkhls: ${info.mkhlsStatus}) duration=${info.duration} ` +
        `presets=${info.transcode ? info.transcode.presetsDone.length : '-'}/` +
        `${info.transcode ? info.transcode.presetsTotal : '-'}`
    );
    if (info.status === 'ready' || info.status === 'failed') break;
    await sleep(5000);
  }

  const { token, expiresAt } = await mkhls.generateStreamToken(streamPath, 600);
  console.log('\nPLAY:', mkhls.buildHlsUrl(streamPath, token));
  console.log('expires:', expiresAt.toISOString());
  console.log('\nOpen the URL above, then press Enter to delete the record.');
  await new Promise((r) => process.stdin.once('data', r));

  console.log('deleted:', await mkhls.deleteVideo(streamPath));
  process.exit(0);
})().catch((err) => {
  console.error(`FAILED [${err.code}]`, err.message);
  process.exit(1);
});

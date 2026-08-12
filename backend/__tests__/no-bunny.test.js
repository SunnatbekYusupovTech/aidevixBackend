'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

// Bu yo'llar ATAYLAB tekshirilmaydi:
//  - docs/              — tarixiy spec, plan va HANDOFF yozuvlari, Bunny'ni
//                         nima uchun olib tashlaganimizni aynan shular tushuntiradi
//  - frontend/e2e/      — u yerdagi urishlar "bunny yo'q" degan TASDIQLAR
//  - backend/__tests__/ — xuddi shu sabab, va shu faylning O'ZI ham shu yerda:
//                         qo'riqchi o'z manbasidagi /bunny/i ni aybdor deb topardi
//  - .superpowers/      — gitignore'langan ijro ledgerlari
const IGNORED_PREFIXES = ['docs/', 'frontend/e2e/', 'backend/__tests__/', '.superpowers/'];

// Tozalash ATAYLAB uchta tushuntirish izohini qoldiradi. Ular Bunny'ning
// qaytishi emas — aksincha, u nima uchun ketgani va nima qoldirganini
// yozib qo'yadi. Ularni o'chirish haqiqiy ma'lumotni yo'qotardi:
//  - models/Video.js       — MongoDB'da qolgan `bunnyStatus_1` indeksini
//                            qo'lda qanday tushirish kerakligini aytadi
//  - videoController.js    — mkhls nima uchun oldindan slot talab qilmasligini
//                            eski tizim bilan solishtirib tushuntiradi
//  - admin/courses/[id]    — 6 daqiqalik polling timeout nima uchun olib
//                            tashlanganini tushuntiradi
const PROSE_ALLOWLIST = [
  'backend/models/Video.js',
  'backend/controllers/videoController.js',
  'frontend/src/app/admin/courses/[id]/page.tsx',
];

// Bular Bunny'ning HAQIQATAN qaytganini bildiradi: endpoint, config kaliti,
// modul yo'li yoki API yuzasi. Bularga allowlist TEGISHLI EMAS — istalgan
// faylda topilsa, bu xato.
const FORBIDDEN_IDENTIFIERS = [
  'bunnycdn',
  'mediadelivery.net',
  'BUNNY_STREAM_API_KEY',
  'BUNNY_LIBRARY_ID',
  'BUNNY_TOKEN_KEY',
  'utils/bunny',
  'bunnyVideoId',
  'BunnyPlayer',
  'bulkLinkBunny',
  'createBunnyVideo',
  'deleteBunnyVideo',
  'getBunnyVideoInfo',
  'streamUploadToBunny',
  'parseBunnyStatus',
  'generateSignedEmbedUrl',
];

const trackedFiles = () =>
  execFileSync('git', ['ls-files'], { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
    .split('\n')
    .filter(Boolean)
    .filter((file) => !IGNORED_PREFIXES.some((prefix) => file.startsWith(prefix)));

const readTracked = () => {
  const files = [];
  for (const file of trackedFiles()) {
    let contents;
    try {
      contents = fs.readFileSync(path.join(REPO_ROOT, file), 'utf8');
    } catch {
      continue; // binar yoki o'qib bo'lmaydigan fayl — e'tiborsiz
    }
    files.push([file, contents]);
  }
  return files;
};

// Qatlam 1 (qattiq): allowlist'siz — Bunny kodi/konfiguratsiyasining qaytishi.
const identifierOffenders = () =>
  readTracked()
    .filter(([, contents]) => FORBIDDEN_IDENTIFIERS.some((id) => contents.includes(id)))
    .map(([file]) => file);

// Qatlam 2 (yumshoq): yalang'och "bunny" so'zi — allowlist'dagi uch fayldan
// tashqari hech qayerda bo'lmasligi kerak.
const proseOffenders = () =>
  readTracked()
    .filter(([file, contents]) => /bunny/i.test(contents) && !PROSE_ALLOWLIST.includes(file))
    .map(([file]) => file);

describe('Bunny.net qoldiqlari', () => {
  it('hech qayerda Bunny kodi yoki konfiguratsiyasi yo\'q', () => {
    expect(identifierOffenders()).toEqual([]);
  });

  it('allowlist\'dan tashqarida "bunny" so\'zi yo\'q', () => {
    expect(proseOffenders()).toEqual([]);
  });

  it('utils/bunny.js moduli mavjud emas', () => {
    expect(fs.existsSync(path.join(REPO_ROOT, 'backend', 'utils', 'bunny.js'))).toBe(false);
  });

  it('sizib chiqqan kalitli fayl mavjud emas', () => {
    expect(fs.existsSync(path.join(REPO_ROOT, 'fetch_bunny.html'))).toBe(false);
  });
});

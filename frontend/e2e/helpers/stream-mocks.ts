import fs from 'fs';
import path from 'path';
import type { Page, Route } from '@playwright/test';
import { MOCK_USER, MOCK_SUBSCRIPTION_STATUS } from '../fixtures/mock-data';

export const TEST_VIDEO_ID = 'vid-stream-1';
export const TEST_COURSE_ID = 'course-stream-1';

// Vidstack's React `<MediaPlayer>` renders a plain `<div data-media-player>`
// wrapper in this build — not a literal `<media-player>` custom element tag
// (no Custom Elements registry is wired up). `[data-media-player]` is the
// selector that actually matches the rendered DOM; a tag-name locator finds
// nothing and every assertion built on it would time out regardless of app
// behaviour.
export const PLAYER_SELECTOR = '[data-media-player]';

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

/** Login qilgan va ikkala kanalga obuna bo'lgan foydalanuvchi. */
export async function mockSubscribedUser(page: Page) {
  // User to'g'ridan-to'g'ri `data` ostida bo'lishi kerak, `data: { user }`
  // emas — `checkAuthStatus` `return { user: data.data }` qiladi, shuning
  // uchun qo'shimcha nesting `state.user`ni `{ user: {...} }` qilib qo'yadi.
  await page.route('**/api/**/auth/me*', (route) =>
    json(route, { success: true, data: MOCK_USER }),
  );
  await page.route('**/api/**/auth/csrf*', (route) =>
    json(route, { success: true, data: { token: 'test-csrf' } }),
  );
  await page.route('**/api/**/subscriptions/status*', (route) =>
    json(route, MOCK_SUBSCRIPTION_STATUS),
  );
  await page.route('**/api/**/subscriptions/realtime-status*', (route) =>
    json(route, MOCK_SUBSCRIPTION_STATUS),
  );
  await page.addInitScript(() => {
    sessionStorage.setItem('daily_reward_dismissed', new Date().toISOString().slice(0, 10));
    // Bu ikkalasi visual "backdrop" muammosini yopadi (DailyRewardModal va
    // BetaWelcomeModal ochilib, to'liq ekranli qoplama bilan player
    // tugmalariga bosishni to'smasligi uchun) — lekin komponentning o'zi
    // baribir mount bo'ladi, chunki dismiss tekshiruvi shu komponentlarning
    // ICHIDAGI effektda, JSX render shartida emas: `next/dynamic()` chunk
    // so'rovi baribir yuboriladi. Uzoq `page.clock.fastForward` chaqiradigan
    // testlar uchun `suppressMarketingChromeTimers()`ga qarang — u shu
    // qoldiq muammoni yopadi.
    localStorage.setItem('aidevix_beta_welcome_dismissed', '1');
  });
}

/**
 * `ClientLayoutWrapper` yettita marketing-chrome komponentini
 * (DailyRewardModal, LiveActivityTicker, AICoach, ExitIntentModal,
 * BetaWelcomeModal, PWAInstallPrompt, InstallAppFab) `requestIdleCallback`
 * orqali kechiktirib mount qiladi — bularning darslar bilan aloqasi yo'q.
 * `page.clock.install()` shu API'ni ham soxtalashtiradi, shuning uchun uzoq
 * `fastForward` chaqirilganda bu komponentlar deyarli zudlik bilan mount
 * bo'ladi va `next/dynamic()` orqali haqiqiy tarmoq so'rovi bilan chunk
 * so'raydi. Agar `fastForward` virtual vaqtni webpack'ning ICHKI
 * chunk-yuklash taymeridan (standart 120s, endi u ham soxta soat ostida)
 * oshirib yuborsa — chunk hali kelmasdan turib reject bo'ladi va
 * `ChunkLoadError` bilan Next dev-overlay butun sahifani "o'ldiradi". Bu
 * qaysi komponentda sodir bo'lishi tasodifiy (qaysi tarmoq so'rovi
 * sekinroq bo'lsa) — bu ikki xil komponentda (`LiveActivityTicker`,
 * `BetaWelcomeModal`) kuzatilgan, shuning uchun bitta komponentni
 * localStorage bilan "dismiss" qilish yetarli emas: mount hali ham sodir
 * bo'ladi.
 *
 * `requestIdleCallback`ni hech qachon chaqirilmaydigan no-op bilan
 * almashtirib, bu yettala komponentning umuman mount bo'lmasligini
 * ta'minlaymiz — `setTimeout`/`setInterval` (haqiqiy poll shularga
 * tayanadi) tegilmagan holda qoladi.
 *
 * `page.clock.install()`DAN KEYIN chaqirilishi SHART: Playwright klok
 * o'zining fake `requestIdleCallback`ini kontekst darajasidagi init-skript
 * sifatida RO'YXATDAN O'TKAZILGAN vaqti bo'yicha qo'llaydi (daraja emas) —
 * shu funksiya oldinroq chaqirilsa, keyin ro'yxatdan o'tadigan klok skripti
 * ustidan yozib, bu no-op'ni asl (funksional) versiyaga qaytarib qo'yadi.
 */
export async function suppressMarketingChromeTimers(page: Page) {
  await page.addInitScript(() => {
    window.requestIdleCallback = () => 0;
  });
}

const baseVideo = {
  _id: TEST_VIDEO_ID,
  title: 'Test dars',
  description: 'Test tavsif',
  duration: 600,
  order: 0,
  thumbnail: '',
  materials: [],
  views: 10,
  course: { _id: TEST_COURSE_ID, title: 'Test kurs', category: 'javascript' },
};

/** Tayyor video: player bor. */
export function readyVideoBody(overrides: Record<string, unknown> = {}) {
  return {
    success: true,
    data: {
      video: baseVideo,
      player: {
        type: 'hls',
        hlsUrl: 'https://stream.test/vod/aidevix/vid.mp4/master.m3u8?token=t1',
        expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      },
      progress: null,
      streamStatus: 'ready',
      ...overrides,
    },
  };
}

/** Tayyorlanmayotgan yoki buzilgan video: player yo'q. */
export function preparingVideoBody(streamStatus: 'pending' | 'processing' | 'failed') {
  return {
    success: true,
    data: { video: baseVideo, player: null, progress: null, streamStatus },
  };
}

// `/api/` prefix — not just `/videos/${videoId}` — matters here: the app's
// own page route is also `/videos/${videoId}` (no `/api/` segment), and an
// unscoped pattern intercepts that top-level navigation too, serving raw
// JSON as the document instead of the app shell.
export function videoDetailPattern(videoId: string) {
  return new RegExp(`/api/.*/videos/${videoId}(?:[?#]|$)`);
}

/**
 * `GET /videos/:id` ni mock qiladi. `bodies` ketma-ketligi: birinchi so'rov
 * birinchi tanani oladi, ikkinchisi ikkinchisini va hokazo; ro'yxat tugagach
 * oxirgisi takrorlanadi. Poll va refetch testlari shunga tayanadi.
 * Har bir chaqiruv sonini o'lchash uchun qaytariladigan obyektdan foydalaning.
 */
export async function mockVideoDetail(page: Page, videoId: string, bodies: unknown[]) {
  const counter = { calls: 0 };
  await page.route(videoDetailPattern(videoId), (route) => {
    const body = bodies[Math.min(counter.calls, bodies.length - 1)];
    counter.calls += 1;
    return json(route, body);
  });
  return counter;
}

const HLS_SAMPLE_DIR = path.join(__dirname, '..', 'fixtures', 'hls-sample');

/**
 * Haqiqatan o'ynay oladigan, minimal HLS VOD oqimini (`ffmpeg` bilan oldindan
 * yaratilgan, ~4s, 2 segment) ulaydi. `readyVideoBody()`dagi `master.m3u8`
 * so'roviga shu real playlist qaytadi, va nisbiy segment nomlari (`seg0.bin`,
 * `seg1.bin`) ham ushlanadi. Faqat position-report testiga kerak — boshqa
 * testlarga sun'iy bo'sh playlist yetarli, chunki ular faqat konteyner mount
 * bo'lishini tekshiradi.
 *
 * Segmentlar ataylab `.ts` kengaytmasi bilan SAQLANMAYDI (MPEG-TS konvensiyasi
 * shuni talab qilsa ham): `frontend/tsconfig.json`ning `include: ["**\/*.ts"]`
 * naqshi ularni TypeScript manba fayli sifatida oladi va ikkilik tarkibni
 * tahlil qilishga urinib, butun loyihaning `tsc` ishga tushirilishini erta
 * uzadi — bu esa Plan 3'ning skoup qilingan type gate'ini butunlay ko'r qilib
 * qo'yadi. Kontent-tur baribir `route.fulfill`da qo'lda beriladi, shuning
 * uchun kengaytma pleyer uchun ahamiyatsiz.
 */
export async function mockPlayableHls(page: Page) {
  const playlist = fs.readFileSync(path.join(HLS_SAMPLE_DIR, 'stream.m3u8'));
  await page.route('**/master.m3u8*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/vnd.apple.mpegurl', body: playlist }),
  );
  for (const seg of ['seg0.bin', 'seg1.bin']) {
    const body = fs.readFileSync(path.join(HLS_SAMPLE_DIR, seg));
    await page.route(`**/${seg}`, (route) =>
      route.fulfill({ status: 200, contentType: 'video/mp2t', body }),
    );
  }
}

const HLS_LONG_SAMPLE_DIR = path.join(__dirname, '..', 'fixtures', 'hls-sample-long');

/**
 * Same idea as `mockPlayableHls`, but backed by a real ~40s/4-segment
 * ffmpeg-generated stream (`testsrc`+`sine`, 10s segments, exact 40.000s
 * total — see the directory for the generating command in the task report)
 * instead of the ~4s sample.
 *
 * The resume-guard's 15s end margin (`END_GUARD_SECONDS` in
 * `LessonPlayer.tsx`) can only be pinned against a stream whose real
 * duration makes `duration - 15` meaningfully positive. The ~4s sample's
 * `duration - 15` is negative, so with that fixture *every* `startAt > 5`
 * is rejected regardless of what the margin actually is — changing
 * `END_GUARD_SECONDS` from 15 to 0 would leave a test built on the short
 * fixture green. This fixture exists so a resume position inside the final
 * 15 real seconds can be told apart from one that merely exceeds the whole
 * duration.
 */
export async function mockLongPlayableHls(page: Page) {
  const playlist = fs.readFileSync(path.join(HLS_LONG_SAMPLE_DIR, 'stream.m3u8'));
  await page.route('**/master.m3u8*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/vnd.apple.mpegurl', body: playlist }),
  );
  for (const seg of ['seg0.bin', 'seg1.bin', 'seg2.bin', 'seg3.bin']) {
    const body = fs.readFileSync(path.join(HLS_LONG_SAMPLE_DIR, seg));
    await page.route(`**/${seg}`, (route) =>
      route.fulfill({ status: 200, contentType: 'video/mp2t', body }),
    );
  }
}

/**
 * Vidstack sets this boolean attribute on the `[data-media-player]` wrapper
 * once the media has genuinely reached a playable state — the same moment
 * `handleCanPlay` in `LessonPlayer.tsx` runs and, if the resume guard
 * allows it, performs the seek. Gating on the attribute (instead of a flat
 * wall-clock wait) avoids a vacuous pass: `react-hot-toast`'s default
 * success duration is ~2s plus ~1s of exit animation, so a flat 2s wait can
 * land inside that window on a fast run and outside it — after the toast
 * has already come and gone — on a loaded machine, making a "no toast"
 * assertion pass whether or not a seek happened.
 */
export async function waitForCanPlay(page: Page, timeout = 20_000) {
  await page.waitForSelector(`${PLAYER_SELECTOR}[data-can-play]`, { timeout });
}

/**
 * Reads the underlying native `<video>` element's `currentTime` directly.
 * The resume guard's observable effect is `player.currentTime = startAt`
 * (`LessonPlayer.tsx`); asserting on the toast alone leaves open whether
 * vidstack's `currentTime` setter silently no-ops or throws for a value
 * past the media's real duration — in which case `onResume` would never
 * fire and a "no toast" assertion would pass for a reason unrelated to the
 * guard. Reading `currentTime` settles that directly.
 */
export function playerCurrentTime(page: Page) {
  return page
    .locator(`${PLAYER_SELECTOR} video`)
    .evaluate((el) => (el as HTMLVideoElement).currentTime);
}

/** Progress POST'larini ushlaydi va yuborilgan tanalarni to'playdi. */
export async function captureProgressPosts(page: Page) {
  const bodies: Record<string, unknown>[] = [];
  await page.route('**/enrollments/*/watch/*', (route) => {
    try {
      bodies.push(JSON.parse(route.request().postData() || '{}'));
    } catch {
      bodies.push({});
    }
    return json(route, { success: true, data: {} });
  });
  return bodies;
}

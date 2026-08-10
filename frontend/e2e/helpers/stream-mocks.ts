import fs from 'fs';
import path from 'path';
import type { Page, Route } from '@playwright/test';
import { MOCK_USER, MOCK_SUBSCRIPTION_STATUS } from '../fixtures/mock-data';

export const TEST_VIDEO_ID = 'vid-stream-1';
export const TEST_COURSE_ID = 'course-stream-1';

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
    // BetaWelcomeModal `requestIdleCallback` orqali (timeout 3000ms) mount
    // bo'ladi va yana 850ms dan keyin ochiladi, ya'ni u sahifa yuklangandan
    // KEYIN, oldindan aytib bo'lmaydigan onda to'liq ekranli backdrop qo'yadi
    // va player tugmalariga bosishni to'sadi. Bu darsga aloqasi yo'q flakilik
    // manbai — modalni oldindan "ko'rilgan" deb belgilaymiz.
    localStorage.setItem('aidevix_beta_welcome_dismissed', '1');
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

/**
 * `GET /videos/:id` ni mock qiladi. `bodies` ketma-ketligi: birinchi so'rov
 * birinchi tanani oladi, ikkinchisi ikkinchisini va hokazo; ro'yxat tugagach
 * oxirgisi takrorlanadi. Poll va refetch testlari shunga tayanadi.
 * Har bir chaqiruv sonini o'lchash uchun qaytariladigan obyektdan foydalaning.
 */
export async function mockVideoDetail(page: Page, videoId: string, bodies: unknown[]) {
  const counter = { calls: 0 };
  // `/api/` prefix — not just `/videos/${videoId}` — matters here: the app's
  // own page route is also `/videos/${videoId}` (no `/api/` segment), and an
  // unscoped pattern intercepts that top-level navigation too, serving raw
  // JSON as the document instead of the app shell.
  const pattern = new RegExp(`/api/.*/videos/${videoId}(?:[?#]|$)`);
  await page.route(pattern, (route) => {
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

import { test, expect } from '@playwright/test';
import {
  TEST_VIDEO_ID,
  mockSubscribedUser,
  mockVideoDetail,
  mockPlayableHls,
  readyVideoBody,
  captureProgressPosts,
} from './helpers/stream-mocks';

// Vidstack's React `<MediaPlayer>` renders a plain `<div data-media-player>`
// wrapper in this build — not a literal `<media-player>` custom element tag
// (no Custom Elements registry is wired up). `[data-media-player]` is the
// selector that actually matches the rendered DOM; a tag-name locator finds
// nothing and every assertion below would time out regardless of app
// behaviour.
const PLAYER_SELECTOR = '[data-media-player]';

test.describe('Dars player — ulanish', () => {
  test.beforeEach(async ({ page }) => {
    await mockSubscribedUser(page);
    // Master playlist so'rovini ushlaymiz: haqiqiy oqim kerak emas, bizga
    // player manbani so'raganini bilish yetarli.
    await page.route('**/master.m3u8*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/vnd.apple.mpegurl',
        body: '#EXTM3U\n#EXT-X-VERSION:3\n',
      }),
    );
  });

  test('tayyor video uchun player mount bo\'ladi va manbani so\'raydi', async ({ page }) => {
    // Kengaytirilgan kutishlar (pastga qarang) global 60s test-timeout'iga
    // yetib qolishi mumkin — shu test uchun ayricha kengaytiramiz.
    test.setTimeout(90_000);
    await mockVideoDetail(page, TEST_VIDEO_ID, [readyVideoBody()]);

    // Bu shu faylning birinchi testi bo'lgani uchun `/videos/[id]` marshrutini
    // (vidstack + hls.js + framer-motion bilan ~4.5k modul) sovuq Next.js dev
    // serverida birinchi marta kompilyatsiya qiladi — bu yolg'iz o'zi 10-16s
    // olishi mumkin, standart 15s'dan oshib ketadi. Playwright har chaqiruvda
    // yangi dev server ko'taradi (`reuseExistingServer: false`), shuning uchun
    // bu kechikish oldindan isitib bo'lmaydigan, takrorlanuvchi holat — flakilik
    // emas. Shu ikkala kutish shu sababli kengaytirilgan.
    const playlistRequest = page.waitForRequest('**/master.m3u8*', { timeout: 45_000 });
    await page.goto(`/videos/${TEST_VIDEO_ID}`);

    await expect(page.locator(PLAYER_SELECTOR)).toBeVisible({ timeout: 30_000 });
    await playlistRequest;
  });

  test('iframe player butunlay yo\'q', async ({ page }) => {
    await mockVideoDetail(page, TEST_VIDEO_ID, [readyVideoBody()]);
    await page.goto(`/videos/${TEST_VIDEO_ID}`);
    await expect(page.locator(PLAYER_SELECTOR)).toBeVisible({ timeout: 20_000 });

    // Playground va sandbox iframe'lari boshqa sahifada; bu sahifada video
    // uchun iframe qolmasligi kerak.
    await expect(page.locator('iframe[allowfullscreen]')).toHaveCount(0);
  });

  test('progress POST tanasi positionSeconds yuboradi, watchedSeconds emas', async ({ page }) => {
    // Bu test uchun beforeEach'dagi bo'sh manifest yetarli emas: pozitsiya
    // hisoboti faqat LessonPlayer'ning haqiqiy `time-update` hodisasidan (native
    // <video> elementidan) keladi, va vidstack `paused` holatini native
    // `play`/`pause` hodisalaridan kuzatadi — buni tashqaridan qalbakilashtirib
    // bo'lmaydi. Shuning uchun `mockPlayableHls` bilan ffmpeg tomonidan oldindan
    // tayyorlangan ~4s, 2 segmentli haqiqiy HLS oqimini beramiz va "Play"
    // tugmasini bosib, haqiqiy pleyerni ishga tushiramiz.
    //
    // `useLessonStream`ning 10s throttle chegarasi (POSITION_REPORT_INTERVAL_S)
    // real vaqtda kutishni talab qiladi — buning o'rniga xuddi shu hook'dagi
    // ikkinchi, mustaqil real yo'lni ishlatamiz: tab yashiringanda darhol
    // flush qiladigan `visibilitychange` handler (useLessonStream.ts:128-137).
    // Bu ham sun'iy emas — foydalanuvchi darsni ochiq qoldirib boshqa tabga
    // o'tganda platformada haqiqatan sodir bo'ladigan yo'l.
    await mockPlayableHls(page);
    await mockVideoDetail(page, TEST_VIDEO_ID, [readyVideoBody()]);
    const posts = await captureProgressPosts(page);

    await page.goto(`/videos/${TEST_VIDEO_ID}`);
    await expect(page.locator(PLAYER_SELECTOR)).toBeVisible({ timeout: 20_000 });

    await page.getByRole('button', { name: 'Play' }).click();
    // Native <video> currentTime > 0 bo'lguncha bir necha timeupdate kerak.
    await page.waitForTimeout(1_500);

    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await expect.poll(() => posts.length, { timeout: 10_000 }).toBeGreaterThan(0);
    expect(posts[0]).toHaveProperty('positionSeconds');
    expect(posts[0]).not.toHaveProperty('watchedSeconds');
  });
});

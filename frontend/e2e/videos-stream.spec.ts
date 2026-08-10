import { test, expect } from '@playwright/test';
import {
  TEST_VIDEO_ID,
  mockSubscribedUser,
  mockVideoDetail,
  mockPlayableHls,
  readyVideoBody,
  preparingVideoBody,
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
    // `page.goto` ning standart 30s navigatsiya limiti bu marshrut uchun kam:
    // Playwright har chaqiruvda yangi dev server ko'taradi
    // (`reuseExistingServer: false`), shuning uchun `/videos/[id]` (vidstack +
    // hls.js + framer-motion, ~4.5k modul) SOVUQ kompilyatsiya qilinadi va
    // `load` hodisasi 30s dan kech kelishi mumkin. Bu kutilgan, takrorlanuvchi
    // holat — ilova xatosi emas.
    page.setDefaultNavigationTimeout(90_000);
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
    test.setTimeout(150_000);
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

test.describe('Playground sahifasi — player', () => {
  test.beforeEach(async ({ page }) => {
    page.setDefaultNavigationTimeout(90_000);
    await mockSubscribedUser(page);
    await page.route('**/master.m3u8*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/vnd.apple.mpegurl',
        body: '#EXTM3U\n#EXT-X-VERSION:3\n',
      }),
    );
  });

  test('playground ham HLS player ishlatadi', async ({ page }) => {
    // `/videos/[id]/playground` — Monaco + Pyodide script tag + vidstack +
    // hls.js + framer-motion — bu faylning shu marshrutga birinchi tashrifi
    // bo'lsa, sovuq Next.js dev server kompilyatsiyasi (`reuseExistingServer:
    // false`) yolg'iz o'zi 30-40s olishi mumkin. Yuqoridagi
    // 'tayyor video uchun player mount bo'ladi' testidagi kabi kengaytirilgan
    // budjet kerak — bu takrorlanuvchi holat, flakilik emas.
    test.setTimeout(150_000);
    await mockVideoDetail(page, TEST_VIDEO_ID, [readyVideoBody()]);
    const playlistRequest = page.waitForRequest('**/master.m3u8*', { timeout: 60_000 });

    await page.goto(`/videos/${TEST_VIDEO_ID}/playground`);

    await expect(page.locator(PLAYER_SELECTOR)).toBeVisible({ timeout: 30_000 });
    await playlistRequest;
  });

  test('playground ko\'r taymeri progress yubormaydi', async ({ page }) => {
    await mockVideoDetail(page, TEST_VIDEO_ID, [readyVideoBody()]);
    const posts = await captureProgressPosts(page);

    await page.goto(`/videos/${TEST_VIDEO_ID}/playground`);
    await expect(page.locator(PLAYER_SELECTOR)).toBeVisible({ timeout: 30_000 });

    // Eski kod har 10 soniyada video o'ynayotganini bilmay POST qilardi.
    await page.clock.install();
    await page.clock.fastForward('00:45');
    expect(posts.length).toBe(0);
  });
});

test.describe('Dars player — tayyorlanish va xato holatlari', () => {
  test.beforeEach(async ({ page }) => {
    // Xuddi yuqoridagi describe'dagi kabi: sovuq Next.js dev server
    // kompilyatsiyasi standart 30s navigatsiya limitidan oshib ketishi mumkin.
    page.setDefaultNavigationTimeout(90_000);
    await mockSubscribedUser(page);
    await page.route('**/master.m3u8*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/vnd.apple.mpegurl',
        body: '#EXTM3U\n#EXT-X-VERSION:3\n',
      }),
    );
  });

  test('processing video 30s dan keyin o\'zi qayta so\'raladi va player paydo bo\'ladi', async ({ page }) => {
    test.setTimeout(60_000);
    // Dev serverda `next.config.mjs`ning `reactStrictMode: true`si dastlabki
    // fetch effektini ATAYLAB ikki marta chaqiradi (mount → cleanup → mount),
    // shuning uchun ro'yxatda faqat bitta 'processing' tana bo'lsa, u shu
    // ikkilanishning o'zidayoq iste'mol qilinadi va "tayyorlanmoqda" ekrani
    // umuman ko'rinmay, to'g'ridan-to'g'ri 'ready'ga sakraydi — bu poll haqida
    // hech narsa isbotlamaydi. Bir nechta 'processing' tana bilan bufer
    // qo'yamiz.
    const counter = await mockVideoDetail(page, TEST_VIDEO_ID, [
      preparingVideoBody('processing'),
      preparingVideoBody('processing'),
      preparingVideoBody('processing'),
      readyVideoBody(),
    ]);

    // `clock.install()` `page.goto`dan OLDIN chaqiriladi: aks holda sahifa
    // yuklanishi paytida yaratilgan 30s poll `setInterval`ini soxta soat
    // qamrab ololmay qoladi (Playwright'ning virtual soati faqat o'zi
    // o'rnatilgandan keyin yaratilgan taymerlarni kuzatadi).
    await page.clock.install();
    await page.goto(`/videos/${TEST_VIDEO_ID}`);
    // `getByText` emas: `processingDesc`ning o'zida ham "tayyorlanmoqda" so'zi
    // bor (Task 3), shuning uchun matn qidiruvi ikki elementga (sarlavha +
    // paragraf) mos kelib strict-mode xatosini beradi. Sarlavhaga aniq qarab
    // ikkilanishni yo'qotamiz.
    await expect(page.getByRole('heading', { name: /tayyorlanmoqda/i })).toBeVisible({ timeout: 20_000 });
    const callsAfterSettle = counter.calls;

    // `clock.fastForward` hujjatga ko'ra navbatdagi har bir taymerni FAQAT BIR
    // MARTA otkazadi ("laptop qopqog'ini bir muddat yopib, keyin ochish"
    // simulyatsiyasi) — StrictMode'ning ikkilangan dastlabki so'rovi nechta
    // bo'lganini oldindan aniq bilib bo'lmagani uchun, player ko'rinmaguncha
    // bir necha marta 30+ soniyalik sakrash qilamiz.
    for (let i = 0; i < 4 && !(await page.locator(PLAYER_SELECTOR).isVisible()); i++) {
      await page.clock.fastForward('00:35');
    }

    await expect(page.locator(PLAYER_SELECTOR)).toBeVisible({ timeout: 5_000 });
    expect(counter.calls).toBeGreaterThan(callsAfterSettle);
  });

  test('failed video xato ekranini ko\'rsatadi va pollinqni to\'xtatadi', async ({ page }) => {
    const counter = await mockVideoDetail(page, TEST_VIDEO_ID, [preparingVideoBody('failed')]);

    await page.clock.install();
    await page.goto(`/videos/${TEST_VIDEO_ID}`);
    await expect(page.getByText(/administratorga murojaat/i)).toBeVisible({ timeout: 20_000 });

    const callsAfterLoad = counter.calls;
    await page.clock.fastForward('01:10');
    expect(counter.calls).toBe(callsAfterLoad);
  });

  test('kutish ekranida Bunny.net so\'zi yo\'q', async ({ page }) => {
    await mockVideoDetail(page, TEST_VIDEO_ID, [preparingVideoBody('processing')]);
    await page.goto(`/videos/${TEST_VIDEO_ID}`);
    // `getByText` emas: `processingDesc`ning o'zida ham "tayyorlanmoqda" so'zi
    // bor (Task 3), shuning uchun matn qidiruvi ikki elementga (sarlavha +
    // paragraf) mos kelib strict-mode xatosini beradi. Sarlavhaga aniq qarab
    // ikkilanishni yo'qotamiz.
    await expect(page.getByRole('heading', { name: /tayyorlanmoqda/i })).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('body')).not.toContainText(/bunny/i);
  });
});

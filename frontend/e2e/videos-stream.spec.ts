import { test, expect } from '@playwright/test';
import {
  TEST_VIDEO_ID,
  mockSubscribedUser,
  mockVideoDetail,
  mockPlayableHls,
  readyVideoBody,
  preparingVideoBody,
  captureProgressPosts,
  suppressMarketingChromeTimers,
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
    // `next/dynamic()` orqali kechiktirib mount bo'ladigan marketing-chrome
    // komponentlari (LiveActivityTicker, BetaWelcomeModal va h.k.) darsga
    // aloqasi yo'q, lekin ularning `requestIdleCallback` taymeri ham soxta
    // soat ostida — pastdagi 140s'gacha fastForward webpack'ning ICHKI
    // chunk-yuklash taymeridan (120s) oshib ketadi va ular hali
    // yuklanmasdan turib `ChunkLoadError` bilan Next dev-overlay butun
    // sahifani "o'ldiradi". Batafsili uchun helper'dagi izohga qarang.
    await suppressMarketingChromeTimers(page);
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

test.describe('Dars player — token va resume', () => {
  test.beforeEach(async ({ page }) => {
    // Xuddi yuqoridagi describe'lardagi kabi: sovuq Next.js dev server
    // kompilyatsiyasi standart 30s navigatsiya limitidan oshib ketishi mumkin.
    page.setDefaultNavigationTimeout(90_000);
    await mockSubscribedUser(page);
    // Boshqa describe'lardagi bo'sh/soxta manifest ("#EXTM3U\n#EXT-X-VERSION:3\n")
    // bu yerda ishlamaydi: unda hech qanday level yo'q, shuning uchun hls.js uni
    // DARHOL fatal xato ("no levels found in manifest") deb rad etadi. Bu esa
    // pastdagi ikkita testda o'zining `onError` orqali kutilmagan refetch
    // qo'zg'atib, tasodifiy bo'lib qoladigan raqob qiladi — va uchinchi testda
    // `handleCanPlay` HECH QACHON chaqirilmasligi mumkin (media hech qachon
    // playable holatga yetmaydi), ya'ni resume-qamrov tekshiruvi HAQIQATDA HECH
    // NARSANI tekshirmay, faqat tasodifan yashil chiqib qoladi. Shu describe'ga
    // haqiqatan ijro etiladigan minimal HLS oqimini ulaymiz — shunda `canPlay`
    // haqiqiy davomiylik (`duration`) bilan chaqiriladi va yagona xato manbai
    // faqat testning O'ZI qo'zg'atgan sun'iy hodisa bo'lib qoladi.
    await mockPlayableHls(page);
  });

  test('token tugashiga 6 daqiqa qolganda proaktiv qayta so\'raladi', async ({ page }) => {
    // Shu faylning shu describe'dagi birinchi testi sovuq dev-server
    // kompilyatsiyasiga (yuqoridagi 'ulanish' describe'idagi kabi) duch kelishi
    // mumkin — kengaytirilgan test-timeout.
    test.setTimeout(150_000);
    await page.clock.install();
    // 02:00'lik fastForward yolg'iz o'zi ~120s chegarasiga yaqin — yettita
    // kechiktirilgan marketing-chrome vidjetining soxta-soat/haqiqiy-tarmoq
    // poyg'asida yiqilib ketishining oldini olamiz (faylning tepasidagi va
    // helper'dagi izohga qarang).
    await suppressMarketingChromeTimers(page);

    const soon = readyVideoBody({
      player: {
        type: 'hls',
        hlsUrl: 'https://stream.test/vod/aidevix/vid.mp4/master.m3u8?token=t1',
        expiresAt: new Date(Date.now() + 6 * 60 * 1000).toISOString(),
      },
    });
    // `reactStrictMode` dastlabki fetch effektini ikki marta chaqiradi (mount →
    // cleanup → mount) — ikki elementli ro'yxat (`[soon, ready]`) shu
    // ikkilanishning o'zidayoq iste'mol qilinib, player uzoq-muddatli token
    // bilan mount bo'lardi va proaktiv taymer hech qachon qisqa lead bilan
    // o'rnatilmasdi. `soon`ni ikki marta qo'yib, ikkilanishdan keyin ham
    // faol holat "tez tugaydigan token" bo'lishini ta'minlaymiz.
    const counter = await mockVideoDetail(page, TEST_VIDEO_ID, [soon, soon, readyVideoBody()]);

    await page.goto(`/videos/${TEST_VIDEO_ID}`);
    // `LessonPlayer`ning o'zi ham `next/dynamic()` orqali keladi (sahifaning
    // boshqa yettita marketing-chrome vidjeti kabi): uning webpack chunk
    // so'rovi haqiqiy tarmoqqa ketadi, lekin script yuklangandan keyingi
    // ichki hal qiluvchi (`resolve`) chaqiruv soxta soat ostidagi 0-kechikishli
    // taymerga bog'liq bo'lib chiqadi — faqat haqiqiy vaqt kutish yetarli
    // emas, chunki o'sha taymer hech qachon o'zi otilmaydi. Mayda haqiqiy
    // kutish (tarmoq/kompilyatsiya uchun) va mayda virtual tik (navbatdagi
    // 0-kechikishli taymerlarni bo'shatish uchun) navbat bilan takrorlanadi —
    // 120s'lik webpack chunk-taymeridan olisroq turish uchun ataylab kichik.
    for (let i = 0; i < 20 && !(await page.locator(PLAYER_SELECTOR).isVisible()); i += 1) {
      await page.waitForTimeout(500);
      await page.clock.fastForward('00:01');
    }
    await expect(page.locator(PLAYER_SELECTOR)).toBeVisible({ timeout: 5_000 });
    // StrictMode ikkilanishi tufayli mount paytidagi aniq chaqiruvlar soni
    // oldindan noma'lum — o'zgarmas boshlang'ich qiymat sifatida shu yerdagi
    // haqiqiy sonni olamiz (pastdagi processing-poll testidagi naqsh).
    const callsAfterSettle = counter.calls;

    // 5 daqiqalik lead → ~1 daqiqadan keyin ishga tushishi kerak.
    await page.clock.fastForward('02:00');
    await expect.poll(() => counter.calls, { timeout: 10_000 }).toBeGreaterThan(callsAfterSettle);
  });

  test('ketma-ket xatolar bitta refetch beradi (30s tormoz)', async ({ page }) => {
    // Vidstack `onError` propi HECH QACHON tashqi DOM hodisasi sifatida
    // eshittirilmaydi: @vidstack/react manba kodida (`MediaPlayerDelegate.
    // notify`) callback to'g'ridan-to'g'ri ICHKI `dispatch` handle orqali
    // chaqiriladi, `el.dispatchEvent(new CustomEvent('error', ...))` uni
    // umuman qo'zg'atmaydi (native `<video>` elementining o'z error
    // listeneri ham bor, lekin u faqat brauzer HAQIQATAN o'rnatgan
    // `media.error`ni ko'rib ishlaydi — sun'iy hodisa buni to'ldirmaydi).
    // Shuning uchun HAQIQIY fatal HLS xatosini ikki marta hosil qilamiz:
    // manifest doim buzuq (level'siz) qaytadi, va ikkinchi javob
    // birinchisidan BOSHQA `hlsUrl` beradi — shu farq vidstack'ni manifestni
    // QAYTA yuklashga (demak yana fatal xatoga uchrashga) majbur qiladi.
    let hlsErrorCount = 0;
    page.on('console', (msg) => {
      if (msg.text().includes('manifestParsingError')) hlsErrorCount += 1;
    });
    await page.route('**/master.m3u8*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/vnd.apple.mpegurl',
        body: '#EXTM3U\n#EXT-X-VERSION:3\n',
      }),
    );
    const brokenA = readyVideoBody({
      player: {
        type: 'hls',
        hlsUrl: 'https://stream.test/vod/aidevix/vid.mp4/master.m3u8?token=a',
        expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      },
    });
    const brokenB = readyVideoBody({
      player: {
        type: 'hls',
        hlsUrl: 'https://stream.test/vod/aidevix/vid.mp4/master.m3u8?token=b',
        expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      },
    });
    // `brokenA` ikki marta: StrictMode'ning ikkilangan dastlabki fetch
    // effekti ro'yxatni ikki marotaba iste'mol qilishi mumkin — shunda ham
    // player birinchi (fatal xatoga uchraydigan) `hlsUrl` bilan mount bo'ladi.
    const counter = await mockVideoDetail(page, TEST_VIDEO_ID, [brokenA, brokenA, brokenB]);

    await page.goto(`/videos/${TEST_VIDEO_ID}`);
    await expect(page.locator(PLAYER_SELECTOR)).toBeVisible({ timeout: 20_000 });

    // Birinchi fatal xato o'zining refetch'ini (token=b) qo'zg'atadi —
    // cooldown bo'sh bo'lgani uchun bu O'TADI.
    await expect.poll(() => counter.calls, { timeout: 20_000 }).toBeGreaterThanOrEqual(3);
    // token=b manifesti ham buzuq — ikkinchi fatal xato tez orada keladi.
    await expect.poll(() => hlsErrorCount, { timeout: 20_000 }).toBeGreaterThanOrEqual(2);

    // Ikkinchi xato 30s tormoz ostida qoladi: yana bir necha soniya kutib,
    // chaqiruvlar soni 3'da to'xtab qolganini tasdiqlaymiz (4'ga chiqmaydi).
    await page.waitForTimeout(3_000);
    expect(counter.calls).toBe(3);
  });

  test('duration dan katta eski pozitsiya seek qilmaydi', async ({ page }) => {
    // 4650 soniyalik kumulyativ qoldiq (eski `watchedSeconds` shartnomasidagi
    // 10+20+…+300 naqshi) — istalgan haqiqiy dars davomiyligidan (bu
    // describe'dagi `mockPlayableHls` beradigan ~4s'lik namunadan ham, video
    // metama'lumotidagi 600s'dan ham) beqiyos katta, shuning uchun guard
    // ANIQ ishga tushishi kerak. `handleCanPlay`ning duration'i
    // `MediaCanPlayDetail`dan — vidstack'ning HAQIQIY <video> elementidan —
    // keladi, mock video body'sining `duration: 600` maydonidan emas.
    await mockVideoDetail(page, TEST_VIDEO_ID, [
      readyVideoBody({ progress: { lastPositionSeconds: 4650 } }),
    ]);

    await page.goto(`/videos/${TEST_VIDEO_ID}`);
    await expect(page.locator(PLAYER_SELECTOR)).toBeVisible({ timeout: 20_000 });

    // Resume toast'i chiqmasligi kerak — seek bo'lmadi.
    await page.waitForTimeout(2000);
    await expect(page.getByText(/davom ettirildi/i)).toHaveCount(0);
  });
});

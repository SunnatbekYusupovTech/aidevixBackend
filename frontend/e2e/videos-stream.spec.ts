import { test, expect } from '@playwright/test';
import {
  TEST_VIDEO_ID,
  TEST_VIDEO_ID_2,
  TEST_COURSE_ID,
  PLAYER_SELECTOR,
  mockSubscribedUser,
  mockVideoDetail,
  mockCoursePage,
  videoDetailPattern,
  videoWithId,
  mockPlayableHls,
  mockLongPlayableHls,
  waitForCanPlay,
  playerCurrentTime,
  readyVideoBody,
  preparingVideoBody,
  captureProgressPosts,
  suppressMarketingChromeTimers,
} from './helpers/stream-mocks';

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
    // serverida birinchi marta kompilyatsiya qiladi. Bu kompilyatsiya vaqti
    // mashina yukiga qarab talaygina o'zgaruvchan (kuzatilgan: butun fayl
    // ishga tushirilganda ba'zan 45s'dan oshadi, alohida ishga tushirilganda
    // esa yo'q) — Playwright har chaqiruvda yangi dev server ko'taradi
    // (`reuseExistingServer: false`), shuning uchun bu oldindan isitib
    // bo'lmaydigan holat.
    //
    // AVVAL o'zimiz "isitib" olamiz: birinchi tashrif — hech qanday qat'iy
    // vaqt oynasiga bog'lanmagan holda — kompilyatsiya narxini to'laydi.
    // Muammo aslida `page.waitForRequest`ning qat'iy 45s oynasi `goto`dan
    // OLDIN sanoq boshlagani edi: agar sovuq kompilyatsiyaning o'zi shu
    // oynaning ko'p qismini yeb qo'ysa, haqiqiy manifest so'rovi uchun
    // deyarli vaqt qolmay, test soxta yiqilardi — bu ilova xatosi emas,
    // sinov qurilishining o'zidagi poyga edi. Marshrut isigandan keyin
    // ikkinchi (`reload`) tashrifda kompilyatsiya narxi yo'q, shuning uchun
    // haqiqiy vaqt-o'lchovli tekshiruv endi ishonchli budjetga ega bo'ladi.
    await page.goto(`/videos/${TEST_VIDEO_ID}`);
    await expect(page.locator(PLAYER_SELECTOR)).toBeVisible({ timeout: 120_000 });

    const playlistRequest = page.waitForRequest('**/master.m3u8*', { timeout: 20_000 });
    await page.reload();
    await expect(page.locator(PLAYER_SELECTOR)).toBeVisible({ timeout: 20_000 });
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
    // Ro'yxat-o'rin (index) asosidagi qattiq ketma-ketlik ("ikki marta
    // brokenA, keyin brokenB") StrictMode'ning dastlabki fetch effektini
    // ANIQ ikki marta chaqirishiga qaramlik qilardi — agar u faqat bir marta
    // chaqirilsa, birinchi xato-refetch xuddi shu `brokenA`ni qayta olardi
    // (hlsUrl o'zgarmagani uchun qayta yuklanish yo'q, ikkinchi xato ham
    // yo'q), va test tormoz haqida hech narsa isbotlamay, mutlaqo BOSHQA
    // sababdan qizarardi. Shu o'rniga javob TARKIBI (necha marta so'ralgani
    // emas) hal qiladi: birinchi HAQIQIY fatal xato ro'y berguncha har doim
    // `brokenA` qaytariladi (necha marta StrictMode chaqirsa ham bir xil
    // manba, ikkilanish ahamiyatsiz), shundan keyin har doim `brokenB`.
    //
    // Vaqt-asosidagi "shu lahzada nechta chaqiruv bo'lgan" baholashi (test
    // 1'dagi kabi) bu yerda ISHLAMAYDI: manifest ATAYLAB doim buzuq bo'lgani
    // uchun StrictMode'ning ikkilangan mount'i, birinchi xato VA undan
    // kelib chiqqan refetch hammasi bitta Node event-loop tikida, hatto
    // `[data-media-player]` "visible" bo'lgunchayoq, tugab qolishi mumkin
    // (kuzatilgan: shu boshqacha yondashuvga o'tishdan oldin `visible`dan
    // keyin olingan boshlang'ich nuqta ham allaqachon refetch'dan KEYINGI
    // holatni ko'rsatardi). Shuning uchun "qachon" emas, "nechta chaqiruv
    // qaysi tanani oldi" ni sanaymiz — bu STATIK, hech qanday poyga yo'q:
    // `hlsErrorCount === 0` bo'lgan har bir chaqiruv `brokenA` oladi
    // (StrictMode ikkilanishi shu sonni o'zgartirishi mumkin, lekin
    // baribir `brokenA`), birinchi xatodan keyingi HAR bir chaqiruv esa
    // `brokenB` oladi — demak `servedBroken.b` soni ANIQ "nechta refetch
    // xato tufayli sodir bo'ldi" degani, StrictMode'ning boshlang'ich
    // chaqiruvlar soniga mutlaqo bog'liq bo'lmagan holda.
    const counter = { calls: 0 };
    const servedBroken = { a: 0, b: 0 };
    await page.route(videoDetailPattern(TEST_VIDEO_ID), (route) => {
      counter.calls += 1;
      const isFirstPhase = hlsErrorCount === 0;
      servedBroken[isFirstPhase ? 'a' : 'b'] += 1;
      const body = isFirstPhase ? brokenA : brokenB;
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });

    await page.goto(`/videos/${TEST_VIDEO_ID}`);
    await expect(page.locator(PLAYER_SELECTOR)).toBeVisible({ timeout: 20_000 });

    // Ikkinchi HAQIQIY fatal xato faqat vidstack `brokenB`ni (boshqa
    // `hlsUrl`ni) haqiqatan qayta yuklagandan keyin sodir bo'lishi mumkin —
    // demak shu tekshiruv o'zi "cooldown BIRINCHI refetch'ni o'tkazib
    // yuborgani"ning dalili.
    await expect.poll(() => hlsErrorCount, { timeout: 20_000 }).toBeGreaterThanOrEqual(2);

    // Butun jarayondan aynan BITTA refetch kelib chiqqan (`brokenB` aynan
    // bir marta so'ralgan) — StrictMode'ning dastlabki chaqiruvlar soniga
    // ham (`servedBroken.a` istalgan qiymatda bo'lishi mumkin), "ikki yoki
    // undan ko'p" degan buzilgan tormozga ham bog'liq bo'lmagan tekshiruv.
    expect(servedBroken.b).toBe(1);

    // Ikkinchi xato 30s tormoz ostida qoladi: yana bir necha soniya kutib,
    // yana bir refetch (demak yana bir `brokenB` so'rovi) sodir bo'lmaganini
    // tasdiqlaymiz.
    await page.waitForTimeout(3_000);
    expect(servedBroken.b).toBe(1);
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

    // Flat 2s wall-clock kutish emas: `data-can-play`ni kutamiz — bu
    // `handleCanPlay` (demak, agar guard ruxsat bersa, seek) allaqachon
    // ishlagan aniq lahza. Flat kutish `react-hot-toast`ning ~2s+~1s chiqish
    // animatsiyasi bilan poyga qilardi va band mashinada `canPlay` shu
    // oyna tashqarisida kelsa, tekshiruv HECH NARSANI isbotlamay o'tib
    // ketardi.
    await waitForCanPlay(page);

    // Resume toast'i chiqmasligi kerak — seek bo'lmadi.
    await expect(page.getByText(/davom ettirildi/i)).toHaveCount(0);
    // Toast yo'qligiga tayanish yetarli emas: agar vidstack'ning
    // `currentTime` setter'i real duration'dan katta qiymatda jimgina hech
    // narsa qilmasa (yoki tashqi throw qilsa-yu shu throw yutilib ketsa),
    // `onResume` chaqirilmay, toast HAM chiqmaydi — lekin bu guard
    // ishlagani uchun emas. Native <video>ning `currentTime`sini bevosita
    // o'qib, seek haqiqatan bo'lmaganini mustaqil tasdiqlaymiz.
    await expect.poll(() => playerCurrentTime(page), { timeout: 5_000 }).toBeLessThan(1);
  });

  test('darsning ichkarisidagi eski pozitsiya seek qiladi (40s namuna, 15s marjadan yiroq)', async ({ page }) => {
    // Finding 2: `mockPlayableHls`ning ~4s namunasida `duration - 15`
    // manfiy chiqadi, shuning uchun HAR QANDAY `startAt > 5` rad etiladi —
    // `END_GUARD_SECONDS`ni 15'dan 0'ga o'zgartirish ham bu holatda test'ni
    // yashil qoldiradi. 40s'lik uzunroq namunada `duration - 15 = 25`,
    // shuning uchun 20s (darsning "ichkarisida", 25'dan kichik) haqiqatan
    // marjaning O'ZINI, uning shunchaki mavjudligini emas, tekshiradi.
    await mockLongPlayableHls(page);
    await mockVideoDetail(page, TEST_VIDEO_ID, [
      readyVideoBody({ progress: { lastPositionSeconds: 20 } }),
    ]);

    await page.goto(`/videos/${TEST_VIDEO_ID}`);
    await expect(page.locator(PLAYER_SELECTOR)).toBeVisible({ timeout: 20_000 });
    await waitForCanPlay(page);

    await expect(page.getByText(/davom ettirildi/i)).toBeVisible({ timeout: 10_000 });
    await expect.poll(() => playerCurrentTime(page), { timeout: 10_000 }).toBeGreaterThan(15);
  });

  test('darsning oxirgi 15 soniyasidagi eski pozitsiya seek qilmaydi (40s namuna, 15s marja)', async ({ page }) => {
    // Xuddi yuqoridagi test bilan bir juft: 40s namunada `duration - 15 =
    // 25`, shuning uchun 30s (25'dan katta — darsning oxirgi 15
    // soniyasida) marjaning ANIQ chegarasini rad etadi. Ikkalasi birga
    // "duration'dan katta" (eski test) va "marja ICHIDA/TASHQARISIDA"
    // shartlarini bir-biridan ajratadi.
    await mockLongPlayableHls(page);
    await mockVideoDetail(page, TEST_VIDEO_ID, [
      readyVideoBody({ progress: { lastPositionSeconds: 30 } }),
    ]);

    await page.goto(`/videos/${TEST_VIDEO_ID}`);
    await expect(page.locator(PLAYER_SELECTOR)).toBeVisible({ timeout: 20_000 });
    await waitForCanPlay(page);

    await expect(page.getByText(/davom ettirildi/i)).toHaveCount(0);
    await expect.poll(() => playerCurrentTime(page), { timeout: 5_000 }).toBeLessThan(1);
  });
});

test.describe('Dars player — darslar orasida almashinuv', () => {
  test.beforeEach(async ({ page }) => {
    page.setDefaultNavigationTimeout(90_000);
    await mockSubscribedUser(page);
    // Haqiqiy (o'ynaydigan) oqim: bo'sh manifest hls.js'da fatal xato berib,
    // `onError` orqali kutilmagan refetch qo'zg'atardi — bu testda esa aynan
    // so'rovlar ketma-ketligi o'lchanadi.
    await mockPlayableHls(page);
  });

  test('boshqa darsning kechikkan javobi ochiq darsni abadiy spinnerda qoldirmaydi', async ({ page }) => {
    // Kurs sahifasi ham, dars sahifasi ham shu faylda birinchi marta sovuq
    // kompilyatsiya qilinishi mumkin (`reuseExistingServer: false`).
    test.setTimeout(180_000);

    // ── Ssenariy (haqiqiy ikki bosishlik yo'l) ────────────────────────────
    // Foydalanuvchi `pending` holatidagi 2-darsni ochadi: backend javobi
    // mkhls'ga borgani uchun sekin. Kutmasdan Orqaga bosib, tayyor 1-darsni
    // ochadi — u darhol o'ynay boshlaydi. SHUNDAN KEYIN 2-darsning kechikkan
    // javobi keladi. `videos.current` butun ilova uchun bitta slot bo'lgani
    // uchun tuzatishdan oldin u 1-darsni bosib ketardi va sahifa `player`ni
    // ham, `streamStatus`ni ham ko'rmay qolib, ABADIY spinnerga tushardi
    // (xato yo'q, poll yo'q, `onError` yo'q, qayta fetch yo'q — faqat qattiq
    // reload qutqarardi).
    //
    // Sekin javob QO'LDA ochiladigan "eshik" ortida ushlab turiladi, real
    // kechikish bilan emas: shunda "avval 1-dars javobi, keyin 2-darsniki"
    // tartibi mashina yukiga bog'liq bo'lmay, ANIQ kafolatlanadi.
    let releaseSlow: () => void = () => {};
    const slowGate = new Promise<void>((resolve) => {
      releaseSlow = resolve;
    });
    const slow = { requested: 0, served: 0 };

    await page.route(videoDetailPattern(TEST_VIDEO_ID_2), async (route) => {
      slow.requested += 1;
      await slowGate;
      slow.served += 1;
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(
          preparingVideoBody('processing', {
            video: videoWithId(TEST_VIDEO_ID_2, 'Ikkinchi dars'),
          }),
        ),
      });
    });
    await mockVideoDetail(page, TEST_VIDEO_ID, [readyVideoBody()]);
    await mockCoursePage(page, TEST_COURSE_ID, [
      videoWithId(TEST_VIDEO_ID_2, 'Ikkinchi dars'),
      videoWithId(TEST_VIDEO_ID, 'Test dars'),
    ]);

    await page.goto(`/courses/${TEST_COURSE_ID}`);
    await expect(page.getByRole('link', { name: 'Ikkinchi dars' })).toBeVisible({ timeout: 90_000 });

    // 1) Sekin (tayyorlanayotgan) darsga o'tamiz — javobi ushlab qolinadi.
    await page.getByRole('link', { name: 'Ikkinchi dars' }).click();
    await expect(page).toHaveURL(new RegExp(`/videos/${TEST_VIDEO_ID_2}`), { timeout: 90_000 });
    await expect.poll(() => slow.requested, { timeout: 30_000 }).toBeGreaterThan(0);

    // 2) Orqaga — SPA navigatsiyasi, store saqlanadi, so'rov hamon uchmoqda.
    await page.goBack();
    await expect(page.getByRole('link', { name: 'Test dars' })).toBeVisible({ timeout: 60_000 });

    // 3) Tayyor darsni ochamiz — javobi darhol keladi, player mount bo'ladi.
    await page.getByRole('link', { name: 'Test dars' }).click();
    await expect(page.locator(PLAYER_SELECTOR)).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole('heading', { level: 1, name: 'Test dars' })).toBeVisible();

    // 4) Endi eski darsning javobi keladi — ochiq sahifaga tegmasligi kerak.
    releaseSlow();
    await expect.poll(() => slow.served, { timeout: 30_000 }).toBeGreaterThan(0);

    // React javobni qayta ishlashiga (buzuq holatda — player'ni uzib, to'liq
    // ekranli spinnerga tushishiga) yetarli vaqt beramiz.
    await page.waitForTimeout(3_000);

    expect(page.url()).toContain(`/videos/${TEST_VIDEO_ID}`);
    await expect(page.locator(PLAYER_SELECTOR)).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: 'Test dars' })).toBeVisible();
  });
});

test.describe('Dars player — token yangilanishida uzluksizlik', () => {
  test.beforeEach(async ({ page }) => {
    await mockSubscribedUser(page);
  });

  // Regressiya: token yangilanganda `hlsUrl` almashadi, bu provayderni qayta
  // qurishga majbur qiladi va u PAUZADA qaytadi. Jonli stack'da o'lchangan —
  // 360s'lik token bilan dars ~57-soniyada jimgina qotib qolardi, ya'ni aynan
  // 60s'lik lead nuqtasida. Yangilanishning butun maqsadi ko'rinmas bo'lish.
  //
  // Soxta soat ishlatilmaydi: bu yerda haqiqiy o'ynash kerak, `page.clock` esa
  // hls.js'ning tarmoq bilan poyg'asini buzadi.
  test('token yangilangach o\'ynash to\'xtamaydi', async ({ page }) => {
    test.setTimeout(180_000);
    await mockLongPlayableHls(page);

    // Manba almashuvini aynan shu hodisadan bilamiz: yangilanish yangi token
    // bilan `master.m3u8`ni qaytadan so'raydi.
    let manifestRequests = 0;
    page.on('response', (r) => {
      if (r.url().includes('master.m3u8')) manifestRequests += 1;
    });

    const soon = readyVideoBody({
      player: {
        type: 'hls',
        hlsUrl: 'https://stream.test/vod/aidevix/vid.mp4/master.m3u8?token=first',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000 + 2_000).toISOString(),
      },
    });
    const refreshed = readyVideoBody({
      player: {
        type: 'hls',
        // Boshqa token -> boshqa URL -> manba almashadi, haqiqiy yangilanishdagidek.
        hlsUrl: 'https://stream.test/vod/aidevix/vid.mp4/master.m3u8?token=second',
        expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
      },
    });
    // `reactStrictMode` dastlabki fetch effektini ikki marta chaqiradi.
    await mockVideoDetail(page, TEST_VIDEO_ID, [soon, soon, refreshed]);

    await page.goto(`/videos/${TEST_VIDEO_ID}`);
    await expect(page.locator(PLAYER_SELECTOR)).toBeVisible({ timeout: 60_000 });

    // Play tugmasi orqali — `video.play()`ni to'g'ridan-to'g'ri chaqirish bu
    // harness'da avtoo'ynash siyosatiga urilib pauzada qolib ketadi.
    await page.evaluate(() => {
      const v = document.querySelector('video') as HTMLVideoElement | null;
      if (v) v.muted = true;
    });
    await page.getByRole('button', { name: 'Play' }).click();

    const state = () =>
      page.evaluate(() => {
        const v = document.querySelector('video') as HTMLVideoElement | null;
        return v ? { t: v.currentTime, paused: v.paused } : { t: -1, paused: true };
      });

    await expect.poll(async () => (await state()).paused, { timeout: 30_000 }).toBe(false);
    const seenBefore = manifestRequests;
    const before = await state();

    // Fixture 40 soniyalik, yangilanish esa hook'dagi 30s'lik minimal kechikish
    // polidan oldin bo'lolmaydi. Shuning uchun qat'iy kutish emas, aynan almashuv
    // hodisasini kutamiz — aks holda video oxiriga yetib o'z-o'zidan to'xtaydi va
    // test yangilanishga aloqasi yo'q sabab bilan qizarardi.
    await expect
      .poll(() => manifestRequests, { timeout: 60_000, intervals: [1000] })
      .toBeGreaterThan(seenBefore);

    await page.waitForTimeout(4_000);

    const after = await state();
    expect(after.paused).toBe(false);
    expect(after.t).toBeGreaterThan(before.t);
  });
});

# Plan 3 — Frontend HLS player va admin panel

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aidevix frontend'ini Bunny `<iframe>` dan mkhls HLS player'iga ko'chirish (resume, progress, token yangilash, tayyorlanmoqda polling'i) va admin panelni `streamStatus` shartnomasiga o'tkazish.

**Architecture:** Ikkita yangi birlik. `components/videos/LessonPlayer.tsx` — faqat o'ynatadi (Vidstack + bundle qilingan hls.js), Redux'ni ham API'ni ham bilmaydi. `hooks/useLessonStream.ts` — faqat hayot sikli (fetch, polling, token taymerlari, throttled progress), DOM'ga tegmaydi. Ikkala dars sahifasi shu ikkitasini ulaydi va o'zining gate/xato ekranlarini chizadi. Admin panel alohida — u player ishlatmaydi, faqat nomlash va status oqimi.

**Tech Stack:** Next.js 14 (App Router), React 18, Redux Toolkit, TypeScript, Tailwind + daisyUI, `@vidstack/react` 1.15.x, `hls.js` 1.6.x, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-10-plan3-frontend-player-admin-design.md`
**Oldingi bosqich:** `docs/superpowers/HANDOFF.md`

---

## Global Constraints

Har bir taskning talablari ushbu bo'limni o'z ichiga oladi.

- **Vidstack versiyasi majburiy qadaladi: `1.15.6`.** npm'dagi `latest` dist-tegi
  **`0.6.15`** — butunlay boshqa, eski API. `npm i @vidstack/react` eskisini o'rnatadi va
  bu rejadagi hech bir kod kompilatsiya qilinmaydi. `@vidstack/react@1.15.6` va
  `vidstack@1.15.6` aniq yoziladi.
- **`hls.js` aniq dependency.** Vidstack aks holda uni runtime'da JSDelivr CDN'dan
  `import()` qiladi — pullik darsning o'ynashi uchinchi tomonga bog'lanib qoladi.
  `provider.library = HLS` orqali uzatiladi.
- **Progress tanasi har doim `{ positionSeconds }`.** `watchedSeconds` nomi hech qayerda
  yuborilmaydi (backend uni faqat bitta reliz qabul qiladi).
- **Transcode foizi hech qayerda ko'rsatilmaydi.** Faqat `presetsDone.length / presetsTotal`
  va `n/m preset` matni. mkhls `progress_percent`ni hech qachon oshirmaydi.
- **`streamPath` student kodida ham, admin ro'yxatida ham ko'rsatilmaydi va so'ralmaydi.**
- **Uch til.** `videos/[id]/page.tsx` va `admin/**` inline `localText` naqshini ishlatadi;
  `playground/page.tsx` `t()` ni ishlatadi. Har bir fayl **o'z mavjud naqshiga** ergashadi.
- **Branch:** `main` (hozir `origin/main`dan 35 commit oldinda). **Push qilinmaydi.**
- Har bir commit oxirida: `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>`
- Barcha buyruqlar `aidevixBackend/frontend/` ichida bajariladi, aks holda alohida aytiladi.

---

## File Structure

| Fayl | Holat | Mas'uliyati |
|---|---|---|
| `src/components/videos/LessonPlayer.tsx` | **yangi** | Faqat o'ynatish: Vidstack + hls.js, resume seek, hodisa chiqarish |
| `src/hooks/useLessonStream.ts` | **yangi** | Faqat hayot sikli: fetch, polling, token taymerlari, progress throttle |
| `src/types/video.ts` | o'zgaradi | `Player`, `Progress`, `StreamStatus` shartnomasi |
| `src/store/slices/videoSlice.ts` | o'zgaradi | `progress` va `streamStatus`ni saqlash |
| `src/hooks/useVideos.ts` | o'zgaradi | Yangi maydonlarni chiqarish |
| `src/api/videoApi.ts` | o'zgaradi | `saveProgress` tanasi |
| `src/app/videos/[id]/page.tsx` | o'zgaradi | Player ulash, `failed` ekrani, eskirgan matnlar |
| `src/app/videos/[id]/playground/page.tsx` | o'zgaradi | Bir xil player, ko'r taymerni olib tashlash |
| `src/api/adminApi.ts` | o'zgaradi | `linkVideoToStream`, `bulkLinkBunny` olib tashlanadi |
| `src/app/admin/courses/[id]/page.tsx` | o'zgaradi | `streamStatus`, transcode progressi, yuklash oqimi |
| `src/app/admin/tools/page.tsx` | o'zgaradi | CSV bulk-link bo'limi olib tashlanadi |
| `e2e/videos-stream.spec.ts` | **yangi** | Student player va hayot sikli testlari |
| `e2e/admin-videos.spec.ts` | **yangi** | Admin status va transcode progressi testlari |
| `e2e/helpers/stream-mocks.ts` | **yangi** | Umumiy mock quruvchilar (ikkala spec ishlatadi) |

---

## Task 1: Bog'liqliklar va `LessonPlayer` komponenti

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/src/components/videos/LessonPlayer.tsx`

**Interfaces:**
- Consumes: hech narsa (birinchi task)
- Produces: `LessonPlayer` default export, props interfeysi
  `LessonPlayerProps { hlsUrl: string; poster?: string; startAt: number; onPosition(seconds: number): void; onError(): void; onResume?(seconds: number): void }`

Bu task hech qayerga ulanmaydi — shuning uchun uning darvozasi e2e emas, **`typecheck` + `build`**. `build` ataylab: u Vidstack CSS import'lari Next.js'da ishlashini va komponent SSR paytida yiqilmasligini isbotlaydi. Xulq-atvor qamrovi Task 2'da keladi.

- [ ] **Step 1: Bog'liqliklarni qadab o'rnatish**

```bash
npm install @vidstack/react@1.15.6 vidstack@1.15.6 hls.js@1.6.17
```

- [ ] **Step 2: To'g'ri versiya tushganini tasdiqlash**

Bu qadam o'tkazib yuborilmasin — bu taskning eng ehtimolli nosozligi.

```bash
node -e "console.log(require('@vidstack/react/package.json').version)"
```

Kutilgan: `1.15.6`. Agar `0.6.15` chiqsa — npm `latest` tegini olgan, ya'ni eski API
o'rnatilgan va quyidagi kodning hech biri kompilatsiya qilinmaydi. Bunday holda
`package.json`dagi qatorni qo'lda `"@vidstack/react": "1.15.6"` qilib tuzating va
`npm install` ni qayta ishga tushiring.

- [ ] **Step 3: Komponentni yozish**

`src/components/videos/LessonPlayer.tsx`:

```tsx
'use client';

import { useEffect, useRef } from 'react';
import HLS from 'hls.js';
import {
  MediaPlayer,
  MediaProvider,
  Poster,
  isHLSProvider,
  type MediaCanPlayDetail,
  type MediaPlayerInstance,
  type MediaProviderAdapter,
  type MediaTimeUpdateEventDetail,
} from '@vidstack/react';
import {
  DefaultVideoLayout,
  defaultLayoutIcons,
} from '@vidstack/react/player/layouts/default';

import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';

export interface LessonPlayerProps {
  hlsUrl: string;
  poster?: string;
  /** Qaysi soniyadan davom etish kerak. 0 — boshidan. */
  startAt: number;
  /** Faqat o'ynayotganda va seek qilinmayotganda chaqiriladi. Throttle — chaqiruvchining ishi. */
  onPosition: (seconds: number) => void;
  onError: () => void;
  /** Resume seek haqiqatan sodir bo'lgandan keyin bir marta. */
  onResume?: (seconds: number) => void;
}

/** Bundan kichik pozitsiya "davom etish" emas, shovqin. */
const MIN_RESUME_SECONDS = 5;
/** Oxirgi bo'lakka qaytarilmaydi — dars amalda tugagan. */
const END_GUARD_SECONDS = 15;

export default function LessonPlayer({
  hlsUrl,
  poster,
  startAt,
  onPosition,
  onError,
  onResume,
}: LessonPlayerProps) {
  const playerRef = useRef<MediaPlayerInstance>(null);

  // Har bir manba uchun bitta resume. Token yangilanganda `hlsUrl` almashadi va
  // `can-play` qaytadan chiqadi — bu ref bo'lmasa player bitta tomosha davomida
  // ikki marta seek qilardi.
  const resumedForRef = useRef<string | null>(null);
  useEffect(() => {
    resumedForRef.current = null;
  }, [hlsUrl]);

  const handleProviderChange = (provider: MediaProviderAdapter | null) => {
    if (isHLSProvider(provider)) {
      // Bundle qilingan hls.js. Aks holda Vidstack uni runtime'da CDN'dan yuklaydi,
      // ya'ni pullik darsning o'ynashi uchinchi tomonga bog'lanadi.
      provider.library = HLS;
    }
  };

  const handleCanPlay = (detail: MediaCanPlayDetail) => {
    if (resumedForRef.current === hlsUrl) return;
    resumedForRef.current = hlsUrl;

    const player = playerRef.current;
    if (!player) return;
    if (startAt <= MIN_RESUME_SECONDS) return;

    // Migratsiyadan oldingi `watchedSeconds` yozuvlari kumulyativ shartnoma ostida
    // yozilgan (10+20+30+…), ya'ni deyarli har doim darsdan uzunroq. Shu shart
    // ularni jimgina rad etadi — alohida migratsiya kerak emas.
    const { duration } = detail;
    if (!(duration > 0) || startAt >= duration - END_GUARD_SECONDS) return;

    player.currentTime = startAt;
    onResume?.(startAt);
  };

  const handleTimeUpdate = (detail: MediaTimeUpdateEventDetail) => {
    const player = playerRef.current;
    if (!player || player.state.paused || player.state.seeking) return;
    onPosition(detail.currentTime);
  };

  return (
    <MediaPlayer
      ref={playerRef}
      className="absolute inset-0 h-full w-full"
      src={{ src: hlsUrl, type: 'application/x-mpegurl' }}
      playsInline
      onProviderChange={handleProviderChange}
      onCanPlay={handleCanPlay}
      onTimeUpdate={handleTimeUpdate}
      onError={() => onError()}
    >
      <MediaProvider>
        {poster ? <Poster className="vds-poster" src={poster} alt="" /> : null}
      </MediaProvider>
      <DefaultVideoLayout icons={defaultLayoutIcons} />
    </MediaPlayer>
  );
}
```

**Agar `player.state.paused` / `player.state.seeking` kompilatsiya qilinmasa** (Vidstack
patch versiyasiga qarab `state` nomi farq qilishi mumkin), o'rniga hook'lardan
foydalaning — natija bir xil:

```tsx
import { useMediaState } from '@vidstack/react';
// komponent tanasida:
const paused = useMediaState('paused', playerRef);
const seeking = useMediaState('seeking', playerRef);
// handleTimeUpdate ichida: if (paused || seeking) return;
```

- [ ] **Step 4: Typecheck va build**

```bash
npm run typecheck && npm run lint && npm run build
```

Kutilgan: uchalasi ham xatosiz. `build` Vidstack CSS import'lari va SSR yo'lini
tekshiradi — `typecheck` yolg'iz buni tutmaydi.

- [ ] **Step 5: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/components/videos/LessonPlayer.tsx
git commit -m "$(cat <<'EOF'
feat(player): add LessonPlayer on Vidstack with bundled hls.js

The component only plays. It takes a URL and a resume point, emits position
and error, and knows nothing about Redux, the API, or i18n — which is what
lets both lesson pages share it and what makes it testable on its own.

hls.js is an explicit dependency passed to the provider. Vidstack otherwise
imports it from a CDN at runtime, which would put a third party in the
playback path of paid lessons.

Vidstack is pinned to 1.15.6 deliberately: npm's `latest` dist-tag is 0.6.15,
an older and incompatible API line, so an unpinned install silently yields
code that does not compile.

The resume guard (startAt > 5 and below duration - 15) also absorbs the
pre-migration data problem: old watchedSeconds rows were written under the
cumulative contract and are almost always longer than the lesson, so they are
rejected rather than seeking a returning student past the end.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Shartnoma qatlami, `useLessonStream` va student sahifasini ulash

**Files:**
- Modify: `frontend/src/types/video.ts`
- Modify: `frontend/src/store/slices/videoSlice.ts:70-120`
- Modify: `frontend/src/hooks/useVideos.ts`
- Modify: `frontend/src/api/videoApi.ts:20-25`
- Create: `frontend/src/hooks/useLessonStream.ts`
- Modify: `frontend/src/app/videos/[id]/page.tsx` (30, 119-121, 139-154, 409-417)
- Create: `frontend/e2e/helpers/stream-mocks.ts`
- Test: `frontend/e2e/videos-stream.spec.ts`

**Interfaces:**
- Consumes: `LessonPlayer` (Task 1) va uning props interfeysi
- Produces:
  - `types/video.ts`: `Player { type: 'hls'; hlsUrl: string; expiresAt: string }`,
    `Progress { lastPositionSeconds: number }`,
    `StreamStatus = 'pending' | 'processing' | 'ready' | 'failed'`
  - `useLessonStream(videoId: string, opts: { reportProgress: boolean }): LessonStream`
  - `stream-mocks.ts`: `mockSubscribedUser(page)`, `mockVideoDetail(page, videoId, body)`,
    `readyVideoBody(overrides?)`, `preparingVideoBody(status)`

- [ ] **Step 1: Failing testlarni yozish**

Avval umumiy mock quruvchilar. `e2e/helpers/stream-mocks.ts`:

```ts
import type { Page, Route } from '@playwright/test';
import { MOCK_USER, MOCK_SUBSCRIPTION_STATUS } from '../fixtures/mock-data';

export const TEST_VIDEO_ID = 'vid-stream-1';
export const TEST_COURSE_ID = 'course-stream-1';

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

/** Login qilgan va ikkala kanalga obuna bo'lgan foydalanuvchi. */
export async function mockSubscribedUser(page: Page) {
  await page.route('**/api/**/auth/me*', (route) =>
    json(route, { success: true, data: { user: MOCK_USER } }),
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
export function mockVideoDetail(page: Page, videoId: string, bodies: unknown[]) {
  const counter = { calls: 0 };
  const pattern = new RegExp(`/videos/${videoId}(?:[?#]|$)`);
  page.route(pattern, (route) => {
    const body = bodies[Math.min(counter.calls, bodies.length - 1)];
    counter.calls += 1;
    return json(route, body);
  });
  return counter;
}

/** Progress POST'larini ushlaydi va yuborilgan tanalarni to'playdi. */
export function captureProgressPosts(page: Page) {
  const bodies: Record<string, unknown>[] = [];
  page.route('**/enrollments/*/watch/*', (route) => {
    try {
      bodies.push(JSON.parse(route.request().postData() || '{}'));
    } catch {
      bodies.push({});
    }
    return json(route, { success: true, data: {} });
  });
  return bodies;
}
```

Endi `e2e/videos-stream.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
import {
  TEST_VIDEO_ID,
  mockSubscribedUser,
  mockVideoDetail,
  readyVideoBody,
  captureProgressPosts,
} from './helpers/stream-mocks';

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
    mockVideoDetail(page, TEST_VIDEO_ID, [readyVideoBody()]);

    const playlistRequest = page.waitForRequest('**/master.m3u8*');
    await page.goto(`/videos/${TEST_VIDEO_ID}`);

    await expect(page.locator('media-player')).toBeVisible({ timeout: 20_000 });
    await playlistRequest;
  });

  test('iframe player butunlay yo\'q', async ({ page }) => {
    mockVideoDetail(page, TEST_VIDEO_ID, [readyVideoBody()]);
    await page.goto(`/videos/${TEST_VIDEO_ID}`);
    await expect(page.locator('media-player')).toBeVisible({ timeout: 20_000 });

    // Playground va sandbox iframe'lari boshqa sahifada; bu sahifada video
    // uchun iframe qolmasligi kerak.
    await expect(page.locator('iframe[allowfullscreen]')).toHaveCount(0);
  });

  test('progress POST tanasi positionSeconds yuboradi, watchedSeconds emas', async ({ page }) => {
    mockVideoDetail(page, TEST_VIDEO_ID, [readyVideoBody()]);
    const posts = captureProgressPosts(page);

    await page.goto(`/videos/${TEST_VIDEO_ID}`);
    await expect(page.locator('media-player')).toBeVisible({ timeout: 20_000 });

    // Player'ni o'ynatib bo'lmaydi (mock playlist'da segment yo'q), shuning
    // uchun pozitsiya hodisasini to'g'ridan-to'g'ri chiqaramiz.
    await page.evaluate(() => {
      const el = document.querySelector('media-player') as HTMLElement & {
        dispatchEvent: (e: Event) => boolean;
      };
      el.dispatchEvent(
        new CustomEvent('time-update', {
          detail: { currentTime: 42, played: null },
          bubbles: true,
        }),
      );
    });

    await expect.poll(() => posts.length, { timeout: 10_000 }).toBeGreaterThan(0);
    expect(posts[0]).toHaveProperty('positionSeconds');
    expect(posts[0]).not.toHaveProperty('watchedSeconds');
  });
});
```

> **Eslatma implementatorga:** uchinchi test sintetik `time-update` hodisasiga
> tayanadi. Agar Vidstack tashqaridan yuborilgan hodisani qabul qilmasa,
> uni `page.evaluate` orqali `document.querySelector('media-player').currentTime = 42`
> ga almashtiring va o'sha yo'l bilan `time-update` chiqishini kuting. Testning
> maqsadi — **POST tanasining shakli**, hodisa mexanikasi emas.

- [ ] **Step 2: Testlarni ishga tushirib, yiqilishini ko'rish**

```bash
npm run dev &
npx playwright test e2e/videos-stream.spec.ts --project=chromium
```

Kutilgan: uchala test ham FAIL. Birinchi ikkitasi `media-player` topilmagani uchun
(sahifa hamon `<iframe>` chizadi), uchinchisi POST umuman ketmagani uchun.

- [ ] **Step 3: `types/video.ts` ni yozish**

To'liq fayl:

```ts
export interface Video {
  _id: string;
  title: string;
  description: string;
  duration: number;
  order: number;
  thumbnail: string;
  materials: { name: string; url: string }[];
  viewCount: number;
  course?: {
    _id: string;
    title: string;
    category?: string;
  };
  views?: number;
}

/** mkhls transcode holati. Backend har bir `GET /videos/:id` javobida qaytaradi. */
export type StreamStatus = 'pending' | 'processing' | 'ready' | 'failed';

/**
 * Video tayyor bo'lgandagina keladi. `hlsUrl` ichida qisqa muddatli stream
 * token bor; mkhls playlist'ni qayta yozib, tokenni segmentlarga ham
 * tarqatadi, shuning uchun uni player'ga o'zgarishsiz berish yetarli.
 */
export interface Player {
  type: 'hls';
  hlsUrl: string;
  expiresAt: string;
}

export interface Progress {
  lastPositionSeconds: number;
}

export interface VideoResponse {
  success: boolean;
  data: {
    video: Video;
    player: Player | null;
    progress: Progress | null;
    streamStatus: StreamStatus;
  };
}
```

`Player.embedUrl` va `Player.telegramLink` olib tashlandi — `telegramLink` aslida
`videoLink`ga tegishli edi, `player`ga emas. `Video.rating` ham olib tashlandi: backend
uni javobdan chiqargan (modelda bunday maydon yo'q edi).

- [ ] **Step 4: `videoSlice.ts` ni yangilash**

`initialState` (76-qator atrofi) — `player` izohi va ikkita yangi maydon:

```js
const initialState = {
  courseVideos: [],
  topVideos:    [],
  current:      null,
  videoLink:    null,
  /** mkhls HLS: { type, hlsUrl, expiresAt } — video tayyor bo'lmasa null */
  player:       null,
  /** { lastPositionSeconds } — enrollment yo'q bo'lsa null */
  progress:     null,
  /** 'pending' | 'processing' | 'ready' | 'failed' */
  streamStatus: null,
  loading:      false,
  linkLoading:  false,
  error:        null,
  ratings:      {},
}
```

`clearCurrentVideo` reducer'i:

```js
clearCurrentVideo: (state) => {
  state.current      = null
  state.videoLink    = null
  state.player       = null
  state.progress     = null
  state.streamStatus = null
  state.error        = null
},
```

`fetchVideo.fulfilled`:

```js
.addCase(fetchVideo.fulfilled, (state, action) => {
  state.loading      = false
  state.current      = action.payload.video
  state.videoLink    = action.payload.videoLink ?? null
  state.player       = action.payload.player ?? null
  state.progress     = action.payload.progress ?? null
  state.streamStatus = action.payload.streamStatus ?? null
})
```

Fayl oxiridagi selektorlar yoniga:

```js
export const selectVideoProgress = (state) => state.videos.progress
export const selectStreamStatus  = (state) => state.videos.streamStatus
```

- [ ] **Step 5: `useVideos.ts` ni yangilash**

Import ro'yxatiga `selectVideoProgress, selectStreamStatus` qo'shiladi va qaytariladigan
obyektga:

```ts
    progress:      useSelector(selectVideoProgress),
    streamStatus:  useSelector(selectStreamStatus),
```

- [ ] **Step 6: `videoApi.saveProgress` shartnomasini o'zgartirish**

```ts
  /**
   * POST /enrollments/:courseId/watch/:videoId — joriy pozitsiyani saqlash.
   * Shartnoma: JORIY POZITSIYA yuboriladi, delta emas — backend deltani o'zi
   * hisoblaydi. Eski `watchedSeconds` nomi backend'da bir reliz qabul qilinadi,
   * lekin frontend uni endi yubormaydi.
   */
  saveProgress: (courseId: string, videoId: string, positionSeconds: number) =>
    api.post(`enrollments/${courseId}/watch/${videoId}`, { positionSeconds }),
```

- [ ] **Step 7: `useLessonStream.ts` ni yozish**

`src/hooks/useLessonStream.ts`:

```ts
'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { videoApi } from '@api/videoApi'
import { useVideos } from '@hooks/useVideos'
import type { StreamStatus, Video } from '@/types/video'

/** O'ynayotgan dars pozitsiyasini shu oraliqda bir marta yuboradi. */
const POSITION_REPORT_INTERVAL_S = 10
/** Token muddati tugashidan shuncha oldin yangi token olinadi. */
const TOKEN_REFRESH_LEAD_MS = 5 * 60 * 1000
/** Tayyorlanayotgan dars uchun poll oralig'i (spec §11). */
const PREPARING_POLL_MS = 30_000
/**
 * Ikki xato-refetch orasidagi minimal masofa. Busiz haqiqatan buzilgan oqim
 * `error → refetch → error` siklida cheksiz aylanadi.
 */
const ERROR_REFETCH_COOLDOWN_MS = 30_000

export interface LessonPlayerBinding {
  hlsUrl: string
  poster?: string
  startAt: number
  onPosition: (seconds: number) => void
  onError: () => void
}

export interface LessonStream {
  video: Video | null
  videoLink: unknown
  streamStatus: StreamStatus | null
  loading: boolean
  error: unknown
  /** Video hali tayyorlanmoqda — sahifa kutish ekranini chizadi. */
  isPreparing: boolean
  /** Transcode buzilgan — sahifa xato ekranini chizadi. */
  hasFailed: boolean
  /** null bo'lsa player ko'rsatilmaydi. */
  playerProps: LessonPlayerBinding | null
  /** Kutish ekranidagi "Yangilash" tugmasi uchun. */
  refetch: () => void
}

export function useLessonStream(
  videoId: string,
  { reportProgress }: { reportProgress: boolean },
): LessonStream {
  const {
    current: video,
    videoLink,
    player,
    progress,
    streamStatus,
    loading,
    error,
    fetchById,
  } = useVideos()

  // `fetchById` har renderda yangi funksiya. Quyidagi taymerlar shu sababdan
  // qayta ishga tushmasligi kerak.
  const fetchRef = useRef(fetchById)
  useEffect(() => {
    fetchRef.current = fetchById
  }, [fetchById])

  const positionRef = useRef(0)
  const lastSentRef = useRef(0)
  const resumeAtRef = useRef<number | null>(null)
  const errorRefetchAtRef = useRef(0)
  const frozenForRef = useRef<string | null>(null)

  const reportRef = useRef(reportProgress)
  useEffect(() => {
    reportRef.current = reportProgress
  }, [reportProgress])

  const courseId =
    video && typeof video.course === 'object' ? video.course?._id : undefined
  const courseIdRef = useRef<string | undefined>(undefined)
  useEffect(() => {
    courseIdRef.current = courseId
  }, [courseId])

  // ── Resume nuqtasini muzlatish ──────────────────────────────────────────
  // Render paytida bajariladi (idempotent), chunki `player` va `progress`
  // bitta javobdan bitta renderda keladi — effekt kech qolib, birinchi
  // `playerProps` startAt=0 bilan hisoblanardi.
  if (frozenForRef.current !== videoId) {
    frozenForRef.current = videoId
    resumeAtRef.current = null
    positionRef.current = 0
    lastSentRef.current = 0
    errorRefetchAtRef.current = 0
  }
  if (resumeAtRef.current === null && progress) {
    // Faqat birinchi javob ma'noli pozitsiya olib keladi. Keyingi har qanday
    // javob (token yangilanishi, poll) shu seans BOSHIDAGI pozitsiyani
    // qaytaradi, ya'ni uni qayta o'qish player'ni orqaga tortardi.
    resumeAtRef.current = (progress as { lastPositionSeconds?: number }).lastPositionSeconds || 0
  }

  // ── Dastlabki fetch ─────────────────────────────────────────────────────
  useEffect(() => {
    if (videoId) fetchRef.current(videoId)
  }, [videoId])

  const sendPosition = useCallback(
    (seconds: number) => {
      const course = courseIdRef.current
      if (!reportRef.current || !course || !videoId) return
      lastSentRef.current = seconds
      videoApi.saveProgress(course, videoId, Math.floor(seconds)).catch(() => {})
    },
    [videoId],
  )

  const onPosition = useCallback(
    (seconds: number) => {
      positionRef.current = seconds
      if (seconds - lastSentRef.current >= POSITION_REPORT_INTERVAL_S) {
        sendPosition(seconds)
      }
    },
    [sendPosition],
  )

  // ── Unmount'da va tab yashiringanda oxirgi pozitsiyani yuborish ─────────
  useEffect(() => {
    const flush = () => {
      if (positionRef.current > lastSentRef.current) sendPosition(positionRef.current)
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      flush()
    }
  }, [sendPosition])

  // ── Proaktiv token yangilash ────────────────────────────────────────────
  const expiresAt = player?.expiresAt
  useEffect(() => {
    if (!expiresAt || !videoId) return
    const lead = new Date(expiresAt).getTime() - Date.now() - TOKEN_REFRESH_LEAD_MS
    const timer = setTimeout(() => fetchRef.current(videoId), Math.max(0, lead))
    return () => clearTimeout(timer)
  }, [expiresAt, videoId])

  // ── Reaktiv: player xatosi ──────────────────────────────────────────────
  const onError = useCallback(() => {
    const now = Date.now()
    if (now - errorRefetchAtRef.current < ERROR_REFETCH_COOLDOWN_MS) return
    errorRefetchAtRef.current = now
    if (videoId) fetchRef.current(videoId)
  }, [videoId])

  // ── Tayyorlanayotgan darsni pollinq qilish ──────────────────────────────
  const isPreparing =
    !player && (streamStatus === 'pending' || streamStatus === 'processing')

  useEffect(() => {
    if (!isPreparing || !videoId) return
    const timer = setInterval(() => fetchRef.current(videoId), PREPARING_POLL_MS)
    return () => clearInterval(timer)
  }, [isPreparing, videoId])

  const refetch = useCallback(() => {
    if (videoId) fetchRef.current(videoId)
  }, [videoId])

  const hlsUrl = player?.hlsUrl
  const poster = video?.thumbnail || undefined

  const playerProps = useMemo<LessonPlayerBinding | null>(() => {
    if (!hlsUrl) return null
    return {
      hlsUrl,
      poster,
      // Ref'lar ataylab dependency emas: `startAt` faqat manba almashganda
      // qayta o'qilishi kerak, har renderda emas.
      startAt: positionRef.current > 0 ? positionRef.current : resumeAtRef.current ?? 0,
      onPosition,
      onError,
    }
  }, [hlsUrl, poster, onPosition, onError])

  return {
    video: (video as Video) ?? null,
    videoLink,
    streamStatus: (streamStatus as StreamStatus) ?? null,
    loading,
    error,
    isPreparing,
    hasFailed: streamStatus === 'failed',
    playerProps,
    refetch,
  }
}
```

- [ ] **Step 8: `page.tsx` ni ulash**

Import'lar bo'limiga (`VideoComments` importidan keyin):

```tsx
import { useLessonStream } from '@hooks/useLessonStream';

const LessonPlayer = dynamic(() => import('@/components/videos/LessonPlayer'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-black">
      <span className="loading loading-spinner loading-lg text-primary" />
    </div>
  ),
});
```

29-30-qatorlarni almashtiring:

```tsx
  const { video, videoLink, loading, error, playerProps, isPreparing, hasFailed, refetch } =
    useLessonStream(id, { reportProgress: isLoggedIn && isSubscribed });
```

> `isLoggedIn` va `isSubscribed` hozir 105-109-qatorlarda hisoblanadi, ya'ni bu
> chaqiruvdan **keyin**. Ularning `useSelector` bloklarini shu chaqiruvdan **oldinga**
> ko'chiring — hooklar tartibi shart bo'lmagani uchun bu xavfsiz.

O'chiring:
- 119-121-qatorlar: `watchedSecondsRef` va `progressTimerRef` e'lonlari
- 123-130-qatorlar: `fetchByIdRef` va uning `useEffect`lari — endi hook bajaradi
  (`setIsMounted(true)` ni saqlab qoling, alohida `useEffect`ga ko'chiring)
- 139-154-qatorlar: ko'r progress `useEffect`i butunlay

Qo'shing (resume toast'i):

```tsx
  const handleResume = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = String(Math.floor(seconds % 60)).padStart(2, '0');
    toast.success(`${localText.resumeToast} ${mins}:${secs}`);
  };
```

`localText`ga qo'shing:

```tsx
    resumeToast: lang === 'en' ? 'Resumed from' : lang === 'ru' ? 'Продолжаем с' : 'Davom ettirildi:',
```

409-417-qatorlardagi `embedUrl ?` shoxini almashtiring:

```tsx
          ) : playerProps ? (
            /* Obuna bor + mkhls HLS oqimi tayyor */
            <LessonPlayer {...playerProps} onResume={handleResume} />
          ) : (videoLink as any)?.telegramLink ? (
```

- [ ] **Step 9: Testlarni qayta ishga tushirish**

```bash
npx playwright test e2e/videos-stream.spec.ts --project=chromium
```

Kutilgan: uchala test ham PASS.

```bash
npm run typecheck && npm run lint
```

Kutilgan: xatosiz. `page.tsx`da `embedUrl`ga qolgan havolalar bo'lsa `typecheck` ko'rsatadi.

- [ ] **Step 10: Commit**

```bash
git add frontend/src frontend/e2e
git commit -m "$(cat <<'EOF'
feat(video): play lessons through mkhls HLS instead of the Bunny iframe

The backend has returned player.hlsUrl since Plan 2 while the frontend kept
reading player.embedUrl, so no lesson has actually played on either page. This
wires the student page to the real contract.

videoSlice was discarding half of every response: progress and streamStatus
were never stored, and resume and the preparing-state poll both depend on
them. Both are kept now, with selectors.

Lifecycle lives in useLessonStream rather than in the page. It freezes the
resume point on the first response — later responses (token refresh, status
poll) still report where the session started, so re-reading them would drag a
watching student backwards — throttles position reports to one per ten
seconds, flushes on unmount and tab hide, and refreshes the stream token both
five minutes ahead of expiry and reactively on a player error, the latter
behind a thirty-second floor so a genuinely broken stream cannot spin.

The progress body is now positionSeconds. The old cumulative watchedSeconds
name is accepted by the backend for one release only.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Polling ekrani, `failed` holati va eskirgan matnlar

**Files:**
- Modify: `frontend/src/app/videos/[id]/page.tsx` (36-98 `localText`, 223-286 xato ekrani, 328-343 meta qatori, 439-455 kutish shoxi)
- Test: `frontend/e2e/videos-stream.spec.ts` (yangi testlar qo'shiladi)

**Interfaces:**
- Consumes: `useLessonStream` dan `isPreparing`, `hasFailed`, `refetch` (Task 2)
- Produces: yo'q (sahifa ichki o'zgarishi)

- [ ] **Step 1: Failing testlarni yozish**

`e2e/videos-stream.spec.ts` oxiriga:

```ts
import { preparingVideoBody } from './helpers/stream-mocks';

test.describe('Dars player — tayyorlanish va xato holatlari', () => {
  test.beforeEach(async ({ page }) => {
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
    const counter = mockVideoDetail(page, TEST_VIDEO_ID, [
      preparingVideoBody('processing'),
      readyVideoBody(),
    ]);

    await page.goto(`/videos/${TEST_VIDEO_ID}`);
    await expect(page.getByText(/tayyorlanmoqda/i)).toBeVisible({ timeout: 20_000 });
    expect(counter.calls).toBe(1);

    // Poll 30 soniyalik. Vaqtni oldinga suramiz.
    await page.clock.install();
    await page.clock.fastForward('00:35');

    await expect(page.locator('media-player')).toBeVisible({ timeout: 20_000 });
  });

  test('failed video xato ekranini ko\'rsatadi va pollinqni to\'xtatadi', async ({ page }) => {
    const counter = mockVideoDetail(page, TEST_VIDEO_ID, [preparingVideoBody('failed')]);

    await page.goto(`/videos/${TEST_VIDEO_ID}`);
    await expect(page.getByText(/administratorga murojaat/i)).toBeVisible({ timeout: 20_000 });

    const callsAfterLoad = counter.calls;
    await page.clock.install();
    await page.clock.fastForward('01:10');
    expect(counter.calls).toBe(callsAfterLoad);
  });

  test('kutish ekranida Bunny.net so\'zi yo\'q', async ({ page }) => {
    mockVideoDetail(page, TEST_VIDEO_ID, [preparingVideoBody('processing')]);
    await page.goto(`/videos/${TEST_VIDEO_ID}`);
    await expect(page.getByText(/tayyorlanmoqda/i)).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('body')).not.toContainText(/bunny/i);
  });
});
```

> **Eslatma:** `page.clock` Playwright 1.45+ da bor; loyihada 1.59 o'rnatilgan, ya'ni
> mavjud. `clock.install()` sahifa yuklangandan keyin chaqirilsa mavjud taymerlarni
> qamrab olmasligi mumkin — agar shunday bo'lsa, `install()` ni `page.goto` dan
> **oldin** chaqiring va vaqtni qo'lda `fastForward` bilan suring.

- [ ] **Step 2: Testlarni ishga tushirib, yiqilishini ko'rish**

```bash
npx playwright test e2e/videos-stream.spec.ts --project=chromium -g "tayyorlanish"
```

Kutilgan: uchala yangi test ham FAIL — `failed` ekrani mavjud emas, kutish matnida
"Bunny.net" bor, poll esa Task 2'da yozilgan lekin kutish shoxi hali `refetch`ni
ishlatmaydi.

- [ ] **Step 3: `localText` matnlarini tuzatish va qo'shish**

`busyDesc` ni almashtiring (52-56-qatorlar):

```tsx
    busyDesc:
      lang === 'en'
        ? 'The lesson is still being prepared for streaming. Please try again shortly.'
        : lang === 'ru'
          ? 'Урок ещё готовится к трансляции. Попробуйте немного позже.'
          : "Dars hali oqim uchun tayyorlanmoqda. Iltimos, birozdan keyin urinib ko'ring.",
```

`processingDesc` ni almashtiring (97-qator):

```tsx
    processingDesc:
      lang === 'en'
        ? 'The lesson is being prepared. This page updates itself — no need to reload.'
        : lang === 'ru'
          ? 'Урок готовится. Страница обновится сама — перезагружать не нужно.'
          : 'Dars tayyorlanmoqda. Sahifa o\'zi yangilanadi — qayta yuklash shart emas.',
```

Yangi matnlar qo'shing:

```tsx
    failedTitle:
      lang === 'en' ? 'Something went wrong' : lang === 'ru' ? 'Произошла ошибка' : 'Xatolik yuz berdi',
    failedDesc:
      lang === 'en'
        ? 'This lesson could not be prepared for streaming. Please contact an administrator.'
        : lang === 'ru'
          ? 'Этот урок не удалось подготовить к трансляции. Обратитесь к администратору.'
          : "Bu darsni oqim uchun tayyorlab bo'lmadi. Administratorga murojaat qiling.",
```

- [ ] **Step 4: Kutish shoxini yangilash va `failed` shoxini qo'shish**

439-455-qatorlardagi oxirgi `else` shoxini almashtiring:

```tsx
          ) : hasFailed ? (
            /* Transcode buzilgan — kutish foydasiz */
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-tr from-[#111726] to-[#161D31]">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-red-500/30 bg-red-500/20">
                <span className="text-3xl">⚠️</span>
              </div>
              <h2 className="mb-2 text-xl font-bold text-white">{localText.failedTitle}</h2>
              <p className="max-w-md px-8 text-center text-slate-400">{localText.failedDesc}</p>
            </div>
          ) : (
            /* Tayyorlanmoqda — sahifa har 30 soniyada o'zini yangilaydi */
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-tr from-[#111726] to-[#161D31]">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-yellow-500/30 bg-yellow-500/20">
                <span className="text-3xl">⏳</span>
              </div>
              <h2 className="mb-2 text-xl font-bold text-white">{localText.processingTitle}</h2>
              <p className="mb-6 max-w-md px-8 text-center text-slate-400">
                {localText.processingDesc}
              </p>
              <button
                onClick={refetch}
                className="btn btn-outline rounded-full border-white/20 px-8 text-white hover:bg-white/10"
              >
                🔄 {localText.refresh}
              </button>
            </div>
          )}
```

`window.location.reload()` o'rniga `refetch` — reload butun Redux holatini, obuna
tekshiruvini va sahifa hydration'ini qaytadan boshlaydi, holbuki bizga faqat bitta
so'rov kerak.

- [ ] **Step 5: 503 xato ekranidagi reload tugmasini saqlash**

274-281-qatorlardagi `isBusy` tugmasi `window.location.reload()` bo'lib **qoladi** — u
sahifa umuman yuklanmagan (`error` bor, `video` yo'q) holat uchun, ya'ni u yerda
`refetch` uchun Redux konteksti yo'q. Tegilmaydi.

- [ ] **Step 6: Yulduzcha reytingi qatorini olib tashlash**

339-342-qatorlardagi blokni o'chiring:

```tsx
            <div className="flex items-center gap-2 text-slate-400">
              <IoStar className="text-yellow-400" />
              <span className="text-sm font-medium">{video.rating?.average?.toFixed(1) || '0.0'}</span>
            </div>
```

Backend `rating`ni javobdan chiqargan (modelda bunday maydon yo'q edi), ya'ni bu qator
har doim soxta `0.0` ko'rsatardi. `IoStar` importini ham olib tashlang, agar boshqa
joyda ishlatilmasa.

- [ ] **Step 7: Testlarni qayta ishga tushirish**

```bash
npx playwright test e2e/videos-stream.spec.ts --project=chromium
npm run typecheck && npm run lint
```

Kutilgan: barcha testlar PASS, typecheck va lint xatosiz.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/app/videos frontend/e2e
git commit -m "$(cat <<'EOF'
feat(video): auto-poll while a lesson is preparing, and surface failed ones

Spec §11 and the handoff both describe a thirty-second poll as existing — the
backend's refreshPreparingStatus was built specifically to serve it — but the
client half was never written. Until now a student whose lesson finished
transcoding had to reload by hand to find out.

A failed transcode had no screen at all. Because player is null for both
"preparing" and "failed", a broken lesson showed the waiting spinner forever.
It now says so and stops polling.

The waiting copy claimed the video was "still processing on Bunny.net" in all
three languages, which stopped being true a plan ago.

The refresh button calls the fetch thunk instead of window.location.reload —
a full reload discards Redux state and re-runs the subscription check to
deliver one request's worth of new data.

Drops the star rating row: the backend deliberately stopped returning
video.rating because no such field exists on the model, so the row had been
rendering a hardcoded-looking 0.0.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Playground sahifasi

**Files:**
- Modify: `frontend/src/app/videos/[id]/playground/page.tsx` (109, 190-196, 213-223, 465-480)
- Test: `frontend/e2e/videos-stream.spec.ts` (yangi describe bloki)

**Interfaces:**
- Consumes: `useLessonStream` (Task 2), `LessonPlayer` (Task 1)
- Produces: yo'q

- [ ] **Step 1: Failing testni yozish**

```ts
test.describe('Playground sahifasi — player', () => {
  test.beforeEach(async ({ page }) => {
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
    mockVideoDetail(page, TEST_VIDEO_ID, [readyVideoBody()]);
    const playlistRequest = page.waitForRequest('**/master.m3u8*');

    await page.goto(`/videos/${TEST_VIDEO_ID}/playground`);

    await expect(page.locator('media-player')).toBeVisible({ timeout: 20_000 });
    await playlistRequest;
  });

  test('playground ko\'r taymeri progress yubormaydi', async ({ page }) => {
    mockVideoDetail(page, TEST_VIDEO_ID, [readyVideoBody()]);
    const posts = captureProgressPosts(page);

    await page.goto(`/videos/${TEST_VIDEO_ID}/playground`);
    await expect(page.locator('media-player')).toBeVisible({ timeout: 20_000 });

    // Eski kod har 10 soniyada video o'ynayotganini bilmay POST qilardi.
    await page.clock.install();
    await page.clock.fastForward('00:45');
    expect(posts.length).toBe(0);
  });
});
```

- [ ] **Step 2: Testlarni ishga tushirib, yiqilishini ko'rish**

```bash
npx playwright test e2e/videos-stream.spec.ts --project=chromium -g "Playground"
```

Kutilgan: birinchisi FAIL (`media-player` yo'q, iframe bor), ikkinchisi FAIL (ko'r
taymer 45 soniyada 4 marta POST qiladi).

- [ ] **Step 3: Hookni ulash**

109-qatorni almashtiring:

```tsx
  const { video, loading, playerProps } = useLessonStream(id, {
    reportProgress: isLoggedIn && isSubscribed,
  });
```

Import qo'shing va `LessonPlayer` ni dinamik yuklang (fayl allaqachon `dynamic`
ishlatadi, shu naqshga ergashing):

```tsx
import { useLessonStream } from '@hooks/useLessonStream';

const LessonPlayer = dynamic(() => import('@/components/videos/LessonPlayer'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-black">
      <span className="loading loading-spinner loading-md text-primary" />
    </div>
  ),
});
```

- [ ] **Step 4: Ko'r taymerni va eski fetch effektini o'chirish**

O'chiring:
- 190-196-qatorlar: `fetchByIdRef` va uning effekti (`setIsMounted(true)` ni alohida
  effektda saqlab qoling)
- 213-223-qatorlar: `// Track watch progress every 10s` effekti butunlay
- `watchedSecondsRef` va `progressTimerRef` e'lonlari (fayl boshida)
- `videoApi` importi, agar boshqa joyda ishlatilmasa

- [ ] **Step 5: Playerni almashtirish**

465-480-qatorlardagi `player?.embedUrl ? <iframe … /> : …` blokini almashtiring:

```tsx
            {playerProps ? (
              <LessonPlayer {...playerProps} />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-tr from-[#111726] to-[#161D31] text-center">
                <span className="mb-3 text-3xl">⏳</span>
                <p className="px-6 text-sm text-slate-400">
                  {t('playground.videoPreparing')}
                </p>
              </div>
            )}
```

`t('playground.videoPreparing')` kalitini uchala i18n fayliga qo'shing
(`src/utils/i18n/uz.ts`, `ru.ts`, `en.ts`):

```ts
    'playground.videoPreparing': 'Dars tayyorlanmoqda…',      // uz.ts
    'playground.videoPreparing': 'Урок готовится…',            // ru.ts
    'playground.videoPreparing': 'The lesson is being prepared…', // en.ts
```

> Bu sahifada resume toast'i **ko'rsatilmaydi** — playground'da ekran allaqachon
> zich (kod muharriri, terminal, sidebar) va toast asosiy sahifada chiqadi.
> `onResume` uzatilmaydi.

- [ ] **Step 6: Testlarni qayta ishga tushirish**

```bash
npx playwright test e2e/videos-stream.spec.ts --project=chromium
npm run typecheck && npm run lint
```

Kutilgan: barcha testlar PASS.

- [ ] **Step 7: Commit**

```bash
git add frontend/src frontend/e2e
git commit -m "$(cat <<'EOF'
feat(playground): share the lesson player with the main video page

The playground page carries its own copy of the player, which spec §7 never
listed and which has been rendering an empty iframe for the same reason the
main page was — it read player.embedUrl. It now mounts the same LessonPlayer
and gets resume, throttled progress and token refresh from the same hook.

Its blind ten-second timer is gone too. That timer incremented and posted a
watch position on a schedule with no idea whether anything was playing, so
simply leaving the page open recorded watch time.

Both pages can be open at once without conflict: the backend keeps
max(previousPosition, position), so the furthest point wins.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Admin panel — nomlash, status va transcode progressi

**Files:**
- Modify: `frontend/src/app/admin/courses/[id]/page.tsx` (20-64, 276-292, 596-660)
- Test: `frontend/e2e/admin-videos.spec.ts` (yangi)

**Interfaces:**
- Consumes: `StreamStatus` (Task 2, `types/video.ts`)
- Produces: `VideoRow` turi `{ _id, title, description?, order, duration, streamStatus }`;
  `TranscodeInfo { presetsDone: string[]; presetsTotal: number } | null`

- [ ] **Step 1: Failing testni yozish**

`e2e/admin-videos.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
import type { Page, Route } from '@playwright/test';
import { MOCK_USER } from './fixtures/mock-data';

const COURSE_ID = 'course-admin-1';
const VIDEO_ID = 'vid-admin-1';

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

async function mockAdmin(page: Page) {
  await page.route('**/api/**/auth/me*', (route) =>
    json(route, { success: true, data: { user: { ...MOCK_USER, role: 'admin' } } }),
  );
  await page.route('**/api/**/auth/csrf*', (route) =>
    json(route, { success: true, data: { token: 'test-csrf' } }),
  );
  await page.route(new RegExp(`/courses/${COURSE_ID}(?:[?#]|$)`), (route) =>
    json(route, {
      success: true,
      data: {
        course: {
          _id: COURSE_ID,
          title: 'Admin test kurs',
          description: '',
          price: 0,
          level: 'beginner',
          category: 'javascript',
          isPublished: true,
          isFree: false,
        },
      },
    }),
  );
}

function mockCourseVideos(page: Page, streamStatus: string) {
  return page.route(new RegExp(`/videos/course/${COURSE_ID}`), (route) =>
    json(route, {
      success: true,
      data: {
        videos: [
          {
            _id: VIDEO_ID,
            title: '1-Dars: Test',
            description: '',
            order: 0,
            duration: 600,
            streamStatus,
          },
        ],
        count: 1,
      },
    }),
  );
}

test.describe('Admin — dars statuslari', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdmin(page);
  });

  test('ready dars ready badge ko\'rsatadi, pending emas', async ({ page }) => {
    await mockCourseVideos(page, 'ready');
    await page.goto(`/admin/courses/${COURSE_ID}`);
    await expect(page.getByText('1-Dars: Test')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('ready', { exact: false }).first()).toBeVisible();
  });

  test('processing dars n/m preset progressini ko\'rsatadi, foizsiz', async ({ page }) => {
    await mockCourseVideos(page, 'processing');
    await page.route(new RegExp(`/videos/${VIDEO_ID}/status`), (route) =>
      json(route, {
        success: true,
        data: {
          videoId: VIDEO_ID,
          streamStatus: 'processing',
          isReady: false,
          duration: 600,
          transcode: { presetsDone: ['720p', '480p'], presetsTotal: 3 },
        },
      }),
    );

    await page.goto(`/admin/courses/${COURSE_ID}`);
    await expect(page.getByText('2/3 preset')).toBeVisible({ timeout: 30_000 });

    // Foiz raqami hech qayerda chiqmasligi kerak — mkhls uni oshirmaydi.
    await expect(page.locator('body')).not.toContainText(/\d+\s*%/);
  });
});
```

- [ ] **Step 2: Testlarni ishga tushirib, yiqilishini ko'rish**

```bash
npx playwright test e2e/admin-videos.spec.ts --project=chromium
```

Kutilgan: birinchisi FAIL (`vid.bunnyStatus` undefined → doim `pending`), ikkinchisi
FAIL (progress UI umuman yo'q).

- [ ] **Step 3: Turlarni va `StatusBadge`ni yangilash**

21-29-qatorlarni almashtiring:

```tsx
import type { StreamStatus } from '@/types/video';

type VideoRow = {
  _id: string;
  title: string;
  description?: string;
  order: number;
  duration: number;
  streamStatus: StreamStatus;
};

/**
 * mkhls'dan keladigan yagona haqiqiy progress ko'rsatkichi.
 * `progress_percent` ataylab yo'q: mkhls uni hech qachon oshirmaydi
 * (transcode davomida 0, oxirida 100).
 */
type TranscodeInfo = { presetsDone: string[]; presetsTotal: number } | null;
```

46-57-qatorlardagi `StatusBadge`ni almashtiring:

```tsx
function StatusBadge({ status }: { status: StreamStatus }) {
  const cls =
    status === 'ready' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
    : status === 'failed' ? 'border-red-500/30 bg-red-500/10 text-red-300'
    : status === 'processing' ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
    : 'border-slate-600/30 bg-slate-700/20 text-slate-400';
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cls}`}>
      {status || 'pending'}
    </span>
  );
}
```

`encoding` va `error` shoxlari o'chdi — mkhls ularni chiqarmaydi
(`parseStreamStatus`: `error`/`unavailable` → `failed`).

- [ ] **Step 4: Transcode progressi holatini va pollingni qo'shish**

Komponent holatiga qo'shing:

```tsx
  const [transcode, setTranscode] = useState<Record<string, TranscodeInfo>>({});
```

`refreshStatus` (277-292-qatorlar) ni almashtiring:

```tsx
  const readStatus = useCallback(async (videoId: string) => {
    const res = await getVideoStatus(videoId);
    const d = unwrapAdmin<{
      streamStatus: StreamStatus;
      duration?: number;
      transcode: TranscodeInfo;
    }>(res);
    setVideos(prev =>
      prev.map(v =>
        v._id === videoId
          ? { ...v, streamStatus: d.streamStatus, duration: d.duration ?? v.duration }
          : v,
      ),
    );
    setTranscode(prev => ({ ...prev, [videoId]: d.transcode }));
    return d;
  }, []);

  const refreshStatus = async (vid: VideoRow) => {
    try {
      const d = await readStatus(vid._id);
      toast.success(`Status: ${d.streamStatus}`);
    } catch {
      toast.error('Status olishda xato');
    }
  };
```

Ro'yxat polling effektini qo'shing:

```tsx
  // `processing` qatorlarini kuzatib turadi.
  //
  // Uchta cheklov ataylab: faqat processing qatorlari, 20 soniya, va faqat tab
  // ko'rinib turganda. Bu endpoint student poll'idan farq qiladi —
  // `checkVideoStatus`da hech qanday cooldown yo'q, har chaqiruv to'g'ridan-to'g'ri
  // mkhls'ga boradi. Bir kurs ommaviy yuklanayotganda o'nlab qator bir vaqtda
  // processing bo'lishi mumkin va ochiq qoldirilgan tab soatlab mkhls'ni urardi.
  useEffect(() => {
    const processingIds = videos.filter(v => v.streamStatus === 'processing').map(v => v._id);
    if (processingIds.length === 0) return;

    const tick = () => {
      if (document.visibilityState !== 'visible') return;
      processingIds.forEach(vid => { readStatus(vid).catch(() => {}); });
    };

    tick();
    const timer = setInterval(tick, 20_000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
    // `videos` o'rniga uning processing id'lari — har bir duration yangilanishida
    // interval qayta ishga tushmasligi uchun.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videos.map(v => (v.streamStatus === 'processing' ? v._id : '')).join(','), readStatus]);
```

- [ ] **Step 5: Qatordagi progress UI'sini qo'shish**

616-627-qatorlardagi meta blokini almashtiring:

```tsx
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <FiClock className="h-3 w-3" />
                          {fmtDur(vid.duration)}
                        </span>
                        <StatusBadge status={vid.streamStatus || 'pending'} />
                      </div>
                      {vid.streamStatus === 'processing' &&
                        (transcode[vid._id]?.presetsTotal ?? 0) > 0 && (
                          <div className="mt-2 max-w-xs">
                            <div className="h-1 overflow-hidden rounded-full bg-slate-800">
                              <div
                                className="h-full rounded-full bg-amber-500 transition-all"
                                style={{
                                  width: `${
                                    (transcode[vid._id]!.presetsDone.length /
                                      transcode[vid._id]!.presetsTotal) *
                                    100
                                  }%`,
                                }}
                              />
                            </div>
                            <p className="mt-1 text-[10px] text-slate-500">
                              {transcode[vid._id]!.presetsDone.length}/
                              {transcode[vid._id]!.presetsTotal} preset
                              {transcode[vid._id]!.presetsDone.length > 0 &&
                                ` — ${transcode[vid._id]!.presetsDone.join(', ')} tayyor`}
                            </p>
                          </div>
                        )}
```

Bar kengligi nisbatdan hisoblanadi, lekin **foiz raqami yozilmaydi** — ko'rsatiladigan
yagona son `n/m`.

632-640-qatorlardagi refresh tugmasi shartini almashtiring:

```tsx
                      {vid.streamStatus === 'processing' && (
```

- [ ] **Step 6: Testlarni qayta ishga tushirish**

```bash
npx playwright test e2e/admin-videos.spec.ts --project=chromium
npm run typecheck && npm run lint
```

Kutilgan: ikkala test PASS. `typecheck` `bunnyStatus`/`bunnyVideoId` ga qolgan
havolalarni ko'rsatadi — ular Task 6'da tozalanadi, shuning uchun bu qadamda
`typecheck` **hali yiqilishi mumkin**. Agar shunday bo'lsa, `saveEdit` va `openEdit`
dagi havolalarni vaqtincha `// @ts-expect-error` bilan emas, balki Task 6'ni darhol
ketma-ket bajarish bilan yoping — bu ikki task bitta typecheck darvozasini bo'lishadi.

> **Reviewer uchun:** Task 5 va Task 6 alohida ko'rib chiqiladi, lekin `typecheck`
> darvozasi faqat Task 6 oxirida yashil bo'ladi. Task 5'ni Playwright testlari va
> `npm run lint` bo'yicha baholang.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/admin frontend/e2e/admin-videos.spec.ts
git commit -m "$(cat <<'EOF'
fix(admin): read streamStatus instead of the fields the API stopped sending

Task 13 added a projection to getCourseVideos, so bunnyVideoId and bunnyStatus
no longer come back — and the admin list reads exactly those. Every lesson has
been showing as "pending" and offering the link button since, with no error to
notice: the fields are simply undefined.

Transcode progress is built from presetsDone and presetsTotal and rendered as
"2/3 preset". No percentage is shown anywhere, because mkhls never advances
progress_percent — it sits at 0 for the whole job and jumps to 100 — so a
percentage would be a number that means nothing for an hour.

The list polls processing rows every twenty seconds and only while the tab is
visible. Unlike the student poll, checkVideoStatus has no cooldown and reaches
mkhls on every call, so a course upload with a dozen processing rows and a
forgotten tab would otherwise hammer it indefinitely.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Admin panel — yuklash oqimi, qo'lda ulash va Bunny tozalash

**Files:**
- Modify: `frontend/src/api/adminApi.ts:36, 54-57`
- Modify: `frontend/src/app/admin/courses/[id]/page.tsx` (155-262, 310-318, 665-738, header)
- Modify: `frontend/src/app/admin/tools/page.tsx` (7, 200-235)
- Test: `frontend/e2e/admin-videos.spec.ts` (yangi testlar)

**Interfaces:**
- Consumes: `VideoRow`, `TranscodeInfo` (Task 5)
- Produces: `linkVideoToStream(id: string, streamPath: string)` — `adminApi.ts` eksporti

- [ ] **Step 1: Failing testlarni yozish**

`e2e/admin-videos.spec.ts` ga qo'shing:

```ts
test.describe('Admin — qo\'lda ulash va tozalash', () => {
  test.beforeEach(async ({ page }) => {
    await mockAdmin(page);
  });

  test('tahrirlash modalida mkhls yo\'li maydoni bor, Bunny GUID emas', async ({ page }) => {
    await mockCourseVideos(page, 'pending');
    await page.goto(`/admin/courses/${COURSE_ID}`);
    await expect(page.getByText('1-Dars: Test')).toBeVisible({ timeout: 20_000 });

    await page.getByText('1-Dars: Test').hover();
    await page.locator('button[title="mkhls yo\'liga ulash"]').first().click();

    await expect(page.getByPlaceholder(/aidevix\//)).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/bunny guid/i);
  });

  test('link-stream endpointi chaqiriladi', async ({ page }) => {
    await mockCourseVideos(page, 'pending');
    await page.route(new RegExp(`/videos/${VIDEO_ID}$`), (route) =>
      json(route, { success: true, data: {} }),
    );

    let linkBody: Record<string, unknown> | null = null;
    await page.route(new RegExp(`/videos/${VIDEO_ID}/link-stream`), (route) => {
      linkBody = JSON.parse(route.request().postData() || '{}');
      return json(route, { success: true, message: 'ok', data: {} });
    });

    await page.goto(`/admin/courses/${COURSE_ID}`);
    await expect(page.getByText('1-Dars: Test')).toBeVisible({ timeout: 20_000 });
    await page.getByText('1-Dars: Test').hover();
    await page.locator('button[title="mkhls yo\'liga ulash"]').first().click();

    await page.getByPlaceholder(/aidevix\//).fill(`aidevix/${VIDEO_ID}.mp4`);
    await page.getByRole('button', { name: 'Saqlash' }).click();

    await expect.poll(() => linkBody, { timeout: 10_000 }).not.toBeNull();
    expect(linkBody).toEqual({ streamPath: `aidevix/${VIDEO_ID}.mp4` });
  });

  test('tools sahifasida bulk Bunny bo\'limi yo\'q', async ({ page }) => {
    await page.goto('/admin/tools');
    await expect(page.locator('body')).not.toContainText(/bunnyVideoId/i);
    await expect(page.locator('body')).not.toContainText(/bulk.*bunny/i);
  });
});
```

- [ ] **Step 2: Testlarni ishga tushirib, yiqilishini ko'rish**

```bash
npx playwright test e2e/admin-videos.spec.ts --project=chromium -g "ulash"
```

Kutilgan: uchalasi ham FAIL.

- [ ] **Step 3: `adminApi.ts` ni yangilash**

36-qatorni almashtiring:

```ts
/**
 * Mavjud mkhls yo'liga qo'lda bog'lash. Faqat eski yoki qo'lda yuklangan
 * fayllar uchun — normal oqimda `createVideo` streamPath'ni o'zi hisoblaydi.
 */
export const linkVideoToStream = (id: string, streamPath: string) =>
  axiosInstance.patch(`videos/${id}/link-stream`, { streamPath })
```

54-57-qatorlardagi `bulkLinkBunny` eksportini butunlay o'chiring. Backend endpointi
(`POST /api/admin/videos/bulk-link`) joyida qoladi — u 8-bosqich qamrovida.

- [ ] **Step 4: `admin/courses/[id]/page.tsx` — import va edit formasi**

7-qatordagi importni yangilang: `linkVideoToBunny` → `linkVideoToStream`.

97-99-qatorlardagi `editForm` boshlang'ich holatini almashtiring:

```tsx
  const [editForm, setEditForm] = useState({
    title: '', description: '', order: 0, durationMin: 0, streamPath: '',
  });
```

`openEdit` (232-241) ni almashtiring:

```tsx
  const openEdit = (vid: VideoRow) => {
    setEditVid(vid);
    setEditForm({
      title: vid.title,
      description: vid.description || '',
      order: vid.order,
      durationMin: vid.duration ? Math.round(vid.duration / 60) : 0,
      // Faqat-yozish: streamPath ochiq `videos/course/:id` endpointidan ataylab
      // olib tashlangan (provayder identifikatori, spec §10.4), shuning uchun
      // uni ko'rsatadigan ma'lumot bu yerda yo'q. Yo'l determinlashgan —
      // placeholder uni eslatib turadi.
      streamPath: '',
    });
  };
```

`saveEdit` (243-262) ni almashtiring:

```tsx
  const saveEdit = async () => {
    if (!editVid) return;
    try {
      await updateVideo(editVid._id, {
        title: editForm.title,
        description: editForm.description,
        order: editForm.order,
        duration: Math.round((Number(editForm.durationMin) || 0) * 60),
      });
      const path = editForm.streamPath.trim();
      if (path) {
        await linkVideoToStream(editVid._id, path);
      }
      toast.success('Video yangilandi');
      setEditVid(null);
      fetchData();
    } catch {
      toast.error("Saqlab bo'lmadi");
    }
  };
```

712-719-qatorlardagi maydonni almashtiring:

```tsx
                <Field label="mkhls yo'li (qo'lda ulash — ixtiyoriy)">
                  <input
                    value={editForm.streamPath}
                    onChange={e => setEditForm({ ...editForm, streamPath: e.target.value })}
                    placeholder={`aidevix/${editVid?._id ?? '<videoId>'}.mp4`}
                    className={`${inp} font-mono text-xs`}
                  />
                </Field>
```

641-649-qatorlardagi ulash tugmasini almashtiring:

```tsx
                      {vid.streamStatus === 'pending' && (
                        <button
                          onClick={() => openEdit(vid)}
                          title="mkhls yo'liga ulash"
                          className="rounded-lg p-2 text-sky-400 hover:bg-sky-500/10"
                        >
                          <FiLink className="h-3.5 w-3.5" />
                        </button>
                      )}
```

- [ ] **Step 5: Yuklash oqimini transcode kutishidan ajratish**

`startUpload` (155-229) ning 191-224-qatorlarini almashtiring:

```tsx
      // 3️⃣ Transcode navbatga qo'yildi. Kutmaymiz.
      //
      // Ilgari bu yerda 6 daqiqalik polling turardi va undan keyin "Timeout"
      // xatosi tashlanardi. Bunny uchun to'g'ri edi; mkhls'da 40 daqiqalik dars
      // 40-60 daqiqa transcode bo'ladi (spec §14.1), ya'ni har bir haqiqiy dars
      // sog'-salomat ishlanayotgan holda "Timeout" deb ko'rsatilardi.
      // Kuzatishni ro'yxat qatori o'z polling'i bilan bajaradi.
      setPhase('done');
      toast.success(`${autoTitle} — yuklandi, transcode navbatga qo'yildi`);
      setTopic(''); setDesc(''); setFile(null);
      setShowUpload(false);
      phaseTimeoutRef.current = setTimeout(() => setPhase('idle'), 1500);
      fetchData();
    } catch (err: any) {
      setPhase('error');
      // Backend `startTranscode` muvaffaqiyatsiz bo'lsa streamStatus='failed'
      // yozib 502 qaytaradi — fayl yuklangan, lekin transcode boshlanmagan.
      // Bu umumiy "Yuklashda xato"dan butunlay boshqa vaziyat.
      if (err?.response?.status === 502) {
        toast.error('Fayl yuklandi, lekin transcode boshlanmadi — mkhls ni tekshiring');
      } else {
        toast.error(err?.message || 'Yuklashda xato');
      }
    }
  };
```

`pollRef` endi ishlatilmaydi — e'lonini (92-qator) va 124-qatordagi tozalashni o'chiring.

181-185-qatorlardagi xato xabarini almashtiring:

```tsx
      if (!upload?.uploadUrl) {
        toast.error('Upload URL olishda xato — mkhls sozlamalarini tekshiring');
        setPhase('error');
        return;
      }
```

165-qatordagi izohni yangilang: `// 1️⃣ DB yozuvi va mkhls stream yo'lini yaratish`.
187-qatordagi izohni yangilang: `// 2️⃣ Faylni backend proxy orqali mkhls ga yuklash`.

311-318-qatorlardagi `phaseLabel` ni yangilang:

```tsx
  const phaseLabel: Record<UploadPhase, string> = {
    idle:       'Yuklashni boshlash',
    creating:   'Yozuv yaratilmoqda…',
    uploading:  `Yuklanmoqda ${progress}%`,
    processing: 'Transcode navbatga qo\'yilmoqda…',
    done:       '✓ Yuklandi',
    error:      'Qayta urinish',
  };
```

563-566-qatorlardagi "Bunny.net video kodlayapti — 1–3 daqiqa kuting…" matnini
almashtiring:

```tsx
                            mkhls transcode navbatiga qo'yilmoqda…
```

- [ ] **Step 6: Kurs sarlavhasi yoniga bepul/pullik badge qo'shish**

Header blokidagi kurs sarlavhasi yoniga (333-345-qatorlar atrofi):

```tsx
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                course?.isFree
                  ? 'border-sky-500/30 bg-sky-500/10 text-sky-300'
                  : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
              }`}
            >
              {course?.isFree ? 'Bepul kurs' : 'Pullik kurs'}
            </span>
```

Spec §14.8 admin panelda bepul/pullik oqimni ko'rinadigan qilishni talab qiladi.
Amalda buzish yo'li yo'q (yagona yuklash yo'li mkhls'ga ketadi, YouTube yo'li umuman
mavjud emas), lekin admin pullik darsni yuklayotganini ko'rib tursin.

- [ ] **Step 7: `admin/tools/page.tsx` dan bulk-link bo'limini olib tashlash**

7-qatordagi `bulkLinkBunny` importini o'chiring. 200-235-qatorlar atrofidagi butun
bulk-link bo'limini (holat, handler, forma va tavsif matni) o'chiring. Sahifadagi
qolgan asboblarga tegmang.

- [ ] **Step 8: Testlarni qayta ishga tushirish**

```bash
npx playwright test e2e/admin-videos.spec.ts --project=chromium
npm run typecheck && npm run lint && npm run build
```

Kutilgan: barcha testlar PASS va **`typecheck` endi yashil** — Task 5 qoldirgan
`bunnyStatus`/`bunnyVideoId` havolalari shu taskda yopildi.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/api/adminApi.ts frontend/src/app/admin frontend/e2e/admin-videos.spec.ts
git commit -m "$(cat <<'EOF'
feat(admin): stop blocking uploads on transcode, link by stream path

The upload flow polled for six minutes and then threw "Timeout". That was
right for Bunny, which encoded in about a minute; mkhls takes forty to sixty
minutes for a forty-minute lesson, so every real upload would have reported a
timeout on a video that was processing perfectly well. Upload now finishes
when the file is in and the job is queued, and the list row watches the rest.

A 502 from the upload proxy is no longer flattened into the generic error.
The backend returns it specifically when the file arrived but startTranscode
failed — it writes streamStatus 'failed' at the same time — and that needs a
different response from an upload that simply died.

Manual linking moves to PATCH link-stream with a streamPath. The field is
write-only with a deterministic placeholder: streamPath is deliberately absent
from the unauthenticated course-videos endpoint, so there is nothing to
prefill it from, and there is no reason to add an admin endpoint just to
display a path the admin can derive from the video id.

Drops the bulk Bunny link tool from the UI. It wrote bunnyVideoId, which
nothing reads for playback any more. The backend endpoint stays until stage 8,
so the rollback path is intact.

Adds a free/paid badge next to the course title, which is what spec §14.8 asks
stage 7 to account for.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Token yangilash va resume qamrovini mahkamlash

**Files:**
- Test: `frontend/e2e/videos-stream.spec.ts` (yangi describe bloki)
- Modify: `frontend/src/hooks/useLessonStream.ts` (faqat testlar xato ko'rsatsa)

**Interfaces:**
- Consumes: `useLessonStream` (Task 2), `stream-mocks.ts` (Task 2)
- Produces: yo'q

Task 2 token yangilash va resume mantiqini **yozdi**, lekin ularni hech narsa
tekshirmadi. Bu task ularni qulflaydi. Agar testlar xato topsa — hookni tuzating,
testni emas.

- [ ] **Step 1: Testlarni yozish**

```ts
test.describe('Dars player — token va resume', () => {
  test.beforeEach(async ({ page }) => {
    await mockSubscribedUser(page);
    await page.route('**/master.m3u8*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/vnd.apple.mpegurl',
        body: '#EXTM3U\n#EXT-X-VERSION:3\n',
      }),
    );
  });

  test('token tugashiga 6 daqiqa qolganda proaktiv qayta so\'raladi', async ({ page }) => {
    await page.clock.install();
    const soon = readyVideoBody({
      player: {
        type: 'hls',
        hlsUrl: 'https://stream.test/vod/aidevix/vid.mp4/master.m3u8?token=t1',
        expiresAt: new Date(Date.now() + 6 * 60 * 1000).toISOString(),
      },
    });
    const counter = mockVideoDetail(page, TEST_VIDEO_ID, [soon, readyVideoBody()]);

    await page.goto(`/videos/${TEST_VIDEO_ID}`);
    await expect(page.locator('media-player')).toBeVisible({ timeout: 20_000 });
    expect(counter.calls).toBe(1);

    // 5 daqiqalik lead → ~1 daqiqadan keyin ishga tushishi kerak.
    await page.clock.fastForward('02:00');
    await expect.poll(() => counter.calls, { timeout: 10_000 }).toBe(2);
  });

  test('ketma-ket xatolar bitta refetch beradi (30s tormoz)', async ({ page }) => {
    const counter = mockVideoDetail(page, TEST_VIDEO_ID, [readyVideoBody()]);

    await page.goto(`/videos/${TEST_VIDEO_ID}`);
    await expect(page.locator('media-player')).toBeVisible({ timeout: 20_000 });
    expect(counter.calls).toBe(1);

    for (let i = 0; i < 3; i += 1) {
      await page.evaluate(() => {
        document.querySelector('media-player')!.dispatchEvent(
          new CustomEvent('error', {
            detail: { message: 'segment 403' },
            bubbles: true,
          }),
        );
      });
      await page.waitForTimeout(300);
    }

    await expect.poll(() => counter.calls, { timeout: 10_000 }).toBe(2);
  });

  test('duration dan katta eski pozitsiya seek qilmaydi', async ({ page }) => {
    // 600 soniyalik dars, 4650 soniyalik kumulyativ qoldiq (10+20+…+300 naqshi).
    mockVideoDetail(page, TEST_VIDEO_ID, [
      readyVideoBody({ progress: { lastPositionSeconds: 4650 } }),
    ]);

    await page.goto(`/videos/${TEST_VIDEO_ID}`);
    await expect(page.locator('media-player')).toBeVisible({ timeout: 20_000 });

    // Resume toast'i chiqmasligi kerak — seek bo'lmadi.
    await page.waitForTimeout(2000);
    await expect(page.getByText(/davom ettirildi/i)).toHaveCount(0);
  });
});
```

- [ ] **Step 2: Testlarni ishga tushirish**

```bash
npx playwright test e2e/videos-stream.spec.ts --project=chromium -g "token va resume"
```

Kutilgan: uchalasi ham PASS (mantiq Task 2'da yozilgan). **Agar biror test yiqilsa —
`useLessonStream.ts` ni tuzating, testni emas.** Ehtimolli sabablar:
- proaktiv taymer `expiresAt` o'zgarganda qayta qo'yilmayapti → `useEffect` deps
- xato tormozi ishlamayapti → `errorRefetchAtRef` `onError` callback'ida qamalgan
  eski qiymatni o'qiyapti
- resume shartida `duration` `MediaCanPlayDetail` dan emas, boshqa manbadan olinyapti

- [ ] **Step 3: Butun e2e to'plamini ishga tushirish**

```bash
npx playwright test --project=chromium
```

Kutilgan: mavjud testlar ham yashil. `videos.spec.ts` dagi `MOCK_VIDEO_BY_ID_RESPONSE`
endi `player`/`streamStatus`siz — agar shu sababdan yiqilsa, fixture'ga
`player: null, progress: null, streamStatus: 'processing'` qo'shing (mock'ni yangi
shartnomaga moslash to'g'ri, testni o'chirish emas).

- [ ] **Step 4: Commit**

```bash
git add frontend/e2e frontend/src/hooks/useLessonStream.ts
git commit -m "$(cat <<'EOF'
test(video): lock down token refresh, the error brake, and the resume guard

Task 2 wrote all three and nothing checked any of them. These are the paths
that fail silently in production: a token that never refreshes strands a
student four hours in, a missing error brake turns one broken stream into an
unbounded refetch loop, and a resume guard that lets stale data through seeks
a returning student past the end of the lesson.

The stale-position case uses 4650 seconds against a 600-second lesson — the
exact shape the old cumulative contract produced (10+20+...+300) — so the
guard is tested against real bad data rather than an invented number.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Bundle o'lchovi, qo'lda uchdan-uchgacha va hujjatlar

**Files:**
- Modify: `docs/superpowers/HANDOFF.md` (yangi HANDOFF yoziladi)
- Create: `docs/superpowers/specs/2026-08-05-video-streaming-mkhls-design.md` ga
  §15.4 holat jadvalini yangilash

**Interfaces:**
- Consumes: barcha oldingi tasklar
- Produces: keyingi bosqich uchun handoff

- [ ] **Step 1: Bundle o'lchash**

```bash
npm run build
```

`Route (app)` jadvalidan `/videos/[id]` va `/videos/[id]/playground` qatorlarining
First Load JS qiymatini yozib oling. Spec §14.5 "Vidstack ~100 KB qo'shadi" deb
taxmin qilgan — haqiqiy raqamni Step 6'dagi HANDOFF'ga yozing. Agar 200 KB dan oshsa,
buni HANDOFF'da ochiq risk sifatida qayd eting (bu taskni bloklamaydi).

- [ ] **Step 2: Lokal muhitni ko'tarish**

```bash
cd ../
docker compose -f docker-compose.dev.yml down -v
rm -rf .data/media/aidevix .data/cache/vod
docker compose -f docker-compose.dev.yml up -d --build
cd backend && node scripts/seed-dev-user.js && npm run dev
```

Alohida terminalda: `cd frontend && npm run dev`.

**Eslatma:** `.env` o'zgartirilsa backend'ni qayta ishga tushiring — `nodemon` faqat
`js/mjs/cjs/json` kuzatadi. `touch backend/index.js` ishonchli. Seed tokenlari
15 daqiqa yashaydi.

- [ ] **Step 3: Admin oqimini qo'lda tekshirish**

Har bir bandni bajarib, natijani yozib boring:

1. `/admin/courses/<id>` — kurs sarlavhasi yonida `Pullik kurs` badge'i
2. Haqiqiy `.mp4` yuklash — panel **bloklanmasdan** yopiladi, "yuklandi, transcode
   navbatga qo'yildi" toast'i
3. Qator `processing` badge'ini oladi va `n/m preset` progressi **o'sadi**
4. Foiz raqami hech qayerda ko'rinmaydi
5. Tabni yashiring (boshqa tabga o'ting) → tarmoq panelida `/status` so'rovlari
   **to'xtaydi**; qaytganda darhol bittasi ketadi
6. Transcode tugagach qator `ready` bo'ladi

- [ ] **Step 4: Student oqimini qo'lda tekshirish**

1. `/videos/<id>` — video o'ynaydi
2. Sifat menyusidan boshqa rungga o'tish ishlaydi
3. Tezlik, PiP, fullscreen, klaviatura (probel, ←/→) ishlaydi
4. ~20 soniya ko'ring, tabni yoping, qayta oching → **"Davom ettirildi" toast'i** va
   o'sha joydan davom etadi
5. Sahifani pastga aylantiring → sticky mini-player'ga o'tadi va **o'ynash uzilmaydi**
6. `/videos/<id>/playground` — o'sha video o'ynaydi, resume ham ishlaydi
7. Hali transcode bo'lmagan videoni oching → "tayyorlanmoqda", **qo'l tegizmasdan**
   tayyor bo'lganda player o'zi paydo bo'ladi

- [ ] **Step 5: mkhls o'chirilgan holatni tekshirish**

```bash
docker compose -f docker-compose.dev.yml stop mkhls
```

Tayyor videoni oching → **503** ekrani ("Video vaqtincha mavjud emas"), abadiy
"tayyorlanmoqda" emas. mkhls'ni qaytaring va sahifani yangilang.

- [ ] **Step 6: HANDOFF ni yozish**

`docs/superpowers/HANDOFF.md` ni **butunlay qayta yozing** (eski nusxa git tarixida
qoladi). `.superpowers/sdd/` `.gitignore`langan, ya'ni bu fayl va git tarixi yagona
durable yozuv — quyidagilar albatta bo'lsin:

- Ikkala repo va branch holati; `main` `origin/main`dan nechta commit oldinda
- Step 1'da o'lchangan haqiqiy bundle raqamlari
- Vidstack `latest` dist-tegi tuzog'i (`0.6.15` vs `1.15.6`) — bu keyingi
  `npm install` da yana urishi mumkin
- **Prod CORS:** `configs/production/config.yaml` hamon `your-domain.com`
  placeholder'i bilan; hls.js segmentlarni `fetch` bilan oladi, ya'ni eski
  iframe'da bo'lmagan yangi talab. 9-bosqich uchun qattiq band
- Hali tuzatilmagan ma'lum muammolar — eski HANDOFF'dagi ro'yxatni **ko'chiring**
  (`getVideo` populate proyeksiyasi, `markVideoWatched` course tekshiruvi, yuklash
  hajmi chegarasi, Go `finishJob` probe testi) va Plan 3 davomida topilgan yangilarini
  qo'shing
- Keyingi bosqich: 8 (xavfsizlik tozalash — `utils/bunny.js`, schema maydonlari,
  `bulk-link` endpointi, `fetch_bunny.html`) va 9 (deploy)

Spec `§15.4` holat jadvalini yangilang: `6-7. Frontend` → `✅`.

- [ ] **Step 7: Commit**

```bash
cd ..
git add docs/superpowers/HANDOFF.md docs/superpowers/specs/2026-08-05-video-streaming-mkhls-design.md
git commit -m "$(cat <<'EOF'
docs: hand off to stage 8 after the frontend player and admin panel

Records the measured bundle cost of Vidstack against the spec's estimate, the
npm dist-tag trap that will bite the next install (latest is 0.6.15, an older
incompatible line; the project needs 1.15.6), and the production CORS
placeholder — hls.js fetches playlists and segments directly, which the old
iframe never did, so mkhls must name the real origin before deploy.

Carries forward the known-unfixed list rather than restating it: .superpowers/
is gitignored, so this file and the git history are the only durable record.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 8: Alohida whole-branch review buyurtma qilish**

Plan 3 shu yerda tugaydi, lekin **merge qilinmaydi**. HANDOFF'ning eng kuchli
tavsiyasi: butun branch uchun alohida review, **implementator emas**. Bu naqsh
Plan 1-2 da bir marta va Plan 2 da yana ikki marta chok-orasidagi xatoliklarni
topgan — har biri alohida to'g'ri ko'rinadigan tasklar orasidan.

Foydalanuvchiga xabar bering: Plan 3 tugadi, whole-branch review kutilmoqda.

---

## Self-Review

**Spec qamrovi:**

| Spec bo'limi | Task |
|---|---|
| §2.1 Vidstack + bundle qilingan hls.js | Task 1 |
| §2.2 Token segmentlarga meros (o'zgarish talab qilmaydi) | — (tasdiqlangan fakt) |
| §2.3 Prod CORS bandi | Task 8 (HANDOFF) |
| §3.1 `startAt` muzlatish | Task 2 (hook), Task 7 (test) |
| §3.2 Progress throttle + flush | Task 2 |
| §3.3 Token yangilash (proaktiv + reaktiv + tormoz) | Task 2 (hook), Task 7 (test) |
| §3.4 30s polling | Task 2 (hook), Task 3 (ekran + test) |
| §3.5 Tozalash | Task 2 |
| §4 `LessonPlayer` + `onResume` | Task 1, Task 3 (toast) |
| §5.1 `page.tsx` (o'chirish, `hasFailed`, matnlar, reyting) | Task 2, Task 3 |
| §5.2 `playground/page.tsx` | Task 4 |
| §5.3 `types/video.ts` | Task 2 |
| §5.4 `videoSlice` + `useVideos` | Task 2 |
| §5.5 `videoApi.saveProgress` | Task 2 |
| §6.1 `VideoRow` + `StatusBadge` | Task 5 |
| §6.2 Yuklash oqimini ajratish + ro'yxat polling | Task 5 (polling), Task 6 (oqim) |
| §6.3 Transcode progressi, foizsiz | Task 5 |
| §6.4 502 ni yutmaslik | Task 6 |
| §6.5 Qo'lda ulash | Task 6 |
| §6.6 Tozalash (`bulkLinkBunny`, yorliqlar) | Task 6 |
| §6.7 `isFree` badge | Task 6 |
| §7 Xatoliklar jadvali | Task 3 (failed, preparing), Task 2 (503 mavjud yo'l) |
| §8.1 Playwright | Task 2, 3, 4, 5, 6, 7 |
| §8.2 Qo'lda E2E | Task 8 |
| §8.3 Bundle o'lchovi | Task 8 |
| §8.4 Whole-branch review | Task 8 Step 8 |

Qopqoqsiz spec bandi topilmadi.

**Tur muvofiqligi:** `StreamStatus` Task 2'da `types/video.ts` da e'lon qilinadi va
Task 5'da admin panelga import qilinadi — bir xil nom. `LessonPlayerProps` (Task 1)
`useLessonStream` ning `LessonPlayerBinding` (Task 2) bilan mos: `hlsUrl`, `poster`,
`startAt`, `onPosition`, `onError`; `onResume` faqat props'da (ixtiyoriy), sahifa uni
alohida uzatadi. `TranscodeInfo` faqat Task 5-6 da ishlatiladi.

**Ma'lum kelishuv:** Task 5 `typecheck` darvozasini Task 6 bilan bo'lishadi — bu
Task 5'ning o'zida ochiq yozilgan, chunki `bunnyVideoId` havolalari edit modalida
qoladi va uni bir taskda bo'lish sun'iy chegara bo'lardi.

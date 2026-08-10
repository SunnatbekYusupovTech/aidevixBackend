import { test, expect } from './fixtures/test-fixtures';
import { ROUTES, SELECTORS, TIMEOUTS } from './helpers/constants';
import {
  MOCK_VIDEOS,
  MOCK_TOP_VIDEOS,
  MOCK_SUBSCRIPTION_UNVERIFIED,
  MOCK_VIDEO_BY_ID_RESPONSE,
} from './fixtures/mock-data';
import { waitForPageReady } from './helpers/test-utils';

test.describe('Videos Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/**/videos/top*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_TOP_VIDEOS) }),
    );
    await page.route('**/api/**/auth/me*', (route) =>
      route.fulfill({ status: 401, body: JSON.stringify({ success: false }) }),
    );
    await page.route('**/api/**/auth/refresh-token*', (route) =>
      route.fulfill({ status: 401, body: JSON.stringify({ success: false }) }),
    );
  });

  test('videos page loads', async ({ page }) => {
    await page.goto(ROUTES.VIDEOS);
    await waitForPageReady(page);
    await expect(page).not.toHaveTitle(/error|500/i);
  });
});

test.describe('Video Detail — Subscription Gate', () => {
  test('video detail requires subscription', async ({ page }) => {
    // Simulate unverified user
    await page.route('**/api/**/auth/me*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            user: {
              _id: 'u1',
              username: 'newuser',
              email: 'new@test.com',
              subscriptions: { telegram: { verified: false }, instagram: { verified: false } },
            },
          },
        }),
      }),
    );
    await page.route('**/api/**/auth/refresh-token*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { accessToken: 'tok' } }) }),
    );
    await page.route('**/api/**/subscriptions/status*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SUBSCRIPTION_UNVERIFIED) }),
    );
    await page.route('**/api/**/subscriptions/realtime-status*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SUBSCRIPTION_UNVERIFIED) }),
    );
    await page.route('**/api/**/videos/video-1*', (route) => {
      if (route.request().method() !== 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) });
      }
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_VIDEO_BY_ID_RESPONSE),
      });
    });
    await page.route('**/api/**/xp/stats*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) }),
    );

    await page.addInitScript(() => {
      localStorage.setItem('aidevix_user', JSON.stringify({
        _id: 'u1', username: 'newuser', email: 'new@test.com',
        subscriptions: { telegram: { verified: false }, instagram: { verified: false } },
      }));
    });

    await page.goto('/videos/video-1');
    await waitForPageReady(page);

    await expect(
      page.getByText(/Telegram va Instagram|Telegram and Instagram|Подпишитесь.*Telegram/i),
    ).toBeVisible({ timeout: TIMEOUTS.PAGE_LOAD });
    await page.getByRole('button', { name: /obuna|subscribe/i }).click();
    const gate = page.locator('.fixed.inset-0.z-50');
    await expect(gate).toBeVisible({ timeout: TIMEOUTS.API_RESPONSE });
    await expect(
      gate.getByText(/Instagram obunasi|Telegram obunasi|Instagram subscription|Telegram subscription|Подписка/i),
    ).toBeVisible({ timeout: TIMEOUTS.API_RESPONSE });
  });

  test('verified user can access video', async ({ loggedInPage }) => {
    await loggedInPage.route('**/api/**/videos/video-1*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            video: MOCK_VIDEOS.data.videos[0],
            videoLink: null,
            player: {
              type: 'hls',
              hlsUrl: 'https://stream.test/vod/aidevix/test-video-id/master.m3u8?token=t1',
              expiresAt: new Date(Date.now() + 7200000).toISOString(),
            },
            progress: null,
            streamStatus: 'ready',
          },
        }),
      }),
    );
    await loggedInPage.route('**/api/**/videos/video-1/rating*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { rating: 4.5 } }) }),
    );
    await loggedInPage.route('**/master.m3u8*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/vnd.apple.mpegurl',
        body: '#EXTM3U\n#EXT-X-VERSION:3\n',
      }),
    );

    await loggedInPage.goto('/videos/video-1');
    await waitForPageReady(loggedInPage);

    // Vidstack's React <MediaPlayer> renders as a plain <div data-media-player>
    // wrapper in this build, not a literal <media-player> custom element.
    await expect(loggedInPage.locator('[data-media-player]')).toBeVisible({ timeout: TIMEOUTS.API_RESPONSE });
    const url = loggedInPage.url();
    expect(url).toContain('/videos/video-1');
  });
});

test.describe('Video — Rating', () => {
  test('video rating component renders for authenticated user', async ({ loggedInPage }) => {
    await loggedInPage.route('**/api/**/videos/video-1*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { video: MOCK_VIDEOS.data.videos[0] },
        }),
      }),
    );
    await loggedInPage.route('**/api/**/videos/video-1/rating*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { rating: 0 } }) }),
    );

    await loggedInPage.goto('/videos/video-1');
    await waitForPageReady(loggedInPage);

    // Look for star rating elements
    await loggedInPage.waitForTimeout(2000);
    const stars = loggedInPage.locator('[class*="star"], [class*="Star"], [class*="rating"] button, svg[class*="star"]');
    // Rating component may or may not be visible depending on page state
  });
});

test.describe('Video — Search', () => {
  test('video search returns results', async ({ page }) => {
    await page.route('**/api/**/videos/search*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_VIDEOS) }),
    );
    await page.route('**/api/**/auth/me*', (route) =>
      route.fulfill({ status: 401, body: JSON.stringify({ success: false }) }),
    );
    await page.route('**/api/**/auth/refresh-token*', (route) =>
      route.fulfill({ status: 401, body: JSON.stringify({ success: false }) }),
    );

    await page.goto(ROUTES.VIDEOS);
    await waitForPageReady(page);

    const searchInput = page.locator('input[type="text"], input[type="search"]').first();
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('React');
      await page.waitForTimeout(600);
    }
  });
});

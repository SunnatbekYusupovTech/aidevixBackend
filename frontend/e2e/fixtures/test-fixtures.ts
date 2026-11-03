import { test as base, expect } from '@playwright/test';
import { ROUTES } from '../helpers/constants';
import {
  MOCK_TOP_COURSES,
  MOCK_TOP_VIDEOS,
  MOCK_COURSES,
  MOCK_CATEGORIES,
  MOCK_USER,
  MOCK_USER_STATS,
  MOCK_SUBSCRIPTION_STATUS,
  MOCK_AUTH_LOGIN_SUCCESS,
  MOCK_LEADERBOARD,
  MOCK_VIDEOS,
} from './mock-data';

/**
 * Extended test fixtures with API mocking and auth helpers.
 */
export const test = base.extend<{
  /** Set up common API mocks so pages render without a real backend */
  withMockedAPIs: void;
  /** Simulate a logged-in user */
  loggedInPage: typeof base['prototype'];
}>({
  withMockedAPIs: [async ({ page }, use) => {
    await page.addInitScript(() => {
      // Exercise the app as a returning visitor with consent already recorded.
      localStorage.setItem('aidevix_cookie_consent', 'rejected');
      localStorage.setItem('aidevix_beta_welcome_dismissed', '1');
      // Prevent DailyRewardModal from blocking pointer events in tests.
      sessionStorage.setItem('daily_reward_dismissed', new Date().toISOString().slice(0, 10));
    });

    // Mock all common API endpoints
    await page.route('**/api/**/courses/top*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_TOP_COURSES) }),
    );
    await page.route('**/api/**/videos/top*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_TOP_VIDEOS) }),
    );
    await page.route('**/api/**/courses/categories*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_CATEGORIES) }),
    );
    await page.route('**/api/**/courses?*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_COURSES) }),
    );
    await page.route('**/api/**/courses', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_COURSES) }),
    );
    // List/search mocks return `data.videos`; GET /videos/:id must return `data.video` + `videoLink`.
    await page.route('**/api/**/videos/**', (route) => {
      const url = route.request().url();
      const method = route.request().method();
      if (method !== 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: {} }),
        });
      }
      if (url.includes('/videos/top')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_TOP_VIDEOS) });
      }
      if (url.includes('/videos/course/')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { videos: [] } }),
        });
      }
      if (url.includes('/videos/search')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_VIDEOS) });
      }
      if (url.includes('/rating') || url.includes('/rate') || url.includes('/link/')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: {} }),
        });
      }
      const m = url.match(/\/videos\/([^/?]+)/);
      const id = m?.[1];
      if (id && !['top', 'search', 'course'].includes(id)) {
        const video = MOCK_VIDEOS.data.videos.find((v) => v._id === id) ?? MOCK_VIDEOS.data.videos[0];
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { video, videoLink: null } }),
        });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_VIDEOS) });
    });
    await page.route('**/api/**/subscriptions/status*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SUBSCRIPTION_STATUS) }),
    );
    await page.route('**/api/**/subscriptions/realtime-status*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SUBSCRIPTION_STATUS) }),
    );
    await page.route('**/api/**/auth/me*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: { user: MOCK_USER } }) }),
    );
    await page.route('**/api/**/auth/refresh-token*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { accessToken: 'refreshed-token' } }),
      }),
    );
    await page.route('**/api/**/xp/stats*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_USER_STATS) }),
    );
    await page.route('**/api/**/ranking*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_LEADERBOARD) }),
    );
    await page.route('**/api/**/projects/course/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { projects: [] } }),
      }),
    );
    await page.route('**/api/**/videos/course/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { videos: [] } }),
      }),
    );
    await page.route('**/api/**/courses/**/recommended*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { courses: [] } }),
      }),
    );

    await use();
  }, { auto: true }],

  loggedInPage: async ({ page }, use) => {
    // Set up auth cookies + localStorage for logged-in state
    await page.addInitScript((user) => {
      localStorage.setItem('aidevix_user', JSON.stringify(user));
      localStorage.setItem('aidevix_theme', 'dark');
    }, MOCK_USER);

    // Mock auth endpoint
    await page.route('**/api/**/auth/me*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { user: MOCK_USER } }),
      }),
    );
    await page.route('**/api/**/auth/refresh-token*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { accessToken: 'refreshed-token' } }),
      }),
    );
    await page.route('**/api/**/xp/stats*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_USER_STATS) }),
    );
    await page.route('**/api/**/subscriptions/status*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SUBSCRIPTION_STATUS) }),
    );
    await page.route('**/api/**/subscriptions/realtime-status*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SUBSCRIPTION_STATUS) }),
    );

    await use(page);
  },
});

export { expect };

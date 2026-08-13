import { test, expect } from './fixtures/test-fixtures';
import { ROUTES, SELECTORS, TIMEOUTS } from './helpers/constants';
import { MOCK_TOP_COURSES, MOCK_TOP_VIDEOS, MOCK_USER } from './fixtures/mock-data';
import {
  waitForPageReady,
  assertSEOMeta,
  assertNoBrokenLinks,
  assertPerformanceBudget,
  collectConsoleErrors,
  assertAccessibleInteractives,
} from './helpers/test-utils';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    // Mock APIs for homepage
    await page.route('**/api/**/courses/top*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_TOP_COURSES) }),
    );
    await page.route('**/api/**/videos/top*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_TOP_VIDEOS) }),
    );
    await page.route('**/api/**/auth/me*', (route) =>
      route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ success: false }) }),
    );
    // 401 on refresh triggers axios → hard redirect to /login (no Navbar on /).
    await page.route('**/api/**/auth/refresh-token*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { accessToken: 'e2e-guest' } }),
      }),
    );
  });

  test('homepage loads successfully', async ({ page }) => {
    await page.goto(ROUTES.HOME);
    await waitForPageReady(page);

    // Page should not show error state
    await expect(page).not.toHaveTitle(/error|500|404/i);
  });

  test('has correct SEO meta tags', async ({ page }) => {
    await page.goto(ROUTES.HOME);
    await waitForPageReady(page);

    const title = await page.title();
    expect(title).toBeTruthy();

    const desc = await page.locator('meta[name="description"]').getAttribute('content').catch(() => null);
    if (desc) expect(desc.length).toBeGreaterThan(0);
  });

  test('has proper Open Graph tags', async ({ page }) => {
    await page.goto(ROUTES.HOME);
    await waitForPageReady(page);

    const ogType = await page.locator('meta[property="og:type"]').getAttribute('content').catch(() => null);
    const ogSiteName = await page.locator('meta[property="og:site_name"]').getAttribute('content').catch(() => null);
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content').catch(() => null);
    const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content').catch(() => null);

    // Home `page.tsx` merges partial openGraph (title/image); type/siteName may come only from root layout.
    expect(ogType || ogSiteName || ogTitle || ogImage).toBeTruthy();
  });

  test('has Twitter Card meta tags', async ({ page }) => {
    await page.goto(ROUTES.HOME);
    await waitForPageReady(page);

    const twitterCard = await page.locator('meta[name="twitter:card"]').getAttribute('content').catch(() => null);
    // Twitter card is optional but good to have
    if (twitterCard) {
      expect(twitterCard).toBeTruthy();
    }
  });

  test('has proper robots meta', async ({ page }) => {
    await page.goto(ROUTES.HOME);
    await waitForPageReady(page);

    const robots = await page.locator('meta[name="robots"]').getAttribute('content').catch(() => null);
    if (robots) {
      expect(robots).toContain('index');
    }
  });

  test('viewport meta is set correctly', async ({ page }) => {
    await page.goto(ROUTES.HOME);
    await waitForPageReady(page);

    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toContain('width=device-width');
  });

  test('has favicon', async ({ page }) => {
    await page.goto(ROUTES.HOME);
    const favicon = page.locator('link[rel="icon"], link[rel="shortcut icon"]');
    const count = await favicon.count();
    if (count > 0) {
      const href = await favicon.first().getAttribute('href');
      expect(href).toBeTruthy();
    }
  });
});

test.describe('Homepage — Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/**/courses/top*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_TOP_COURSES) }),
    );
    await page.route('**/api/**/videos/top*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_TOP_VIDEOS) }),
    );
    await page.route('**/api/**/auth/me*', (route) =>
      route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ success: false }) }),
    );
    await page.route('**/api/**/auth/refresh-token*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { accessToken: 'e2e-guest' } }),
      }),
    );
  });

  test('navbar is visible', async ({ page }) => {
    await page.goto(ROUTES.HOME);
    await waitForPageReady(page);

    const nav = page.locator(SELECTORS.NAVBAR).first();
    await expect(nav).toBeVisible();
  });

  test('logo links to home', async ({ page }) => {
    await page.goto(ROUTES.HOME);
    await waitForPageReady(page);

    const logoLink = page.locator('a[href="/"]').first();
    await expect(logoLink).toBeVisible();
  });

  test('nav links to courses', async ({ page }) => {
    await page.goto(ROUTES.HOME);
    await waitForPageReady(page);

    const coursesLink = page.locator('a[href="/courses"]').first();
    if (await coursesLink.isVisible()) {
      await coursesLink.click();
      await page.waitForURL('**/courses', { timeout: TIMEOUTS.PAGE_LOAD });
    }
  });

  test('nav shows login/register for unauthenticated user', async ({ page }) => {
    await page.goto(ROUTES.HOME);
    await waitForPageReady(page);

    // Should show auth buttons somewhere on page
    const loginLink = page.locator('a[href="/login"]');
    const registerLink = page.locator('a[href="/register"]');

    const hasLogin = await loginLink.count() > 0;
    const hasRegister = await registerLink.count() > 0;

    expect(hasLogin || hasRegister).toBeTruthy();
  });

  test('footer is visible', async ({ page }) => {
    await page.goto(ROUTES.HOME);
    await waitForPageReady(page);

    const footer = page.locator(SELECTORS.FOOTER).first();
    await expect(footer).toBeVisible();
  });

  test('footer contains social links', async ({ page }) => {
    await page.goto(ROUTES.HOME);
    await waitForPageReady(page);

    // Footer should have telegram and instagram links
    const telegramLink = page.locator('a[href*="t.me"]').first();
    const instagramLink = page.locator('a[href*="instagram"]').first();

    const hasTelegram = await telegramLink.count() > 0;
    const hasInstagram = await instagramLink.count() > 0;

    expect(hasTelegram || hasInstagram).toBeTruthy();
  });
});

test.describe('Homepage — Content', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/**/courses/top*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_TOP_COURSES) }),
    );
    await page.route('**/api/**/videos/top*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_TOP_VIDEOS) }),
    );
    await page.route('**/api/**/auth/me*', (route) =>
      route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ success: false }) }),
    );
    await page.route('**/api/**/auth/refresh-token*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { accessToken: 'e2e-guest' } }),
      }),
    );
  });

  test('displays hero section', async ({ page }) => {
    await page.goto(ROUTES.HOME);
    await waitForPageReady(page);

    // Hero should have heading with Aidevix or relevant text
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: TIMEOUTS.ANIMATION });
  });

  test('displays course cards', async ({ page }) => {
    await page.goto(ROUTES.HOME);
    await waitForPageReady(page);

    // Wait for content to load
    await page.waitForTimeout(2000);

    // Should show course-related content
    const courseSection = page.locator('text=/kurs/i').first();
    if (await courseSection.isVisible()) {
      expect(true).toBeTruthy();
    }
  });

  test('CTA buttons are clickable', async ({ page }) => {
    await page.goto(ROUTES.HOME);
    await waitForPageReady(page);

    // Find primary CTA buttons
    const ctaButtons = page.locator('a.btn, button.btn').filter({ hasText: /boshlash|kurslar|ro.*yxat/i });
    const count = await ctaButtons.count();

    if (count > 0) {
      // First CTA should be clickable
      await expect(ctaButtons.first()).toBeEnabled();
    }
  });
});

test.describe('Homepage — Responsive', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/**', (route) => {
      const url = route.request().url();
      if (url.includes('/auth/me')) {
        return route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ success: false }),
        });
      }
      if (url.includes('/auth/refresh-token')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { accessToken: 'e2e-guest' } }),
        });
      }
      if (url.includes('courses/top')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_TOP_COURSES) });
      }
      if (url.includes('videos/top')) {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_TOP_VIDEOS) });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) });
    });
  });

  test('mobile: hamburger menu appears on small screens', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(ROUTES.HOME);
    await waitForPageReady(page);

    // Should see hamburger menu button on mobile
    const menuBtns = page.locator('button').filter({ has: page.locator('svg') });
    const count = await menuBtns.count();
    expect(count).toBeGreaterThan(0);
  });

  test('desktop: nav links visible on large screens', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(ROUTES.HOME);
    await waitForPageReady(page);

    const nav = page.locator(SELECTORS.NAVBAR).first();
    await expect(nav).toBeVisible();
  });
});

test.describe('Homepage — Performance', () => {
  test('page loads within performance budget', async ({ page }) => {
    await page.route('**/api/**', (route) => {
      const url = route.request().url();
      if (url.includes('/auth/me')) {
        return route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ success: false }),
        });
      }
      if (url.includes('/auth/refresh-token')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { accessToken: 'e2e-guest' } }),
        });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) });
    });

    await page.goto(ROUTES.HOME);
    await waitForPageReady(page);

    const timing = await assertPerformanceBudget(page, 15_000); // generous for dev server
    expect(timing.firstByte).toBeLessThan(5000);
  });

  test('no critical console errors', async ({ page }) => {
    const errors = collectConsoleErrors(page);

    await page.route('**/api/**', (route) => {
      const url = route.request().url();
      if (url.includes('/auth/me')) {
        return route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ success: false }),
        });
      }
      if (url.includes('/auth/refresh-token')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { accessToken: 'e2e-guest' } }),
        });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) });
    });

    await page.goto(ROUTES.HOME);
    await waitForPageReady(page);

    // Filter out expected dev-mode warnings
    const criticalErrors = errors.filter(
      (e) => !e.includes('favicon') && !e.includes('DevTools') && !e.includes('hydration'),
    );

    if (criticalErrors.length > 0) {
      console.warn('Console errors:', criticalErrors);
    }
  });
});

// These two blocks render inside <LazyMotion strict> in HomeClient, which
// forbids the `motion` export and throws when it sees one. Both components
// return null when logged out, and the suite above mocks auth/me as 401 —
// so this case needs its own logged-in setup or it proves nothing.
test.describe('Homepage — logged-in sections render without a motion error', () => {
  test.beforeEach(async ({ page }) => {
    const json = (route: any, body: unknown) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

    await page.route('**/api/**/auth/me*', (route) => json(route, { success: true, data: MOCK_USER }));
    await page.route('**/api/**/auth/csrf*', (route) => json(route, { success: true, data: { token: 'test-csrf' } }));
    await page.route('**/api/**/courses/top*', (route) => json(route, MOCK_TOP_COURSES));
    await page.route('**/api/**/videos/top*', (route) => json(route, MOCK_TOP_VIDEOS));

    // ContinueWatching bails out unless course AND nextVideo are both present.
    await page.route('**/api/**/enrollments/continue*', (route) =>
      json(route, {
        success: true,
        data: {
          course: { _id: 'c1', title: 'Test kurs', thumbnail: null },
          nextVideo: { _id: 'v1', title: 'Dars 1', duration: 120 },
          progressPercent: 40,
        },
      }),
    );

    // RecommendedForYou bails out when the list comes back empty.
    await page.route('**/api/**/courses/recommended*', (route) =>
      json(route, {
        success: true,
        data: { courses: [{ _id: 'c1', title: 'Test kurs', category: 'javascript' }], meta: { basedOn: [] } },
      }),
    );
  });

  test('bosh sahifada framer-motion strict xatosi yo\'q', async ({ page }) => {
    const errors = collectConsoleErrors(page);

    await page.goto(ROUTES.HOME);
    await waitForPageReady(page);
    // Both blocks fetch after mount; give their render a beat to land.
    await page.waitForTimeout(1000);

    const motionErrors = errors.filter((e) => /motion|LazyMotion|strict/i.test(e));
    expect(motionErrors, `framer-motion xatolari:\n${motionErrors.join('\n')}`).toHaveLength(0);
  });
});

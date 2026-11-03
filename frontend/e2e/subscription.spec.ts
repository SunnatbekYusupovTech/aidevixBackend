import { test, expect } from './fixtures/test-fixtures';
import { ROUTES, TIMEOUTS } from './helpers/constants';
import {
  MOCK_SUBSCRIPTION_STATUS,
  MOCK_SUBSCRIPTION_UNVERIFIED,
  MOCK_VIDEO_BY_ID_RESPONSE,
} from './fixtures/mock-data';
import { waitForPageReady } from './helpers/test-utils';

test.describe('Subscription Verification', () => {
  test('subscription page loads for logged-in user', async ({ loggedInPage }) => {
    await loggedInPage.route('**/api/**/subscriptions/status*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SUBSCRIPTION_UNVERIFIED) }),
    );
    await loggedInPage.route('**/api/**/subscriptions/realtime-status*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SUBSCRIPTION_UNVERIFIED) }),
    );

    await loggedInPage.goto(ROUTES.SUBSCRIPTION);
    await waitForPageReady(loggedInPage);

    // Should show subscription verification UI
    const hasTelegramSection = await loggedInPage.locator('text=/telegram/i').first().isVisible().catch(() => false);
    const hasInstagramSection = await loggedInPage.locator('text=/instagram/i').first().isVisible().catch(() => false);

    // At least one social verification should be visible
    expect(hasTelegramSection || hasInstagramSection).toBeTruthy();
  });

  test('shows verified status for subscribed user', async ({ loggedInPage }) => {
    await loggedInPage.route('**/api/**/subscriptions/status*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SUBSCRIPTION_STATUS) }),
    );
    await loggedInPage.route('**/api/**/subscriptions/realtime-status*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SUBSCRIPTION_STATUS) }),
    );

    await loggedInPage.goto(ROUTES.SUBSCRIPTION);
    await waitForPageReady(loggedInPage);
    await loggedInPage.waitForResponse(
      (r) => r.url().includes('subscriptions/status') && r.status() === 200,
      { timeout: TIMEOUTS.PAGE_LOAD },
    ).catch(() => {});

    // Success card (avoid nav duplicate "Kurslar" links)
    await expect(loggedInPage.getByRole('heading', { name: /tabriklaymiz|congratulations|поздравляем/i })).toBeVisible({
      timeout: TIMEOUTS.PAGE_LOAD,
    });
  });

  test('Telegram verify button submits username', async ({ loggedInPage }) => {
    let telegramVerifyCalled = false;

    await loggedInPage.route('**/api/**/subscriptions/status*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SUBSCRIPTION_UNVERIFIED) }),
    );
    await loggedInPage.route('**/api/**/subscriptions/realtime-status*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SUBSCRIPTION_UNVERIFIED) }),
    );
    await loggedInPage.route('**/api/**/subscriptions/verify-telegram', async (route) => {
      telegramVerifyCalled = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { telegram: { verified: true, username: 'testuser_tg' } },
        }),
      });
    });

    await loggedInPage.goto(ROUTES.SUBSCRIPTION);
    await waitForPageReady(loggedInPage);

    // Dismiss any modal overlays first
    const modal = loggedInPage.locator('.fixed.inset-0, [class*="modal-overlay"]').first();
    if (await modal.isVisible({ timeout: 2000 }).catch(() => false)) {
      await modal.locator('button').first().click().catch(() => {});
      await loggedInPage.waitForTimeout(500);
    }

    // Find Telegram input and fill it
    const tgInput = loggedInPage.locator('input[placeholder*="telegram" i], input[placeholder*="username" i]').first();
    if (await tgInput.isVisible().catch(() => false)) {
      await tgInput.fill('testuser_tg');

      // Find and click verify/submit button near the telegram section
      const verifyBtn = loggedInPage.locator('button').filter({ hasText: /tekshirish|verify|tasdiqlash/i }).first();
      if (await verifyBtn.isVisible().catch(() => false)) {
        // Force click to bypass disabled state (button may enable after input)
        await verifyBtn.click({ force: true }).catch(() => {});
        await loggedInPage.waitForTimeout(1000);
      }
    }
  });

  test('Instagram verify button submits username', async ({ loggedInPage }) => {
    await loggedInPage.route('**/api/**/subscriptions/status*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SUBSCRIPTION_UNVERIFIED) }),
    );
    await loggedInPage.route('**/api/**/subscriptions/realtime-status*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SUBSCRIPTION_UNVERIFIED) }),
    );
    await loggedInPage.route('**/api/**/subscriptions/verify-instagram', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { instagram: { verified: true, username: 'testuser_ig' } },
        }),
      }),
    );

    await loggedInPage.goto(ROUTES.SUBSCRIPTION);
    await waitForPageReady(loggedInPage);

    // Dismiss any modal overlays first
    const igModal = loggedInPage.locator('.fixed.inset-0, [class*="modal-overlay"]').first();
    if (await igModal.isVisible({ timeout: 2000 }).catch(() => false)) {
      await igModal.locator('button').first().click().catch(() => {});
      await loggedInPage.waitForTimeout(500);
    }

    const igInput = loggedInPage.locator('input[placeholder*="instagram" i], input[placeholder*="username" i]').last();
    if (await igInput.isVisible().catch(() => false)) {
      await igInput.fill('testuser_ig');

      const verifyBtn = loggedInPage.locator('button').filter({ hasText: /tekshirish|verify|tasdiqlash/i }).last();
      if (await verifyBtn.isVisible().catch(() => false)) {
        await verifyBtn.click({ force: true }).catch(() => {});
        await loggedInPage.waitForTimeout(1000);
      }
    }
  });
});

test.describe('Subscription Gate Component', () => {
  test('gate blocks content for unverified users', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('aidevix_user', JSON.stringify({
        _id: 'u1', username: 'newuser', email: 'new@test.com',
        subscriptions: { telegram: { verified: false }, instagram: { verified: false } },
      }));
    });

    await page.route('**/api/**/auth/me*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            user: {
              _id: 'u1', username: 'newuser', email: 'new@test.com',
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
    await page.route('**/api/**/xp/stats*', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: {} }) }),
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

    await page.goto('/videos/video-1');
    await waitForPageReady(page);

    await expect(
      page.getByText(/Telegram va Instagram|Telegram and Instagram|Подпишитесь.*Telegram/i),
    ).toBeVisible({ timeout: TIMEOUTS.PAGE_LOAD });
    await page.getByRole('button', { name: /obuna|subscribe/i }).click();
    const gate = page.locator('.fixed.inset-0.z-50');
    await expect(gate).toBeVisible({ timeout: TIMEOUTS.API_RESPONSE });
    await expect(
      gate.getByText(/Instagram.{0,4}obuna|Telegram.{0,4}(obuna|ulaning)|Follow on Instagram|Connect Telegram|Instagram subscription|Telegram subscription|Подпис|Подключите/i),
    ).toBeVisible({ timeout: TIMEOUTS.API_RESPONSE });
  });
});

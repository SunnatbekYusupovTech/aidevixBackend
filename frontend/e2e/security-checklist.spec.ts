import { test, expect } from './fixtures/test-fixtures';
import { ROUTES, TIMEOUTS } from './helpers/constants';
import { waitForPageReady } from './helpers/test-utils';

test.describe('Security Checklist Smoke', () => {
  test('public response contains critical security headers', async ({ page }) => {
    const response = await page.goto(ROUTES.HOME);
    expect(response).toBeTruthy();

    const headers = response!.headers();
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['permissions-policy']).toContain('camera=');
    // `same-origin-allow-popups` — Google OAuth popup window.opener bilan
    // bog'lana olishi uchun zarur (`same-origin` popup callback'ni bloklaydi).
    expect(headers['cross-origin-opener-policy']).toBe('same-origin-allow-popups');
    expect(headers['cross-origin-resource-policy']).toBe('same-site');
    expect(headers['strict-transport-security']).toContain('max-age=');
    expect(headers['content-security-policy-report-only']).toContain("default-src 'self'");
  });

  test('all target=_blank links include noopener', async ({ page }) => {
    for (const route of [ROUTES.HOME, ROUTES.REFERRAL]) {
      await page.goto(route);
      await waitForPageReady(page);

      const linksWithoutNoopener = await page.locator('a[target="_blank"]:not([rel*="noopener"])').count();
      expect(linksWithoutNoopener, `Missing noopener on route ${route}`).toBe(0);
    }
  });

  test('auth pages avoid critical runtime exceptions', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (text.includes('favicon')) return;
        if (text.includes('GSI_LOGGER')) return;
        if (text.includes('Failed to fetch RSC payload')) return;
        if (text.includes('Failed to load resource: the server responded with a status of 403')) return;
        consoleErrors.push(text);
      }
    });

    await page.goto(ROUTES.LOGIN);
    await waitForPageReady(page);
    await page.goto(ROUTES.REGISTER);
    await waitForPageReady(page);

    const critical = consoleErrors.filter((err) =>
      /TypeError|ReferenceError|SyntaxError|Cannot read properties/i.test(err),
    );
    expect(critical.slice(0, 3), 'Critical runtime exceptions found').toEqual([]);
  });
});


import { test, expect } from '@playwright/test';
import type { Page, Route } from '@playwright/test';
import { MOCK_USER } from './fixtures/mock-data';

const COURSE_ID = 'course-admin-1';
const VIDEO_ID = 'vid-admin-1';

const json = (route: Route, body: unknown, status = 200) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

async function mockAdmin(page: Page) {
  // `checkAuthStatus` (src/store/slices/authSlice.ts) does
  // `tokenStorage.setUser(data.data); return { user: data.data }`, and the
  // reducer sets `state.user = action.payload.user`. So the user object must
  // sit directly under `data`, NOT nested as `data: { user: {...} }` — that
  // extra nesting makes `state.user.role` undefined, `AdminRoute` sees a
  // non-admin and redirects to `/` before the page under test ever renders.
  await page.route('**/api/**/auth/me*', (route) =>
    json(route, { success: true, data: { ...MOCK_USER, role: 'admin' } }),
  );
  await page.route('**/api/**/auth/csrf*', (route) =>
    json(route, { success: true, data: { token: 'test-csrf' } }),
  );
  // `/api/` prefix matters: the page's own navigation URL
  // (`/admin/courses/${COURSE_ID}`) also contains the literal substring
  // `courses/${COURSE_ID}`, so an unscoped pattern intercepts the top-level
  // document request too and serves raw JSON instead of the app shell.
  await page.route(new RegExp(`/api/.*/courses/${COURSE_ID}(?:[?#]|$)`), (route) =>
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

async function mockCourseVideos(page: Page, streamStatus: string) {
  await page.route(new RegExp(`/api/.*/videos/course/${COURSE_ID}`), (route) =>
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
    page.setDefaultNavigationTimeout(90_000);
    await mockAdmin(page);
  });

  test('ready dars ready badge ko\'rsatadi, pending emas', async ({ page }) => {
    await mockCourseVideos(page, 'ready');
    await page.goto(`/admin/courses/${COURSE_ID}`);
    // Admin shell'ga yetib kelganimizni tasdiqlaydi — auth mock buzilsa
    // (masalan noto'g'ri nesting bilan) sahifa AdminRoute tomonidan `/`ga
    // qaytariladi va keyingi assertion "text not found" bilan chalkash
    // xato beradi, buning o'rniga bu yerda aniq yiqiladi.
    await expect(page.getByText('Aidevix Admin')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('1-Dars: Test')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('ready', { exact: false }).first()).toBeVisible();
  });

  test('processing dars n/m preset progressini ko\'rsatadi, foizsiz', async ({ page }) => {
    await mockCourseVideos(page, 'processing');
    await page.route(new RegExp(`/api/.*/videos/${VIDEO_ID}/status`), (route) =>
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
    await expect(page.getByText('Aidevix Admin')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText('2/3 preset')).toBeVisible({ timeout: 30_000 });

    // Foiz raqami hech qayerda chiqmasligi kerak — mkhls uni oshirmaydi.
    await expect(page.locator('body')).not.toContainText(/\d+\s*%/);
  });
});

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
    // exact:true — the page also has a "Kursni saqlash" button whose
    // accessible name substring-matches "Saqlash" and triggers a strict-mode
    // violation otherwise.
    await page.getByRole('button', { name: 'Saqlash', exact: true }).click();

    await expect.poll(() => linkBody, { timeout: 10_000 }).not.toBeNull();
    expect(linkBody).toEqual({ streamPath: `aidevix/${VIDEO_ID}.mp4` });
  });

  test('tools sahifasida bulk Bunny bo\'limi yo\'q', async ({ page }) => {
    await page.goto('/admin/tools');
    await expect(page.locator('body')).not.toContainText(/bunnyVideoId/i);
    await expect(page.locator('body')).not.toContainText(/bulk.*bunny/i);
  });
});

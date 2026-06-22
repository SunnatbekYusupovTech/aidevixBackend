import { defineConfig, devices } from '@playwright/test';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/test-results',
  // Next.js dev server + route mocking is significantly more stable in serial mode locally.
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [['html', { outputFolder: 'e2e/playwright-report' }], ['github']]
    : [['html', { outputFolder: 'e2e/playwright-report', open: 'never' }], ['list']],

  timeout: 60_000,
  expect: { timeout: 15_000 },

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'uz-UZ',
    timezoneId: 'Asia/Tashkent',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    // --- Desktop browsers ---
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // --- Mobile viewports ---
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 14'] },
    },

    // --- Tablet ---
    {
      name: 'tablet',
      use: { ...devices['iPad (gen 7)'] },
    },
  ],

  webServer: {
    // CI builds the app first (`npm run build`), so serve the production build
    // with `next start` — pre-compiled pages load in ms. `next dev` recompiles
    // every route on first hit, which made the serial suite blow past the
    // 30-minute job timeout. Locally we keep `next dev` for fast iteration.
    command: process.env.CI ? 'npm run start' : 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});

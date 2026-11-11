import { defineConfig, devices } from '@playwright/test';

const PREVIEW_PORT = 4204;
const BASE_PATH = process.env.BASE_PATH ?? '/nore-coffee/';
const SITE_URL = `http://localhost:${String(PREVIEW_PORT)}${BASE_PATH}`;
const IS_CI = Boolean(process.env.CI);

/**
 * End-to-end tests run against the production build, served under the same sub-path that
 * GitHub Pages uses. Locally they drive the installed Google Chrome; CI installs Chromium.
 */
export default defineConfig({
  testDir: './e2e',
  outputDir: './test-results',
  fullyParallel: true,
  workers: IS_CI ? 2 : 4,
  expect: { timeout: 10_000 },
  forbidOnly: IS_CI,
  retries: IS_CI ? 2 : 0,
  reporter: IS_CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: SITE_URL,
    channel: IS_CI ? undefined : 'chrome',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
      testIgnore: /(mobile|no-js)\.spec\.ts/,
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } },
      testMatch: /mobile\.spec\.ts/,
    },
    {
      // Reading and browsing must work with JavaScript off; only the cart and the tools need it.
      name: 'no-js',
      use: { ...devices['Desktop Chrome'], javaScriptEnabled: false },
      testMatch: /no-js\.spec\.ts/,
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview',
    url: SITE_URL,
    reuseExistingServer: !IS_CI,
    timeout: 120_000,
  },
});

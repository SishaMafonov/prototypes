import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  testMatch: '**/*.spec.mjs',
  fullyParallel: true,
  workers: 2,
  timeout: 30_000,
  forbidOnly: true,
  retries: 0,
  updateSnapshots: 'none',
  outputDir: 'reports/browser/artifacts',
  snapshotPathTemplate: '{testDir}/baselines/{platform}/{projectName}/{arg}{ext}',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/browser/html', open: 'never' }],
    ['junit', { outputFile: 'reports/browser/results.junit.xml' }],
    ['json', { outputFile: 'reports/browser/results.json' }],
  ],
  expect: {
    timeout: 5000,
    toHaveScreenshot: { animations: 'disabled', caret: 'hide', scale: 'css', threshold: 0.1, maxDiffPixels: 0 },
  },
  use: {
    browserName: 'chromium',
    viewport: { width: 960, height: 540 },
    deviceScaleFactor: 1,
    locale: 'en-US',
    timezoneId: 'Europe/Stockholm',
    colorScheme: 'dark',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    { name: 'e2e', testMatch: '**/e2e.spec.mjs', use: { baseURL: 'http://127.0.0.1:4173' } },
    { name: 'browser-integration', testMatch: '**/integration.spec.mjs', use: { baseURL: 'http://127.0.0.1:4174' } },
    { name: 'visual', testMatch: '**/visual.spec.mjs', use: { baseURL: 'http://127.0.0.1:4174' } },
  ],
  webServer: {
    command: 'npm run build && npm run build:browser-test && node tests/browser/serve.mjs',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});

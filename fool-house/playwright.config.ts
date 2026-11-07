import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e', fullyParallel: true, workers: process.env.CI ? 2 : 2,
  testIgnore: '**/production.spec.ts',
  timeout: 60_000, expect: { timeout: 8_000, toHaveScreenshot: { animations: 'disabled', scale: 'css', maxDiffPixelRatio: 0.001, threshold: 0.2 } },
  forbidOnly: !!process.env.CI, retries: 0, updateSnapshots: 'none',
  outputDir: './test-results', snapshotPathTemplate: '{testDir}/__screenshots__/{platform}/{projectName}/{testFilePath}/{arg}{ext}',
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }], ['json', { outputFile: 'test-results/results.json' }], ['./e2e/coverage-reporter.ts']],
  use: { baseURL: 'http://127.0.0.1:4178', browserName: 'chromium', locale: 'en-US', timezoneId: 'Europe/Stockholm', colorScheme: 'dark', reducedMotion: 'no-preference', serviceWorkers: 'block', trace: 'retain-on-failure', screenshot: 'only-on-failure', video: 'off' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true } },
    { name: 'compact', testMatch: /layout\.(visual|graph)\.spec\.ts/, use: { viewport: { width: 375, height: 667 }, deviceScaleFactor: 1 } },
    { name: 'landscape', testMatch: /layout\.(visual|graph)\.spec\.ts/, use: { viewport: { width: 844, height: 390 }, deviceScaleFactor: 1 } },
    { name: 'hidpi', testMatch: /layout\.graph\.spec\.ts/, use: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 } },
    { name: 'production', testIgnore: [], testMatch: /production\.spec\.ts/, use: { baseURL: 'http://127.0.0.1:4179', viewport: { width: 390, height: 844 } } },
  ],
  webServer: [
    { command: 'npm run serve:e2e', url: 'http://127.0.0.1:4178', reuseExistingServer: false, timeout: 60_000 },
    { command: 'npm run serve:production-test', url: 'http://127.0.0.1:4179', reuseExistingServer: false, timeout: 60_000 },
  ],
});

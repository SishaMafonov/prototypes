import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './browser',
  workers: 2,
  forbidOnly: true,
  updateSnapshots: 'none',
  snapshotPathTemplate: '{testDir}/snapshots/{arg}-{platform}{ext}',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    browserName: 'chromium',
    viewport: { width: 1280, height: 720 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
  },
});

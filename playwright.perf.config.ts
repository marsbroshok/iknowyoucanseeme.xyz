import { defineConfig, devices } from '@playwright/test';
import base from './playwright.config.ts';

/**
 * Drift world frame-rate trace (`npm run perf:trace`): not part of the
 * gates. Same builds and server as the e2e suite; Chromium uses the
 * machine's GPU (Metal on macOS). Results: console and
 * `test-results/drift-perf.json`; a Chrome trace in `test-results/`.
 */
export default defineConfig({
  ...base,
  testDir: './tests/e2e/perf',
  testIgnore: [],
  timeout: 120_000,
  projects: [
    {
      name: 'chromium-gpu',
      use: { ...devices['Desktop Chrome'], launchOptions: { args: ['--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] } },
    },
  ],
});

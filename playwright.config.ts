import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4325',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Two builds: the default one (no Web3Forms key → email-only contact page;
  // no GoatCounter code → no analytics script) and a keyed one (contact form
  // and GoatCounter script rendered; both services are mocked in tests).
  webServer: {
    command:
      'npm run build && ASTRO_OUT_DIR=dist-e2e-keyed PUBLIC_WEB3FORMS_KEY=e2e-test-key PUBLIC_GOATCOUNTER_CODE=e2e-test npx astro build && npx tsx tests/e2e/staticServer.ts',
    url: 'http://localhost:4325',
    reuseExistingServer: false,
    timeout: 300_000,
  },
});

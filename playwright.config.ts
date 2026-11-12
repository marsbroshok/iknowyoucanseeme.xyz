import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  // The frame-rate trace has its own config (playwright.perf.config.ts).
  testIgnore: '**/perf/**',
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
      // WebGL2 for the drift world: the GPU where there is one, otherwise
      // SwiftShader (Chrome no longer falls back to it without this flag).
      use: { ...devices['Desktop Chrome'], launchOptions: { args: ['--enable-unsafe-swiftshader'] } },
    },
  ],
  // Two builds: the default one (no Web3Forms key → email-only contact page;
  // no GoatCounter code → no analytics script; production-identical) and a
  // keyed test build (contact form and GoatCounter script rendered, both
  // services mocked in tests; PUBLIC_DRIFT_DEBUG exposes the drift world's
  // read-only state as window.__driftDebug).
  webServer: {
    command:
      'npm run build && ASTRO_OUT_DIR=dist-e2e-keyed PUBLIC_WEB3FORMS_KEY=e2e-test-key PUBLIC_GOATCOUNTER_CODE=e2e-test PUBLIC_DRIFT_DEBUG=true npx astro build && npx tsx tests/e2e/staticServer.ts',
    url: 'http://localhost:4325',
    reuseExistingServer: false,
    timeout: 300_000,
  },
});

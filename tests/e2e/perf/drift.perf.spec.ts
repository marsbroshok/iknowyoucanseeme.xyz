import { test, expect, devices, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Frame-rate trace of the drift world: drifts for a fixed time with steady
 * wheel input (and a few turns), counting animation frames in the page, on
 * a desktop viewport (high tier) and on an emulated phone (touch, coarse
 * pointer → low tier, same GPU). Phone numbers are indicative only; the
 * real mid-range phone check is manual (docs/perf.md).
 */
const KEYED = 'http://localhost:4326';
const SECONDS = 10;

interface FrameStats {
  frames: number;
  seconds: number;
  fps: number;
  p95FrameMs: number;
  worstFrameMs: number;
}

/** Drifts and measures frame times with requestAnimationFrame. */
async function measure(page: Page): Promise<FrameStats> {
  await page.goto(`${KEYED}/en/`);
  await page.waitForFunction(() => ((window as unknown as { __driftDebug?: { frames: number } }).__driftDebug?.frames ?? 0) > 30, null, { timeout: 30_000 });
  const run = page.evaluate((seconds) => {
    return new Promise<FrameStats>((resolve) => {
      const times: number[] = [];
      let last = performance.now();
      const start = last;
      const tick = (now: number) => {
        times.push(now - last);
        last = now;
        if (now - start < seconds * 1000) requestAnimationFrame(tick);
        else {
          const sorted = [...times].sort((a, b) => a - b);
          const total = (now - start) / 1000;
          resolve({
            frames: times.length,
            seconds: total,
            fps: times.length / total,
            p95FrameMs: sorted[Math.floor(sorted.length * 0.95)],
            worstFrameMs: sorted[sorted.length - 1],
          });
        }
      };
      requestAnimationFrame(tick);
    });
  }, SECONDS);
  const end = Date.now() + SECONDS * 1000;
  let i = 0;
  while (Date.now() < end) {
    await page.mouse.wheel(0, 120);
    if (i++ % 10 === 5) await page.keyboard.press('ArrowLeft');
    await page.waitForTimeout(100);
  }
  return run;
}

const results: Record<string, FrameStats> = {};

test.describe('Drift world frame rate', () => {
  test.afterAll(() => {
    const file = path.resolve('test-results', 'drift-perf.json');
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, `${JSON.stringify(results, null, 2)}\n`);
  });

  test('desktop, high tier (≥ 60 fps target)', async ({ page, browser }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await browser.startTracing(page, { path: path.resolve('test-results', 'drift-perf-trace.json'), screenshots: false });
    const stats = await measure(page);
    await browser.stopTracing();
    results.desktop = stats;
    console.log(`[perf] desktop: ${JSON.stringify(stats)}`);
    expect(stats.fps).toBeGreaterThanOrEqual(55);
  });

  test('emulated phone, low tier (indicative; ≥ 40 fps target on a real phone)', async ({ browser }) => {
    const context = await browser.newContext({ ...devices['Pixel 7'] });
    const page = await context.newPage();
    const stats = await measure(page);
    results.phoneEmulated = stats;
    console.log(`[perf] phone (emulated): ${JSON.stringify(stats)}`);
    expect(stats.fps).toBeGreaterThanOrEqual(40);
    await context.close();
  });
});

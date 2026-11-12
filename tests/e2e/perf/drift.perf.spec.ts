import { test, expect, devices, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Frame-rate trace of the drift world: drifts for a fixed time with steady
 * wheel input (and a few turns), counting animation frames in the page, on
 * a desktop viewport (high tier) and on an emulated phone (touch, coarse
 * pointer → low tier, same GPU), each also with the lens active over a
 * work (track lens_20261111). Phone numbers are indicative only; the real
 * mid-range phone check is manual (docs/perf.md).
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

/** Drifts in front of a work with the lens on it: the pointer circles over the work and L goes through every lens. */
async function measureLens(page: Page, hold: (at: { x: number; y: number }) => Promise<unknown>, move: (at: { x: number; y: number }) => Promise<unknown>): Promise<FrameStats & { lensFrames: number }> {
  await page.goto(`${KEYED}/en/?w=arrivee`);
  await page.waitForFunction(() => (window as unknown as { __driftDebug?: { loaded: Record<string, string> } }).__driftDebug?.loaded.arrivee !== undefined, null, { timeout: 30_000 });
  const box = await page.locator('[data-drift-canvas]').boundingBox();
  if (!box) throw new Error('The world canvas has no box');
  const c = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await hold(c);
  await page.waitForFunction(() => (window as unknown as { __driftDebug: { lens: { strength: number } } }).__driftDebug.lens.strength === 1, null, { timeout: 10_000 });
  const run = page.evaluate((seconds) => {
    return new Promise<FrameStats & { lensFrames: number }>((resolve) => {
      const times: number[] = [];
      let lensFrames = 0;
      let last = performance.now();
      const start = last;
      const tick = (now: number) => {
        times.push(now - last);
        last = now;
        if ((window as unknown as { __driftDebug: { lens: { strength: number } } }).__driftDebug.lens.strength > 0) lensFrames++;
        if (now - start < seconds * 1000) requestAnimationFrame(tick);
        else {
          const sorted = [...times].sort((a, b) => a - b);
          const total = (now - start) / 1000;
          resolve({ frames: times.length, seconds: total, fps: times.length / total, p95FrameMs: sorted[Math.floor(sorted.length * 0.95)], worstFrameMs: sorted[sorted.length - 1], lensFrames });
        }
      };
      requestAnimationFrame(tick);
    });
  }, SECONDS);
  const end = Date.now() + SECONDS * 1000;
  let i = 0;
  while (Date.now() < end) {
    const a = (i * Math.PI) / 8;
    await move({ x: c.x + Math.cos(a) * 30, y: c.y + Math.sin(a) * 30 });
    if (i++ % 15 === 14) await page.keyboard.press('l');
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

  test('desktop, high tier, lens active over a work (≥ 60 fps target)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const stats = await measureLens(
      page,
      (at) => page.mouse.move(at.x, at.y),
      (at) => page.mouse.move(at.x, at.y),
    );
    results.desktopLens = stats;
    console.log(`[perf] desktop with lens: ${JSON.stringify(stats)}`);
    expect(stats.lensFrames / stats.frames).toBeGreaterThan(0.9);
    expect(stats.fps).toBeGreaterThanOrEqual(55);
  });

  test('emulated phone, low tier, finger on a work with the lens (indicative)', async ({ browser }) => {
    const context = await browser.newContext({ ...devices['Pixel 7'] });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    const touch = (type: 'touchStart' | 'touchMove', at: { x: number; y: number }) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: [{ x: at.x, y: at.y, id: 0 }] });
    const stats = await measureLens(
      page,
      (at) => touch('touchStart', at),
      (at) => touch('touchMove', at),
    );
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    results.phoneEmulatedLens = stats;
    console.log(`[perf] phone (emulated) with lens: ${JSON.stringify(stats)}`);
    expect(stats.lensFrames / stats.frames).toBeGreaterThan(0.9);
    expect(stats.fps).toBeGreaterThanOrEqual(40);
    await context.close();
  });
});

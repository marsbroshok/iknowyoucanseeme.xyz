import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { decodeQrSvg } from '../qr/decodeQr.js';
import { KIOSK } from '../../src/kiosk/KioskState.js';

/**
 * The exhibition mode (`?kiosk=1`, FR5) and the specimens (FR4) in
 * Chromium. Kiosk timing runs on Playwright's fake clock (`page.clock`):
 * the idle reset and the hidden cursor are reached by jumping the clock,
 * never by waiting. Assertions about the camera read `window.__driftDebug`
 * (keyed test build, port 4326).
 */
const KEYED = 'http://localhost:4326';

interface Debug {
  frames: number;
  pose: { x: number; z: number; yaw: number };
  facing: string | null;
  fragment: { id: string; opacity: number } | null;
  threshold: { holding: boolean; visible: boolean };
  sound: { state: string } | null;
}
const debug = (page: Page) => page.evaluate(() => (window as unknown as { __driftDebug?: Debug }).__driftDebug ?? null);

async function worldReady(page: Page): Promise<void> {
  await page.waitForFunction(() => ((window as unknown as { __driftDebug?: { frames: number } }).__driftDebug?.frames ?? 0) > 5, null, { timeout: 15_000 });
}

/** Waits for a number of new frames (state, not time). */
async function frames(page: Page, n: number): Promise<void> {
  const start = (await debug(page))?.frames ?? 0;
  await page.waitForFunction((target) => ((window as unknown as { __driftDebug: { frames: number } }).__driftDebug.frames ?? 0) >= target, start + n, { timeout: 15_000 });
}

/**
 * Jumps the fake clock without racing Playwright's live real-time tick loop
 * (an in-flight `_runTo` resuming after `fastForward` otherwise rewinds ticks).
 */
async function jumpClock(page: Page, ms: number): Promise<void> {
  const lead = 250;
  await page.clock.pauseAt((await page.evaluate(() => Date.now())) + lead);
  await new Promise((r) => setTimeout(r, 25));
  await page.clock.fastForward(ms - lead);
  await page.clock.resume();
}

/** Opens the work in front through the keyboard work list (real buttons). */
async function openFirstWork(page: Page): Promise<void> {
  const first = page.locator('[data-drift-works] button[tabindex="0"]');
  await first.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-drift-focus]')).toBeVisible();
}

test.describe('Exhibition mode (?kiosk=1)', () => {
  test('opens straight into the world: no threshold, no links, sound only after the first tap', async ({ page }) => {
    await page.goto(`${KEYED}/en/?kiosk=1`);
    await worldReady(page);
    await expect(page.locator('[data-threshold]')).toBeHidden();
    expect((await debug(page))?.threshold.holding).toBe(false);
    expect(await page.locator('a[href]').count()).toBe(0);
    expect((await debug(page))?.sound?.state).toBe('off');
    await page.locator('[data-drift-canvas]').click({ position: { x: 20, y: 300 } });
    await expect.poll(async () => (await debug(page))?.sound?.state, { timeout: 10_000 }).toBe('playing');
  });

  test('the focus dialog shows a QR code to the work page instead of the contact form and links', async ({ page }) => {
    for (const [lang, path] of [
      ['en', '/en/works/'],
      ['fr', '/fr/oeuvres/'],
    ] as const) {
      await page.goto(`${KEYED}/${lang}/?kiosk=1`);
      await worldReady(page);
      const slug = await page.locator('[data-drift-works] button[tabindex="0"]').getAttribute('data-slug');
      await openFirstWork(page);
      const qr = page.locator('[data-focus-qr]');
      await expect(qr).toBeVisible();
      await expect(page.locator('[data-focus-contact-row]')).toBeHidden();
      await expect(page.locator('[data-focus-work-row]')).toBeHidden();
      const svg = await (await page.request.get(`${KEYED}${await qr.getAttribute('src')}`)).text();
      expect(await decodeQrSvg(svg), lang).toBe(`https://www.iknowyoucanseeme.xyz${path}${slug}/`);
      expect((await new AxeBuilder({ page }).include('[data-drift-focus]').analyze()).violations, lang).toEqual([]);
    }
  });

  test('hides the cursor after 5 s without input and resets after 90 s (fake clock)', async ({ page }) => {
    await page.clock.install();
    await page.goto(`${KEYED}/en/?kiosk=1`);
    await worldReady(page);
    const start = (await debug(page))?.pose;
    await openFirstWork(page);
    await page.mouse.move(400, 300);
    await expect(page.locator('html')).not.toHaveClass(/kiosk-idle/);
    await jumpClock(page, KIOSK.cursorHideMs + 1_000);
    await expect(page.locator('html')).toHaveClass(/kiosk-idle/);
    await expect(page.locator('[data-drift-focus]')).toBeVisible();
    await jumpClock(page, KIOSK.idleResetMs);
    await expect(page.locator('[data-drift-focus]')).toBeHidden();
    await frames(page, 2);
    const pose = (await debug(page))?.pose;
    expect(pose?.x).toBeCloseTo(start?.x as number, 1);
    expect(pose?.z).toBeCloseTo(start?.z as number, 1);
    await page.mouse.move(420, 320);
    await jumpClock(page, KIOSK_TICK);
    await expect(page.locator('html')).not.toHaveClass(/kiosk-idle/);
  });

  test('drifts along the zone path by itself when nobody is there (fake clock)', async ({ page }) => {
    await page.clock.install();
    await page.goto(`${KEYED}/en/?kiosk=1`);
    await worldReady(page);
    const start = (await debug(page))?.pose;
    await jumpClock(page, KIOSK.autoDriftAfterMs + 1_000);
    // The glide runs frame by frame: wait for frames, not for time.
    await expect.poll(async () => {
      await frames(page, 5);
      const p = (await debug(page))?.pose;
      return Math.hypot((p?.x ?? 0) - (start?.x ?? 0), (p?.z ?? 0) - (start?.z ?? 0)) > 0.5;
    }, { timeout: 20_000 }).toBe(true);
  });

  test('"Wake up" shows the awake page, and the idle reset brings the world back (fake clock)', async ({ page }) => {
    await page.clock.install();
    await page.goto(`${KEYED}/fr/?kiosk=1`);
    await worldReady(page);
    await page.locator('[data-drift-wake]').click();
    await expect(page.locator('[data-drift]')).toBeHidden();
    await jumpClock(page, KIOSK.idleResetMs + 1_000);
    await expect(page.locator('[data-drift]')).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('iknowyoucanseeme:mode'))).toBeNull();
  });

  test('ignores ?w= in the address and starts at the beginning of the path', async ({ page }) => {
    await page.goto(`${KEYED}/en/?kiosk=1`);
    await worldReady(page);
    const start = (await debug(page))?.pose;

    await page.goto(`${KEYED}/en/?kiosk=1&w=venise-portrait-5`);
    await worldReady(page);
    const state = await debug(page);
    expect(state?.facing).toBeNull();
    expect(state?.pose.x).toBeCloseTo(start?.x as number, 1);
    expect(state?.pose.z).toBeCloseTo(start?.z as number, 1);
  });

  test('never writes ?w= when settling, and "Wake up" after settling resets to the start after 90 s (fake clock)', async ({ page }) => {
    test.setTimeout(60_000);
    await page.clock.install();
    await page.goto(`${KEYED}/en/?kiosk=1`);
    await worldReady(page);
    const start = (await debug(page))?.pose;

    await jumpClock(page, KIOSK.autoDriftAfterMs + 500);
    await expect.poll(async () => (await debug(page))?.fragment?.id ?? null, { timeout: 30_000 }).not.toBeNull();
    const settled = (await debug(page))?.pose;
    expect(Math.hypot((settled?.x ?? 0) - (start?.x ?? 0), (settled?.z ?? 0) - (start?.z ?? 0))).toBeGreaterThan(5);
    expect(new URL(page.url()).searchParams.get('w')).toBeNull();

    await page.locator('[data-drift-wake]').click();
    await expect(page.locator('[data-drift]')).toBeHidden();
    await page.evaluate(() => delete (window as { __driftDebug?: unknown }).__driftDebug);
    await jumpClock(page, KIOSK.idleResetMs + 1_000);
    await expect(page.locator('[data-drift]')).toBeVisible();
    await worldReady(page);
    const resetPose = (await debug(page))?.pose;
    expect(resetPose?.x).toBeCloseTo(start?.x as number, 1);
    expect(resetPose?.z).toBeCloseTo(start?.z as number, 1);
  });
});

/** One tick of the kiosk's idle machine (ms), enough for the next check. */
const KIOSK_TICK = 600;

test.describe('Specimens (Leak zone)', () => {
  test('the awake Dreamland page shows the Leak zone as a specimen grid with museum tags (EN, FR)', async ({ page }) => {
    await page.goto('/fr/territoires/dreamland/');
    const grid = page.locator('ul.specimen-grid');
    await expect(grid).toHaveAttribute('aria-label', 'Spécimens');
    await expect(grid.locator('.work-card-specimen').filter({ hasText: 'spécimen 01 · Venise · 2025' })).toHaveCount(1);
    await expect(grid.locator('.work-card-specimen').filter({ hasText: 'esquisse 01 · argile · 2026' })).toHaveCount(1);
    expect(await grid.locator('li').count()).toBe(13);
    await page.goto('/en/territories/dreamland/');
    await expect(page.locator('ul.specimen-grid .work-card-specimen').filter({ hasText: 'specimen 01 · Venice · 2025' })).toHaveCount(1);
    await expect(page.locator('ul.specimen-grid .work-card-specimen').filter({ hasText: 'sketch 04 · clay · 2026' })).toHaveCount(1);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });

  test('in the world a specimen wears its tag when the visitor stands in front of it, and in its dialog', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('iknowyoucanseeme:sound', 'off'));
    await page.goto(`${KEYED}/fr/?w=venise-portrait-5`);
    await worldReady(page);
    await expect.poll(async () => (await debug(page))?.facing, { timeout: 15_000 }).toBe('venise-portrait-5');
    await expect(page.locator('[data-drift-specimen]')).toHaveText('spécimen 01 · Venise · 2025');
    await openFirstWork(page);
    await expect(page.locator('[data-focus-specimen]')).toHaveText('spécimen 01 · Venise · 2025');
    await page.goto(`${KEYED}/fr/?w=arrivee`);
    await worldReady(page);
    await expect.poll(async () => (await debug(page))?.facing, { timeout: 15_000 }).toBe('arrivee');
    await expect(page.locator('[data-drift-specimen]')).toHaveText('');
  });
});

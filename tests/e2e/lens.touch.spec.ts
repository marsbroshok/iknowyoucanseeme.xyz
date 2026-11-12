import { test, expect, devices, type Page, type CDPSession, type Browser } from '@playwright/test';

/**
 * The lens on touch screens (FR3, FR4), with real touch events (Chrome
 * DevTools protocol): it follows the finger, a still long press changes
 * the lens (every lens of the tier is reachable), a lifted finger lets it
 * fade over about 600 ms, and a two-finger tap toggles "see unaltered".
 * Runs on an emulated phone (low tier: five lenses, no fracture) and on a
 * laptop with a touch screen (fine pointer, so high tier: all six; touch
 * is switched on after the world has chosen its tier).
 */
const KEYED = 'http://localhost:4326';

type Mode = 'gel' | 'mirror' | 'exposure' | 'fracture' | 'flare' | 'icm';
interface LensDebug {
  slug: string | null;
  mode: Mode | null;
  strength: number;
  unaltered: boolean;
  modes: Mode[];
}
interface Point {
  x: number;
  y: number;
}
const lensState = (page: Page) => page.evaluate(() => (window as unknown as { __driftDebug: { lens: LensDebug; tier: string } }).__driftDebug.lens);

/** One touch event with the given fingers down. */
const touch = (cdp: CDPSession, type: 'touchStart' | 'touchMove' | 'touchEnd', points: Point[]) =>
  cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map((p, id) => ({ x: p.x, y: p.y, id })) });

/** A touch page in front of a work, with its image loaded. */
async function touchPage(browser: Browser, options: Parameters<Browser['newContext']>[0]) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(`${KEYED}/en/?w=arrivee`);
  await page.waitForFunction(() => (window as unknown as { __driftDebug?: { loaded: Record<string, string> } }).__driftDebug?.loaded.arrivee !== undefined, null, { timeout: 20_000 });
  const box = await page.locator('[data-drift-canvas]').boundingBox();
  if (!box) throw new Error('The world canvas has no box');
  const centre = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  return { context, page, errors, centre, cdp };
}

/** Strength of the lens frame by frame for `ms` (page clock). */
const sampleStrength = (page: Page, ms: number) =>
  page.evaluate(
    (duration) =>
      new Promise<{ t: number; s: number }[]>((resolve) => {
        const out: { t: number; s: number }[] = [];
        const start = performance.now();
        const tick = (now: number) => {
          out.push({ t: now - start, s: (window as unknown as { __driftDebug: { lens: { strength: number } } }).__driftDebug.lens.strength });
          if (now - start < duration) requestAnimationFrame(tick);
          else resolve(out);
        };
        requestAnimationFrame(tick);
      }),
    ms,
  );

for (const [name, options, tier, count] of [
  ['phone (low tier)', { ...devices['Pixel 7'] }, 'low', 5],
  ['laptop touch screen (high tier)', { viewport: { width: 1280, height: 800 } }, 'high', 6],
] as const) {
  test.describe(`Lens on a ${name}`, () => {
    test('follows the finger while it touches and fades out over ~600 ms after it lifts (FR3)', async ({ browser }) => {
      const { context, page, errors, centre, cdp } = await touchPage(browser, options);
      expect(await page.evaluate(() => (window as unknown as { __driftDebug: { tier: string } }).__driftDebug.tier)).toBe(tier);
      expect((await lensState(page)).slug).toBeNull();
      await touch(cdp, 'touchStart', [centre]);
      await expect.poll(async () => (await lensState(page)).strength).toBe(1);
      expect((await lensState(page)).slug).toBe('arrivee');
      const samples = sampleStrength(page, 1300);
      await page.waitForTimeout(150);
      await touch(cdp, 'touchEnd', []);
      const trace = await samples;
      const released = trace.find((p) => p.s < 1);
      const gone = trace.find((p) => p.s === 0);
      expect(released).toBeDefined();
      expect(gone).toBeDefined();
      const fade = (gone?.t ?? 0) - (released?.t ?? 0);
      expect(fade).toBeGreaterThan(400);
      expect(fade).toBeLessThan(900);
      await expect.poll(async () => (await lensState(page)).slug).toBeNull();
      expect(errors).toEqual([]);
      await context.close();
    });

    test(`a still long press changes the lens: all ${count} lenses of the tier are reachable, and the work does not open`, async ({ browser }) => {
      const { context, page, errors, centre, cdp } = await touchPage(browser, options);
      const modes = (await lensState(page)).modes;
      expect(modes).toHaveLength(count);
      if (tier === 'low') expect(modes).not.toContain('fracture');
      const seen = new Set<Mode>();
      for (let i = 0; i < count; i++) {
        await touch(cdp, 'touchStart', [centre]);
        await expect.poll(async () => (await lensState(page)).strength).toBe(1);
        const before = (await lensState(page)).mode as Mode;
        seen.add(before);
        // Still holding: the long press changes the lens on the work.
        await expect.poll(async () => (await lensState(page)).mode).not.toBe(before);
        seen.add((await lensState(page)).mode as Mode);
        await touch(cdp, 'touchEnd', []);
        await expect.poll(async () => (await lensState(page)).slug).toBeNull();
      }
      expect([...seen].sort()).toEqual([...modes].sort());
      await expect(page.locator('[data-drift-focus]')).toBeHidden();
      expect(errors).toEqual([]);
      await context.close();
    });

    test('a two-finger tap toggles "see unaltered" (FR4)', async ({ browser }) => {
      const { context, page, centre, cdp } = await touchPage(browser, options);
      const pair = [
        { x: centre.x - 40, y: centre.y },
        { x: centre.x + 40, y: centre.y },
      ];
      await touch(cdp, 'touchStart', pair);
      await touch(cdp, 'touchEnd', []);
      await expect.poll(async () => (await lensState(page)).unaltered).toBe(true);
      // A finger dragging over the work (not a tap, which opens it) shows no lens now.
      await touch(cdp, 'touchStart', [centre]);
      await touch(cdp, 'touchMove', [{ x: centre.x + 30, y: centre.y }]);
      await page.waitForTimeout(300);
      expect((await lensState(page)).strength).toBe(0);
      await touch(cdp, 'touchEnd', []);
      await touch(cdp, 'touchStart', pair);
      await touch(cdp, 'touchEnd', []);
      await expect.poll(async () => (await lensState(page)).unaltered).toBe(false);
      await expect(page.locator('[data-drift-focus]')).toBeHidden();
      await context.close();
    });
  });
}

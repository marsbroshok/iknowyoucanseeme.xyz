import { test, expect, type Page } from '@playwright/test';
import sharp from 'sharp';

/**
 * The lens in the running world (keyed build, `window.__driftDebug`): it
 * follows the mouse over a work, every lens of the tier is reachable with
 * the keyboard (L), Shift shows the work unaltered, and the caption names
 * the lens in use. Touch behaviour is in lens.touch.spec.ts.
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
const lensState = (page: Page) => page.evaluate(() => (window as unknown as { __driftDebug: { lens: LensDebug } }).__driftDebug.lens);

/** Opens the world in front of a work and waits for its image. */
async function inFrontOf(page: Page, slug: string): Promise<void> {
  await page.goto(`${KEYED}/en/?w=${slug}`);
  await page.waitForFunction((s) => (window as unknown as { __driftDebug?: { loaded: Record<string, string> } }).__driftDebug?.loaded[s] !== undefined, slug, { timeout: 15_000 });
}

/** Centre of the canvas in page coordinates. */
async function canvasCentre(page: Page): Promise<{ x: number; y: number }> {
  const box = await page.locator('[data-drift-canvas]').boundingBox();
  if (!box) throw new Error('The world canvas has no box');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Spread of a small square of the canvas around a point (sharp stats). */
async function patch(page: Page, at: { x: number; y: number }): Promise<Buffer> {
  return page.screenshot({ clip: { x: at.x - 40, y: at.y - 40, width: 80, height: 80 } });
}
async function meanAbsDiff(a: Buffer, b: Buffer): Promise<number> {
  const [ra, rb] = await Promise.all([sharp(a).raw().toBuffer(), sharp(b).raw().toBuffer()]);
  let s = 0;
  for (let i = 0; i < ra.length; i++) s += Math.abs(ra[i] - rb[i]);
  return s / ra.length;
}

test.describe('Lens in the world (desktop)', () => {
  test('follows the mouse onto the work under it, and fades out when the mouse leaves', async ({ page }) => {
    await inFrontOf(page, 'arrivee');
    const c = await canvasCentre(page);
    await page.mouse.move(c.x, c.y);
    await expect.poll(async () => (await lensState(page)).strength).toBe(1);
    expect((await lensState(page)).slug).toBe('arrivee');
    await page.mouse.move(5, 5);
    await expect.poll(async () => (await lensState(page)).slug, { timeout: 2000 }).toBeNull();
  });

  test('every lens of the tier is reachable with L, and the caption names it', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await inFrontOf(page, 'arrivee');
    const c = await canvasCentre(page);
    await page.mouse.move(c.x, c.y);
    await expect.poll(async () => (await lensState(page)).strength).toBe(1);
    const first = await lensState(page);
    expect(first.modes).toEqual(['gel', 'mirror', 'exposure', 'fracture', 'flare', 'icm']);
    const seen = new Set<Mode>([first.mode as Mode]);
    const captions = new Set<string>([(await page.locator('[data-drift-lens]').textContent()) ?? '']);
    for (let i = 1; i < first.modes.length; i++) {
      const before = (await lensState(page)).mode;
      await page.keyboard.press('l');
      await expect.poll(async () => (await lensState(page)).mode).not.toBe(before);
      seen.add((await lensState(page)).mode as Mode);
      captions.add((await page.locator('[data-drift-lens]').textContent()) ?? '');
    }
    expect([...seen].sort()).toEqual([...first.modes].sort());
    expect(captions.size).toBe(6);
    expect([...captions]).toContain('Mirror fold');
    expect(errors).toEqual([]);
  });

  test('the keyboard alone brings the lens to the work in front (no mouse)', async ({ page }) => {
    await inFrontOf(page, 'solitude');
    await page.locator('[data-drift]').focus();
    await page.keyboard.press('l');
    await expect.poll(async () => (await lensState(page)).slug).toBe('solitude');
    await expect.poll(async () => (await lensState(page)).strength).toBe(1);
  });

  test('holding Shift shows the work unaltered, and the picture really changes back (FR4)', async ({ page }) => {
    await inFrontOf(page, 'arrivee');
    const c = await canvasCentre(page);
    await page.mouse.move(c.x, c.y);
    await expect.poll(async () => (await lensState(page)).strength).toBe(1);
    // A lens that clearly changes the picture under the pointer.
    while ((await lensState(page)).mode !== 'flare') {
      const before = (await lensState(page)).mode;
      await page.keyboard.press('l');
      await expect.poll(async () => (await lensState(page)).mode).not.toBe(before);
    }
    await page.waitForTimeout(500);
    const lensed = await patch(page, c);
    await page.keyboard.down('Shift');
    await expect.poll(async () => (await lensState(page)).strength).toBe(0);
    expect((await lensState(page)).unaltered).toBe(true);
    await page.waitForTimeout(100);
    const pure = await patch(page, c);
    expect(await meanAbsDiff(lensed, pure)).toBeGreaterThan(4);
    await page.keyboard.up('Shift');
    await expect.poll(async () => (await lensState(page)).strength).toBe(1);
  });

  test('a click on a work still opens it (the lens takes no click)', async ({ page }) => {
    await inFrontOf(page, 'arrivee');
    const c = await canvasCentre(page);
    await page.mouse.click(c.x, c.y);
    await expect(page.locator('[data-drift-focus]')).toBeVisible();
    await expect(page.locator('[data-focus-title]')).toContainText('Arrivée');
  });
});

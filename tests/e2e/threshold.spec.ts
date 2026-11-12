import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { soundOff } from './soundOff.js';

/**
 * The threshold, the gaze and the fragments in Chromium (keyed build with
 * `window.__driftDebug`, port 4326): first vs returning visit, keyboard-only
 * entry, the `entered` event, the breathing leak, the gaze turn toward a
 * lingering pointer, fragments mirrored into the live region and counted
 * on the awake territory page, and the awake page for visitors without
 * JavaScript.
 */
const KEYED = 'http://localhost:4326';

interface Debug {
  frames: number;
  pose: { x: number; z: number; yaw: number };
  threshold: { holding: boolean; visible: boolean; leak: boolean };
  gaze: { turns: { slug: string; yaw: number; pitch: number }[]; lineOpacity: number };
  fragment: { id: string; opacity: number } | null;
}
const debug = (page: Page) => page.evaluate(() => (window as unknown as { __driftDebug: Debug }).__driftDebug);
const entered = (page: Page) => page.evaluate(() => (window as unknown as { __entered: { gesture: boolean; returning: boolean }[] }).__entered);

/** Records `entered` events (the sound track's hook) before any page script runs. */
async function recordEntered(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const seen: unknown[] = [];
    (window as unknown as { __entered: unknown[] }).__entered = seen;
    document.addEventListener('entered', (e) => seen.push((e as CustomEvent).detail));
  });
}

async function worldReady(page: Page): Promise<void> {
  await page.waitForFunction(() => ((window as unknown as { __driftDebug?: { frames: number } }).__driftDebug?.frames ?? 0) > 5, null, { timeout: 15_000 });
}

// The sound is muted here (returning and deep-linked visits fade by themselves); sound.spec.ts covers sound on.
test.beforeEach(({ page }) => soundOff(page));

test.describe('Threshold', () => {
  test('first visit: the line, Enter focused, Wake up visible, the world holding still behind a breathing leak', async ({ page }) => {
    await recordEntered(page);
    await page.goto(`${KEYED}/en/`);
    const threshold = page.locator('[data-threshold]');
    await expect(threshold).toBeVisible({ timeout: 15_000 });
    await expect(threshold).toHaveAttribute('data-kind', 'full');
    await expect(threshold.locator('.drift-threshold-line')).toHaveText('I know you can see me');
    await expect(page.locator('[data-threshold-enter]')).toBeFocused();
    await expect(page.locator('[data-drift-wake]')).toBeVisible();
    await worldReady(page);
    await expect.poll(async () => (await debug(page)).threshold).toEqual({ holding: true, visible: true, leak: true });
    await expect(page.locator('[data-threshold-leak]')).toHaveAttribute('data-leak', 'on');
    const before = (await debug(page)).pose;
    await page.keyboard.press('ArrowUp');
    await page.waitForTimeout(500);
    expect((await debug(page)).pose).toEqual(before);
    expect(await entered(page)).toEqual([]);
  });

  test('keyboard-only entry: Enter on the focused button enters, emits "entered" with the gesture, and the threshold fades away', async ({ page }) => {
    await recordEntered(page);
    await page.goto(`${KEYED}/fr/`);
    await expect(page.locator('[data-threshold-enter]')).toBeFocused({ timeout: 15_000 });
    await expect(page.locator('[data-threshold-enter]')).toHaveText('Entrer');
    await page.keyboard.press('Shift+Tab');
    await expect(page.locator('[data-drift-wake]')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-threshold-enter]')).toBeFocused();
    await page.keyboard.press('Enter');
    expect(await entered(page)).toEqual([{ gesture: true, returning: false }]);
    await expect(page.locator('[data-threshold]')).toBeHidden({ timeout: 4000 });
    await worldReady(page);
    await expect.poll(async () => (await debug(page)).threshold).toEqual({ holding: false, visible: false, leak: false });
    expect(await page.evaluate(() => localStorage.getItem('iknowyoucanseeme:visited'))).toBe('1');
  });

  test('returning visit: the short threshold fades by itself (no click while sound is off)', async ({ page }) => {
    await recordEntered(page);
    await page.goto(`${KEYED}/en/`);
    await page.locator('[data-threshold-enter]').click({ timeout: 15_000 });
    await page.reload();
    const threshold = page.locator('[data-threshold]');
    await expect(threshold).toHaveAttribute('data-kind', 'short', { timeout: 15_000 });
    await expect(page.locator('[data-threshold-enter]')).toBeHidden();
    await expect(threshold).toBeHidden({ timeout: 3000 });
    expect(await entered(page)).toEqual([{ gesture: false, returning: true }]);
  });

  test('"Wake up" on the threshold leads to the awake page without entering', async ({ page }) => {
    await recordEntered(page);
    await page.goto(`${KEYED}/en/`);
    await expect(page.locator('[data-threshold]')).toBeVisible({ timeout: 15_000 });
    await page.locator('[data-drift-wake]').click();
    await expect(page.locator('[data-drift]')).toBeHidden();
    expect(await page.locator('main').getAttribute('inert')).toBeNull();
    expect(await entered(page)).toEqual([]);
  });

  test('axe passes with the threshold up, in English and French', async ({ page }) => {
    for (const lang of ['en', 'fr']) {
      await page.goto(`${KEYED}/${lang}/`);
      await expect(page.locator('[data-threshold]')).toBeVisible({ timeout: 15_000 });
      await worldReady(page);
      expect((await new AxeBuilder({ page }).analyze()).violations, lang).toEqual([]);
    }
  });
});

test.describe('Without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('visitors see the awake page, never the threshold', async ({ page }) => {
    await page.goto(`${KEYED}/en/`);
    await expect(page.locator('main h1')).toBeVisible();
    await expect(page.locator('[data-threshold]')).toBeHidden();
    await expect(page.locator('[data-drift]')).toBeHidden();
  });
});

test.describe('Gaze and fragments', () => {
  test('an apparition turns slightly toward a pointer that lingers on it for more than 2 s', async ({ page }) => {
    await page.goto(`${KEYED}/en/?w=arrivee`);
    await worldReady(page);
    await expect(page.locator('[data-threshold]')).toBeHidden({ timeout: 3000 });
    const { width, height } = page.viewportSize() as { width: number; height: number };
    await page.mouse.move(width / 2 + 40, height / 2 - 30);
    await page.waitForTimeout(1000);
    expect((await debug(page)).gaze.turns).toEqual([]);
    await expect
      .poll(async () => (await debug(page)).gaze.turns.find((t) => t.slug === 'arrivee')?.yaw ?? 0, { timeout: 8000 })
      .toBeGreaterThan(0.02);
    const turn = (await debug(page)).gaze.turns.find((t) => t.slug === 'arrivee') as { yaw: number; pitch: number };
    expect(turn.yaw).toBeLessThanOrEqual(0.22);
    expect(turn.pitch).toBeGreaterThan(0);
  });

  test('a fragment surfaces near the settled work, is mirrored into the polite live region, and is counted on the territory page', async ({ page }) => {
    await page.goto(`${KEYED}/en/?w=arrivee`);
    await worldReady(page);
    const said = page.locator('[data-drift-said]');
    await expect(said).toHaveAttribute('aria-live', 'polite');
    await expect(said).toHaveText('The moment of return.', { timeout: 10_000 });
    await expect(page.locator('[data-drift-fragment]')).toHaveText('The moment of return.');
    await expect.poll(async () => (await debug(page)).fragment?.opacity ?? 0).toBeGreaterThan(0.5);
    expect((await debug(page)).fragment?.id).toBe('work:arrivee');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('iknowyoucanseeme:fragments') ?? '[]'))).toContain('work:arrivee');
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);

    await page.goto(`${KEYED}/en/territories/dreamland/`);
    const counter = page.locator('[data-fragments-found]');
    const total = JSON.parse((await counter.getAttribute('data-ids')) as string).length as number;
    expect(total).toBeGreaterThan(1);
    await expect(counter).toBeVisible();
    await expect(counter).toHaveText(`Fragments found: 1 / ${total}`);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });

  test('the territory count starts at 0 before any drift, in French, without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${KEYED}/fr/territoires/dreamland/`);
    await expect(page.locator('[data-fragments-found]')).toHaveText(/^Fragments trouvés\u00a0: 0 \/ \d+$/);
    expect(errors).toEqual([]);
  });
});

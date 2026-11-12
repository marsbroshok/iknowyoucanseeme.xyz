import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

/**
 * The drift world in Chromium (WebGL2 on the GPU, or SwiftShader): it
 * mounts on the home pages, renders, lands deep links on the right work,
 * keeps the awake layer for reduced motion, passes axe while mounted, and
 * sends its metrics. Assertions about the camera read `window.__driftDebug`,
 * which only the keyed test build (port 4326, PUBLIC_DRIFT_DEBUG=true) has.
 */
const KEYED = 'http://localhost:4326';
const SLUGS = fs
  .readdirSync(path.resolve('src/content/works'))
  .filter((f) => f.endsWith('.yaml'))
  .map((f) => f.replace(/\.yaml$/, ''))
  .sort();

interface DebugState {
  frames: number;
  facing: string | null;
  nearest: string | null;
  loaded: Record<string, string>;
}
const debugState = (page: Page) => page.evaluate(() => (window as unknown as { __driftDebug?: DebugState }).__driftDebug ?? null);

/** Waits until the world has drawn a few frames. */
async function worldReady(page: Page): Promise<void> {
  await page.waitForFunction(() => ((window as unknown as { __driftDebug?: { frames: number } }).__driftDebug?.frames ?? 0) > 5, null, { timeout: 15_000 });
}

/** Collects page errors (any uncaught exception fails the test). */
function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

/** GoatCounter replaced by a recorder (the keyed build loads its script). */
async function recordAnalytics(page: Page): Promise<void> {
  await page.route('https://gc.zgo.at/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'text/javascript',
      body: 'window.__gc = []; window.goatcounter = { count(v) { window.__gc.push(v); } };',
    }),
  );
  await page.route('https://*.goatcounter.com/**', (route) => route.abort());
}

test.describe('Drift world', () => {
  test('mounts over the awake home after first paint and renders (canvas not blank)', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto(`${KEYED}/en/?w=arrivee`);
    await worldReady(page);
    await expect(page.locator('[data-drift]')).toBeVisible();
    await expect(page.locator('[data-drift-wake]')).toBeVisible();
    // The awake page is still in the DOM, only inert while the world is shown.
    await expect(page.locator('main [data-territory="dreamland"]')).toHaveCount(1);
    expect(await page.locator('main').getAttribute('inert')).toBe('');
    await page.waitForFunction(() => (window as unknown as { __driftDebug: DebugState }).__driftDebug.loaded.arrivee !== undefined, null, { timeout: 15_000 });
    await page.waitForTimeout(300);
    const { channels } = await sharp(await page.locator('[data-drift-canvas]').screenshot()).stats();
    const spread = Math.max(...channels.map((c) => c.stdev));
    expect(spread).toBeGreaterThan(8);
    expect(errors).toEqual([]);
  });

  test('the production build mounts the world too, without the debug hook', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto('/fr/');
    await expect(page.locator('[data-drift]')).toBeVisible({ timeout: 15_000 });
    expect(await page.evaluate(() => 'undefined' !== typeof (window as unknown as { __driftDebug?: unknown }).__driftDebug)).toBe(false);
    expect(errors).toEqual([]);
  });

  test('a deep link lands in front of its work, for every work (EN)', async ({ page }) => {
    test.setTimeout(240_000);
    const errors = watchErrors(page);
    for (const slug of SLUGS) {
      await page.goto(`${KEYED}/en/?w=${slug}`);
      await worldReady(page);
      expect((await debugState(page))?.facing, slug).toBe(slug);
    }
    expect(errors).toEqual([]);
  });

  test('every work page links to its own deep link, in both languages', async ({ page }) => {
    for (const [lang, segment] of [
      ['en', 'works'],
      ['fr', 'oeuvres'],
    ] as const) {
      for (const slug of SLUGS) {
        const html = fs.readFileSync(path.resolve('dist', lang, segment, slug, 'index.html'), 'utf8');
        expect(html, `${lang}/${slug}`).toMatch(new RegExp(`<a href="/${lang}/\\?w=${slug}" data-drift-link[^>]*>`));
      }
    }
    // And the link works from a French work page.
    await page.goto(`${KEYED}/fr/oeuvres/solitude/`);
    await page.locator('[data-drift-link]').click();
    await worldReady(page);
    expect((await debugState(page))?.facing).toBe('solitude');
    expect(new URL(page.url()).searchParams.get('w')).toBe('solitude');
  });

  test('the address follows the work the visitor settles in front of (replaceState)', async ({ page }) => {
    await page.goto(`${KEYED}/en/?w=arrivee`);
    await worldReady(page);
    const historyLength = await page.evaluate(() => history.length);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => (document.activeElement as HTMLElement).dataset.slug ?? null);
    expect(focused).not.toBeNull();
    await page.keyboard.press('Tab');
    const next = await page.evaluate(() => (document.activeElement as HTMLElement).dataset.slug as string);
    expect(next).not.toBe(focused);
    await expect.poll(() => new URL(page.url()).searchParams.get('w'), { timeout: 15_000 }).toBe(next);
    expect(await page.evaluate(() => history.length)).toBe(historyLength);
  });

  test('reduced motion keeps the awake layer and never loads the world', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const chunks: string[] = [];
    page.on('request', (r) => {
      if (/DriftWorld/.test(r.url())) chunks.push(r.url());
    });
    await page.goto(`${KEYED}/en/`);
    await page.waitForLoadState('load');
    await page.waitForTimeout(1500);
    await expect(page.locator('[data-drift]')).toBeHidden();
    expect(await page.locator('main').getAttribute('inert')).toBeNull();
    await expect(page.locator('[data-drift-start]')).toBeVisible();
    expect(chunks).toEqual([]);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('"Wake up" returns to the awake page and is remembered; "Drift" comes back', async ({ page }) => {
    await page.goto(`${KEYED}/fr/`);
    await worldReady(page);
    await page.locator('[data-drift-wake]').click();
    await expect(page.locator('[data-drift]')).toBeHidden();
    await expect(page.locator('[data-drift-start]')).toBeFocused();
    await page.reload();
    await page.waitForLoadState('load');
    await page.waitForTimeout(1000);
    await expect(page.locator('[data-drift]')).toBeHidden();
    await page.locator('[data-drift-start]').click();
    await expect(page.locator('[data-drift]')).toBeVisible();
    await worldReady(page);
  });

  test('axe passes with the world mounted, and with a work open in the focus dialog', async ({ page }) => {
    for (const lang of ['en', 'fr']) {
      await page.goto(`${KEYED}/${lang}/?w=arrivee`);
      await worldReady(page);
      expect((await new AxeBuilder({ page }).analyze()).violations, lang).toEqual([]);
      const { width, height } = page.viewportSize() as { width: number; height: number };
      await page.mouse.click(width / 2, height / 2);
      await expect(page.locator('[data-drift-focus]')).toBeVisible();
      expect((await new AxeBuilder({ page }).analyze()).violations, `${lang} dialog`).toEqual([]);
    }
  });

  test('the focus dialog shows the work and its links; Esc closes it', async ({ page }) => {
    await page.goto(`${KEYED}/en/?w=arrivee`);
    await worldReady(page);
    const { width, height } = page.viewportSize() as { width: number; height: number };
    await page.mouse.click(width / 2, height / 2);
    const dialog = page.locator('[data-drift-focus]');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('h2')).toHaveText('Arrivée');
    await expect(dialog.locator('[data-focus-work]')).toHaveAttribute('href', '/en/works/arrivee/');
    await expect(dialog.locator('[data-focus-contact]')).toHaveAttribute('href', '/en/contact/?work=arrivee');
    await expect(dialog.locator('img')).toHaveAttribute('alt', 'Arrivée');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('keyboard: Tab reaches the nearest work, Enter opens it', async ({ page }) => {
    await page.goto(`${KEYED}/en/?w=solitude`);
    await worldReady(page);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-drift-works] button:focus')).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-drift-focus]')).toBeVisible();
  });

  test('metrics: work-approached while drifting, drift-time on "Wake up"', async ({ page }) => {
    await recordAnalytics(page);
    await page.goto(`${KEYED}/en/?w=arrivee`);
    await worldReady(page);
    await expect
      .poll(() => page.evaluate(() => (window as unknown as { __gc: { path: string; title: string }[] }).__gc.map((e) => `${e.path} ${e.title}`)))
      .toContain('work-approached work=arrivee');
    await page.locator('[data-drift-wake]').click();
    const events = await page.evaluate(() => (window as unknown as { __gc: { path: string; title: string; event: boolean }[] }).__gc);
    expect(events.find((e) => e.path === 'drift-time')).toEqual({ path: 'drift-time', title: 'bucket=0-30s', event: true });
  });
});

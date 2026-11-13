import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { soundOff } from './soundOff.js';

/**
 * The drift world in Chromium (WebGL2 on the GPU, or SwiftShader): it
 * mounts on the home pages, renders, lands deep links on the right work,
 * keeps the awake layer on Save-Data (reduced motion does not route, ADR
 * 0009), passes axe while mounted, and
 * sends its metrics. Assertions about the camera read `window.__driftDebug`,
 * which only the keyed test build (port 4326, PUBLIC_DRIFT_DEBUG=true) has.
 */
const KEYED = 'http://localhost:4326';
const SLUGS = fs
  .readdirSync(path.resolve('src/content/works'))
  .filter((f) => f.endsWith('.yaml'))
  .map((f) => f.replace(/\.yaml$/, ''))
  .sort();

interface DebugWork {
  slug: string;
  distance: number;
  opacity: number;
  ndc: { x: number; y: number; z: number };
}

interface DebugState {
  frames: number;
  facing: string | null;
  nearest: string | null;
  sky: string;
  region: { territory: string; zone: string | null } | null;
  gates: { id: string; x: number; z: number; distance: number; part: number; visible: boolean }[];
  loaded: Record<string, string>;
  works: DebugWork[];
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
  test.beforeEach(({ page }) => soundOff(page));

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
    // Wait for the drawn picture itself (state), not a fixed delay: a slow
    // software renderer may need several frames after the texture arrived.
    await expect
      .poll(async () => {
        const { channels } = await sharp(await page.locator('[data-drift-canvas]').screenshot()).stats();
        return Math.max(...channels.map((c) => c.stdev));
      }, { timeout: 10_000 })
      .toBeGreaterThan(8);
    expect(errors).toEqual([]);
  });

  test('desktop (1440×900) Arrival start pose frames at least 4 simultaneously visible works at staggered depths', async ({ page }) => {
    const errors = watchErrors(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${KEYED}/en/`);
    await page.locator('[data-threshold-enter]').click({ timeout: 15_000 });
    await expect(page.locator('[data-threshold]')).toBeHidden({ timeout: 4_000 });
    await worldReady(page);
    await expect(page.locator('[data-drift-compass]')).toContainText('Arrival');

    const state = await debugState(page);
    expect(state).not.toBeNull();
    const visible = (state?.works ?? []).filter(
      (w) => w.opacity > 0.12 && w.ndc.z > -1 && w.ndc.z < 1 && Math.abs(w.ndc.x) <= 1 && Math.abs(w.ndc.y) <= 1,
    );
    expect(visible.length).toBeGreaterThanOrEqual(4);
    const distances = visible.map((w) => w.distance);
    expect(Math.max(...distances) - Math.min(...distances)).toBeGreaterThan(15);
    expect(errors).toEqual([]);
  });

  test('mounts 3D boreal curtain gates at zone/territory borders and shifts sky atmosphere across zones', async ({ page }) => {
    const errors = watchErrors(page);
    const skies: string[] = [];
    for (const [slug, expectedZone] of [
      ['arrivee', 'arrival'],
      ['les-reflets-i', 'lens'],
      ['venise-portrait-5', 'leak'],
      ['cygne-icm-1', null],
    ] as const) {
      await page.goto(`${KEYED}/en/?w=${slug}`);
      await expect(page.locator('[data-threshold]')).toBeHidden({ timeout: 4_000 });
      await worldReady(page);
      const state = await debugState(page);
      expect(state?.region?.zone ?? null, slug).toBe(expectedZone);
      expect(state?.gates.map((g) => g.id)).toEqual(['dreamland:lens', 'dreamland:leak', 'the-border-is-thin:entry']);
      skies.push(state?.sky ?? '');
    }
    expect(new Set(skies).size).toBe(4);
    expect(errors).toEqual([]);
  });

  test('crossing Arrival → Lens triggers the Fraunces [data-zone-banner] and updates the active zone pill; clicking region pills jumps cleanly', async ({ page }) => {
    test.setTimeout(60_000);
    const errors = watchErrors(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${KEYED}/en/`);
    await expect(page.locator('[data-threshold]')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('[data-zone-banner]')).toBeHidden();

    await page.locator('[data-threshold-enter]').click();
    await worldReady(page);

    const banner = page.locator('[data-zone-banner]');
    const bannerTitle = page.locator('[data-zone-banner-title]');
    const bannerSubtitle = page.locator('[data-zone-banner-subtitle]');
    await expect(banner).toBeVisible();
    await expect(bannerTitle).toHaveText('Dreamland · Arrival');
    await expect(bannerSubtitle).toContainText('arrival into the vast atmospheric colour fields');
    const bannerStyles = await banner.evaluate((el) => {
      const cs = getComputedStyle(el);
      const titleCs = getComputedStyle(el.querySelector('[data-zone-banner-title]') as Element);
      return { pointerEvents: cs.pointerEvents, titleFont: titleCs.fontFamily };
    });
    expect(bannerStyles.pointerEvents).toBe('none');
    expect(bannerStyles.titleFont).toContain('Fraunces');

    const activePill = page.locator('[data-zone-pill][aria-current="true"]');
    await expect(activePill).toHaveText('Dreamland · Arrival');

    // Drift forward along the path across the Arrival → Lens boreal portal.
    await page.mouse.move(640, 400);
    await expect
      .poll(
        async () => {
          await page.mouse.wheel(0, 600);
          return (await debugState(page))?.region?.zone ?? null;
        },
        { timeout: 20_000, intervals: [120] },
      )
      .toBe('lens');

    await expect(banner).toBeVisible();
    await expect(bannerTitle).toHaveText('Dreamland · Lens');
    await expect(bannerSubtitle).toContainText('sharpens our perception');
    await expect(activePill).toHaveText('Dreamland · Lens');

    // Banner expires cleanly after ~3.0 seconds.
    await expect(banner).toBeHidden({ timeout: 6_000 });

    // Clicking region pills jumps cleanly to Leak and to The border is thin.
    await page.getByRole('button', { name: 'Dreamland · Leak' }).click();
    await expect.poll(async () => (await debugState(page))?.region?.zone ?? null).toBe('leak');
    await expect(banner).toBeVisible();
    await expect(bannerTitle).toHaveText('Dreamland · Leak');
    await expect(activePill).toHaveText('Dreamland · Leak');

    await page.getByRole('button', { name: 'The border is thin' }).click();
    await expect.poll(async () => (await debugState(page))?.region?.territory ?? null).toBe('the-border-is-thin');
    await expect(banner).toBeVisible();
    await expect(bannerTitle).toHaveText('The border is thin');
    await expect(activePill).toHaveText('The border is thin');
    expect(errors).toEqual([]);
  });

  test('axe reports 0 violations while [data-zone-banner] is visible in English and French', async ({ page }) => {
    const errors = watchErrors(page);
    for (const [lang, lensPill, expectedTitle] of [
      ['en', 'Dreamland · Lens', 'Dreamland · Lens'],
      ['fr', 'Dreamland · La Loupe', 'Dreamland · La Loupe'],
    ] as const) {
      await page.goto(`${KEYED}/${lang}/?w=arrivee`);
      await expect(page.locator('[data-threshold]')).toBeHidden({ timeout: 4_000 });
      await worldReady(page);
      await page.getByRole('button', { name: lensPill }).click();
      const banner = page.locator('[data-zone-banner]');
      await expect(banner).toBeVisible();
      await expect(page.locator('[data-zone-banner-title]')).toHaveText(expectedTitle);
      // Wait for banner plateau (opacity === 1) so full visual state is audited by axe.
      await expect.poll(() => banner.evaluate((el) => Number(getComputedStyle(el).opacity))).toBeGreaterThanOrEqual(0.99);
      expect((await new AxeBuilder({ page }).analyze()).violations, lang).toEqual([]);
    }
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
    // Mute toggle, Wake up, then the nearest work.
    await page.keyboard.press('Tab');
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

  test('reduced motion still gets the world (ADR 0009); "Wake up" is visible and leads to the awake page', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(`${KEYED}/en/`);
    await worldReady(page);
    await expect(page.locator('[data-drift]')).toBeVisible();
    expect(await page.locator('main').getAttribute('inert')).toBe('');
    const wake = page.locator('[data-drift-wake]');
    await expect(wake).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await wake.click();
    await expect(page.locator('[data-drift]')).toBeHidden();
    expect(await page.locator('main').getAttribute('inert')).toBeNull();
    await expect(page.locator('[data-drift-start]')).toBeFocused();
  });

  test('Save-Data keeps the awake layer and never loads the world', async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(navigator, 'connection', { value: { saveData: true } }));
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

  test('"See it in the drift" from a work page overrides a stored "Wake up" preference and opens directly on that work', async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto(`${KEYED}/en/`);
    await worldReady(page);
    await page.locator('[data-drift-wake]').click();
    await expect(page.locator('[data-drift]')).toBeHidden();
    await expect(page.locator('html')).not.toHaveClass(/drift-active/);
    expect(await page.evaluate(() => localStorage.getItem('iknowyoucanseeme:mode'))).toBe('awake');

    await page.goto(`${KEYED}/en/works/arrivee/`);
    await page.locator('[data-drift-link]').click();
    await expect(page.locator('html')).toHaveClass(/drift-active/);
    await expect(page.locator('[data-drift]')).toBeVisible();
    await expect(page.locator('[data-drift-start]')).toBeHidden();
    expect(await page.evaluate(() => localStorage.getItem('iknowyoucanseeme:mode'))).toBe('world');
    await worldReady(page);
    expect((await debugState(page))?.facing).toBe('arrivee');
    expect(errors).toEqual([]);
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
    await expect(dialog.locator('[data-focus-image]')).toBeVisible();
    await expect(dialog.locator('[data-focus-image]')).toHaveAttribute('alt', 'Arrivée');
    await expect(dialog.locator('[data-focus-qr-row]')).toBeHidden();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('keyboard: Tab reaches the nearest work, Enter opens it', async ({ page }) => {
    await page.goto(`${KEYED}/en/?w=solitude`);
    await worldReady(page);
    // Mute toggle, Wake up, then the nearest work.
    await page.keyboard.press('Tab');
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

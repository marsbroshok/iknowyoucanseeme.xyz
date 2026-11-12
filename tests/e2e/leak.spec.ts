import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { contrast } from '../../src/design/AccentColor.js';
import { LEAK } from '../../src/leak/LeakMeter.js';
import { AWAKE_INK, AWAKE_TEXT, LeakStyle, MIN_CONTRAST } from '../../src/leak/LeakStyle.js';
import { ModePreference } from '../../src/world/core/ModePreference.js';
import { soundOff } from './soundOff.js';

/**
 * The leak in Chromium (FR1–FR3, FR6): drift time from the world is kept in
 * `localStorage`; awake pages are stained before first paint by the inline
 * script, pass axe at levels 0 / 0.5 / 1 in EN and FR (with screenshots
 * attached for visual review), never shift their layout, show the stray
 * apparition only in the margin and never over text, and "Clear the leak"
 * on the legal page removes it all.
 */
const KEYED = 'http://localhost:4326';
/** A bright dream colour (Venice portrait), so the contrast cap is reached at full level. */
const COLOR = '#eaca92';

/** Drift time giving a level (inverse of the (t / 15 min)² curve). */
const msFor = (level: number) => Math.sqrt(level) * LEAK.saturateMs;

/**
 * Stores a leak before any page script runs, as the world would have.
 *
 * @param page - The page, before navigation.
 * @param level - Leak level.
 * @param random - Optional fixed `Math.random()` (the apparition draw).
 */
async function storeLeak(page: Page, level: number, random?: number): Promise<void> {
  const record = { ms: msFor(level), color: COLOR, cap: LeakStyle.cap(COLOR) };
  await page.addInitScript(
    ({ key, record, random }) => {
      localStorage.setItem(key, JSON.stringify({ ...record, at: Date.now() }));
      if (random !== undefined) Math.random = () => random;
    },
    { key: LEAK.key, record, random },
  );
}

/** `rgb(r, g, b)` → `#rrggbb`. */
function hexOf(rgb: string): string {
  const [r, g, b] = (rgb.match(/\d+/g) ?? []).map(Number);
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}

const bodyBackground = async (page: Page) => hexOf(await page.evaluate(() => getComputedStyle(document.body).backgroundColor));

const AWAKE_PAGES = {
  en: ['/en/about/', '/en/legal/', '/en/territories/dreamland/', '/en/works/venise-portrait-5/'],
  fr: ['/fr/a-propos/', '/fr/mentions-legales/', '/fr/territoires/dreamland/', '/fr/oeuvres/venise-portrait-5/'],
} as const;

test.describe('The leak', () => {
  test.beforeEach(({ page }) => soundOff(page));

  test('drifting in the world stores drift time and the colour of the work seen; the awake page is then stained', async ({ page }) => {
    await page.goto(`${KEYED}/en/?w=venise-portrait-5`);
    await page.waitForFunction(() => ((window as unknown as { __driftDebug?: { frames: number } }).__driftDebug?.frames ?? 0) > 5, null, { timeout: 15_000 });
    await expect(page.locator('[data-threshold]')).toBeHidden({ timeout: 5_000 });
    const start = await page.evaluate(() => (window as unknown as { __driftDebug: { frames: number } }).__driftDebug.frames);
    await page.waitForFunction((n) => (window as unknown as { __driftDebug: { frames: number } }).__driftDebug.frames > n + 60, start, { timeout: 30_000 });
    await page.locator('[data-drift-wake]').click();
    const record = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), LEAK.key);
    expect(record.ms).toBeGreaterThan(0);
    expect(record.color).toBe('#eaca92');
    expect(record.cap).toBe(LeakStyle.cap('#eaca92'));
    // More drift time means a higher level: store it as if 15 minutes had passed and read the awake page.
    await page.evaluate(({ key, ms }) => {
      const r = JSON.parse(localStorage.getItem(key) as string);
      localStorage.setItem(key, JSON.stringify({ ...r, ms, at: Date.now() }));
    }, { key: LEAK.key, ms: LEAK.saturateMs });
    await page.goto(`${KEYED}/en/about/`);
    expect(await page.evaluate(() => document.documentElement.style.getPropertyValue('--leak-level'))).not.toBe('');
    expect(await bodyBackground(page)).not.toBe(AWAKE_INK);
  });

  for (const lang of ['en', 'fr'] as const) {
    for (const level of [0, 0.5, 1]) {
      test(`${lang}: awake pages at level ${level} keep AA contrast and pass axe (screenshots attached)`, async ({ page }, testInfo) => {
        if (level > 0) await storeLeak(page, level);
        for (const path of AWAKE_PAGES[lang]) {
          await page.goto(path);
          const background = await bodyBackground(page);
          if (level === 0) expect(background, path).toBe(AWAKE_INK);
          else expect(background, path).not.toBe(AWAKE_INK);
          for (const text of AWAKE_TEXT) expect(contrast(text, background), `${path} ${text} on ${background}`).toBeGreaterThanOrEqual(MIN_CONTRAST);
          expect((await new AxeBuilder({ page }).analyze()).violations, path).toEqual([]);
          await testInfo.attach(`${lang}-level-${level}${path.replace(/\//g, '_')}.png`, { body: await page.screenshot(), contentType: 'image/png' });
        }
      });
    }
  }

  test('the stain is set before first paint: no layout shift at full level', async ({ page }) => {
    await storeLeak(page, 1, 0);
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.addInitScript(() => {
      (window as unknown as { __cls: number }).__cls = 0;
      new PerformanceObserver((list) => {
        for (const e of list.getEntries() as unknown as { value: number; hadRecentInput: boolean }[]) if (!e.hadRecentInput) (window as unknown as { __cls: number }).__cls += e.value;
      }).observe({ type: 'layout-shift', buffered: true });
    });
    await page.goto('/en/territories/dreamland/');
    await page.waitForLoadState('load');
    await page.waitForTimeout(2_500);
    expect(await page.evaluate(() => (window as unknown as { __cls: number }).__cls)).toBe(0);
  });

  test('the stray apparition crosses the margin only, never over text', async ({ page }) => {
    await storeLeak(page, 1, 0);
    await page.setViewportSize({ width: 1600, height: 900 });
    // The home page on its awake layer (the visitor chose "Wake up" before).
    await page.addInitScript((key) => localStorage.setItem(key, 'awake'), ModePreference.KEY);
    for (const path of ['/en/about/', '/fr/territoires/dreamland/', '/en/works/les-reflets-ii/', '/en/']) {
      await page.goto(path);
      const img = page.locator('.leak-apparition');
      await expect(img, path).toBeVisible();
      // Lazy: it loads once shown; wait for the picture itself.
      await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0), { message: path }).toBe(true);
      for (const progress of [0, 0.25, 0.5, 0.75, 0.999]) {
        const overlap = await page.evaluate((p) => {
          const el = document.querySelector('.leak-apparition') as HTMLElement;
          for (const a of el.getAnimations()) {
            a.pause();
            a.currentTime = (a.effect?.getComputedTiming().delay ?? 0) + p * Number(a.effect?.getComputedTiming().duration ?? 0);
          }
          const box = el.getBoundingClientRect();
          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
          const hits: string[] = [];
          for (let n = walker.nextNode(); n; n = walker.nextNode()) {
            if (!n.textContent?.trim() || (n.parentElement && getComputedStyle(n.parentElement).visibility === 'hidden')) continue;
            const range = document.createRange();
            range.selectNodeContents(n);
            for (const r of range.getClientRects()) {
              if (r.width && r.height && r.left < box.right && r.right > box.left && r.top < box.bottom && r.bottom > box.top) hits.push(n.textContent.trim().slice(0, 30));
            }
          }
          return hits;
        }, progress);
        expect(overlap, `${path} at ${progress}`).toEqual([]);
      }
    }
  });

  test('no apparition below level 0.4, on a narrow screen, or when the draw says no', async ({ page }) => {
    await storeLeak(page, 0.3, 0);
    await page.setViewportSize({ width: 1600, height: 900 });
    await page.goto('/en/about/');
    await expect(page.locator('.leak-apparition')).toBeHidden();
    const narrow = await page.context().newPage();
    await storeLeak(narrow, 1, 0);
    await narrow.goto('/en/about/');
    await expect(narrow.locator('.leak-apparition')).toBeHidden();
    const unlucky = await page.context().newPage();
    await storeLeak(unlucky, 1, 0.99);
    await unlucky.setViewportSize({ width: 1600, height: 900 });
    await unlucky.goto('/en/about/');
    await expect(unlucky.locator('.leak-apparition')).toBeHidden();
  });

  for (const [path, label, done] of [
    ['/en/legal/', 'Clear the leak', 'The leak is cleared.'],
    ['/fr/mentions-legales/', "Effacer l'infiltration", "L'infiltration est effacée."],
  ] as const) {
    test(`"Clear the leak" on ${path} removes the stored leak and the stain`, async ({ page }) => {
      await storeLeak(page, 1);
      await page.goto(path);
      expect(await bodyBackground(page)).not.toBe(AWAKE_INK);
      const clear = page.getByRole('button', { name: label });
      await expect(clear).toBeVisible();
      await clear.click();
      await expect(page.getByRole('status')).toHaveText(done);
      expect(await bodyBackground(page)).toBe(AWAKE_INK);
      // The init script stores the leak again on every load; read the storage of this load only.
      expect(await page.evaluate((key) => localStorage.getItem(key), LEAK.key)).toBeNull();
    });
  }

  test('"Clear the leak" stays hidden without JavaScript', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('http://localhost:4325/en/legal/');
    await expect(page.locator('[data-leak-clear]')).toBeHidden();
    await context.close();
  });
});

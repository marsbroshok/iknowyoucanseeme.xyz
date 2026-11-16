import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { soundOff } from './soundOff.js';

const KEYED = 'http://localhost:4326';

interface DebugProbe {
  frames: number;
  facing: string | null;
}

async function waitForWorld(page: Page): Promise<void> {
  await page.waitForFunction(
    () => ((window as unknown as { __driftDebug?: DebugProbe }).__driftDebug?.frames ?? 0) > 5,
    null,
    { timeout: 15_000 },
  );
}

test.describe('Awake navigation, persistent Drift bridge & zero-JS curatorial filters', () => {
  test.beforeEach(({ page }) => soundOff(page));

  test('1-click [data-header-drift] enters Drift from any Awake route, overrides stored "awake" mode, cleans ?drift=1, and lands on contextual works', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    // Store 'awake' preference and visit /en/works/ -> 1 click enters Drift and strips ?drift=1.
    await page.goto(`${KEYED}/en/works/`);
    await page.evaluate(() => localStorage.setItem('iknowyoucanseeme:mode', 'awake'));
    await page.reload();

    const worksHeaderDrift = page.locator('[data-header-drift]');
    await expect(worksHeaderDrift).toHaveAttribute('href', '/en/?drift=1');
    await worksHeaderDrift.click();
    await expect(page.locator('[data-drift]')).toBeVisible({ timeout: 8_000 });
    await waitForWorld(page);
    expect(new URL(page.url()).searchParams.get('drift')).toBeNull();
    expect(await page.evaluate(() => localStorage.getItem('iknowyoucanseeme:mode'))).toBe('world');

    // From /fr/a-propos/ with stored 'awake' -> 1 click enters French Drift cleanly.
    await page.goto(`${KEYED}/fr/a-propos/`);
    await page.evaluate(() => localStorage.setItem('iknowyoucanseeme:mode', 'awake'));
    await page.reload();
    await page.locator('[data-header-drift]').click();
    await expect(page.locator('[data-drift]')).toBeVisible({ timeout: 8_000 });
    await waitForWorld(page);
    expect(new URL(page.url()).pathname).toBe('/fr/');
    expect(new URL(page.url()).searchParams.get('drift')).toBeNull();

    // From /en/works/solitude/ with stored 'awake' -> [data-header-drift] links to /en/?w=solitude and faces solitude.
    await page.goto(`${KEYED}/en/works/solitude/`);
    await page.evaluate(() => localStorage.setItem('iknowyoucanseeme:mode', 'awake'));
    await page.reload();
    await expect(page.locator('[data-header-drift]')).toHaveAttribute('href', '/en/?w=solitude');
    await page.locator('[data-header-drift]').click();
    await waitForWorld(page);
    expect(
      await page.evaluate(() => (window as unknown as { __driftDebug: DebugProbe }).__driftDebug.facing),
    ).toBe('solitude');

    // From /en/territories/the-border-is-thin/ -> [data-header-drift] opens first work of that territory.
    await page.goto(`${KEYED}/en/territories/the-border-is-thin/`);
    const territoryDriftHref = await page.locator('[data-header-drift]').getAttribute('href');
    expect(territoryDriftHref).toMatch(/^\/en\/\?w=/);
    await page.locator('[data-header-drift]').click();
    await waitForWorld(page);
    const expectedSlug = new URL(territoryDriftHref ?? '', KEYED).searchParams.get('w');
    expect(
      await page.evaluate(() => (window as unknown as { __driftDebug: DebugProbe }).__driftDebug.facing),
    ).toBe(expectedSlug);

    expect(errors).toEqual([]);
  });

  test('Wake up from a settled/deep-linked work reveals [data-awake-resume] beside focused [data-drift-start]', async ({
    page,
  }) => {
    await page.goto(`${KEYED}/en/?w=venise-portrait-5`);
    await expect(page.locator('[data-threshold]')).toBeHidden({ timeout: 5_000 });
    await waitForWorld(page);

    await page.locator('[data-drift-wake]').click();
    await expect(page.locator('[data-drift]')).toBeHidden();
    await expect(page.locator('[data-drift-start]')).toBeFocused();

    const resume = page.locator('[data-awake-resume]');
    await expect(resume).toBeVisible();
    await expect(resume).toHaveAttribute('href', '/en/works/venise-portrait-5/');
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });

  test('Work page breadcrumb, i / N sequence, sticky desktop curatorial plinth, thumbnail Prev/Next, and Territory continuity pass axe in EN & FR', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });

    for (const [lang, worksSeg, territorySeg, zoneAnchor] of [
      ['en', 'works', 'territories', '#zone-arrival'],
      ['fr', 'oeuvres', 'territoires', '#zone-arrival'],
    ] as const) {
      await page.goto(`${KEYED}/${lang}/${worksSeg}/solitude/`);
      const breadcrumb = page.locator('article.work .work-breadcrumb');
      await expect(breadcrumb).toBeVisible();
      await expect(breadcrumb.locator(`a[href="/${lang}/${territorySeg}/dreamland/${zoneAnchor}"]`)).toBeVisible();
      await expect(breadcrumb).toContainText(/\b\d+\s*\/\s*29\b/);

      const plinthPosition = await page
        .locator('.work-plinth')
        .evaluate((el) => getComputedStyle(el).position);
      expect(plinthPosition).toBe('sticky');

      const thumbCount = await page.locator('article.work .prev-next img').count();
      expect(thumbCount).toBe(2);
      expect((await new AxeBuilder({ page }).analyze()).violations, `${lang} work`).toEqual([]);

      await page.goto(`${KEYED}/${lang}/${territorySeg}/dreamland/`);
      await expect(page.locator('main a[href="#zone-arrival"]')).toBeVisible();
      await expect(page.locator('main a[href="#zone-lens"]')).toBeVisible();
      await expect(page.locator('main a[href="#zone-leak"]')).toBeVisible();
      await expect(page.locator(`main a[href="/${lang}/${territorySeg}/the-border-is-thin/"]`).first()).toBeVisible();
      expect((await new AxeBuilder({ page }).analyze()).violations, `${lang} territory`).toEqual([]);
    }
  });
});

test.describe('Zero-JS reversible territory & medium filtering on WorksIndexPage', () => {
  test.use({ javaScriptEnabled: false });

  test('reverses #dreamland :target isolation via #all-works and filters photographs vs ceramics with JavaScript disabled (EN & FR)', async ({
    page,
  }) => {
    const visibleCards = () =>
      page.evaluate(
        () =>
          Array.from(document.querySelectorAll<HTMLElement>('.work-card')).filter(
            (el) => el.offsetWidth > 0 && el.offsetHeight > 0,
          ).length,
      );

    for (const [lang, worksSeg] of [
      ['en', 'works'],
      ['fr', 'oeuvres'],
    ] as const) {
      await page.goto(`${KEYED}/${lang}/${worksSeg}/`);
      expect(await visibleCards()).toBe(43);

      // Isolate Dreamland (29 works) via :target, then reverse to all 43 in 1 click via #all-works.
      await page.locator('.works-index nav a[href="#dreamland"]').click();
      expect(await visibleCards()).toBe(29);

      await page.locator('.works-index nav a[href="#all-works"]').click();
      expect(await visibleCards()).toBe(43);

      // Toggle zero-JS CSS :has(:checked) medium filter pills.
      await page.locator('label[for="medium-filter-ceramic"]').click();
      expect(await visibleCards()).toBe(5);

      await page.locator('label[for="medium-filter-photo"]').click();
      expect(await visibleCards()).toBe(38);

      await page.locator('label[for="medium-filter-all"]').click();
      expect(await visibleCards()).toBe(43);
    }
  });
});

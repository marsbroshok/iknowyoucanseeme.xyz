import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {
  auditTouchTargets,
  detectRectOverlaps,
  viewportCoverageRatio,
} from '../../src/ux/NavigationAudit.js';
import {
  KEYED_ORIGIN,
  collectDriftHudRects,
  openPersonaContext,
  waitForDriftFrames,
} from './uxSurveyCollector.js';
import { soundOff } from './soundOff.js';

interface DriftDebugProbe {
  frames: number;
  pose: { x: number; z: number; yaw: number };
  facing: string | null;
  nearest: string | null;
  loaded: Record<string, string>;
  lens: {
    slug: string | null;
    mode: string | null;
    strength: number;
    modes: string[];
  };
}

const readDebug = (page: Page) =>
  page.evaluate(
    () => (window as unknown as { __driftDebug?: DriftDebugProbe }).__driftDebug ?? null,
  );

test.describe('Drift spatial ergonomics, guided stepper, tactile lens & rich FocusOverlay', () => {
  test('zero HUD overlaps, single-row zone strip, <= 25% chrome coverage, pointer-aware onboarding auto-dismiss, and accessible help panel across EN & FR (320px–1440px)', async ({
    browser,
  }) => {
    test.setTimeout(120_000);

    const viewports = [
      { width: 320, height: 568, label: 'Compact 320×568', pointer: 'coarse' as const },
      { width: 375, height: 667, label: 'iPhone SE 375×667', pointer: 'coarse' as const },
      { width: 390, height: 844, label: 'iPhone 390×844', pointer: 'coarse' as const },
      { width: 820, height: 1180, label: 'Tablet 820×1180', pointer: 'coarse' as const },
      { width: 1440, height: 900, label: 'Desktop 1440×900', pointer: 'fine' as const },
    ];

    for (const locale of ['en', 'fr'] as const) {
      for (const vp of viewports) {
        const { context, page, pageErrors } = await openPersonaContext(browser, vp, vp.pointer);
        try {
          await page.goto(`${KEYED_ORIGIN}/${locale}/?w=solitude`);
          await page.locator('[data-threshold]').waitFor({ state: 'hidden', timeout: 8_000 });
          await waitForDriftFrames(page);

          const hudRects = await collectDriftHudRects(page);
          expect(detectRectOverlaps(hudRects), `${locale}:${vp.width}x${vp.height} overlaps`).toEqual(
            [],
          );
          if (vp.width >= 375) {
            expect(
              viewportCoverageRatio(hudRects, vp),
              `${locale}:${vp.width}x${vp.height} HUD coverage`,
            ).toBeLessThanOrEqual(0.25);
          }

          const layoutCheck = await page.evaluate(() => {
            const top = document.querySelector<HTMLElement>('.drift-top');
            const topRect = top?.getBoundingClientRect();
            const pills = Array.from(
              document.querySelectorAll<HTMLElement>('[data-zone-pill]'),
            ).filter((el) => !el.hidden && el.getBoundingClientRect().height > 0);
            const distinctTops = new Set(
              pills.map((el) => Math.round(el.getBoundingClientRect().top)),
            );
            const onboarding = document.querySelector<HTMLElement>('[data-drift-onboarding]');
            return {
              topLeft: topRect?.left ?? 0,
              topRight: topRect?.right ?? 0,
              innerWidth: window.innerWidth,
              zoneRows: distinctTops.size,
              onboardingPointer: onboarding?.dataset.pointer ?? null,
              onboardingVisible: Boolean(onboarding && !onboarding.hidden),
            };
          });

          expect(layoutCheck.topLeft, `${locale}:${vp.width} topLeft`).toBeGreaterThanOrEqual(0);
          expect(layoutCheck.topRight, `${locale}:${vp.width} topRight`).toBeLessThanOrEqual(
            layoutCheck.innerWidth,
          );
          expect(layoutCheck.zoneRows, `${locale}:${vp.width} zoneRows`).toBe(1);
          expect(layoutCheck.onboardingPointer).toBe(vp.pointer);
          expect(layoutCheck.onboardingVisible).toBe(true);
          expect(pageErrors).toEqual([]);
        } finally {
          await context.close();
        }
      }
    }

    // Verify onboarding auto-dismisses on >= 2.5 m movement, and help toggle + Escape + axe in EN & FR.
    for (const locale of ['en', 'fr'] as const) {
      const { context, page, pageErrors } = await openPersonaContext(
        browser,
        { width: 1280, height: 800, label: 'Desktop' },
        'fine',
      );
      try {
        await page.goto(`${KEYED_ORIGIN}/${locale}/?w=arrivee`);
        await page.locator('[data-threshold]').waitFor({ state: 'hidden', timeout: 8_000 });
        await waitForDriftFrames(page);
        await expect(page.locator('[data-drift-onboarding]')).toBeVisible();

        // Stepping to the next work moves > 2.5 m, dismissing onboarding automatically.
        await page.locator('[data-drift-next]').click();
        await expect(page.locator('[data-drift-onboarding]')).toBeHidden({ timeout: 8_000 });

        // Open help panel via [data-drift-help-toggle], run axe, then dismiss with Escape.
        const helpToggle = page.locator('[data-drift-help-toggle]');
        const helpPanel = page.locator('[data-drift-help-panel]');
        await expect(helpToggle).toHaveAttribute('aria-expanded', 'false');
        await expect(helpPanel).toBeHidden();

        await helpToggle.click();
        await expect(helpToggle).toHaveAttribute('aria-expanded', 'true');
        await expect(helpPanel).toBeVisible();
        expect((await new AxeBuilder({ page }).analyze()).violations, `${locale} help open`).toEqual(
          [],
        );

        await page.keyboard.press('Escape');
        await expect(helpPanel).toBeHidden();
        await expect(helpToggle).toHaveAttribute('aria-expanded', 'false');
        await expect(helpToggle).toBeFocused();
        expect(pageErrors).toEqual([]);
      } finally {
        await context.close();
      }
    }
  });

  test('WorkStepper glides Prev / Next along the path and opens FocusOverlay; [data-lens-cycle] cycles all camera lenses; Tab × 3 stays intact', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await soundOff(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${KEYED_ORIGIN}/en/?w=arrivee`);
    await page.locator('[data-threshold]').waitFor({ state: 'hidden', timeout: 8_000 });
    await waitForDriftFrames(page);
    await page.waitForFunction(
      () =>
        (window as unknown as { __driftDebug?: DriftDebugProbe }).__driftDebug?.loaded.arrivee !==
        undefined,
      null,
      { timeout: 15_000 },
    );

    // Tab × 3 invariant: Mute -> Wake up -> nearest work button in [data-drift-works].
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-drift-works] button:focus')).toBeVisible();

    // [data-lens-cycle] cycles through all 6 desktop camera lenses on click without hovering the mesh.
    const lensCycle = page.locator('[data-lens-cycle]');
    await expect(lensCycle).toBeVisible();
    const seenModes = new Set<string>();
    for (let i = 0; i < 6; i++) {
      const prevMode = (await readDebug(page))?.lens.mode ?? null;
      await lensCycle.click();
      await expect.poll(async () => (await readDebug(page))?.lens.mode ?? null).not.toBe(prevMode);
      const nextMode = (await readDebug(page))?.lens.mode;
      if (nextMode) seenModes.add(nextMode);
      await expect(page.locator('[data-drift-lens]')).not.toHaveText('');
    }
    expect(seenModes.size).toBe(6);

    // Guided Work Stepper: [data-drift-current] shows "<Title> · i / 40", Next/Prev glide, Current opens FocusOverlay.
    const currentBtn = page.locator('[data-drift-current]');
    await expect(currentBtn).toContainText('Arrivée');
    await expect(currentBtn).toContainText('/ 40');
    const initialText = await currentBtn.textContent();

    await page.locator('[data-drift-next]').click();
    await expect(currentBtn).not.toHaveText(initialText ?? '');
    const steppedSlug = await currentBtn.getAttribute('data-slug');
    expect(steppedSlug).toBeTruthy();
    await expect.poll(async () => (await readDebug(page))?.facing, { timeout: 15_000 }).toBe(
      steppedSlug,
    );

    await page.locator('[data-drift-prev]').click();
    await expect.poll(async () => (await readDebug(page))?.facing, { timeout: 15_000 }).toBe(
      'arrivee',
    );

    await currentBtn.click();
    await expect(page.locator('[data-drift-focus]')).toBeVisible();
    await expect(page.locator('[data-focus-title]')).toContainText('Arrivée');
  });

  test('FocusOverlay displays curatorial metadata, steps in place via Prev/Next buttons and ArrowRight/ArrowLeft, syncs camera & ?w=, passes axe, and preserves ?kiosk=1 zero-link invariant', async ({
    browser,
  }) => {
    test.setTimeout(90_000);

    // 1. Mobile coarse-pointer FocusOverlay ergonomics + in-place stepping + camera/?w= sync.
    const { context, page, pageErrors } = await openPersonaContext(
      browser,
      { width: 390, height: 844, label: 'iPhone 390×844' },
      'coarse',
    );
    try {
      await page.goto(`${KEYED_ORIGIN}/fr/?w=solitude`);
      await page.locator('[data-threshold]').waitFor({ state: 'hidden', timeout: 8_000 });
      await waitForDriftFrames(page);

      await page.locator('[data-drift-current]').click();
      const dialog = page.locator('[data-drift-focus]');
      await expect(dialog).toBeVisible();
      await expect(dialog.locator('[data-focus-context]')).toContainText('Dreamland');
      await expect(dialog.locator('[data-focus-context]')).toContainText('/ 40');
      await expect(dialog.locator('[data-focus-meta]')).toContainText('2025');
      await expect(dialog.locator('[data-focus-meta]')).not.toContainText('€');

      // Audit every interactive control inside FocusOverlay for 44x44 coarse comfort.
      const focusControls = await page.evaluate(() =>
        Array.from(
          document.querySelectorAll<HTMLElement>('[data-drift-focus] button, [data-drift-focus] a[href]'),
        )
          .filter((el) => !el.hidden && !el.closest('[hidden]'))
          .map((el, i) => {
            const r = el.getBoundingClientRect();
            return { id: `focus-${i}`, width: r.width, height: r.height };
          }),
      );
      expect(focusControls.length).toBeGreaterThanOrEqual(5);
      expect(auditTouchTargets(focusControls, 'coarse').violations).toEqual([]);
      expect((await new AxeBuilder({ page }).include('[data-drift-focus]').analyze()).violations).toEqual(
        [],
      );

      const historyBefore = await page.evaluate(() => history.length);
      await dialog.locator('[data-focus-next]').click();
      const slugAfterClick = new URL(page.url()).searchParams.get('w');
      expect(slugAfterClick).toBeTruthy();
      expect(slugAfterClick).not.toBe('solitude');

      await page.keyboard.press('ArrowRight');
      const slugAfterArrow = new URL(page.url()).searchParams.get('w');
      expect(slugAfterArrow).toBeTruthy();
      expect(slugAfterArrow).not.toBe(slugAfterClick);
      expect(await page.evaluate(() => history.length)).toBe(historyBefore);

      // Closing leaves the camera facing the browsed work.
      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
      await expect.poll(async () => (await readDebug(page))?.facing, { timeout: 15_000 }).toBe(
        slugAfterArrow,
      );
      expect(pageErrors).toEqual([]);
    } finally {
      await context.close();
    }

    // 2. Exhibition mode (?kiosk=1): 0 <a href> before and after FocusOverlay stepping, no ?w= mutation.
    const kioskCtx = await openPersonaContext(
      browser,
      { width: 1280, height: 800, label: 'Kiosk' },
      'fine',
    );
    try {
      await kioskCtx.page.goto(`${KEYED_ORIGIN}/en/?kiosk=1`);
      await waitForDriftFrames(kioskCtx.page);
      expect(await kioskCtx.page.locator('a[href]').count()).toBe(0);

      await kioskCtx.page.locator('[data-drift-current]').click();
      await expect(kioskCtx.page.locator('[data-drift-focus]')).toBeVisible();
      const initialQr = await kioskCtx.page.locator('[data-focus-qr]').getAttribute('src');
      expect(await kioskCtx.page.locator('a[href]').count()).toBe(0);

      await kioskCtx.page.locator('[data-focus-next]').click();
      const nextQr = await kioskCtx.page.locator('[data-focus-qr]').getAttribute('src');
      expect(nextQr).not.toBe(initialQr);
      expect(await kioskCtx.page.locator('a[href]').count()).toBe(0);
      expect(new URL(kioskCtx.page.url()).searchParams.get('w')).toBeNull();
      expect(kioskCtx.pageErrors).toEqual([]);
    } finally {
      await kioskCtx.context.close();
    }
  });
});

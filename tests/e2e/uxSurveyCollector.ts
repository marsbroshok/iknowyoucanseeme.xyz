import type { Browser, BrowserContext, Page } from '@playwright/test';
import type { Locale } from '../../src/i18n/RouteMap.js';
import type { PointerKind, ViewportSpec } from '../../src/ux/VisitorPersonas.js';
import {
  buildNavigationReport,
  detectRectOverlaps,
  type NamedRect,
  type NavigationAuditReport,
  type RectOverlap,
  type TouchTargetSample,
  type WayfindingSnapshot,
} from '../../src/ux/NavigationAudit.js';
import { soundOff } from './soundOff.js';

/** Keyed test server URL exposing `window.__driftDebug` and contact form chrome. */
export const KEYED_ORIGIN = 'http://localhost:4326';

/** Localized URL segments for Awake routes inspected during the UX survey. */
const ROUTE_SEGMENTS: Readonly<
  Record<Locale, { readonly works: string; readonly territories: string; readonly about: string }>
> = {
  en: { works: 'works', territories: 'territories', about: 'about' },
  fr: { works: 'oeuvres', territories: 'territoires', about: 'a-propos' },
};

/** Geometry and target telemetry captured on Threshold, Drift, and FocusOverlay for one viewport. */
export interface ViewportDriftTelemetry {
  /** Locale inspected. */
  readonly locale: Locale;
  /** Viewport dimensions in CSS pixels. */
  readonly viewport: ViewportSpec;
  /** Active CSS pointer precision (`'fine'` or `'coarse'`). */
  readonly pointerKind: PointerKind;
  /** Confirmed result of `window.matchMedia('(pointer: coarse)').matches`. */
  readonly matchesCoarseMedia: boolean;
  /** Bounding boxes of Threshold elements (`threshold-line`, `threshold-enter`, `drift-top`). */
  readonly thresholdRects: readonly NamedRect[];
  /** Interior collisions among Threshold elements. */
  readonly thresholdOverlaps: readonly RectOverlap[];
  /** Bounding boxes of peer visible HUD containers inside `[data-drift]`. */
  readonly hudRects: readonly NamedRect[];
  /** Interactive button/link target dimensions sampled across Drift, FocusOverlay, and Awake routes. */
  readonly touchTargets: readonly TouchTargetSample[];
  /** Number of visual rows occupied by `.drift-zones` pills (`1` when single-row, `>= 2` when wrapped). */
  readonly zoneStripRowCount: number;
  /** Horizontal left-edge delta (CSS px) between `.page` content column and `.site-header` content edge. */
  readonly headerPageInsetDeltaPx: number;
}

interface DebugProbeWindow {
  __driftDebug?: {
    frames: number;
    facing: string | null;
    loaded: Record<string, string>;
  };
}

/**
 * Waits until the Three.js Drift world has rendered at least 6 frames.
 *
 * @param page - Playwright page pointed at `KEYED_ORIGIN`.
 */
export async function waitForDriftFrames(page: Page): Promise<void> {
  await page.waitForFunction(
    () => ((window as unknown as DebugProbeWindow).__driftDebug?.frames ?? 0) > 5,
    null,
    { timeout: 20_000 },
  );
}

/**
 * Creates a Playwright browser context matching a persona's viewport and pointer precision.
 * Coarse-pointer contexts enable `hasTouch` and `isMobile` so `@media (pointer: coarse)`
 * and `CapabilityProbe` evaluate identically to mobile/tablet hardware.
 *
 * @param browser - Playwright browser instance.
 * @param viewport - Target CSS pixel viewport.
 * @param pointerKind - `'fine'` or `'coarse'`.
 * @returns Configured browser context and muted page.
 */
export async function openPersonaContext(
  browser: Browser,
  viewport: ViewportSpec,
  pointerKind: PointerKind,
): Promise<{ context: BrowserContext; page: Page; pageErrors: string[] }> {
  const isCoarse = pointerKind === 'coarse';
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    hasTouch: isCoarse,
    isMobile: isCoarse,
    deviceScaleFactor: isCoarse ? 2 : 1,
  });
  const page = await context.newPage();
  await soundOff(page);
  const pageErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));
  return { context, page, pageErrors };
}

/**
 * Collects peer visible HUD container bounding boxes inside `[data-drift]` without
 * pairing ancestors against their own descendants.
 *
 * @param page - Page with `[data-drift]` mounted and `[data-threshold]` dismissed.
 * @returns Named bounding boxes in viewport CSS pixels.
 */
export async function collectDriftHudRects(page: Page): Promise<NamedRect[]> {
  return page.evaluate(() => {
    const drift = document.querySelector<HTMLElement>('[data-drift]');
    if (!drift) return [];

    const ignoredAttrs = [
      'data-drift-canvas',
      'data-drift-focus',
      'data-threshold',
      'data-zone-banner',
      'data-drift-works',
      'data-drift-gaze',
      'data-drift-fragment',
      'data-drift-specimen',
      'data-drift-said',
    ];

    const isVisibleChrome = (el: HTMLElement): boolean => {
      if (el.hidden) return false;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') return false;
      if (Number(cs.opacity) <= 0.05) return false;
      if (cs.clipPath === 'inset(50%)') return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 2 && rect.height > 2;
    };

    const labelFor = (el: HTMLElement, index: number): string => {
      if (el.classList.contains('drift-top')) return 'drift-top';
      if (el.classList.contains('drift-help')) return 'drift-help';
      if (el.hasAttribute('data-drift-onboarding')) return 'drift-onboarding';
      if (el.hasAttribute('data-drift-compass') || el.classList.contains('drift-compass')) {
        return 'drift-compass';
      }
      if (el.id) return el.id;
      const firstClass = el.classList.item(0);
      return firstClass ?? `drift-hud-${index}`;
    };

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const regions: NamedRect[] = [];

    const candidates = Array.from(drift.children) as HTMLElement[];
    for (let i = 0; i < candidates.length; i++) {
      const child = candidates[i];
      if (ignoredAttrs.some((attr) => child.hasAttribute(attr))) continue;
      if (child.tagName === 'CANVAS' || child.tagName === 'DIALOG') continue;
      if (!isVisibleChrome(child)) continue;

      const rect = child.getBoundingClientRect();
      const cs = getComputedStyle(child);
      // Unwrap full-viewport pass-through wrappers if any are introduced around HUD sub-bars.
      if (rect.width >= vw * 0.95 && rect.height >= vh * 0.95 && cs.pointerEvents === 'none') {
        const subChildren = Array.from(child.children) as HTMLElement[];
        subChildren.forEach((sub, subIdx) => {
          if (!isVisibleChrome(sub)) return;
          const sr = sub.getBoundingClientRect();
          regions.push({
            id: labelFor(sub, subIdx),
            x: Math.round(sr.x * 100) / 100,
            y: Math.round(sr.y * 100) / 100,
            width: Math.round(sr.width * 100) / 100,
            height: Math.round(sr.height * 100) / 100,
          });
        });
      } else {
        regions.push({
          id: labelFor(child, i),
          x: Math.round(rect.x * 100) / 100,
          y: Math.round(rect.y * 100) / 100,
          width: Math.round(rect.width * 100) / 100,
          height: Math.round(rect.height * 100) / 100,
        });
      }
    }
    return regions;
  });
}

/**
 * Measures Threshold overlay geometry, active Drift HUD geometry, `.drift-zones`
 * row wrapping, FocusOverlay targets, and Awake chrome targets at a given viewport.
 *
 * @param browser - Playwright browser instance.
 * @param locale - `'en'` or `'fr'`.
 * @param viewport - Target CSS pixel viewport.
 * @param pointerKind - `'fine'` or `'coarse'`.
 * @returns Empirical geometry and interactive target samples.
 */
export async function collectViewportTelemetry(
  browser: Browser,
  locale: Locale,
  viewport: ViewportSpec,
  pointerKind: PointerKind,
): Promise<ViewportDriftTelemetry> {
  const { context, page, pageErrors } = await openPersonaContext(browser, viewport, pointerKind);
  try {
    const seg = ROUTE_SEGMENTS[locale];

    // 1. First-visit Threshold screen geometry & targets.
    await page.goto(`${KEYED_ORIGIN}/${locale}/`);
    await page.locator('[data-threshold]').waitFor({ state: 'visible', timeout: 15_000 });
    await page.locator('[data-threshold-enter]').waitFor({ state: 'visible', timeout: 15_000 });

    const matchesCoarseMedia = await page.evaluate(
      () => window.matchMedia('(pointer: coarse)').matches,
    );

    const thresholdRects = await page.evaluate((): NamedRect[] => {
      const pairs: Array<[string, Element | null]> = [
        ['drift-top', document.querySelector('.drift-top')],
        ['threshold-line', document.querySelector('.drift-threshold-line')],
        ['threshold-enter', document.querySelector('[data-threshold-enter]')],
      ];
      const out: NamedRect[] = [];
      for (const [id, el] of pairs) {
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          out.push({
            id,
            x: Math.round(r.x * 100) / 100,
            y: Math.round(r.y * 100) / 100,
            width: Math.round(r.width * 100) / 100,
            height: Math.round(r.height * 100) / 100,
          });
        }
      }
      return out;
    });
    const thresholdOverlaps = detectRectOverlaps(thresholdRects);

    // 2. Enter Drift via deep link on `solitude` (non-specimen photograph with prev/next).
    await page.goto(`${KEYED_ORIGIN}/${locale}/?w=solitude`);
    await page.locator('[data-threshold]').waitFor({ state: 'hidden', timeout: 8_000 });
    await waitForDriftFrames(page);
    await page.waitForFunction(
      () =>
        (window as unknown as DebugProbeWindow).__driftDebug?.loaded.solitude !== undefined,
      null,
      { timeout: 15_000 },
    );

    const hudRects = await collectDriftHudRects(page);

    const driftTargetsAndRows = await page.evaluate(() => {
      const sampleVisible = (selector: string, prefix: string): TouchTargetSample[] => {
        const nodes = Array.from(document.querySelectorAll<HTMLElement>(selector));
        const items: TouchTargetSample[] = [];
        nodes.forEach((el, idx) => {
          if (el.hidden) return;
          const cs = getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) <= 0.05) {
            return;
          }
          const r = el.getBoundingClientRect();
          if (r.width <= 0 || r.height <= 0) return;
          items.push({
            id: `${prefix}-${idx}`,
            width: Math.round(r.width * 100) / 100,
            height: Math.round(r.height * 100) / 100,
          });
        });
        return items;
      };

      const pills = Array.from(document.querySelectorAll<HTMLElement>('[data-zone-pill]')).filter(
        (el) => !el.hidden && el.getBoundingClientRect().height > 0,
      );
      const distinctTops = new Set(pills.map((el) => Math.round(el.getBoundingClientRect().top)));

      const targets: TouchTargetSample[] = [
        ...sampleVisible('[data-drift] .drift-top button', 'drift-top-btn'),
        ...sampleVisible('[data-drift] [data-zone-pill]', 'drift-zone-pill'),
        ...sampleVisible('[data-drift] [data-drift-prev]', 'drift-prev'),
        ...sampleVisible('[data-drift] [data-drift-current]', 'drift-current'),
        ...sampleVisible('[data-drift] [data-drift-next]', 'drift-next'),
        ...sampleVisible('[data-drift] [data-lens-cycle]', 'drift-lens-cycle'),
        ...sampleVisible('[data-drift] [data-drift-help-toggle]', 'drift-help-toggle'),
      ];
      return { targets, zoneStripRowCount: distinctTops.size };
    });

    // 3. Open FocusOverlay on `solitude` and measure dialog interactive targets.
    await page.mouse.click(viewport.width / 2, viewport.height / 2);
    await page.locator('[data-drift-focus]').waitFor({ state: 'visible', timeout: 8_000 });
    const focusTargets = await page.evaluate((): TouchTargetSample[] => {
      const dialog = document.querySelector<HTMLElement>('[data-drift-focus]');
      if (!dialog) return [];
      const controls = Array.from(dialog.querySelectorAll<HTMLElement>('button, a[href]'));
      const out: TouchTargetSample[] = [];
      controls.forEach((el, idx) => {
        if (el.hidden || el.closest('[hidden]')) return;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') return;
        const r = el.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) return;
        out.push({
          id: `focus-control-${idx}`,
          width: Math.round(r.width * 100) / 100,
          height: Math.round(r.height * 100) / 100,
        });
      });
      return out;
    });
    await page.keyboard.press('Escape');

    // 4. Sample Awake navigation, Works index filter controls, and Work page CTAs.
    await page.goto(`${KEYED_ORIGIN}/${locale}/${seg.works}/`);
    const worksPageTargets = await page.evaluate(
      (): { targets: TouchTargetSample[]; headerPageInsetDeltaPx: number } => {
      const sample = (selector: string, prefix: string): TouchTargetSample[] =>
        Array.from(document.querySelectorAll<HTMLElement>(selector))
          .filter((el) => {
            if (el.classList.contains('skip-link') || el.hidden) return false;
            const cs = getComputedStyle(el);
            if (cs.display === 'none' || cs.visibility === 'hidden') return false;
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.height > 0;
          })
          .map((el, idx) => {
            const r = el.getBoundingClientRect();
            return {
              id: `${prefix}-${idx}`,
              width: Math.round(r.width * 100) / 100,
              height: Math.round(r.height * 100) / 100,
            };
          });

      return {
        targets: [
          ...sample('.site-header a', 'header-link'),
          ...sample('footer a', 'footer-link'),
          ...sample('.works-index nav a, .works-index label', 'works-filter'),
        ],
        headerPageInsetDeltaPx: (() => {
          const sig = document.querySelector<HTMLElement>('.site-header .signature');
          const mainH1 = document.querySelector<HTMLElement>('.page h1');
          if (!sig || !mainH1) return 0;
          return Math.round(Math.abs(mainH1.getBoundingClientRect().left - sig.getBoundingClientRect().left) * 100) / 100;
        })(),
      };
    });

    await page.goto(`${KEYED_ORIGIN}/${locale}/${seg.works}/solitude/`);
    const workDetailTargets = await page.evaluate((): TouchTargetSample[] => {
      const selectors = [
        '.work-breadcrumb a',
        '[data-drift-link]',
        '.work a[href*="contact"]',
        '.prev-next a',
      ];
      const out: TouchTargetSample[] = [];
      selectors.forEach((sel) => {
        Array.from(document.querySelectorAll<HTMLElement>(sel)).forEach((el, idx) => {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && r.height > 0) {
            out.push({
              id: `work-cta-${sel}-${idx}`,
              width: Math.round(r.width * 100) / 100,
              height: Math.round(r.height * 100) / 100,
            });
          }
        });
      });
      return out;
    });

    if (pageErrors.length > 0) {
      throw new Error(`Uncaught page errors during UX telemetry: ${pageErrors.join('; ')}`);
    }

    return {
      locale,
      viewport,
      pointerKind,
      matchesCoarseMedia,
      thresholdRects,
      thresholdOverlaps,
      hudRects,
      touchTargets: [
        ...driftTargetsAndRows.targets,
        ...focusTargets,
        ...worksPageTargets.targets,
        ...workDetailTargets,
      ],
      zoneStripRowCount: driftTargetsAndRows.zoneStripRowCount,
      headerPageInsetDeltaPx: worksPageTargets.headerPageInsetDeltaPx,
    };
  } finally {
    await context.close();
  }
}

/**
 * Executes live user-journey wayfinding probes across Awake Home, About, Works Index,
 * Territory page, Work page, Drift HUD, and FocusOverlay for `locale`.
 *
 * @param browser - Playwright browser instance.
 * @param locale - `'en'` or `'fr'`.
 * @param viewport - Viewport dimensions used for the probe session.
 * @param pointerKind - `'fine'` or `'coarse'`.
 * @returns Empirical `WayfindingSnapshot` ready for `evaluateWayfindingChecks`.
 */
export async function collectWayfindingSnapshot(
  browser: Browser,
  locale: Locale,
  viewport: ViewportSpec,
  pointerKind: PointerKind,
): Promise<WayfindingSnapshot> {
  const { context, page, pageErrors } = await openPersonaContext(browser, viewport, pointerKind);
  try {
    const seg = ROUTE_SEGMENTS[locale];

    // 1. Global Drift entry from a non-Home Awake route while stored preference is 'awake'.
    await page.goto(`${KEYED_ORIGIN}/${locale}/${seg.about}/`);
    await page.evaluate(() => localStorage.setItem('iknowyoucanseeme:mode', 'awake'));
    await page.reload();

    const headerDriftLink = page.locator(
      '.site-header [data-header-drift], .site-header nav a[href*="?drift="], .site-header nav a[href*="?w="]',
    );
    const nonHomeDriftHeaderLinkPresent = (await headerDriftLink.count()) > 0;

    let awakeModeDriftClicksFromNonHome = 0;
    if (nonHomeDriftHeaderLinkPresent) {
      await headerDriftLink.first().click();
      awakeModeDriftClicksFromNonHome = 1;
      const enteredDirectly = await page
        .locator('[data-drift]')
        .waitFor({ state: 'visible', timeout: 4_000 })
        .then(() => true)
        .catch(() => false);
      if (!enteredDirectly) {
        await page.locator('[data-drift-start]').click();
        awakeModeDriftClicksFromNonHome = 2;
        await page.locator('[data-drift]').waitFor({ state: 'visible', timeout: 10_000 });
      }
    } else {
      await page.locator('.site-header .signature').click();
      awakeModeDriftClicksFromNonHome = 1;
      await page.waitForLoadState('load');
      const driftVisibleAfterHomeClick = await page.locator('[data-drift]').isVisible();
      if (!driftVisibleAfterHomeClick) {
        await page.locator('[data-drift-start]').waitFor({ state: 'visible', timeout: 8_000 });
        await page.locator('[data-drift-start]').click();
        awakeModeDriftClicksFromNonHome = 2;
        await page.locator('[data-drift]').waitFor({ state: 'visible', timeout: 10_000 });
      }
    }

    // 2. Works index `:target` reversibility & zero-JS medium filtering.
    await page.goto(`${KEYED_ORIGIN}/${locale}/${seg.works}/`);
    const countVisibleWorkCards = () =>
      page.evaluate(
        () =>
          Array.from(document.querySelectorAll<HTMLElement>('.work-card')).filter(
            (el) => el.offsetWidth > 0 && el.offsetHeight > 0,
          ).length,
      );

    const totalCataloguedWorks = await countVisibleWorkCards();
    await page.locator('.works-index nav a[href="#dreamland"]').click();

    const resetInfo = await page.evaluate(() => {
      const anchors = Array.from(
        document.querySelectorAll<HTMLAnchorElement>('.works-index nav a[href]'),
      );
      const reset = anchors.find((a) => {
        const href = a.getAttribute('href') ?? '';
        return href !== '#dreamland' && href !== '#the-border-is-thin';
      });
      const mediumInputs = document.querySelectorAll(
        '.works-index input[name="medium-filter"], .works-index [data-medium-filter]',
      ).length;
      if (!reset) return { hasReset: false, resetHref: null, mediumInputs };
      return { hasReset: true, resetHref: reset.getAttribute('href'), mediumInputs };
    });

    if (resetInfo.hasReset && resetInfo.resetHref !== null) {
      await page.locator(`.works-index nav a[href="${resetInfo.resetHref}"]`).first().click();
    }
    const worksCountRestoredAfterReset = await countVisibleWorkCards();

    // 3. Work page hierarchy, sequence position (`i / N`), and thumbnail prev/next cards.
    await page.goto(`${KEYED_ORIGIN}/${locale}/${seg.works}/solitude/`);
    const workPageState = await page.evaluate(() => {
      const breadcrumb = document.querySelector(
        'article.work .work-breadcrumb, article.work nav:not(.prev-next)',
      );
      const text = document.querySelector('article.work')?.textContent ?? '';
      const hasSequence = /\b\d+\s*\/\s*\d+\b/.test(text);
      const thumbs = Array.from(
        document.querySelectorAll<HTMLImageElement>('article.work .prev-next img'),
      ).filter((img) => img.getBoundingClientRect().width > 0).length;
      return {
        workBreadcrumbPresent: breadcrumb !== null,
        workSequencePositionPresent: hasSequence,
        workPrevNextThumbnailCount: thumbs,
      };
    });

    // 4. Territory page zone jumps, Drift portal link, and cross-territory continuation.
    await page.goto(`${KEYED_ORIGIN}/${locale}/${seg.territories}/dreamland/`);
    const territoryState = await page.evaluate(() => {
      const zoneJumps = document.querySelectorAll(
        'main a[href^="#zone-"], main a[href="#arrival"], main a[href="#lens"], main a[href="#leak"]',
      ).length;
      const driftPortal =
        document.querySelectorAll(
          'main a[href*="?w="], main a[href*="?drift="], main [data-drift-link]',
        ).length > 0;
      const crossTerritory =
        document.querySelectorAll('main a[href*="the-border-is-thin"]').length > 0;
      return {
        territoryZoneJumpCount: zoneJumps,
        territoryDriftPortalPresent: driftPortal,
        crossTerritoryLinkPresent: crossTerritory,
      };
    });

    // 5. Awake Wake-up continuity on a non-featured work (`venise-portrait-5`), plus Drift HUD & FocusOverlay checks.
    await page.goto(`${KEYED_ORIGIN}/${locale}/?w=solitude`);
    await page.locator('[data-threshold]').waitFor({ state: 'hidden', timeout: 8_000 });
    await waitForDriftFrames(page);
    await page.waitForFunction(
      () =>
        (window as unknown as DebugProbeWindow).__driftDebug?.loaded.solitude !== undefined,
      null,
      { timeout: 15_000 },
    );

    const driftHudState = await page.evaluate(() => {
      const isVisible = (sel: string): boolean => {
        const el = document.querySelector<HTMLElement>(sel);
        if (!el || el.hidden) return false;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) <= 0.05) {
          return false;
        }
        if (cs.pointerEvents === 'none') return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      };

      const prevVisible = isVisible('[data-drift-prev]');
      const nextVisible = isVisible('[data-drift-next]');
      const currentEl = document.querySelector<HTMLElement>('[data-drift-current]');
      const currentVisible =
        isVisible('[data-drift-current]') &&
        /\b\d+\s*\/\s*\d+\b/.test(currentEl?.textContent ?? '');
      const lensButtonVisible = isVisible('[data-lens-cycle]');

      return {
        driftPrevNextButtonsVisible: prevVisible && nextVisible,
        driftCurrentWorkIndicatorVisible: currentVisible,
        driftLensCycleButtonVisible: lensButtonVisible,
      };
    });

    // Open FocusOverlay on `solitude` (non-specimen photograph) to inspect curatorial metadata & prev/next buttons.
    await page.mouse.click(viewport.width / 2, viewport.height / 2);
    await page.locator('[data-drift-focus]').waitFor({ state: 'visible', timeout: 8_000 });

    const focusState = await page.evaluate(() => {
      const dialog = document.querySelector<HTMLElement>('[data-drift-focus]');
      if (!dialog) {
        return { focusCuratorialMetaVisible: false, focusPrevNextButtonsVisible: false };
      }
      const isVisibleInside = (sel: string): boolean => {
        const el = dialog.querySelector<HTMLElement>(sel);
        if (!el || el.hidden || el.closest('[hidden]')) return false;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      };

      const metaEl = dialog.querySelector<HTMLElement>('[data-focus-meta]');
      const metaText =
        metaEl && isVisibleInside('[data-focus-meta]') ? (metaEl.textContent ?? '').trim() : '';
      const focusCuratorialMetaVisible = metaText.length > 0 && /\b20\d\d\b/.test(metaText);
      const focusPrevNextButtonsVisible =
        isVisibleInside('[data-focus-prev]') && isVisibleInside('[data-focus-next]');

      return { focusCuratorialMetaVisible, focusPrevNextButtonsVisible };
    });
    await page.keyboard.press('Escape');

    // Check Wake-up continuity on `venise-portrait-5` (not among the 3 static Home featured teasers).
    await page.goto(`${KEYED_ORIGIN}/${locale}/?w=venise-portrait-5`);
    await page.locator('[data-threshold]').waitFor({ state: 'hidden', timeout: 8_000 });
    await waitForDriftFrames(page);
    await page.locator('[data-drift-wake]').click();
    await page.locator('[data-drift]').waitFor({ state: 'hidden', timeout: 6_000 });

    const wakePreservesSettledWorkLink = await page.evaluate(() => {
      const links = Array.from(
        document.querySelectorAll<HTMLAnchorElement>(
          '[data-awake-resume], main a[href*="/venise-portrait-5/"]',
        ),
      );
      return links.some((el) => {
        if (el.hidden || el.closest('[hidden]')) return false;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      });
    });

    if (pageErrors.length > 0) {
      throw new Error(`Uncaught page errors during wayfinding probe: ${pageErrors.join('; ')}`);
    }

    return {
      nonHomeDriftHeaderLinkPresent,
      awakeModeDriftClicksFromNonHome,
      worksFilterResetControlPresent: resetInfo.hasReset,
      worksCountRestoredAfterReset,
      totalCataloguedWorks,
      mediumFilterControlCount: resetInfo.mediumInputs,
      workBreadcrumbPresent: workPageState.workBreadcrumbPresent,
      workSequencePositionPresent: workPageState.workSequencePositionPresent,
      workPrevNextThumbnailCount: workPageState.workPrevNextThumbnailCount,
      territoryZoneJumpCount: territoryState.territoryZoneJumpCount,
      territoryDriftPortalPresent: territoryState.territoryDriftPortalPresent,
      crossTerritoryLinkPresent: territoryState.crossTerritoryLinkPresent,
      wakePreservesSettledWorkLink,
      driftPrevNextButtonsVisible: driftHudState.driftPrevNextButtonsVisible,
      driftCurrentWorkIndicatorVisible: driftHudState.driftCurrentWorkIndicatorVisible,
      driftLensCycleButtonVisible: driftHudState.driftLensCycleButtonVisible,
      focusCuratorialMetaVisible: focusState.focusCuratorialMetaVisible,
      focusPrevNextButtonsVisible: focusState.focusPrevNextButtonsVisible,
    };
  } finally {
    await context.close();
  }
}

/**
 * Builds a complete `NavigationAuditReport` from live viewport telemetry and a wayfinding snapshot.
 *
 * @param telemetry - Measured viewport HUD and touch-target telemetry.
 * @param wayfindingSnapshot - Measured cross-site wayfinding snapshot.
 * @returns Evaluated `NavigationAuditReport`.
 */
export function reportFromTelemetry(
  telemetry: ViewportDriftTelemetry,
  wayfindingSnapshot: WayfindingSnapshot,
): NavigationAuditReport {
  return buildNavigationReport({
    viewport: telemetry.viewport,
    pointerKind: telemetry.pointerKind,
    hudRects: telemetry.hudRects,
    touchTargets: telemetry.touchTargets,
    wayfindingSnapshot,
  });
}

import { test, expect } from '@playwright/test';
import {
  WAYFINDING_CHECK_IDS,
  VisitorPersonas,
  type PointerKind,
  type ViewportSpec,
} from '../../src/ux/VisitorPersonas.js';
import {
  auditTouchTargets,
  detectRectOverlaps,
  evaluateWayfindingChecks,
  explainPersonaScore,
  scorePersona,
  viewportCoverageRatio,
  type WayfindingSnapshot,
} from '../../src/ux/NavigationAudit.js';
import {
  collectViewportTelemetry,
  collectWayfindingSnapshot,
  reportFromTelemetry,
  type ViewportDriftTelemetry,
} from './uxSurveyCollector.js';

const SURVEY_VIEWPORTS: ReadonlyArray<{
  readonly viewport: ViewportSpec;
  readonly pointerKind: PointerKind;
}> = [
  { viewport: { width: 375, height: 667, label: 'iPhone SE 375×667' }, pointerKind: 'coarse' },
  { viewport: { width: 390, height: 844, label: 'iPhone 390×844' }, pointerKind: 'coarse' },
  { viewport: { width: 820, height: 1180, label: 'Tablet 820×1180' }, pointerKind: 'coarse' },
  { viewport: { width: 1440, height: 900, label: 'Desktop 1440×900' }, pointerKind: 'fine' },
  { viewport: { width: 1920, height: 1080, label: 'Desktop 1920×1080' }, pointerKind: 'fine' },
];

test.describe('Multi-persona sociological UX survey & navigation audit', () => {
  test('measures live DOM geometry, HUD collisions, touch targets, wayfinding checks, and 7-persona baseline scores across EN & FR', async ({
    browser,
  }, testInfo) => {
    test.setTimeout(180_000);

    const telemetryByKey = new Map<string, ViewportDriftTelemetry>();
    for (const locale of ['en', 'fr'] as const) {
      for (const { viewport, pointerKind } of SURVEY_VIEWPORTS) {
        const telemetry = await collectViewportTelemetry(browser, locale, viewport, pointerKind);
        telemetryByKey.set(`${locale}:${viewport.width}x${viewport.height}`, telemetry);

        // Pointer media query matches persona pointer profile.
        expect(telemetry.matchesCoarseMedia).toBe(pointerKind === 'coarse');

        // Threshold screen never collides with top Wake-up / Mute controls.
        expect(telemetry.thresholdRects.length).toBe(3);
        expect(telemetry.thresholdOverlaps).toEqual([]);
      }
    }

    // Mobile portrait viewports (375x667 & 390x844) exhibit empirical .drift-top vs .drift-help collisions today,
    // and wrap .drift-zones into multiple rows.
    for (const locale of ['en', 'fr'] as const) {
      for (const key of ['375x667', '390x844'] as const) {
        const mobile = telemetryByKey.get(`${locale}:${key}`);
        expect(mobile).toBeDefined();
        if (!mobile) continue;
        const overlaps = detectRectOverlaps(mobile.hudRects);
        expect(overlaps.length, `${locale}:${key} mobile HUD overlap`).toBeGreaterThanOrEqual(1);
        expect(overlaps[0]?.a).toBe('drift-top');
        expect(overlaps[0]?.b).toBe('drift-help');
        expect(overlaps[0]?.area).toBeGreaterThan(5_000);
        expect(mobile.zoneStripRowCount, `${locale}:${key} wrapped zone rows`).toBeGreaterThanOrEqual(2);
        const cov = viewportCoverageRatio(mobile.hudRects, mobile.viewport);
        expect(cov).toBeGreaterThan(0.2);
        expect(cov).toBeLessThan(0.6);

        const targetAudit = auditTouchTargets(mobile.touchTargets, 'coarse');
        expect(targetAudit.violations.length).toBeGreaterThan(0);
        expect(targetAudit.passRatio).toBeGreaterThan(0);
        expect(targetAudit.passRatio).toBeLessThan(1);
      }
    }

    // Tablet (820x1180) has a single-row zone strip, yet still suffers a .drift-top vs .drift-help
    // collision on touch hardware because [data-drift-tilt] adds a third top button.
    for (const locale of ['en', 'fr'] as const) {
      const tablet = telemetryByKey.get(`${locale}:820x1180`);
      expect(tablet).toBeDefined();
      if (!tablet) continue;
      const tabletOverlaps = detectRectOverlaps(tablet.hudRects);
      expect(tabletOverlaps.length, `${locale}:820x1180 tablet HUD overlap`).toBeGreaterThanOrEqual(1);
      expect(tabletOverlaps[0]?.a).toBe('drift-top');
      expect(tabletOverlaps[0]?.b).toBe('drift-help');
      expect(tablet.zoneStripRowCount).toBe(locale === 'fr' ? 2 : 1);
      const tabletTargetAudit = auditTouchTargets(tablet.touchTargets, 'coarse');
      expect(tabletTargetAudit.violations.length).toBeGreaterThan(0);
    }

    // Desktop (1440x900, 1920x1080) viewports have zero HUD overlap today,
    // while standalone Awake/Focus inline links fall below WCAG 2.5.8 24x24 target thresholds.
    for (const locale of ['en', 'fr'] as const) {
      for (const key of ['1440x900', '1920x1080'] as const) {
        const wide = telemetryByKey.get(`${locale}:${key}`);
        expect(wide).toBeDefined();
        if (!wide) continue;
        expect(detectRectOverlaps(wide.hudRects), `${locale}:${key} wide HUD overlap`).toEqual([]);
        expect(wide.zoneStripRowCount).toBe(1);
        expect(wide.headerPageInsetDeltaPx).toBeLessThanOrEqual(2);
        const cov = viewportCoverageRatio(wide.hudRects, wide.viewport);
        expect(cov).toBeGreaterThan(0.02);
        expect(cov).toBeLessThan(0.25);

        const targetAudit = auditTouchTargets(wide.touchTargets, wide.pointerKind);
        expect(targetAudit.violations.length).toBeGreaterThan(0);
      }
    }

    // Collect cross-site wayfinding snapshots in both English and French.
    const wayfindingByLocale: Record<'en' | 'fr', WayfindingSnapshot> = {
      en: await collectWayfindingSnapshot(
        browser,
        'en',
        { width: 1440, height: 900, label: 'Desktop 1440×900' },
        'fine',
      ),
      fr: await collectWayfindingSnapshot(
        browser,
        'fr',
        { width: 390, height: 844, label: 'iPhone 390×844' },
        'coarse',
      ),
    };

    const AWAKE_PASSED_CHECKS = [
      'globalDriftEntry',
      'reversibleWorksFilter',
      'workBreadcrumbAndContext',
      'territoryContinuity',
      'awakeWakeContinuity',
    ] as const;

    // Verify zero touch-target violations across all Awake controls (header, footer, works filters, work CTAs)
    // on every sampled viewport and pointer profile (fine 24x24 & coarse 44x44).
    for (const [key, telemetry] of telemetryByKey.entries()) {
      const awakeTargets = telemetry.touchTargets.filter(
        (t) =>
          t.id.startsWith('header-link-') ||
          t.id.startsWith('footer-link-') ||
          t.id.startsWith('works-filter-') ||
          t.id.startsWith('work-cta-'),
      );
      expect(awakeTargets.length, `${key} awake target count`).toBeGreaterThan(10);
      expect(
        auditTouchTargets(awakeTargets, telemetry.pointerKind).violations,
        `${key} awake touch-target violations`,
      ).toEqual([]);
    }

    for (const locale of ['en', 'fr'] as const) {
      const snap = wayfindingByLocale[locale];
      expect(snap.totalCataloguedWorks).toBe(40);
      expect(snap.worksCountRestoredAfterReset).toBe(40);
      expect(snap.awakeModeDriftClicksFromNonHome).toBe(1);

      const evaluated = evaluateWayfindingChecks(snap);
      expect(evaluated.totalCount).toBe(8);
      expect(evaluated.passedCount).toBe(5);
      for (const checkId of WAYFINDING_CHECK_IDS) {
        const expected = (AWAKE_PASSED_CHECKS as readonly string[]).includes(checkId);
        expect(evaluated.checks[checkId], `${locale}:${checkId}`).toBe(expected);
      }
    }

    // Score all 7 sociological personas against their primary empirical viewport and locale telemetry.
    const summaryRows: Array<Record<string, unknown>> = [];
    for (const persona of VisitorPersonas.ALL) {
      const primaryLocale = persona.locales[0];
      const key = `${primaryLocale}:${persona.primaryViewport.width}x${persona.primaryViewport.height}`;
      const telemetry = telemetryByKey.get(key);
      expect(telemetry, `telemetry for ${persona.id} (${key})`).toBeDefined();
      if (!telemetry) continue;

      const report = reportFromTelemetry(telemetry, wayfindingByLocale[primaryLocale]);
      const breakdown = explainPersonaScore(persona, report);
      const numericScore = scorePersona(persona, report);

      expect(numericScore).toBe(breakdown.total);
      expect(numericScore).toBeGreaterThan(40);
      expect(numericScore).toBeLessThan(95);
      expect(breakdown.passedChecks).toEqual([...AWAKE_PASSED_CHECKS]);

      summaryRows.push({
        id: persona.id,
        locale: primaryLocale,
        viewport: `${telemetry.viewport.width}x${telemetry.viewport.height}`,
        score: breakdown.total,
        collisionScore: breakdown.collisionScore,
        clearanceScore: breakdown.clearanceScore,
        touchTargetScore: breakdown.touchTargetScore,
        wayfindingScore: breakdown.wayfindingScore,
        hudOverlaps: report.hudOverlaps,
        hudCoverage: Number(report.hudViewportCoverage.toFixed(4)),
        zoneRows: telemetry.zoneStripRowCount,
        touchPass: `${report.touchTargets.passingTargets}/${report.touchTargets.totalTargets}`,
        wcagPass: `${report.touchTargets.wcagPassCount}/${report.touchTargets.totalTargets}`,
      });
    }

    expect(summaryRows).toHaveLength(7);

    const payload = JSON.stringify(
      {
        viewports: Object.fromEntries(
          Array.from(telemetryByKey.entries()).map(([k, v]) => [
            k,
            {
              hudRects: v.hudRects,
              hudOverlaps: detectRectOverlaps(v.hudRects),
              hudCoverage: Number(viewportCoverageRatio(v.hudRects, v.viewport).toFixed(4)),
              zoneStripRowCount: v.zoneStripRowCount,
              headerPageInsetDeltaPx: v.headerPageInsetDeltaPx,
              touchAudit: auditTouchTargets(v.touchTargets, v.pointerKind),
            },
          ]),
        ),
        wayfindingByLocale,
        personas: summaryRows,
      },
      null,
      2,
    );
    await testInfo.attach('ux-survey-baseline.json', {
      body: payload,
      contentType: 'application/json',
    });
  });
});

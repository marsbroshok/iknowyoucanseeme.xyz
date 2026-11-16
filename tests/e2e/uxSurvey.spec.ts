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
  test('verifies zero HUD collisions, <= 25% chrome coverage, 100% touch targets, 8/8 wayfinding checks across fine & coarse viewports, and >= 90/100 scores for all 7 personas', async ({
    browser,
  }, testInfo) => {
    test.setTimeout(240_000);

    const telemetryByKey = new Map<string, ViewportDriftTelemetry>();
    for (const locale of ['en', 'fr'] as const) {
      for (const { viewport, pointerKind } of SURVEY_VIEWPORTS) {
        const key = `${locale}:${viewport.width}x${viewport.height}`;
        const telemetry = await collectViewportTelemetry(browser, locale, viewport, pointerKind);
        telemetryByKey.set(key, telemetry);

        // Pointer media query matches persona pointer profile.
        expect(telemetry.matchesCoarseMedia, `${key} coarse media`).toBe(pointerKind === 'coarse');

        // Threshold screen never collides with top Wake-up / Mute controls.
        expect(telemetry.thresholdRects.length).toBe(3);
        expect(telemetry.thresholdOverlaps).toEqual([]);

        // Post-overhaul HUD geometry: 0 collisions, single-row zone strip, <= 25% viewport coverage.
        expect(detectRectOverlaps(telemetry.hudRects), `${key} HUD overlaps`).toEqual([]);
        expect(telemetry.zoneStripRowCount, `${key} single-row zone strip`).toBe(1);
        const cov = viewportCoverageRatio(telemetry.hudRects, telemetry.viewport);
        expect(cov, `${key} HUD coverage > 0`).toBeGreaterThan(0.01);
        expect(cov, `${key} HUD coverage <= 0.25`).toBeLessThanOrEqual(0.25);

        // 100% touch-target pass ratio across Drift HUD, FocusOverlay, and Awake chrome.
        const targetAudit = auditTouchTargets(telemetry.touchTargets, pointerKind);
        expect(targetAudit.totalTargets, `${key} target count`).toBeGreaterThan(20);
        expect(targetAudit.violations, `${key} touch-target violations`).toEqual([]);
        expect(targetAudit.passRatio, `${key} passRatio`).toBe(1);

        if (viewport.width >= 1440) {
          expect(telemetry.headerPageInsetDeltaPx, `${key} header inset alignment`).toBeLessThanOrEqual(
            2,
          );
        }
      }
    }

    // Collect cross-site wayfinding snapshots across all 4 (locale × pointer class) combinations
    // so responsive media queries cannot hide Awake or Drift controls on the opposite viewport class.
    const wayfindingMatrix: Record<string, WayfindingSnapshot> = {
      'en:fine': await collectWayfindingSnapshot(
        browser,
        'en',
        { width: 1440, height: 900, label: 'Desktop 1440×900' },
        'fine',
      ),
      'fr:coarse': await collectWayfindingSnapshot(
        browser,
        'fr',
        { width: 390, height: 844, label: 'iPhone 390×844' },
        'coarse',
      ),
      'en:coarse': await collectWayfindingSnapshot(
        browser,
        'en',
        { width: 390, height: 844, label: 'iPhone 390×844' },
        'coarse',
      ),
      'fr:fine': await collectWayfindingSnapshot(
        browser,
        'fr',
        { width: 1440, height: 900, label: 'Desktop 1440×900' },
        'fine',
      ),
    };

    for (const [matrixKey, snap] of Object.entries(wayfindingMatrix)) {
      expect(snap.totalCataloguedWorks, `${matrixKey} totalCataloguedWorks`).toBe(40);
      expect(snap.worksCountRestoredAfterReset, `${matrixKey} worksCountRestoredAfterReset`).toBe(40);
      expect(snap.awakeModeDriftClicksFromNonHome, `${matrixKey} awakeModeDriftClicks`).toBe(1);

      const evaluated = evaluateWayfindingChecks(snap);
      expect(evaluated.totalCount).toBe(8);
      expect(evaluated.passedCount, `${matrixKey} passedCount`).toBe(8);
      for (const checkId of WAYFINDING_CHECK_IDS) {
        expect(evaluated.checks[checkId], `${matrixKey}:${checkId}`).toBe(true);
      }
    }

    // Score all 7 sociological personas against their primary empirical viewport and locale/pointer telemetry.
    const summaryRows: Array<Record<string, unknown>> = [];
    for (const persona of VisitorPersonas.ALL) {
      const primaryLocale = persona.locales[0];
      const key = `${primaryLocale}:${persona.primaryViewport.width}x${persona.primaryViewport.height}`;
      const telemetry = telemetryByKey.get(key);
      expect(telemetry, `telemetry for ${persona.id} (${key})`).toBeDefined();
      if (!telemetry) continue;

      const wayfindingSnap = wayfindingMatrix[`${primaryLocale}:${persona.pointerKind}`];
      expect(wayfindingSnap, `wayfinding for ${persona.id}`).toBeDefined();
      if (!wayfindingSnap) continue;

      const report = reportFromTelemetry(telemetry, wayfindingSnap);
      const breakdown = explainPersonaScore(persona, report);
      const numericScore = scorePersona(persona, report);

      expect(numericScore).toBe(breakdown.total);
      expect(numericScore, `${persona.id} UX score >= 90`).toBeGreaterThanOrEqual(90);
      expect(breakdown.passedChecks).toEqual([...WAYFINDING_CHECK_IDS]);
      expect(breakdown.failedChecks).toEqual([]);

      summaryRows.push({
        id: persona.id,
        locale: primaryLocale,
        viewport: `${telemetry.viewport.width}x${telemetry.viewport.height}`,
        pointer: telemetry.pointerKind,
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
        wayfindingMatrix,
        personas: summaryRows,
      },
      null,
      2,
    );
    await testInfo.attach('ux-survey-post-overhaul.json', {
      body: payload,
      contentType: 'application/json',
    });
  });
});

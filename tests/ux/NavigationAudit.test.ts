import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  WAYFINDING_CHECK_IDS,
  VisitorPersonas,
  type WayfindingCheckId,
} from '../../src/ux/VisitorPersonas.js';
import {
  NavigationAudit,
  auditTouchTargets,
  buildNavigationReport,
  detectRectOverlaps,
  evaluateWayfindingChecks,
  explainPersonaScore,
  scorePersona,
  viewportCoverageRatio,
  type NamedRect,
  type NavigationAuditReport,
  type TouchTargetSample,
  type WayfindingSnapshot,
} from '../../src/ux/NavigationAudit.js';

const PASSING_SNAPSHOT: WayfindingSnapshot = {
  nonHomeDriftHeaderLinkPresent: true,
  awakeModeDriftClicksFromNonHome: 1,
  worksFilterResetControlPresent: true,
  worksCountRestoredAfterReset: 40,
  totalCataloguedWorks: 40,
  mediumFilterControlCount: 3,
  workBreadcrumbPresent: true,
  workSequencePositionPresent: true,
  workPrevNextThumbnailCount: 2,
  territoryZoneJumpCount: 3,
  territoryDriftPortalPresent: true,
  crossTerritoryLinkPresent: true,
  wakePreservesSettledWorkLink: true,
  driftPrevNextButtonsVisible: true,
  driftCurrentWorkIndicatorVisible: true,
  driftLensCycleButtonVisible: true,
  focusCuratorialMetaVisible: true,
  focusPrevNextButtonsVisible: true,
};

const BASELINE_SNAPSHOT: WayfindingSnapshot = {
  nonHomeDriftHeaderLinkPresent: false,
  awakeModeDriftClicksFromNonHome: 2,
  worksFilterResetControlPresent: false,
  worksCountRestoredAfterReset: 27,
  totalCataloguedWorks: 40,
  mediumFilterControlCount: 0,
  workBreadcrumbPresent: false,
  workSequencePositionPresent: false,
  workPrevNextThumbnailCount: 0,
  territoryZoneJumpCount: 0,
  territoryDriftPortalPresent: false,
  crossTerritoryLinkPresent: false,
  wakePreservesSettledWorkLink: false,
  driftPrevNextButtonsVisible: false,
  driftCurrentWorkIndicatorVisible: false,
  driftLensCycleButtonVisible: false,
  focusCuratorialMetaVisible: false,
  focusPrevNextButtonsVisible: false,
};

describe('NavigationAudit geometry & occlusion', () => {
  it('detects HUD bounding-box collisions on mobile 375px/390px and ignores edge-touching or degenerate boxes', () => {
    const mobileFrHud: NamedRect[] = [
      { id: 'drift-help', x: 16, y: 16, width: 352, height: 126 },
      { id: 'drift-top', x: 96, y: 16, width: 278, height: 44 },
      { id: 'drift-compass', x: 0, y: 690, width: 390, height: 146 },
      { id: 'adjacent-pill', x: 374, y: 16, width: 16, height: 44 },
      { id: 'hidden-empty', x: 20, y: 20, width: 0, height: 40 },
    ];

    const overlaps = detectRectOverlaps(mobileFrHud);
    expect(overlaps).toEqual([
      {
        a: 'drift-help',
        b: 'drift-top',
        x: 96,
        y: 16,
        width: 272,
        height: 44,
        area: 11_968,
      },
    ]);
    expect(NavigationAudit.detectRectOverlaps(mobileFrHud)).toEqual(overlaps);
  });

  it('computes exact union viewport coverage ratio without double-counting overlapping rects', () => {
    const viewport = { width: 100, height: 100 };
    const overlapping: NamedRect[] = [
      { id: 'a', x: 0, y: 0, width: 60, height: 50 },
      { id: 'b', x: 40, y: 0, width: 60, height: 50 },
      { id: 'outside', x: -20, y: 50, width: 40, height: 70 },
      { id: 'zero', x: 10, y: 10, width: 10, height: 0 },
    ];
    // Union inside 100x100: [0,100]x[0,50] = 5000 plus [0,20]x[50,100] = 1000 => 6000 / 10000 = 0.6
    expect(viewportCoverageRatio(overlapping, viewport)).toBeCloseTo(0.6, 8);
    expect(viewportCoverageRatio([], viewport)).toBe(0);
    expect(viewportCoverageRatio(overlapping, { width: 0, height: 100 })).toBe(0);
    expect(viewportCoverageRatio(overlapping, { width: 100, height: -10 })).toBe(0);
  });

  it('handles disjoint vertical intervals within the same horizontal sweep strip', () => {
    const rects: NamedRect[] = [
      { id: 'top', x: 10, y: 10, width: 30, height: 20 },
      { id: 'bottom', x: 10, y: 60, width: 30, height: 20 },
    ];
    expect(viewportCoverageRatio(rects, { width: 100, height: 100 })).toBeCloseTo(0.12, 8);
  });

  it('property: viewportCoverageRatio stays in [0, 1], is idempotent under duplication, and monotonic under addition', () => {
    const rectArb = fc.record({
      id: fc.string({ minLength: 1, maxLength: 6 }),
      x: fc.double({ min: -50, max: 450, noNaN: true, noDefaultInfinity: true }),
      y: fc.double({ min: -50, max: 900, noNaN: true, noDefaultInfinity: true }),
      width: fc.double({ min: -10, max: 400, noNaN: true, noDefaultInfinity: true }),
      height: fc.double({ min: -10, max: 400, noNaN: true, noDefaultInfinity: true }),
    });
    const viewportArb = fc.record({
      width: fc.integer({ min: 100, max: 1920 }),
      height: fc.integer({ min: 100, max: 1200 }),
    });

    fc.assert(
      fc.property(fc.array(rectArb, { maxLength: 8 }), rectArb, viewportArb, (rects, extra, vp) => {
        const base = viewportCoverageRatio(rects, vp);
        const duplicated = viewportCoverageRatio([...rects, ...rects], vp);
        const augmented = viewportCoverageRatio([...rects, extra], vp);

        expect(base).toBeGreaterThanOrEqual(0);
        expect(base).toBeLessThanOrEqual(1);
        expect(duplicated).toBeCloseTo(base, 9);
        expect(augmented + 1e-12).toBeGreaterThanOrEqual(base);
      }),
    );
  });
});

describe('NavigationAudit touch target ergonomics', () => {
  const sampleTargets: TouchTargetSample[] = [
    { id: 'header-lang', width: 18, height: 20 },
    { id: 'Desktop-24', width: 28, height: 24 },
    { id: 'Mobile-44', width: 88, height: 44 },
  ];

  it('enforces WCAG 2.5.8 AA (24x24 px) on fine pointers and 44x44 px comfort on coarse pointers', () => {
    const fine = auditTouchTargets(sampleTargets, 'fine');
    expect(fine.requiredMinPx).toBe(24);
    expect(fine.totalTargets).toBe(3);
    expect(fine.wcagPassCount).toBe(2);
    expect(fine.comfortPassCount).toBe(2);
    expect(fine.passingTargets).toBe(2);
    expect(fine.passRatio).toBeCloseTo(2 / 3, 8);
    expect(fine.violations).toEqual([
      {
        id: 'header-lang',
        width: 18,
        height: 20,
        requiredMinPx: 24,
        meetsWcagMinimum: false,
        meetsPointerComfort: false,
      },
    ]);

    const coarse = auditTouchTargets(sampleTargets, 'coarse');
    expect(coarse.requiredMinPx).toBe(44);
    expect(coarse.wcagPassCount).toBe(2);
    expect(coarse.comfortPassCount).toBe(1);
    expect(coarse.passingTargets).toBe(1);
    expect(coarse.passRatio).toBeCloseTo(1 / 3, 8);
    expect(coarse.violations).toEqual([
      {
        id: 'header-lang',
        width: 18,
        height: 20,
        requiredMinPx: 44,
        meetsWcagMinimum: false,
        meetsPointerComfort: false,
      },
      {
        id: 'Desktop-24',
        width: 28,
        height: 24,
        requiredMinPx: 44,
        meetsWcagMinimum: true,
        meetsPointerComfort: false,
      },
    ]);

    expect(auditTouchTargets([], 'coarse')).toEqual({
      pointerKind: 'coarse',
      requiredMinPx: 44,
      totalTargets: 0,
      passingTargets: 0,
      wcagPassCount: 0,
      comfortPassCount: 0,
      passRatio: 1,
      violations: [],
    });
  });
});

describe('NavigationAudit wayfinding capability checks', () => {
  it('passes all 8 checks for a complete post-overhaul snapshot and fails all 8 on today baseline', () => {
    const passing = evaluateWayfindingChecks(PASSING_SNAPSHOT);
    expect(passing.passedCount).toBe(8);
    expect(passing.totalCount).toBe(8);
    for (const id of WAYFINDING_CHECK_IDS) {
      expect(passing.checks[id]).toBe(true);
    }

    const baseline = evaluateWayfindingChecks(BASELINE_SNAPSHOT);
    expect(baseline.passedCount).toBe(0);
    expect(baseline.totalCount).toBe(8);
    for (const id of WAYFINDING_CHECK_IDS) {
      expect(baseline.checks[id]).toBe(false);
    }
  });

  it('evaluates each individual wayfinding sub-condition without false positives', () => {
    expect(
      evaluateWayfindingChecks({ ...PASSING_SNAPSHOT, awakeModeDriftClicksFromNonHome: 0 }).checks.globalDriftEntry,
    ).toBe(false);
    expect(
      evaluateWayfindingChecks({ ...PASSING_SNAPSHOT, awakeModeDriftClicksFromNonHome: 2 }).checks.globalDriftEntry,
    ).toBe(false);
    expect(
      evaluateWayfindingChecks({ ...PASSING_SNAPSHOT, totalCataloguedWorks: 0, worksCountRestoredAfterReset: 0 }).checks
        .reversibleWorksFilter,
    ).toBe(false);
    expect(
      evaluateWayfindingChecks({ ...PASSING_SNAPSHOT, mediumFilterControlCount: 1 }).checks.reversibleWorksFilter,
    ).toBe(false);
    expect(
      evaluateWayfindingChecks({ ...PASSING_SNAPSHOT, workSequencePositionPresent: false }).checks
        .workBreadcrumbAndContext,
    ).toBe(false);
    expect(
      evaluateWayfindingChecks({ ...PASSING_SNAPSHOT, workPrevNextThumbnailCount: 0 }).checks.workBreadcrumbAndContext,
    ).toBe(false);
    expect(
      evaluateWayfindingChecks({ ...PASSING_SNAPSHOT, territoryDriftPortalPresent: false }).checks.territoryContinuity,
    ).toBe(false);
    expect(
      evaluateWayfindingChecks({ ...PASSING_SNAPSHOT, crossTerritoryLinkPresent: false }).checks.territoryContinuity,
    ).toBe(false);
    expect(
      evaluateWayfindingChecks({ ...PASSING_SNAPSHOT, driftCurrentWorkIndicatorVisible: false }).checks
        .driftGuidedStepping,
    ).toBe(false);
    expect(
      evaluateWayfindingChecks({ ...PASSING_SNAPSHOT, focusPrevNextButtonsVisible: false }).checks
        .focusInPlaceBrowsing,
    ).toBe(false);
  });
});

describe('NavigationAudit persona scoring & fast-check invariants', () => {
  it('scores every persona at 100 on an ideal collision-free report and exposes component breakdowns', () => {
    for (const persona of VisitorPersonas.ALL) {
      const report = buildNavigationReport({
        viewport: persona.primaryViewport,
        pointerKind: persona.pointerKind,
        hudRects: [{ id: 'hud', x: 16, y: 16, width: 120, height: 44 }],
        touchTargets: [{ id: 'cta', width: 48, height: 48 }],
        wayfindingSnapshot: PASSING_SNAPSHOT,
      });

      expect(scorePersona(persona, report)).toBe(100);
      const breakdown = explainPersonaScore(persona, report);
      expect(breakdown.personaId).toBe(persona.id);
      expect(breakdown.total).toBe(100);
      expect(breakdown.passedChecks).toEqual([...WAYFINDING_CHECK_IDS]);
      expect(breakdown.failedChecks).toEqual([]);
      expect(NavigationAudit.scorePersona(persona, report)).toBe(100);
      expect(NavigationAudit.buildReport({
        viewport: persona.primaryViewport,
        pointerKind: persona.pointerKind,
        hudRects: [{ id: 'hud', x: 16, y: 16, width: 120, height: 44 }],
        touchTargets: [{ id: 'cta', width: 48, height: 48 }],
        wayfindingSnapshot: PASSING_SNAPSHOT,
      })).toEqual(report);
    }
  });

  it('penalizes excessive HUD viewport coverage above 25% and handles non-finite adversarial inputs safely', () => {
    const mobilePersona = VisitorPersonas.byId('instagram-mobile');
    const crowdedReport = buildNavigationReport({
      viewport: { width: 375, height: 667 },
      pointerKind: 'coarse',
      hudRects: [{ id: 'giant-help', x: 0, y: 0, width: 375, height: 350 }],
      touchTargets: [{ id: 'cta', width: 48, height: 48 }],
      wayfindingSnapshot: PASSING_SNAPSHOT,
    });
    expect(crowdedReport.hudViewportCoverage).toBeGreaterThan(NavigationAudit.THRESHOLDS.comfortableHudCoverage);
    const crowdedBreakdown = NavigationAudit.explainPersonaScore(mobilePersona, crowdedReport);
    expect(crowdedBreakdown.clearanceScore).toBeLessThan(mobilePersona.ergonomicWeights.viewportClearance);
    expect(crowdedBreakdown.total).toBeLessThan(100);

    const adversarialReport: NavigationAuditReport = {
      hudOverlaps: [{ a: 'x', b: 'y', x: 0, y: 0, width: 10, height: 10, area: Number.NaN }],
      hudViewportCoverage: Number.POSITIVE_INFINITY,
      touchTargets: {
        pointerKind: 'coarse',
        requiredMinPx: 44,
        totalTargets: 1,
        passingTargets: 0,
        wcagPassCount: 0,
        comfortPassCount: 0,
        passRatio: Number.NaN,
        violations: [],
      },
      wayfinding: evaluateWayfindingChecks(BASELINE_SNAPSHOT),
    };
    const score = scorePersona(mobilePersona, adversarialReport);
    expect(Number.isFinite(score)).toBe(true);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  const checksArb = fc.record(
    Object.fromEntries(WAYFINDING_CHECK_IDS.map((id) => [id, fc.boolean()])) as Record<
      WayfindingCheckId,
      fc.Arbitrary<boolean>
    >,
  );

  const overlapArb = fc.record({
    a: fc.constant('hud-a'),
    b: fc.constant('hud-b'),
    x: fc.double({ min: 0, max: 300, noNaN: true, noDefaultInfinity: true }),
    y: fc.double({ min: 0, max: 300, noNaN: true, noDefaultInfinity: true }),
    width: fc.double({ min: 1, max: 300, noNaN: true, noDefaultInfinity: true }),
    height: fc.double({ min: 1, max: 200, noNaN: true, noDefaultInfinity: true }),
    area: fc.double({ min: 1, max: 30_000, noNaN: true, noDefaultInfinity: true }),
  });

  const reportArb: fc.Arbitrary<NavigationAuditReport> = fc
    .tuple(
      fc.array(overlapArb, { maxLength: 4 }),
      fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),
      fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),
      checksArb,
    )
    .map(([hudOverlaps, hudViewportCoverage, passRatio, checks]) => {
      const passedCount = WAYFINDING_CHECK_IDS.filter((id) => checks[id]).length;
      return {
        hudOverlaps,
        hudViewportCoverage,
        touchTargets: {
          pointerKind: 'coarse',
          requiredMinPx: 44,
          totalTargets: 10,
          passingTargets: Math.round(passRatio * 10),
          wcagPassCount: Math.round(passRatio * 10),
          comfortPassCount: Math.round(passRatio * 10),
          passRatio,
          violations: [],
        },
        wayfinding: {
          checks,
          passedCount,
          totalCount: WAYFINDING_CHECK_IDS.length,
        },
      };
    });

  it('property: scorePersona is bounded in [0, 100] and strictly/weakly monotonic across checks, collisions, clearance, and touch targets', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...VisitorPersonas.ALL),
        reportArb,
        fc.constantFrom(...WAYFINDING_CHECK_IDS),
        fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),
        (persona, report, checkToResolve, delta) => {
          const base = scorePersona(persona, report);
          expect(base).toBeGreaterThanOrEqual(0);
          expect(base).toBeLessThanOrEqual(100);

          // 1. Resolving any wayfinding check failure never decreases score (and strictly increases when previously false).
          const nextChecks = { ...report.wayfinding.checks, [checkToResolve]: true };
          const withResolvedCheck: NavigationAuditReport = {
            ...report,
            wayfinding: {
              checks: nextChecks,
              passedCount: WAYFINDING_CHECK_IDS.filter((id) => nextChecks[id]).length,
              totalCount: WAYFINDING_CHECK_IDS.length,
            },
          };
          const afterCheck = scorePersona(persona, withResolvedCheck);
          if (!report.wayfinding.checks[checkToResolve]) {
            expect(afterCheck).toBeGreaterThan(base);
          } else {
            expect(afterCheck).toBe(base);
          }

          // 2. Removing a HUD collision never decreases score.
          const fewerOverlaps: NavigationAuditReport = {
            ...report,
            hudOverlaps: report.hudOverlaps.slice(1),
          };
          expect(scorePersona(persona, fewerOverlaps)).toBeGreaterThanOrEqual(base);

          // 3. Reducing HUD viewport occlusion never decreases score.
          const lowerCoverage: NavigationAuditReport = {
            ...report,
            hudViewportCoverage: report.hudViewportCoverage * delta,
          };
          expect(scorePersona(persona, lowerCoverage)).toBeGreaterThanOrEqual(base);

          // 4. Improving touch-target pass ratio never decreases score.
          const improvedPassRatio = report.touchTargets.passRatio + (1 - report.touchTargets.passRatio) * delta;
          const betterTargets: NavigationAuditReport = {
            ...report,
            touchTargets: { ...report.touchTargets, passRatio: improvedPassRatio },
          };
          expect(scorePersona(persona, betterTargets)).toBeGreaterThanOrEqual(base);
        },
      ),
    );
  });
});

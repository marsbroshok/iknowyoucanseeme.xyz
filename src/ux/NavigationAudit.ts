import {
  WAYFINDING_CHECK_IDS,
  type PersonaId,
  type PointerKind,
  type VisitorPersona,
  type WayfindingCheckId,
} from './VisitorPersonas.js';

/** Ergonomic and spatial thresholds governing UX scoring and WCAG target checks. */
export const UX_THRESHOLDS = {
  /** WCAG 2.5.8 Level AA minimum target size in CSS pixels. */
  wcagMinTargetPx: 24,
  /** Coarse-pointer thumb comfort target size in CSS pixels (WCAG 2.5.5 / Apple HIG). */
  coarseComfortTargetPx: 44,
  /** Maximum fraction of viewport area HUD chrome may cover before incurring clearance penalties. */
  comfortableHudCoverage: 0.25,
  /** Span above `comfortableHudCoverage` over which HUD clearance score linearly reaches zero. */
  maxHudCoverageSpan: 0.4,
  /** Fractional collision penalty per distinct pair of overlapping HUD containers. */
  overlapCountPenalty: 0.3,
  /** Overlap area in square CSS pixels corresponding to a full collision penalty. */
  overlapAreaDivisorPx: 10_000,
} as const;

/** Viewport dimensions in CSS pixels. */
export interface ViewportSize {
  /** Viewport width in CSS pixels. */
  readonly width: number;
  /** Viewport height in CSS pixels. */
  readonly height: number;
}

/** Axis-aligned DOM bounding rectangle identified by semantic control or container id. */
export interface NamedRect {
  /** Identifier of the measured UI element. */
  readonly id: string;
  /** Left coordinate in CSS pixels relative to the viewport. */
  readonly x: number;
  /** Top coordinate in CSS pixels relative to the viewport. */
  readonly y: number;
  /** Horizontal span in CSS pixels. */
  readonly width: number;
  /** Vertical span in CSS pixels. */
  readonly height: number;
}

/** Non-empty interior intersection between two UI bounding boxes. */
export interface RectOverlap {
  /** First colliding element identifier. */
  readonly a: string;
  /** Second colliding element identifier. */
  readonly b: string;
  /** Intersection left coordinate in CSS pixels. */
  readonly x: number;
  /** Intersection top coordinate in CSS pixels. */
  readonly y: number;
  /** Intersection width in CSS pixels (`> 0`). */
  readonly width: number;
  /** Intersection height in CSS pixels (`> 0`). */
  readonly height: number;
  /** Intersection area in square CSS pixels (`width * height`). */
  readonly area: number;
}

/** Measured dimensions of an interactive link or button control. */
export interface TouchTargetSample {
  /** Identifier of the interactive control. */
  readonly id: string;
  /** Rendered width in CSS pixels. */
  readonly width: number;
  /** Rendered height in CSS pixels. */
  readonly height: number;
}

/** Diagnostic record for an interactive control below pointer target-size thresholds. */
export interface TouchTargetViolation {
  /** Identifier of the undersized interactive control. */
  readonly id: string;
  /** Rendered width in CSS pixels. */
  readonly width: number;
  /** Rendered height in CSS pixels. */
  readonly height: number;
  /** Required minimum dimension in CSS pixels (`24` fine, `44` coarse). */
  readonly requiredMinPx: number;
  /** Whether the control satisfies WCAG 2.5.8 AA (`>= 24x24` CSS px). */
  readonly meetsWcagMinimum: boolean;
  /** Whether the control satisfies the active pointer comfort size. */
  readonly meetsPointerComfort: boolean;
}

/** Aggregated target-size ergonomics result across a set of interactive controls. */
export interface TouchTargetAuditResult {
  /** Pointer precision profile used for evaluation. */
  readonly pointerKind: PointerKind;
  /** Minimum target dimension required for full comfort (`24` or `44` CSS px). */
  readonly requiredMinPx: number;
  /** Total interactive controls inspected. */
  readonly totalTargets: number;
  /** Number of controls meeting `requiredMinPx` in both axes. */
  readonly passingTargets: number;
  /** Number of controls meeting WCAG 2.5.8 AA (`>= 24x24` CSS px). */
  readonly wcagPassCount: number;
  /** Number of controls meeting pointer comfort (`>= requiredMinPx`). */
  readonly comfortPassCount: number;
  /** Fraction of controls passing pointer comfort in `[0, 1]` (`1` when `totalTargets === 0`). */
  readonly passRatio: number;
  /** Controls failing `requiredMinPx` in width or height. */
  readonly violations: readonly TouchTargetViolation[];
}

/** Empirical browser telemetry feeding the 8 cross-site wayfinding checks (FR1). */
export interface WayfindingSnapshot {
  /** Whether non-Home Awake routes render a direct Drift portal link in the global header. */
  readonly nonHomeDriftHeaderLinkPresent: boolean;
  /** Clicks needed from a non-Home Awake route to enter the Drift when stored mode is `'awake'`. */
  readonly awakeModeDriftClicksFromNonHome: number;
  /** Whether the Works index offers a 1-click reset control clearing `#territory` `:target` isolation. */
  readonly worksFilterResetControlPresent: boolean;
  /** Visible work cards on Works index after activating a territory filter and clicking reset (or while targeted if absent). */
  readonly worksCountRestoredAfterReset: number;
  /** Total catalogued works expected when unfiltered (`40`). */
  readonly totalCataloguedWorks: number;
  /** Count of zero-JS medium filter controls distinguishing photographs and ceramics. */
  readonly mediumFilterControlCount: number;
  /** Whether Work pages surface a top-of-page hierarchy breadcrumb (`Works -> Territory -> Zone`). */
  readonly workBreadcrumbPresent: boolean;
  /** Whether Work pages display the work's `i / N` sequence position within its territory. */
  readonly workSequencePositionPresent: boolean;
  /** Count of visual thumbnail images inside a Work page's `Previous / Next` navigation. */
  readonly workPrevNextThumbnailCount: number;
  /** Count of in-page `#zone-*` jump links on a zoned Territory page. */
  readonly territoryZoneJumpCount: number;
  /** Whether Territory pages include a direct portal link into the 3D Drift world. */
  readonly territoryDriftPortalPresent: boolean;
  /** Whether Territory pages offer a continuation link to the sibling territory. */
  readonly crossTerritoryLinkPresent: boolean;
  /** Whether clicking `Wake up` from a settled/deep-linked work (`/?w=<slug>`) preserves a visible link to that work's Awake page. */
  readonly wakePreservesSettledWorkLink: boolean;
  /** Whether the Drift HUD renders visible clickable/tappable `Previous` and `Next` work glide buttons. */
  readonly driftPrevNextButtonsVisible: boolean;
  /** Whether the Drift HUD renders a visible `Current (i / N)` work indicator/button. */
  readonly driftCurrentWorkIndicatorVisible: boolean;
  /** Whether the Drift HUD renders a visible 1-tap/click camera Lens indicator & cycle button. */
  readonly driftLensCycleButtonVisible: boolean;
  /** Whether `FocusOverlay` displays curatorial metadata (year, dimensions/medium, availability). */
  readonly focusCuratorialMetaVisible: boolean;
  /** Whether `FocusOverlay` exposes in-dialog `Previous` and `Next` work stepping buttons. */
  readonly focusPrevNextButtonsVisible: boolean;
}

/** Evaluation outcome of the 8 cross-site wayfinding capability checks. */
export interface WayfindingAuditResult {
  /** Pass/fail map keyed by canonical check identifier. */
  readonly checks: Readonly<Record<WayfindingCheckId, boolean>>;
  /** Count of passing wayfinding checks (`0..8`). */
  readonly passedCount: number;
  /** Total wayfinding checks evaluated (`8`). */
  readonly totalCount: number;
}

/** Combined ergonomic and wayfinding audit report consumed by `scorePersona`. */
export interface NavigationAuditReport {
  /** Pairwise interior bounding-box collisions among visible HUD containers. */
  readonly hudOverlaps: readonly RectOverlap[];
  /** Union fraction of viewport area covered by HUD containers in `[0, 1]`. */
  readonly hudViewportCoverage: number;
  /** Interactive target-size audit result for the active pointer profile. */
  readonly touchTargets: TouchTargetAuditResult;
  /** Evaluation of the 8 cross-layer wayfinding capabilities. */
  readonly wayfinding: WayfindingAuditResult;
}

/** Raw browser measurements used to construct a `NavigationAuditReport`. */
export interface NavigationAuditInput {
  /** Active viewport dimensions in CSS pixels. */
  readonly viewport: ViewportSize;
  /** Active pointer precision class. */
  readonly pointerKind: PointerKind;
  /** Visible HUD chrome bounding boxes measured on the Drift layer. */
  readonly hudRects: readonly NamedRect[];
  /** Interactive link/button target dimensions sampled across audited views. */
  readonly touchTargets: readonly TouchTargetSample[];
  /** Cross-site wayfinding capability observations. */
  readonly wayfindingSnapshot: WayfindingSnapshot;
}

/** Detailed component breakdown of a persona's `0-100` UX score. */
export interface PersonaScoreBreakdown {
  /** Evaluated persona identifier. */
  readonly personaId: PersonaId;
  /** Bounded overall UX score in `[0, 100]` rounded to hundredths. */
  readonly total: number;
  /** Points earned for collision-free HUD layout. */
  readonly collisionScore: number;
  /** Points earned for unobstructed viewport clearance. */
  readonly clearanceScore: number;
  /** Points earned for pointer-appropriate target dimensions. */
  readonly touchTargetScore: number;
  /** Points earned across the 8 weighted wayfinding capabilities. */
  readonly wayfindingScore: number;
  /** Wayfinding checks currently satisfied. */
  readonly passedChecks: readonly WayfindingCheckId[];
  /** Wayfinding checks currently failing. */
  readonly failedChecks: readonly WayfindingCheckId[];
}

interface ClippedBox {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

function clampUnit(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function roundHundredths(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Detects pairwise interior intersections among axis-aligned UI bounding boxes.
 * Boxes that merely touch along an edge or have non-positive width/height produce no overlap.
 *
 * @param rects - Named UI bounding rectangles.
 * @returns Ordered list of strictly positive pairwise overlaps.
 */
export function detectRectOverlaps(rects: readonly NamedRect[]): RectOverlap[] {
  const valid = rects.filter((rect) => rect.width > 0 && rect.height > 0);
  const overlaps: RectOverlap[] = [];
  for (let i = 0; i < valid.length; i++) {
    const a = valid[i];
    for (let j = i + 1; j < valid.length; j++) {
      const b = valid[j];
      const left = Math.max(a.x, b.x);
      const top = Math.max(a.y, b.y);
      const right = Math.min(a.x + a.width, b.x + b.width);
      const bottom = Math.min(a.y + a.height, b.y + b.height);
      const width = right - left;
      const height = bottom - top;
      if (width > 0 && height > 0) {
        overlaps.push({
          a: a.id,
          b: b.id,
          x: left,
          y: top,
          width,
          height,
          area: width * height,
        });
      }
    }
  }
  return overlaps;
}

/**
 * Computes the exact geometric union area of `rects` clipped to `viewport`,
 * divided by `viewport.width * viewport.height` (never double-counting overlapping chrome).
 *
 * @param rects - HUD or chrome bounding boxes.
 * @param viewport - Viewport width and height in CSS pixels.
 * @returns Clipped union coverage ratio in `[0, 1]`.
 */
export function viewportCoverageRatio(rects: readonly NamedRect[], viewport: ViewportSize): number {
  if (viewport.width <= 0 || viewport.height <= 0) return 0;
  const clipped: ClippedBox[] = [];
  for (const rect of rects) {
    if (rect.width <= 0 || rect.height <= 0) continue;
    const x0 = Math.min(viewport.width, Math.max(0, rect.x));
    const y0 = Math.min(viewport.height, Math.max(0, rect.y));
    const x1 = Math.min(viewport.width, Math.max(0, rect.x + rect.width));
    const y1 = Math.min(viewport.height, Math.max(0, rect.y + rect.height));
    if (x1 > x0 && y1 > y0) {
      clipped.push({ x0, y0, x1, y1 });
    }
  }
  if (clipped.length === 0) return 0;

  const xs = [...new Set(clipped.flatMap((box) => [box.x0, box.x1]))].sort((a, b) => a - b);
  let unionArea = 0;

  for (let i = 0; i < xs.length - 1; i++) {
    const stripLeft = xs[i];
    const stripRight = xs[i + 1];
    const stripWidth = stripRight - stripLeft;
    const intervals = clipped
      .filter((box) => box.x0 <= stripLeft && box.x1 >= stripRight)
      .map((box) => [box.y0, box.y1] as const)
      .sort((a, b) => a[0] - b[0]);

    let coveredY = 0;
    let currentStart = -1;
    let currentEnd = -1;
    for (const [y0, y1] of intervals) {
      if (currentEnd < 0) {
        currentStart = y0;
        currentEnd = y1;
      } else if (y0 <= currentEnd) {
        currentEnd = Math.max(currentEnd, y1);
      } else {
        coveredY += currentEnd - currentStart;
        currentStart = y0;
        currentEnd = y1;
      }
    }
    if (currentEnd >= 0) {
      coveredY += currentEnd - currentStart;
    }
    unionArea += stripWidth * coveredY;
  }

  return Math.min(1, Math.max(0, unionArea / (viewport.width * viewport.height)));
}

/**
 * Audits interactive target dimensions against WCAG 2.5.8 Level AA (`24x24` CSS px)
 * and coarse-pointer thumb ergonomics (`44x44` CSS px on touch devices).
 *
 * @param targets - Sampled interactive control dimensions.
 * @param pointerKind - `'fine'` (desktop mouse/keyboard) or `'coarse'` (mobile/tablet touch).
 * @returns Pass counts, pass ratio, and any undersized control violations.
 */
export function auditTouchTargets(
  targets: readonly TouchTargetSample[],
  pointerKind: PointerKind,
): TouchTargetAuditResult {
  const requiredMinPx =
    pointerKind === 'coarse'
      ? UX_THRESHOLDS.coarseComfortTargetPx
      : UX_THRESHOLDS.wcagMinTargetPx;

  let wcagPassCount = 0;
  let comfortPassCount = 0;
  const violations: TouchTargetViolation[] = [];

  for (const target of targets) {
    const meetsWcagMinimum =
      target.width >= UX_THRESHOLDS.wcagMinTargetPx &&
      target.height >= UX_THRESHOLDS.wcagMinTargetPx;
    const meetsPointerComfort =
      target.width >= requiredMinPx && target.height >= requiredMinPx;

    if (meetsWcagMinimum) wcagPassCount++;
    if (meetsPointerComfort) {
      comfortPassCount++;
    } else {
      violations.push({
        id: target.id,
        width: target.width,
        height: target.height,
        requiredMinPx,
        meetsWcagMinimum,
        meetsPointerComfort,
      });
    }
  }

  const totalTargets = targets.length;
  const passRatio = totalTargets === 0 ? 1 : comfortPassCount / totalTargets;

  return {
    pointerKind,
    requiredMinPx,
    totalTargets,
    passingTargets: comfortPassCount,
    wcagPassCount,
    comfortPassCount,
    passRatio,
    violations,
  };
}

/**
 * Evaluates the 8 concrete cross-site navigation capabilities from empirical DOM observations.
 *
 * @param snapshot - Observed Awake and Drift wayfinding telemetry.
 * @returns Boolean pass map and aggregate pass count across all 8 capabilities.
 */
export function evaluateWayfindingChecks(snapshot: WayfindingSnapshot): WayfindingAuditResult {
  const checks: Record<WayfindingCheckId, boolean> = {
    globalDriftEntry:
      snapshot.nonHomeDriftHeaderLinkPresent &&
      snapshot.awakeModeDriftClicksFromNonHome === 1,
    reversibleWorksFilter:
      snapshot.worksFilterResetControlPresent &&
      snapshot.totalCataloguedWorks > 0 &&
      snapshot.worksCountRestoredAfterReset === snapshot.totalCataloguedWorks &&
      snapshot.mediumFilterControlCount >= 2,
    workBreadcrumbAndContext:
      snapshot.workBreadcrumbPresent &&
      snapshot.workSequencePositionPresent &&
      snapshot.workPrevNextThumbnailCount >= 1,
    territoryContinuity:
      snapshot.territoryZoneJumpCount >= 3 &&
      snapshot.territoryDriftPortalPresent &&
      snapshot.crossTerritoryLinkPresent,
    awakeWakeContinuity: snapshot.wakePreservesSettledWorkLink,
    driftGuidedStepping:
      snapshot.driftPrevNextButtonsVisible &&
      snapshot.driftCurrentWorkIndicatorVisible,
    tactileLensControl: snapshot.driftLensCycleButtonVisible,
    focusInPlaceBrowsing:
      snapshot.focusCuratorialMetaVisible &&
      snapshot.focusPrevNextButtonsVisible,
  };

  const passedCount = WAYFINDING_CHECK_IDS.filter((id) => checks[id]).length;
  return {
    checks,
    passedCount,
    totalCount: WAYFINDING_CHECK_IDS.length,
  };
}

/**
 * Assembles a complete `NavigationAuditReport` from raw viewport, HUD, target, and wayfinding measurements.
 *
 * @param input - Raw empirical measurements for a viewport/pointer posture.
 * @returns Evaluated navigation audit report.
 */
export function buildNavigationReport(input: NavigationAuditInput): NavigationAuditReport {
  return {
    hudOverlaps: detectRectOverlaps(input.hudRects),
    hudViewportCoverage: viewportCoverageRatio(input.hudRects, input.viewport),
    touchTargets: auditTouchTargets(input.touchTargets, input.pointerKind),
    wayfinding: evaluateWayfindingChecks(input.wayfindingSnapshot),
  };
}

/**
 * Computes a persona's bounded `0-100` UX score together with per-pillar diagnostics.
 * Monotonicity invariant: resolving any wayfinding check failure, removing or shrinking
 * any HUD collision, lowering HUD occlusion, or increasing touch-target pass ratio never
 * decreases any persona's score.
 *
 * @param persona - Sociological visitor persona and rubric weights.
 * @param report - Empirical navigation audit report.
 * @returns Full score breakdown with `total` in `[0, 100]`.
 */
export function explainPersonaScore(
  persona: VisitorPersona,
  report: NavigationAuditReport,
): PersonaScoreBreakdown {
  const overlapArea = report.hudOverlaps.reduce(
    (sum, item) => sum + (Number.isFinite(item.area) ? Math.max(0, item.area) : UX_THRESHOLDS.overlapAreaDivisorPx),
    0,
  );
  const collisionSeverity = Math.min(
    1,
    report.hudOverlaps.length * UX_THRESHOLDS.overlapCountPenalty +
      overlapArea / UX_THRESHOLDS.overlapAreaDivisorPx,
  );
  const collisionFactor = 1 - collisionSeverity;

  const clampedCoverage = Number.isFinite(report.hudViewportCoverage)
    ? clampUnit(report.hudViewportCoverage)
    : 1;
  const coverageExcess = Math.max(0, clampedCoverage - UX_THRESHOLDS.comfortableHudCoverage);
  const clearanceFactor = Math.max(0, 1 - coverageExcess / UX_THRESHOLDS.maxHudCoverageSpan);

  const touchTargetFactor = clampUnit(report.touchTargets.passRatio);

  const collisionScore = persona.ergonomicWeights.hudCollisionFree * collisionFactor;
  const clearanceScore = persona.ergonomicWeights.viewportClearance * clearanceFactor;
  const touchTargetScore = persona.ergonomicWeights.touchTargetComfort * touchTargetFactor;

  const passedChecks: WayfindingCheckId[] = [];
  const failedChecks: WayfindingCheckId[] = [];
  let wayfindingScore = 0;

  for (const checkId of WAYFINDING_CHECK_IDS) {
    if (report.wayfinding.checks[checkId]) {
      passedChecks.push(checkId);
      wayfindingScore += persona.wayfindingWeights[checkId];
    } else {
      failedChecks.push(checkId);
    }
  }

  const rawTotal = collisionScore + clearanceScore + touchTargetScore + wayfindingScore;
  const total = Math.min(100, Math.max(0, roundHundredths(rawTotal)));

  return {
    personaId: persona.id,
    total,
    collisionScore: roundHundredths(collisionScore),
    clearanceScore: roundHundredths(clearanceScore),
    touchTargetScore: roundHundredths(touchTargetScore),
    wayfindingScore: roundHundredths(wayfindingScore),
    passedChecks,
    failedChecks,
  };
}

/**
 * Computes a bounded `0-100` UX score for `persona` given `report`.
 *
 * @param persona - Sociological visitor persona.
 * @param report - Empirical navigation audit report.
 * @returns Score in `[0, 100]`.
 */
export function scorePersona(persona: VisitorPersona, report: NavigationAuditReport): number {
  return explainPersonaScore(persona, report).total;
}

/**
 * Pure UX ergonomics and cross-layer wayfinding audit engine (FR1).
 * Evaluates HUD collisions, viewport chrome coverage, WCAG 2.5.8 / coarse-pointer
 * touch targets, 8 cross-site wayfinding capabilities, and monotonic persona scores.
 */
export class NavigationAudit {
  /** Ergonomic constants used across geometry, target, and scoring evaluations. */
  static readonly THRESHOLDS = UX_THRESHOLDS;
  /** Pairwise HUD bounding-box overlap detector. */
  static readonly detectRectOverlaps = detectRectOverlaps;
  /** Exact union viewport chrome coverage calculator. */
  static readonly viewportCoverageRatio = viewportCoverageRatio;
  /** Pointer-aware WCAG / mobile thumb touch-target auditor. */
  static readonly auditTouchTargets = auditTouchTargets;
  /** 8-capability cross-layer wayfinding evaluator. */
  static readonly evaluateWayfindingChecks = evaluateWayfindingChecks;
  /** Composite report builder from raw viewport, HUD, target, and wayfinding telemetry. */
  static readonly buildReport = buildNavigationReport;
  /** Detailed per-pillar persona score breakdown calculator. */
  static readonly explainPersonaScore = explainPersonaScore;
  /** Bounded `0-100` monotonic persona UX scorer. */
  static readonly scorePersona = scorePersona;
}

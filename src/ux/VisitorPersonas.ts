import type { Locale } from '../i18n/RouteMap.js';

/** Canonical identifiers for the 7 sociological visitor archetypes (FR1). */
export const PERSONA_IDS = [
  'curator',
  'instagram-mobile',
  'collector',
  'peer-artist',
  'gallery-qr',
  'non-gamer',
  'keyboard-a11y',
] as const;

/** Identifier of a modelled sociological visitor archetype. */
export type PersonaId = (typeof PERSONA_IDS)[number];

/** Canonical identifiers for the 8 cross-site wayfinding capability checks (FR1). */
export const WAYFINDING_CHECK_IDS = [
  'globalDriftEntry',
  'reversibleWorksFilter',
  'workBreadcrumbAndContext',
  'territoryContinuity',
  'awakeWakeContinuity',
  'driftGuidedStepping',
  'tactileLensControl',
  'focusInPlaceBrowsing',
] as const;

/** Identifier of a cross-layer wayfinding capability check. */
export type WayfindingCheckId = (typeof WAYFINDING_CHECK_IDS)[number];

/** CSS pointer precision profile used for WCAG 2.5.8 vs coarse thumb target checks. */
export type PointerKind = 'fine' | 'coarse';

/** Device class typically inhabited by a visitor archetype. */
export type DeviceFormFactor = 'desktop' | 'tablet' | 'mobile';

/** Familiarity with 3D spatial navigation, drag-to-move inertia, and hidden keybindings. */
export type SpatialLiteracy = 'none' | 'low' | 'moderate' | 'high';

/** Primary physical interaction channel of a visitor archetype. */
export type InputModality =
  | 'mouse-trackpad'
  | 'touch-thumb'
  | 'touch-tablet'
  | 'mouse-only'
  | 'keyboard-assistive';

/** Named CSS pixel viewport dimensions used during browser telemetry runs. */
export interface ViewportSpec {
  /** Viewport width in CSS pixels. */
  readonly width: number;
  /** Viewport height in CSS pixels. */
  readonly height: number;
  /** Human-readable device/viewport descriptor. */
  readonly label: string;
}

/** Point budget allocated to layout collision, canvas clearance, and target sizing. */
export interface ErgonomicWeights {
  /** Points awarded when HUD chrome exhibits zero bounding-box collisions. */
  readonly hudCollisionFree: number;
  /** Points awarded when HUD chrome leaves at least 75% of the viewport unobstructed. */
  readonly viewportClearance: number;
  /** Points awarded proportionally to interactive targets meeting pointer comfort thresholds. */
  readonly touchTargetComfort: number;
}

/** Sociological profile, viewport/pointer posture, goals, and 100-point UX rubric weights. */
export interface VisitorPersona {
  /** Stable kebab-case persona key. */
  readonly id: PersonaId;
  /** Concise curatorial/sociological title. */
  readonly title: string;
  /** Sociological context describing cultural habits, time pressure, and expectations. */
  readonly sociologicalSummary: string;
  /** Site locales regularly used by this visitor segment. */
  readonly locales: readonly Locale[];
  /** Primary device form factor. */
  readonly formFactor: DeviceFormFactor;
  /** Pointer precision class governing target size ergonomics. */
  readonly pointerKind: PointerKind;
  /** Primary input modality. */
  readonly inputModality: InputModality;
  /** Familiarity with 3D WebGL navigation conventions. */
  readonly spatialLiteracy: SpatialLiteracy;
  /** Primary viewport measured in the empirical browser survey. */
  readonly primaryViewport: ViewportSpec;
  /** Additional viewports exercised by this visitor segment. */
  readonly secondaryViewports: readonly ViewportSpec[];
  /** Concrete visit goals that navigation must support without friction. */
  readonly primaryGoals: readonly string[];
  /** Ergonomic point weights (summing with `wayfindingWeights` to 100). */
  readonly ergonomicWeights: ErgonomicWeights;
  /** Wayfinding capability point weights (summing with `ergonomicWeights` to 100). */
  readonly wayfindingWeights: Readonly<Record<WayfindingCheckId, number>>;
}

const PERSONA_LIST: readonly VisitorPersona[] = [
  {
    id: 'curator',
    title: 'Contemporary Art Curator & Open-Call Juror',
    sociologicalSummary:
      'Pressed French contemporary art curator or residency juror reviewing 30–60 artist dossiers in one sitting (~90 seconds per artist) on a studio laptop.',
    locales: ['fr'],
    formFactor: 'desktop',
    pointerKind: 'fine',
    inputModality: 'mouse-trackpad',
    spatialLiteracy: 'moderate',
    primaryViewport: { width: 1440, height: 900, label: 'Desktop 1440×900' },
    secondaryViewports: [{ width: 1920, height: 1080, label: 'Desktop 1920×1080' }],
    primaryGoals: [
      'Scan the full body of 40 works and isolate photography vs ceramics without losing index context',
      'Read exhibition statements, dimensions, mediums, and exhibition history within 90 seconds',
      'Step rapidly across a series and enter the 3D Drift from any dossier page in one click',
    ],
    ergonomicWeights: {
      hudCollisionFree: 6,
      viewportClearance: 6,
      touchTargetComfort: 12,
    },
    wayfindingWeights: {
      globalDriftEntry: 10,
      reversibleWorksFilter: 16,
      workBreadcrumbAndContext: 16,
      territoryContinuity: 12,
      awakeWakeContinuity: 6,
      driftGuidedStepping: 4,
      tactileLensControl: 2,
      focusInPlaceBrowsing: 10,
    },
  },
  {
    id: 'instagram-mobile',
    title: 'Mobile Social Follower (Instagram Link-in-Bio)',
    sociologicalSummary:
      'Visual-arts follower arriving from an Instagram story or profile link on an iPhone held one-handed, expecting immediate immersion and effortless thumb-driven exploration.',
    locales: ['en', 'fr'],
    formFactor: 'mobile',
    pointerKind: 'coarse',
    inputModality: 'touch-thumb',
    spatialLiteracy: 'moderate',
    primaryViewport: { width: 390, height: 844, label: 'iPhone 390×844' },
    secondaryViewports: [{ width: 375, height: 667, label: 'iPhone SE 375×667' }],
    primaryGoals: [
      'Enter Dreamland cleanly on a narrow portrait screen without overlapping HUD text',
      'Glide from work to work and trigger camera lens effects with one thumb tap',
      'Share or inspect individual works without cramped inline links',
    ],
    ergonomicWeights: {
      hudCollisionFree: 16,
      viewportClearance: 10,
      touchTargetComfort: 18,
    },
    wayfindingWeights: {
      globalDriftEntry: 8,
      reversibleWorksFilter: 4,
      workBreadcrumbAndContext: 4,
      territoryContinuity: 4,
      awakeWakeContinuity: 6,
      driftGuidedStepping: 12,
      tactileLensControl: 10,
      focusInPlaceBrowsing: 8,
    },
  },
  {
    id: 'collector',
    title: 'Collector & Patron Evaluating Physical Works',
    sociologicalSummary:
      'Art collector or patron browsing on an iPad or desktop display to inspect print dimensions, ceramic materiality, series context, and inquiry availability.',
    locales: ['fr', 'en'],
    formFactor: 'tablet',
    pointerKind: 'coarse',
    inputModality: 'touch-tablet',
    spatialLiteracy: 'low',
    primaryViewport: { width: 820, height: 1180, label: 'Tablet 820×1180' },
    secondaryViewports: [{ width: 1440, height: 900, label: 'Desktop 1440×900' }],
    primaryGoals: [
      'Filter between pigment prints and ceramic sculptures and return to the full catalogue effortlessly',
      'Inspect physical dimensions, year, medium, and availability inside both FocusOverlay and Work pages',
      'Browse adjacent works in place before submitting an availability inquiry',
    ],
    ergonomicWeights: {
      hudCollisionFree: 8,
      viewportClearance: 8,
      touchTargetComfort: 16,
    },
    wayfindingWeights: {
      globalDriftEntry: 6,
      reversibleWorksFilter: 14,
      workBreadcrumbAndContext: 14,
      territoryContinuity: 6,
      awakeWakeContinuity: 6,
      driftGuidedStepping: 6,
      tactileLensControl: 2,
      focusInPlaceBrowsing: 14,
    },
  },
  {
    id: 'peer-artist',
    title: 'Fellow Photographer & Ceramic Artist',
    sociologicalSummary:
      'Practicing visual artist exploring how optical camera interventions (ICM, mirror folds, colour gels, multiple exposure) converse with unfired clay and glazed ceramic forms.',
    locales: ['en'],
    formFactor: 'desktop',
    pointerKind: 'fine',
    inputModality: 'mouse-trackpad',
    spatialLiteracy: 'high',
    primaryViewport: { width: 1440, height: 900, label: 'Desktop 1440×900' },
    secondaryViewports: [{ width: 1920, height: 1080, label: 'Desktop 1920×1080' }],
    primaryGoals: [
      'Discover and cycle all six optical camera lenses over works without hunting for hidden keybindings',
      'Compare photographic landscapes against Leak-zone ceramic specimens across territories',
      'Move fluidly between curatorial statements on Territory pages and spatial zones in the Drift',
    ],
    ergonomicWeights: {
      hudCollisionFree: 8,
      viewportClearance: 10,
      touchTargetComfort: 10,
    },
    wayfindingWeights: {
      globalDriftEntry: 8,
      reversibleWorksFilter: 12,
      workBreadcrumbAndContext: 8,
      territoryContinuity: 10,
      awakeWakeContinuity: 6,
      driftGuidedStepping: 6,
      tactileLensControl: 14,
      focusInPlaceBrowsing: 8,
    },
  },
  {
    id: 'gallery-qr',
    title: 'Physical Exhibition QR Wall-Label Visitor',
    sociologicalSummary:
      'Gallery visitor standing in front of a framed print or ceramic piece who scans its wall QR code on a phone to read its fragment, hear the zone ambience, or see surrounding works.',
    locales: ['fr'],
    formFactor: 'mobile',
    pointerKind: 'coarse',
    inputModality: 'touch-thumb',
    spatialLiteracy: 'low',
    primaryViewport: { width: 390, height: 844, label: 'iPhone 390×844' },
    secondaryViewports: [{ width: 375, height: 667, label: 'iPhone SE 375×667' }],
    primaryGoals: [
      'Land on a specific work via QR code and switch between its Drift view and Awake detail page without losing the work',
      'Step to neighbouring works in the same exhibition zone with one thumb',
      'Read mobile HUD controls clearly without French button labels colliding with help text',
    ],
    ergonomicWeights: {
      hudCollisionFree: 14,
      viewportClearance: 10,
      touchTargetComfort: 16,
    },
    wayfindingWeights: {
      globalDriftEntry: 8,
      reversibleWorksFilter: 4,
      workBreadcrumbAndContext: 10,
      territoryContinuity: 4,
      awakeWakeContinuity: 12,
      driftGuidedStepping: 10,
      tactileLensControl: 4,
      focusInPlaceBrowsing: 8,
    },
  },
  {
    id: 'non-gamer',
    title: 'Non-Gamer Cultural Visitor & Exhibition Goer',
    sociologicalSummary:
      'Museum-going art reader using a desktop mouse who appreciates atmospheric presentation but does not intuit 3D canvas dragging, raycast hunting, or keyboard-only shortcuts.',
    locales: ['en', 'fr'],
    formFactor: 'desktop',
    pointerKind: 'fine',
    inputModality: 'mouse-only',
    spatialLiteracy: 'none',
    primaryViewport: { width: 1440, height: 900, label: 'Desktop 1440×900' },
    secondaryViewports: [{ width: 1920, height: 1080, label: 'Desktop 1920×1080' }],
    primaryGoals: [
      'Advance through works in the 3D Drift via explicit Previous / Current / Next buttons using only a mouse click',
      'Try optical lens effects via a visible clickable control rather than an memorised keyboard letter',
      'Return to plain HTML pages or re-enter the Drift from any section without getting stranded in filtered sub-views',
    ],
    ergonomicWeights: {
      hudCollisionFree: 10,
      viewportClearance: 8,
      touchTargetComfort: 12,
    },
    wayfindingWeights: {
      globalDriftEntry: 10,
      reversibleWorksFilter: 8,
      workBreadcrumbAndContext: 8,
      territoryContinuity: 6,
      awakeWakeContinuity: 6,
      driftGuidedStepping: 14,
      tactileLensControl: 10,
      focusInPlaceBrowsing: 8,
    },
  },
  {
    id: 'keyboard-a11y',
    title: 'Keyboard-Only, Screen-Reader & Motion-Sensitive Visitor',
    sociologicalSummary:
      'Visitor navigating exclusively via Tab/Arrow/Enter keys, assistive speech output, or intentional Wake up transitions away from continuous WebGL motion (ADR 0009).',
    locales: ['en', 'fr'],
    formFactor: 'desktop',
    pointerKind: 'fine',
    inputModality: 'keyboard-assistive',
    spatialLiteracy: 'moderate',
    primaryViewport: { width: 1440, height: 900, label: 'Desktop 1440×900' },
    secondaryViewports: [{ width: 390, height: 844, label: 'Mobile 390×844' }],
    primaryGoals: [
      'Opt out via Wake up from any deep-linked or settled work and immediately reach that work on the Awake layer',
      'Traverse semantic breadcrumbs, reversible zero-JS filters, and WCAG 2.5.8 target sizes across all routes',
      'Step across works inside FocusOverlay or the Drift HUD with predictable focus order preserving Tab × 3',
    ],
    ergonomicWeights: {
      hudCollisionFree: 10,
      viewportClearance: 6,
      touchTargetComfort: 14,
    },
    wayfindingWeights: {
      globalDriftEntry: 10,
      reversibleWorksFilter: 10,
      workBreadcrumbAndContext: 10,
      territoryContinuity: 8,
      awakeWakeContinuity: 12,
      driftGuidedStepping: 8,
      tactileLensControl: 4,
      focusInPlaceBrowsing: 8,
    },
  },
];

const PERSONA_BY_ID: Readonly<Record<PersonaId, VisitorPersona>> = Object.fromEntries(
  PERSONA_LIST.map((persona) => [persona.id, persona]),
) as Record<PersonaId, VisitorPersona>;

/**
 * Registry of the 7 sociological visitor personas used to audit ergonomics,
 * wayfinding continuity, and cross-layer navigation across `iknowyoucanseeme.xyz`.
 */
export class VisitorPersonas {
  /** Ordered catalogue of all 7 visitor personas. */
  static readonly ALL: readonly VisitorPersona[] = PERSONA_LIST;

  /**
   * Looks up a sociological persona definition by its canonical identifier.
   *
   * @param id - Persona identifier.
   * @returns Matching persona descriptor.
   */
  static byId(id: PersonaId): VisitorPersona {
    return PERSONA_BY_ID[id];
  }

  /**
   * Filters personas whose primary device profile uses the given pointer precision.
   *
   * @param pointerKind - `'fine'` or `'coarse'`.
   * @returns Ordered subset of personas matching `pointerKind`.
   */
  static forPointer(pointerKind: PointerKind): VisitorPersona[] {
    return PERSONA_LIST.filter((persona) => persona.pointerKind === pointerKind);
  }

  /**
   * Computes the total rubric weight of a persona (invariant: `100`).
   *
   * @param persona - Visitor persona descriptor.
   * @returns Sum of ergonomic and wayfinding weights.
   */
  static totalWeight(persona: VisitorPersona): number {
    const ergonomicSum =
      persona.ergonomicWeights.hudCollisionFree +
      persona.ergonomicWeights.viewportClearance +
      persona.ergonomicWeights.touchTargetComfort;
    const wayfindingSum = WAYFINDING_CHECK_IDS.reduce(
      (sum, checkId) => sum + persona.wayfindingWeights[checkId],
      0,
    );
    return ergonomicSum + wayfindingSum;
  }
}

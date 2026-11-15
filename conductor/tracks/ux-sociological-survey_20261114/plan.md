# Plan: Multi-Persona Sociological UI/UX Visitor Survey & Senior UX Expert Synthesis

Track: `ux-sociological-survey_20261114` · Spec: [spec.md](./spec.md) · Workflow: [../../workflow.md](../../workflow.md)

## Phase 1: Pure Sociological Persona Model & UX Ergonomics / Wayfinding Audit Engine

- [ ] Task: `VisitorPersonas` & `NavigationAudit` pure domain modules
    - [ ] Red: unit + `fast-check` property tests in `tests/ux/VisitorPersonas.test.ts` and `tests/ux/NavigationAudit.test.ts` (7 sociological personas, bounding-box overlap & viewport occlusion math, WCAG 2.5.8 / coarse-pointer touch target checks, 8 wayfinding capability checks, bounded `0–100` scoring, and monotonicity property test)
    - [ ] Green: implement `src/ux/VisitorPersonas.ts` and `src/ux/NavigationAudit.ts` (one primary unit per file, strict TypeScript + TSDoc, 100% coverage)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Empirical Multi-Viewport Playwright Survey & Senior UI/UX Synthesis

- [ ] Task: Playwright multi-persona UX survey probe (`tests/e2e/uxSurvey.spec.ts`)
    - [ ] Red/Green: implement `tests/e2e/uxSurvey.spec.ts` measuring real DOM geometry, HUD overlap at `375×667` / `390×844` vs `1440×900` / `1920×1080`, touch targets, Awake `:target` filter behavior, Awake→Drift hop counts, and Drift HUD / `FocusOverlay` wayfinding state across EN & FR, feeding snapshots into `NavigationAudit`
- [ ] Task: Sociological Survey Report, Senior UX Expert Synthesis & ADR
    - [ ] Write `docs/ux/sociological-survey.md` (empirical findings & lived session walkthroughs across all 7 visitor archetypes with exact viewport measurements)
    - [ ] Write `docs/ux/senior-ux-synthesis.md` (prioritized `P0`/`P1`/`P2` Senior UI/UX architecture synthesis mapped to Awake Track 15 & Drift Track 16 invariants)
    - [ ] Record sequential ADR in `docs/adr/` (including `Context`, `Decision`, and `Considered & Rejected Alternatives`), update `README.md` architecture index if needed, and mark `metadata.json` `"completed"`
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Inherited Findings

From `aurora-thresholds-and-zones_20261112` review (non-blocking context):
- Keep pure logic in `100%`-covered modules outside `src/world/gl/` per ADR 0006.

## Assumptions & Domain Invariants Ledger

*(Implementer appends assumptions made during execution here.)*

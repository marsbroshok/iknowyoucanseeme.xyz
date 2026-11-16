# Plan: Drift World Mobile/Desktop Ergonomics, Guided Work Stepper, Rich In-Place Focus Dialog & Tactile Lens/Help Controls

Track: `drift-navigation_20261114` · Spec: [spec.md](./spec.md) · Workflow: [../../workflow.md](../../workflow.md)

## Phase 1: Manifest Curatorial Metadata, Rich In-Place `FocusOverlay` & Pure HUD Controllers

- [x] Task: Enrich `WorldManifest` (`ManifestWork`) with curatorial metadata & sequence fields + upgrade `FocusOverlay` (`‹ Prev / Next ›` buttons, `ArrowLeft`/`ArrowRight` keys, metadata & context header) 81fd871
    - [x] Red: unit tests in `tests/world/core/WorldManifest.test.ts`, `tests/world/manifest/WorldManifestBuilder.test.ts`, and `tests/world/island/FocusOverlay.test.ts` (schema validation, localized `metaLine`/`availabilityLabel`/`contextLabel`/`positionIndex`, in-place `Prev/Next` callbacks, `ArrowLeft`/`ArrowRight` handling, `?kiosk=1` link hiding)
    - [x] Green: implement in `src/world/core/WorldManifest.ts`, `src/world/manifest/WorldManifestBuilder.ts`, `src/world/island/FocusOverlay.ts`, and `tests/world/fixtures.ts` (100% coverage)
- [~] Task: `DriftHelp`, `WorkStepper` & `LensToggle` island controllers
    - [ ] Red: unit tests in `tests/world/island/DriftHelp.test.ts`, `tests/world/island/WorkStepper.test.ts`, and `tests/world/island/LensToggle.test.ts` (pointer-aware onboarding auto-dismiss by distance/time, `aria-expanded` + `Escape` help panel toggle, `Prev / Current (i / N) / Next` stepper updates & callbacks, tactile lens cycle button updates & click handling)
    - [ ] Green: implement `src/world/island/DriftHelp.ts`, `src/world/island/WorkStepper.ts`, and `src/world/island/LensToggle.ts` (100% coverage)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: `DriftIsland.astro` & `DriftWorld.ts` Wiring, Mobile Ergonomics & 7-Persona Post-Upgrade Verification

- [ ] Task: Wire upgraded HUD dock, collision-free responsive CSS, single-row mobile zone strip & rich `FocusOverlay` into `DriftIsland.astro` and `DriftWorld.ts`
    - [ ] Red: Playwright E2E tests in `tests/e2e/driftNavigation.spec.ts` (zero HUD bounding-box overlap at `375×667` & `390×844` in EN/FR, `WorkStepper` glide + open, `[data-lens-cycle]` click cycling, `FocusOverlay` `Prev/Next` + `ArrowRight` camera sync, `Tab × 3` preservation, `?kiosk=1` zero-link preservation, and `0` axe violations with help panel & focus dialog open)
    - [ ] Green: wire into `src/components/DriftIsland.astro`, `src/world/gl/DriftWorld.ts`, `src/content/copy/pages/ui.yaml`, and regenerate `docs/copy/REVIEW.md`
- [ ] Task: Post-upgrade 7-persona sociological survey verification (`≥ 90 / 100`), before/after synthesis table, ADR & docs sync
    - [ ] Update `tests/e2e/uxSurvey.spec.ts` to assert `0` HUD collisions, all 8 wayfinding checks `true`, and every persona score `≥ 90 / 100`
    - [ ] Update `docs/ux/senior-ux-synthesis.md` (before vs after empirical table), record sequential ADR in `docs/adr/`, update `README.md` & `docs/perf.md`, and set `metadata.json` `"status"` to `"completed"`
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Inherited Findings

From `ux-sociological-survey_20261114` empirical telemetry & review (address in this track):

- [ ] Task: Address touch-tablet `.drift-top` width, French `.drift-zones` 4-row / `820px` 2-row wrapping, `FocusOverlay` link target height, and cross-viewport `uxSurvey.spec.ts` assertions:
    - On touch hardware (`hasTouch + isMobile`), `TiltControl` unhides `[data-drift-tilt]` (`"Move with the phone"` / `"Bouger avec le téléphone"`) inside `.drift-top`, widening `.drift-top` to `437 px` (EN) / `538 px` (FR) and causing collisions even on `820×1180` tablets (`4,489 px²` FR) as well as `375×667`/`390×844` phones (`20,580–21,120 px²`). Keep `[data-drift-onboarding]` strictly clear of `.drift-top` across `320px–1920px` and ensure `.drift-top` fits cleanly within `375 px` without horizontal overflow.
    - French `.drift-zones` wrapped onto 4 stacked rows on `375×667`/`390×844` (`228 px` tall; `55.11%` total HUD coverage on `fr:375×667`) and 2 rows on `fr:820×1180`: make `.drift-zones` single-row horizontal scroll (`flex-wrap: nowrap; overflow-x: auto; touch-action: pan-x`) across all viewports up to at least `1024px` (or universally) so `zoneStripRowCount === 1` on every viewport including `fr:820×1180`, and keep total peer HUD viewport coverage `<= 25%` even on `fr:375×667`.
    - `FocusOverlay` action links (`[data-focus-work]`, `[data-focus-contact]`) measured `20 px` tall: style them as tactile pill controls with `min-inline-size: 24px; min-block-size: 24px` (`min-inline-size: 2.75rem; min-block-size: 2.75rem` on `@media (pointer: coarse)`) so `auditTouchTargets` reaches `100%` (`0` violations) across all 10 `(locale × viewport)` combinations.
    - In `tests/e2e/uxSurvey.spec.ts`, verify `collectWayfindingSnapshot` on `en:390×844` (`coarse`) and `fr:1440×900` (`fine`) in addition to `en:1440×900` and `fr:390×844` so responsive media queries cannot hide `[data-header-drift]`, `WorkStepper`, or `LensToggle` on the opposite viewport class.

## Assumptions & Domain Invariants Ledger

- **A1 — Path-Order Sequence Numbering (`WorldManifestBuilder`):** `ManifestWork.positionIndex` (`1..positionTotal`) is computed from `FieldLayout.compute`'s deterministic stop order (`territoryOrder` + `progress`) rather than raw content-collection loading order so `[data-drift-current]` and `[data-focus-context]` step monotonically (`1 / 40 → 2 / 40 → …`) in lockstep with `DriftSession.stops`, and `contextLabel` falls back cleanly to the territory title when zone entries are omitted in isolated manifest unit fixtures.

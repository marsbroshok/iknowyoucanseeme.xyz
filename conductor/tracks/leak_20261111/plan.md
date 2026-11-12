# Plan: The Leak, Specimens & Exhibition Mode

Track: `leak_20261111` · Spec: [spec.md](./spec.md) · Workflow: [../../workflow.md](../../workflow.md)

## Phase 1: Logic

- [ ] Task: `LeakMeter` (accumulate, curve, decay) — Red: property tests — Green
- [ ] Task: `LeakStyle` mapping (level + palette → CSS vars, contrast-capped) — Red: property test contrast ≥ 4.5 — Green
- [ ] Task: `KioskState` idle machine — Red: fake-clock tests — Green
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Awake staining

- [ ] Task: Inline leak script (size test ≤ 1.5 KB) + `@layer leak` CSS
- [ ] Task: Stray apparition (margin-only placement, reduced-motion off)
- [ ] Task: "Clear the leak" control on legal page
- [ ] Task: e2e at levels 0/0.5/1 with axe + screenshots
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Specimens & kiosk

- [ ] Task: Specimen presentation in world + awake specimen grid + labels (sketch/esquisse)
- [ ] Task: Kiosk mode (`?kiosk=1`): auto-drift, QR instead of form, idle reset, cursor hide
- [ ] Task: Docs: `docs/exhibition-mode.md` for gallery setup
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Inherited Findings

From `sound_20261111` and earlier reviews (do first):

- Done on main (fix/territory-order, e15b59d): the drift now starts in Dreamland · Arrival via `src/domain/TerritoryOrder.ts`. Keep it; new territories are appended there.
- [ ] Task: `src/world/island/DriftBoot.ts` (~L130) reads `soundOn` once in `enter()`; muting while the threshold is up does not let a returning visitor's short threshold fade by itself. Re-evaluate on mute changes (covered logic + test).
- [ ] Task: product docs: state explicitly that with sound on by default, QR/deep-link visitors click once on the short threshold (threshold FR1); add to README / product docs only as a documented behaviour (do not change product.md's vision).
- Note: crossfade tests use seeded randomness and `toBeCloseTo(…, 3)` RMS checks; if they flake in CI, widen with a justified tolerance, never remove.
- [ ] Task: **flaky e2e hunt.** One e2e test failed once under `CI=true` in the repo root after merges (205/206) and passed on rerun; the merge log did not name it (suspects: sound crossfade/timing, threshold timing). Run `CI=true npm run test:e2e --repeat-each=3` (or Playwright `--repeat-each`) on the full suite, identify any flaky test, fix the root cause (wait for state, not time; deterministic seeds), never add retries or skips. Record findings in the plan.

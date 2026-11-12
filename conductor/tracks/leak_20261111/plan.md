# Plan: The Leak, Specimens & Exhibition Mode

Track: `leak_20261111` · Spec: [spec.md](./spec.md) · Workflow: [../../workflow.md](../../workflow.md)

## Phase 1: Logic

- [x] Task: `LeakMeter` (accumulate, curve, decay) — Red: property tests — Green `a521c26`
- [x] Task: `LeakStyle` mapping (level + palette → CSS vars, contrast-capped) — Red: property test contrast ≥ 4.5 — Green `5950133`
- [x] Task: `KioskState` idle machine — Red: fake-clock tests — Green `2e196d1`
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Awake staining

- [x] Task: Inline leak script (size test ≤ 1.5 KB) + `@layer leak` CSS `72fe86f`
- [x] Task: Stray apparition (margin-only placement, reduced-motion off) `2d04cab`
- [x] Task: "Clear the leak" control on legal page `ebb967c`
- [x] Task: e2e at levels 0/0.5/1 with axe + screenshots `7b47b5e`
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Specimens & kiosk

- [ ] Task: Specimen presentation in world + awake specimen grid + labels (sketch/esquisse)
- [ ] Task: Kiosk mode (`?kiosk=1`): auto-drift, QR instead of form, idle reset, cursor hide
- [ ] Task: Docs: `docs/exhibition-mode.md` for gallery setup
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Inherited Findings

From `sound_20261111` and earlier reviews (do first):

- Done on main (fix/territory-order, e15b59d): the drift now starts in Dreamland · Arrival via `src/domain/TerritoryOrder.ts`. Keep it; new territories are appended there.
- [x] Task: `src/world/island/DriftBoot.ts` (~L130) reads `soundOn` once in `enter()`; muting while the threshold is up does not let a returning visitor's short threshold fade by itself. Re-evaluate on mute changes (covered logic + test). `021d0de`
- [x] Task: product docs: state explicitly that with sound on by default, QR/deep-link visitors click once on the short threshold (threshold FR1); add to README / product docs only as a documented behaviour (do not change product.md's vision). `292ba4d`
- Note: crossfade tests use seeded randomness and `toBeCloseTo(…, 3)` RMS checks; if they flake in CI, widen with a justified tolerance, never remove.
- [ ] Task: **flaky e2e hunt.** One e2e test failed once under `CI=true` in the repo root after merges (205/206) and passed on rerun; the merge log did not name it (suspects: sound crossfade/timing, threshold timing). Run `CI=true npm run test:e2e --repeat-each=3` (or Playwright `--repeat-each`) on the full suite, identify any flaky test, fix the root cause (wait for state, not time; deterministic seeds), never add retries or skips. Record findings in the plan.

## Assumptions ledger

- Leak decay half-life 5 days; level curve (t / 15 min)², stored time bounded at 30 min (`a521c26`).
- Max background mix 0.3, contrast guard 4.6:1 (AA is 4.5:1), apparition chance 0.5 × level from level 0.4 (`5950133`).
- Kiosk auto-drift: after 10 s without input, then one work every 12 s (`2e196d1`).
- The stray apparition is the right-hand swan of *Les Reflets II* (the picture has swans, not crows; its caption speaks of dreaming birds) (`2d04cab`).
- The leak script trusts the cap the world stored (computed with `LeakStyle.cap`), clamped to 0.3; `DistGuard` counts only the exact leak script on its own 1.5 KB budget (`72fe86f`).

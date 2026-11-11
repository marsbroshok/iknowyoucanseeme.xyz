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

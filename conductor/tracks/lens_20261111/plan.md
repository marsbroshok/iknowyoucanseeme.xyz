# Plan: The Lens

Track: `lens_20261111` · Spec: [spec.md](./spec.md) · Workflow: [../../workflow.md](../../workflow.md)

## Phase 1: Lens logic

- [ ] Task: `LensDirector` (technique → mode mapping, seeded fallback, cycling) — Red/Green with property tests
- [ ] Task: `LensCrossfade` + `LensUniforms` (pointer region, velocity smoothing, touch fade) — Red/Green
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Shaders

- [ ] Task: Shared GLSL chunk (pointer mask, tier defines) + shader compile test harness (headless WebGL in Playwright)
- [ ] Task: Colour filter + Mirror fold shaders with visual snapshots
- [ ] Task: Multiple exposure + Fracture shaders with visual snapshots
- [ ] Task: Light leak + ICM shaders with visual snapshots
- [ ] Task: Low-tier variants
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Integration

- [ ] Task: Wire lens into `ApparitionMesh`; Shift / two-finger "see unaltered"
- [ ] Task: Touch behaviour e2e (emulated touch) + fps trace with lens active
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

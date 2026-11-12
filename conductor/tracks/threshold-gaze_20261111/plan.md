# Plan: Threshold, Gaze & Fragments

Track: `threshold-gaze_20261111` · Spec: [spec.md](./spec.md) · Workflow: [../../workflow.md](../../workflow.md)

## Phase 1: Logic

- [ ] Task: `ThresholdState` machine (first/returning/reduced-motion; emits `entered`) — Red/Green
- [ ] Task: `GazeDirector` (dwell detection, bounded rotation, once-per-session line with fake clock) — Red/Green + property tests
- [ ] Task: `FragmentSurfacer` + `FragmentProgress` store — Red/Green + property tests
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Presentation

- [ ] Task: Threshold overlay (HTML/CSS + breathing-leak shader), Enter / Wake up controls, keyboard support
- [ ] Task: Gaze rotation on apparitions + fog text rendering for the gaze line
- [ ] Task: Fragment text in the world + `aria-live` mirror
- [ ] Task: "Fragments found n / N" on awake territory pages (progressive, JS-only enhancement)
- [ ] Task: e2e: first vs returning visit, keyboard entry, aria-live
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Inherited Findings

From `lens_20261111` review (non-blocking; do first):

- [ ] Task: `src/world/manifest/TechniqueHints.ts` (~L15): the `/i` flag lets `\bND\b` match a standalone "nd"; make the ND pattern case-sensitive and add a test.
- [ ] Task: `src/world/gl/DriftWorld.ts` (~L141–168): per-frame lens loop has small branches only covered by e2e. Move the decision part into a covered `LensSession` in `src/world/core/` (gl keeps pure wiring); this track adds gaze/fragment per-frame logic too, so put both in covered session modules, not in gl.
- [ ] Task: `tests/e2e/visual/harness.ts` (~L128) `textureChecksum` sums a CPU-side array a shader cannot change; replace with the meaningful proof (no-lens redraw identical to base) or remove.
- Note (artist decision pending): "Les Reflets" titles map to the mirror lens via the reflets→mirror keyword; keep unless the artist decides otherwise.

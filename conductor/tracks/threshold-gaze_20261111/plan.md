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

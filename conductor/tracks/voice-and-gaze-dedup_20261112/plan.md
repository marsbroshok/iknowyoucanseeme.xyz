# Plan: Dreamland Manifesto Voice & Gaze De-duplication

Track: `voice-and-gaze-dedup_20261112` · Spec: [spec.md](./spec.md) · Workflow: [../../workflow.md](../../workflow.md)

## Phase 1: CopyGuard Calibration & Gaze De-duplication

- [ ] Task: Calibrate `CopyGuard` for manifesto cadence (`src/tools/CopyGuard.ts`, `conductor/product-guidelines.md`)
    - [ ] Red: unit tests for raised sentence limits (EN 38 / FR 42) and `checkNarrativeCadence` rejecting choppy telegraphic blocks (< 10 words/sentence average) while accepting *Dreamland* manifesto prose
    - [ ] Green: implement in `CopyGuard.ts` and wire `checkNarrativeCadence` into `tests/drafts.test.ts` for `about.yaml` (`bio`, `origin`), `territories/*.yaml`, and `zones/*.yaml`
- [ ] Task: Add `blocks.line` to `pages/threshold.yaml` and `artist_practice` to `pages/ui.yaml` (EN + FR)
- [ ] Task: De-duplicate `iknowyoucanseeme` and `"I know you can see me"` in `HomePage.astro` and `DriftIsland.astro`
    - [ ] Red: component/container + e2e assertions that Awake home `<h1>` is `Alexander Usoltsev`, `iknowyoucanseeme` appears once (header signature), and `[data-threshold]` + Awake home never render the gaze phrase
    - [ ] Green: update `HomePage.astro`, `[...route].astro` (pass threshold line), `DriftIsland.astro`, and update affected existing e2e assertions cleanly
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Manifesto-Voice Prose & Fragment Rewrite

- [ ] Task: Rewrite `pages/about.yaml`, `territories/*.yaml`, and `zones/*.yaml` in the *Dreamland* manifesto style (EN + FR)
- [ ] Task: Rewrite all 40 `src/content/copy/works/*.yaml` fragments in the *Dreamland* manifesto & 2025–2026 caption register (EN + FR; add minimum fragment word-count guard ≥ 6 words in `tests/drafts.test.ts` so flat 3–4 word labels cannot return)
- [ ] Task: Update `docs/copy/instagram-bio.md` and regenerate `docs/copy/REVIEW.md` (`npm run copy:review`)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

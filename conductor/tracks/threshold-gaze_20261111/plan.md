# Plan: Threshold, Gaze & Fragments

Track: `threshold-gaze_20261111` · Spec: [spec.md](./spec.md) · Workflow: [../../workflow.md](../../workflow.md)

## Phase 1: Logic

- [x] Task: `ThresholdState` machine (first/returning/reduced-motion; emits `entered`) — Red/Green (716eba7; reduced motion is deliberately not an input, ADR 0009)
- [x] Task: `GazeDirector` (dwell detection, bounded rotation, once-per-session line with fake clock) — Red/Green + property tests (946ade8)
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

- [x] Task: `src/world/manifest/TechniqueHints.ts` (~L15): the `/i` flag lets `\bND\b` match a standalone "nd"; make the ND pattern case-sensitive and add a test. (c28cfae)
- [x] Task: `src/world/gl/DriftWorld.ts` (~L141–168): per-frame lens loop has small branches only covered by e2e. Move the decision part into a covered `LensSession` in `src/world/core/` (gl keeps pure wiring); this track adds gaze/fragment per-frame logic too, so put both in covered session modules, not in gl. (d3cec9e)
- [x] Task: `tests/e2e/visual/harness.ts` (~L128) `textureChecksum` sums a CPU-side array a shader cannot change; replace with the meaningful proof (no-lens redraw identical to base) or remove. (b83d9fd)
- Note (artist confirmed 2026-11-12): "Les Reflets" → mirror lens is correct. Keep. *Superseded the same day (17:47) by the task below: Les Reflets were made with a colour filter.*
- [x] Task (artist decision 2026-11-12, 17:47): **Declared techniques override inferred hints.** `SelectionEntry.techniques` kept on merge (property test) and written by `ContentGenerator` (default `[]`); the manifest reads lens keys only from declared techniques when any (`lensTechniques`); Les Reflets I–III declare `colour filter` (content regenerated with `npm run intake -- generate --export intake/instagram/your_instagram_activity`, only the three work files changed); declared techniques are named via `ui.yaml` labels so FR pages stay French; README + ADR 0008 note. (59cff04, 13a864a, 679aaca)
- [x] Task (artist decision 2026-11-12, do first): **stop routing on `prefers-reduced-motion`.** `DeviceProfile` (and any reduced-motion checks in boot/island/e2e) must no longer send reduced-motion visitors to the awake layer; WebGL2 / save-data / weak-device rules stay. Wake up / Se réveiller stays always visible. Update unit + property tests (reduced motion no longer changes the decision), the reduced-motion e2e (now asserts the world mounts AND the Wake up control is visible and works), README/docs, and record an ADR ("Reduced motion does not route to the awake layer") with Context (artist: the world is the artwork; Wake up is the opt-out), Decision, Considered & Rejected Alternatives (auto-awake under reduced motion; reduced-motion low-motion variant), and the WCAG note (2.3.3 Animation from Interactions is AAA; AA met through the Wake up control and pause-free static awake layer). (7b76075; ADR 0009)

## Assumptions

Ledger of reasonable assumptions made while the artist was away (also in commit bodies):

- A1 (716eba7): a deep link (`?w=`, e.g. a QR wall label) gets the short threshold, like a returning visit.
- A2 (716eba7): the short threshold enters by itself at once and fades over 1 s while sound is off (no sound exists yet, so returning visitors never need the click in this track); the full threshold fades over 1.6 s after Enter.
- A3 (946ade8): "near an apparition" means the pointer is over it (the lens raycast). Turns are bounded at 0.22 rad yaw / 0.1 rad pitch and eased; the gaze line, once allowed after 3 min of drifting, comes after a memoryless random wait (mean 90 s), fades in 2 s, holds 4 s, fades out 3 s.
- A4 (59cff04): blank entries in declared techniques do not count as declared.
- A5 (13a864a): declared techniques are a small vocabulary named in `ui.yaml` (`technique_<key>`); FR label for "colour filter" is "filtre coloré" (draft, native proof pending); "ICM" stays "ICM".

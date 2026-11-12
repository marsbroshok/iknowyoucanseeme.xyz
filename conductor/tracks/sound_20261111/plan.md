# Plan: Sound

Track: `sound_20261111` · Spec: [spec.md](./spec.md) · Workflow: [../../workflow.md](../../workflow.md)

## Phase 1: Interfaces & pure logic

- [ ] Task: `SoundEngine` interface + `ZoneMixer` — Red: property tests (sum to 1, smooth ramps) — Green
- [ ] Task: `AudioManifest` parser (empty manifest valid; bad entries rejected loudly) — Red/Green
- [ ] Task: `SoundRecipes` parameter mapping per zone — Red/Green
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Tone adapter

- [ ] Task: Install `tone`; `ToneSoundEngine` with lazy import after `entered`
- [ ] Task: Offline render tests per recipe (non-silent, muted = silent, no discontinuities on crossfade)
- [ ] Task: Field-recording layer player (streamed loops from manifest)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Integration

- [ ] Task: Wire to drift position + `entered`; mute toggle UI (persisted); visibility suspend
- [ ] Task: Bundle test: `tone` absent from initial chunks
- [ ] Task: ADR "Tone.js behind SoundEngine"
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Inherited Findings

From `threshold-gaze_20261111` review (non-blocking):

- [ ] Task: the `entered` event (with `gesture: true`) is emitted both by the threshold's **Enter** and by **Drift** on the awake page (`ThresholdOverlay.skip()`, assumption A8). The sound engine must treat any `entered` with `gesture: true` as the user gesture that may unlock audio, and must never start audio from `entered` without `gesture: true`. Test both sources.
- [ ] Task: `src/scripts/FragmentCount.ts` parses build-time ids with `JSON.parse(rawIds) as string[]` without validation; validate with a tiny guard (array of strings) and test malformed input (fail closed: show nothing).
- [ ] Task: ADR 0007 still describes reduced-motion phones as an awake-layer case; add a "Superseded in part by ADR 0009" note (do not rewrite history).
- Note (artist decision pending): the threshold line currently reuses the gaze sentence (`ui.t('gaze')`, ADR 0010 A7). Keep unless the artist decides otherwise.

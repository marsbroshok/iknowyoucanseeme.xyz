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

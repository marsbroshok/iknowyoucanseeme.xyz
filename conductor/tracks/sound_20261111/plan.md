# Plan: Sound

Track: `sound_20261111` · Spec: [spec.md](./spec.md) · Workflow: [../../workflow.md](../../workflow.md)

## Phase 1: Interfaces & pure logic

- [x] Task: `SoundEngine` interface + `ZoneMixer` — Red: property tests (sum to 1, smooth ramps) — Green (2e04254; with `SoundZones` and `ZoneField`, weights from the camera)
- [x] Task: `AudioManifest` parser (empty manifest valid; bad entries rejected loudly) — Red/Green (5c58c25)
- [x] Task: `SoundRecipes` parameter mapping per zone — Red/Green (b29ea7d; with `CueReader`, `SoundScene`, `SoundLevel`)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) — `npm run test:e2e` exit 0 (200 passed) with `CI=true` and with `env -u CI` at e10d28d; `npm run check` exited 1 under both settings there (v8 counted the never-loaded, type-only `SoundEngine.ts` as uncovered), fixed in 242805a, then `npm run check` exit 0 (827 unit tests, 100% coverage) with `CI=true` and with `env -u CI` at 242805a

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
- [x] Task: `src/scripts/FragmentCount.ts` parses build-time ids with `JSON.parse(rawIds) as string[]` without validation; validate with a tiny guard (array of strings) and test malformed input (fail closed: show nothing). (c7acc25)
- [x] Task: ADR 0007 still describes reduced-motion phones as an awake-layer case; add a "Superseded in part by ADR 0009" note (do not rewrite history). (50a4cae)
- Note (artist decision pending): the threshold line currently reuses the gaze sentence (`ui.t('gaze')`, ADR 0010 A7). Keep unless the artist decides otherwise.

## Assumptions

Ledger of reasonable assumptions made while the artist was away (also in commit bodies):

- A1 (2e04254): works without a zone (and any territory other than the border) sound like the arrival; the border territory (`the-border-is-thin`) is one sound zone whatever the zones of its works. Zone weights are a softmax of the distances to the `FieldLayout` regions (falloff 8 m).
- A2 (2e04254): FR1's interface gains `setCues(cues)` for FR2's closeness cues (glints near works, swell near eclipse works). The full zone crossfade lasts 2 s (never below 1.5 s).
- A3 (5c58c25): manifest shape `{ "zones": { <zone>: [ { "src", "gain"? } ] } }`; files only under `/audio/`, gain in (0, 1] (default 1).
- A4 (b29ea7d): eclipse works are those whose slug has the word `eclipse` or whose title has "éclipse"/"eclipse"; closeness is 1 within 4 m, 0 beyond 24 m; master ceiling −12 dBFS with a limiter at −6 dBFS.

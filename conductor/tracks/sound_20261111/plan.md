# Plan: Sound

Track: `sound_20261111` · Spec: [spec.md](./spec.md) · Workflow: [../../workflow.md](../../workflow.md)

## Phase 1: Interfaces & pure logic

- [x] Task: `SoundEngine` interface + `ZoneMixer` — Red: property tests (sum to 1, smooth ramps) — Green (2e04254; with `SoundZones` and `ZoneField`, weights from the camera)
- [x] Task: `AudioManifest` parser (empty manifest valid; bad entries rejected loudly) — Red/Green (5c58c25)
- [x] Task: `SoundRecipes` parameter mapping per zone — Red/Green (b29ea7d; with `CueReader`, `SoundScene`, `SoundLevel`)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) — `npm run test:e2e` exit 0 (200 passed) with `CI=true` and with `env -u CI` at e10d28d; `npm run check` exited 1 under both settings there (v8 counted the never-loaded, type-only `SoundEngine.ts` as uncovered), fixed in 242805a, then `npm run check` exit 0 (827 unit tests, 100% coverage) with `CI=true` and with `env -u CI` at 242805a

## Phase 2: Tone adapter

- [x] Task: Install `tone`; `ToneSoundEngine` with lazy import after `entered` (46a9126; tone 15.2.6, node-web-audio-api 2.1.0 dev; `createSoundEngine` is the lazy chunk's entry, wired to `entered` in phase 3)
- [x] Task: Offline render tests per recipe (non-silent, muted = silent, no discontinuities on crossfade) (afbb0e5, 78fc44e; `ImpulseReverb` replaces `Tone.Reverb`)
- [x] Task: Field-recording layer player (streamed loops from manifest) (da520df; CI installs ALSA for the Node Web Audio tests, 06f3e90)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) — gates at 1dba530: `npm run check` exit 0 and `npm run test:e2e` exit 0 (200 passed) with `CI=true` and with `env -u CI`

## Phase 3: Integration

- [x] Task: Wire to drift position + `entered`; mute toggle UI (persisted); visibility suspend (d110429; `SoundDirector`, `SoundPreference`, `SoundControls`, e2e `sound.spec.ts`)
- [x] Task: Bundle test: `tone` absent from initial chunks (9e2b8da; boot 5.4 KB gz, world 133.2 KB gz, sound 64.3 KB gz; boundary test)
- [x] Task: ADR "Tone.js behind SoundEngine" (39be02a; ADR 0011, README, tech stack)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Inherited Findings

From `threshold-gaze_20261111` review (non-blocking):

- [x] Task: the `entered` event (with `gesture: true`) is emitted both by the threshold's **Enter** and by **Drift** on the awake page (`ThresholdOverlay.skip()`, assumption A8). The sound engine must treat any `entered` with `gesture: true` as the user gesture that may unlock audio, and must never start audio from `entered` without `gesture: true`. Test both sources. (d110429: `SoundDirector` tests and boot tests for Enter and Drift; e2e for both)
- [x] Task: `src/scripts/FragmentCount.ts` parses build-time ids with `JSON.parse(rawIds) as string[]` without validation; validate with a tiny guard (array of strings) and test malformed input (fail closed: show nothing). (c7acc25)
- [x] Task: ADR 0007 still describes reduced-motion phones as an awake-layer case; add a "Superseded in part by ADR 0009" note (do not rewrite history). (50a4cae)
- Note (artist decision pending): the threshold line currently reuses the gaze sentence (`ui.t('gaze')`, ADR 0010 A7). Keep unless the artist decides otherwise.

## Assumptions

Ledger of reasonable assumptions made while the artist was away (also in commit bodies):

- A1 (2e04254): works without a zone (and any territory other than the border) sound like the arrival; the border territory (`the-border-is-thin`) is one sound zone whatever the zones of its works. Zone weights are a softmax of the distances to the `FieldLayout` regions (falloff 8 m).
- A2 (2e04254): FR1's interface gains `setCues(cues)` for FR2's closeness cues (glints near works, swell near eclipse works). The full zone crossfade lasts 2 s (never below 1.5 s).
- A3 (5c58c25): manifest shape `{ "zones": { <zone>: [ { "src", "gain"? } ] } }`; files only under `/audio/`, gain in (0, 1] (default 1).
- A5 (46a9126): `tone` ^15.2.6, the registry's `latest` tag (the proxy also lists untagged 15.5.x pre-releases, not used). The engine is unit-tested in Node with `node-web-audio-api` (silent sink, `Tone.Offline`), so `src/sound/engine/` needs no coverage exclusion.
- A6 (afbb0e5): voices balanced to about −30 dBFS each after the master (lens sparser, about −40 dBFS); mix ramps 0.08 s under the 0.1 s update cadence.
- A7 (da520df): recordings share the master (ceiling, mute, fades); a recording streams from the first time its zone weighs over 0.05 and pauses below 0.01.
- A8 (06f3e90): CI installs `libasound2t64` (ubuntu 24.04+) for node-web-audio-api's Linux binary.
- A9 (d110429): unmuting is itself a gesture and may unlock audio; while sound is on, returning and deep-linked visitors click Enter on the short threshold (threshold spec FR1), muted it fades by itself; world-only e2e specs start muted. The mute toggle comes first in the top bar so "Wake up" stays right before Enter in tab order. The first frame places the mix where the camera is (the world starts in the first territory of the manifest, currently the border).
- A4 (b29ea7d): eclipse works are those whose slug has the word `eclipse` or whose title has "éclipse"/"eclipse"; closeness is 1 within 4 m, 0 beyond 24 m; master ceiling −12 dBFS with a limiter at −6 dBFS.

## Out-of-scope findings

- Tone.js creates its own `AudioContext` when its module is evaluated (after the gesture); `createSoundEngine` replaces and closes it. Harmless, noted in ADR 0011.
- The world starts at the head of the first territory in the manifest's order (`the-border-is-thin` today, not Dreamland's Arrival); not changed here (layout is outside this track).

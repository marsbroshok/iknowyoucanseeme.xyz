# Spec: Sound

**Track ID:** `sound_20261111` · **Type:** Feature · **Phase:** 3 · **Depends on:** `threshold-gaze_20261111`

## Overview

Generative ambient sound that follows the drift, plus optional layers of the artist's field recordings. Sound starts only after the threshold's Enter click and can always be muted.

## Functional Requirements

- **FR1 `SoundEngine` interface:** `start()`, `stop()`, `setMix(zoneWeights)`, `setMuted(bool)`, `dispose()`. The world talks only to this interface.
- **FR2 `ToneSoundEngine`:** Tone.js implementation, **dynamically imported after `entered`**. Per-zone recipes:
  - *Arrival*: wide filtered pink-noise "sea" + slow detuned pad drones, long reverb.
  - *Lens*: sparser, brighter; granular glints triggered by approaching works.
  - *Leak*: low pulse, close and dry, faint human-like hum.
  - *The border is thin*: wind-like noise with slow pitch bends (ICM); a low swell near eclipse works.
- **FR3 Zone crossfade (`ZoneMixer`):** weights from the camera position (smooth, sum to 1), ramped over ≥ 1.5 s.
- **FR4 Field recordings:** optional manifest `public/audio/manifest.json` mapping zones to looping files (streamed, never preloaded before `entered`). The site works without any recordings.
- **FR5 Controls:** visible mute toggle (persisted); audio suspended when the tab is hidden; volume never above a set ceiling.
- **FR6 ADR:** record "Tone.js behind SoundEngine" in `docs/adr/` (number assigned at authoring time), with the rejected alternative (hand-written Web Audio).

## Non-Functional Requirements

- Tone.js is not in the initial bundle (bundle test asserts this).
- Pure modules (ZoneMixer, recipe parameter mapping, manifest parsing) with 100% coverage and property tests (weights sum to 1, ramps monotonic). The Tone adapter gets integration tests with Tone's offline rendering (`Tone.Offline`) asserting non-silent output per recipe and silence when muted.

## Acceptance Criteria

1. No audio before Enter; mute persists across reloads; hidden tab suspends audio.
2. Zone changes crossfade smoothly (offline render test checks no clicks/discontinuities above a threshold).

## Assumptions

- No field recordings yet; the manifest ships empty and the site works on generative sound alone.

## Out of Scope

- Music composition beyond the generative recipes.

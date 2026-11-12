# 11. Tone.js behind SoundEngine

Date: 2026-11-12

## Status

Accepted

## Context

Track `sound_20261111` adds the generative ambience: four recipes (Arrival, Lens, Leak, the border is thin) crossfading with the drift camera, optional field recordings, a mute toggle and the guideline "consent for the senses" (no audio before a deliberate gesture, mute always visible, a volume ceiling). The tech stack named Tone.js "behind an in-house `SoundEngine` interface, dynamically imported only after the threshold click" and asked for this ADR.

Open questions at authoring time:

1. Library or hand-written Web Audio.
2. Where decisions live, and how the audio code is tested (the WebGL code needed a coverage exclusion, ADR 0006).
3. How the bundle stays small for visitors who never hear a sound.

## Decision

- **Tone.js 15 behind `SoundEngine`** (`src/sound/SoundEngine.ts`: `start`, `stop`, `setMix`, `setCues`, `setMuted`, `dispose`). The world and the boot talk only to this interface; `ToneSoundEngine` (`src/sound/engine/`) is the one implementation. Only `src/sound/engine/` imports `tone` (asserted by `tests/sound/soundBoundary.test.ts`).
- **Decisions are pure and covered** (`src/sound/core/`): `ZoneField` (camera → zone weights, a softmax of distances to the `FieldLayout` regions), `ZoneMixer` (rate-limited crossfade, a full change takes 2 s, never under 1.5 s), `SoundRecipes` (equal-power levels and per-zone parameters), `CueReader` (closeness to works and to eclipse works), `SoundLevel` (ceiling −12 dBFS, limiter −6 dBFS), `AudioManifest`, `SoundPreference` (mute, `localStorage`) and `SoundDirector` (gesture gating, mute, hidden tab, leaving the world, lazy loading, mix updates every 0.1 s).
- **Consent:** only an `entered` event with `gesture: true` (Enter on the threshold, Drift on the awake page) or an unmute click may unlock audio; until then no `AudioContext` exists and the Tone.js chunk is not even loaded. While sound is on, a returning or deep-linked visitor's short threshold waits for the Enter click (threshold spec FR1); muted, it fades by itself. A hidden tab, "Wake up" and mute suspend the context.
- **The engine is unit-tested in Node, without a coverage exclusion:** `node-web-audio-api` (dev dependency) provides Web Audio in Node; the tests render every recipe with `Tone.Offline` (audible, below the limiter, silent when muted or stopped, no click or level jump on zone crossfades, with a control proving an instant switch would fail) and drive realtime contexts on a silent sink (`sinkId: { type: 'none' }`). CI installs the ALSA library that its Linux binary links.
- **Bundle:** the boot dynamically imports `src/sound/engine/createSoundEngine.ts`, a separate chunk with Tone.js; the bundle test asserts Tone.js is in neither the boot module nor the world chunk.
- **Reverb:** `ImpulseReverb` (a convolver with a decaying-noise impulse response computed synchronously) instead of `Tone.Reverb`, which renders its impulse response in a separate offline context.
- **Field recordings** stream through `<audio preload="none" loop>` elements, created only when their zone is first heard; `public/audio/manifest.json` ships empty and the site works on generative sound alone.

## Considered & Rejected Alternatives

- **Hand-written Web Audio (no library).** Rejected: reverbs, LFO modulation, oscillator banks, envelopes and scheduling would all be written and maintained here for little artistic gain; Tone.js provides them and its weight only reaches visitors after their gesture. The `SoundEngine` interface keeps the door open: an implementation on native Web Audio can replace `ToneSoundEngine` without touching the world, the boot or the decisions.
- **Exclude `src/sound/engine/` from coverage and test it only in Playwright (like ADR 0006).** Rejected: `node-web-audio-api` runs the real engine in Node, so the audio code keeps the 100 % gate and offline renders measure the output itself (levels, silence, discontinuities), which a browser test can only do through a debug hook.
- **`Tone.Reverb`.** Rejected after the offline renders: it generates its impulse response by rendering another offline context asynchronously (a `ready` promise every start must wait for), and the result depends on timing. The synchronous `ImpulseReverb` is ready at once and reproducible with a seed.
- **Create the AudioContext at boot and resume it on the gesture.** Rejected: an `AudioContext` before the gesture is exactly what the guideline forbids (and Chrome warns about it); the context is created inside the lazily loaded chunk, after the gesture.
- **Start the zone mix from a fixed zone and let it ramp.** Rejected: the world may start in any territory (the first in the manifest's order); the first frame places the mix where the camera is, later frames ramp.

## Consequences

- `npm run check` on Linux needs `libasound.so.2` (GitHub's runner gets it from the deploy workflow; on a desktop Linux it is usually installed).
- Tests read the samples of `node-web-audio-api` buffers at once (the native memory is reused by later renders) and seed `Math.random` (Tone.js draws its noise from it) so renders are reproducible.
- Tone.js creates its own `AudioContext` when its module loads (after the gesture); `createSoundEngine` replaces and closes it.

# 10. Threshold, gaze and fragments: pure directors, HTML text over the canvas

Date: 2026-11-12

## Status

Accepted

## Context

Track `threshold-gaze_20261111` adds the first screen (the threshold), the world's quiet awareness of the visitor (the gaze) and fragments of text that surface near works and slowly rebuild the statements. Several choices were not fixed by the spec:

1. Where the per-frame decisions live. ADR 0006 keeps only GPU wiring in `src/world/gl/` (excluded from coverage); the lens review asked that per-frame decisions leave `DriftWorld`.
2. How text appears "in the fog": drawn in WebGL, or as HTML over the canvas.
3. Which line the threshold shows, and which threshold a deep link (`?w=`, the QR wall labels) gets.
4. How the awake territory page shows "fragments found: n / N" while the awake pages ship no external JavaScript (ADR 0007, `DistGuard`).
5. How fragment progress stays meaningful when a statement has a different number of sentences in English and French (Dreamland: 7 in English, 6 in French).

## Decision

- **Pure directors, thin wiring.** `ThresholdState` (full vs short threshold, click needed, `entered` once), `GazeDirector` (dwell > 2 s, bounded eased turn, the gaze line at most once per session after ≥ 3 min of drifting), `FragmentCatalog` / `FragmentSurfacer` / `FragmentProgress` (placement, surfacing, read ids), `ThresholdPalette` and `LensSession` live in `src/world/core/` under the 100 % gate, with fake-clock unit tests and fast-check properties. DOM parts (`ThresholdOverlay`, `WorldWhisper`) live in `src/world/island/`, also covered. `src/world/gl/` only adds the leak shader (`ThresholdLeak`), the mesh turn and the wiring in `DriftWorld`. The coverage exclusion does not grow.
- **Text is HTML over the canvas.** The gaze line and fragments are `aria-hidden` paragraphs positioned over the canvas (a fragment just above its work, from the camera projection), faded by the directors' opacities, in Fraunces. Each one is mirrored, when it starts, into a polite `aria-live` region (FR4).
- **The threshold line is the gaze line** (`ui.yaml` `gaze`, the same line the awake home page already shows). `pages/threshold.yaml` keeps only the page title; no copy is duplicated. The leak's colour is the brightest palette colour of a random Arrival work, over the night blue.
- **Short threshold for returning visitors and deep links.** A deep link is a deliberate visit to one work (often from a wall label at the exhibition), so it gets the 1 s short threshold like a return. While there is no sound (until the sound track), the short threshold needs no click. The full threshold holds the world still and makes the rest of the world layer `inert`; "Wake up" stays above it and reachable. "Drift" on the awake page skips the threshold: that click is itself the gesture.
- **`entered` event.** Entering dispatches a bubbling `CustomEvent('entered', { detail: { gesture, returning } })` on the world layer; the sound track listens for it. No audio in this track.
- **Fragment count on territory pages: a small inline script.** `src/scripts/FragmentCount.ts` reads the stored ids itself (its own copy of the storage key, checked against `FragmentProgress.KEY` by a unit test that writes with one and reads with the other), so Astro inlines it. `DistGuard` gives territory pages an inline budget of 2 KB (`TERRITORY_JS_BUDGET`); they still may load no external script. The element is hidden without JavaScript.
- **Language-independent ids, counted per language.** Ids are `work:<slug>` and `statement:<territory>:<index>`. The awake page counts only the ids that exist in its language, so "n / N" never exceeds N; a territory without works surfaces no sentences and does not count them.

## Considered & Rejected Alternatives

- **Text drawn in WebGL (SDF fonts or canvas textures).** Rejected: a font atlas for Latin + French diacritics adds weight to the world chunk, the text would not be selectable or readable by assistive technology, and it would need a second, hidden copy for the live region anyway.
- **A separate `line` block in `pages/threshold.yaml`.** Rejected: it would duplicate the gaze line already in `ui.yaml` (and shown on the awake home page) and let the two drift apart.
- **Full threshold for deep links.** Rejected: a visitor who scanned a wall label asked for one work; a full screen with a click in front of it breaks that.
- **Import `FragmentProgress` into the territory script.** Rejected: the module is also used by the world chunk, so Rollup makes it a shared chunk and Astro emits the territory script as an external module, which ADR 0007 keeps off awake pages.
- **Allow first-party modules on territory pages.** Rejected: it widens the "awake pages ship no external JavaScript" rule for a 1 KB count.
- **Count across languages (union of EN and FR ids).** Rejected: sentence indices do not correspond between languages, so the count could exceed N on one of the pages.

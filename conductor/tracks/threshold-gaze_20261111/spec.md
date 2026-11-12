# Spec: Threshold, Gaze & Fragments

**Track ID:** `threshold-gaze_20261111` · **Type:** Feature · **Phase:** 2 · **Depends on:** `lens_20261111`

## Overview

The first screen and the world's quiet awareness of the visitor: the threshold, the gaze ("I know you can see me"), and fragments of text that surface near works and slowly rebuild the statement.

## Functional Requirements

- **FR1 Threshold:** on capable devices, `/{lang}/` opens on a near-black night-blue void with one line (from `pages/threshold`), a single slowly breathing colour leak (shader, palette from a random Arrival work), an **Enter / Entrer** button (this user gesture will unlock audio in the sound track), and a small **Wake up / Se réveiller** link. Returning visitors (localStorage) skip to a shorter threshold (1 s fade, still a click to enter if sound is on).
- **FR2 Gaze behaviour (`GazeDirector`):** after the pointer dwells near an apparition for > 2 s, the apparition turns slightly toward it (bounded rotation). Rarely (at most once per session after ≥ 3 minutes of drift, plus once on the threshold), the gaze line surfaces in the fog, then fades.
- **FR3 Fragments (`FragmentSurfacer`):** a work's fragment fades in near it when the camera settles close; statement sentences are assigned to positions along the path; each one read is stored (localStorage) and the awake territory page can show "fragments found: n / N".
- **FR4 Accessibility:** all surfaced text is mirrored into a polite `aria-live` region; the threshold is keyboard-operable; `prefers-reduced-motion` does not skip the threshold or the world (artist decision 2026-11-12; see Inherited Findings); the Wake up link on the threshold is the opt-out.

## Non-Functional Requirements

- Pure modules (GazeDirector timing/probability, FragmentSurfacer selection and persistence, threshold state machine) with 100% coverage; property tests: the gaze line never shows more than once per session after the threshold; fragment progress is monotonic and bounded.
- e2e: first visit vs returning visit; keyboard-only entry; aria-live receives fragments.

## Acceptance Criteria

1. The threshold appears on first visit on capable devices and never blocks the awake layer.
2. Gaze and fragment behaviours respect their frequency rules (tested with a fake clock).

## Assumptions

- Session = the browser tab's lifetime (sessionStorage).

## Out of Scope

- Audio (the Enter click only emits an `entered` event the sound track will consume).

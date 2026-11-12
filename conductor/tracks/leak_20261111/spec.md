# Spec: The Leak, Specimens & Exhibition Mode

**Track ID:** `leak_20261111` · **Type:** Feature · **Phase:** 4 · **Depends on:** `sound_20261111`

## Overview

The Dreamland leaks into our world: the longer someone drifts, the more the awake pages are stained by dream colour and stray apparitions, without ever losing legibility. The Leak zone presents its inhabitants (Venice portraits) and first fauna sketches (clay creatures) as specimens. An exhibition/kiosk mode serves gallery screens.

## Functional Requirements

- **FR1 Leak level (`LeakMeter`):** accumulated drift time (localStorage) → level 0…1 (ease-in curve, saturating around 15 minutes total); decays slowly over days of absence.
- **FR2 Awake staining:** a tiny inline script on awake pages reads the level and sets CSS variables: background tint toward the last-seen work's palette, soft chromatic edge on images, occasional (≤ 1 per page view, level ≥ 0.4) faint apparition (a small cut-out of a work) drifting across the margin, never over text. All within the `@layer leak`.
- **FR3 Legibility guard:** at every level, text contrast stays ≥ 4.5:1 (computed at runtime by the same `AccentColor` helper; the level is capped otherwise); `prefers-reduced-motion` is not used to change the effect (artist decision 2026-11-12); the stray apparition stays slow and never covers text.
- **FR4 Specimens:** Leak zone works render as "specimens" in the world (framed, with a mono label like a museum tag: `specimen 03 · Venise · 2025`) and on the awake territory page as a specimen grid. Clay sketches are labelled *sketch / esquisse*.
- **FR5 Exhibition mode (`?kiosk=1`):** auto-drift along the zone path, no external links, the contact form replaced by a QR to the work page, idle reset after 90 s without input, cursor hidden after 5 s, sound on after one first tap.
- **FR6 "Clear the leak":** a small control on the legal page resets the stored level (privacy-respecting, local only).

## Non-Functional Requirements

- Inline leak script ≤ 1.5 KB; no layout shift (CLS 0 contribution).
- Pure modules (LeakMeter curve and decay, staining parameter mapping, kiosk idle state machine) with 100% coverage + property tests (level ∈ [0,1], monotonic in drift time, contrast guard always holds).
- e2e: awake page at levels 0 / 0.5 / 1 passes axe; screenshots for visual review; kiosk idle reset with a fake clock.

## Acceptance Criteria

1. Leak visibly grows with drift time and never breaks AA contrast.
2. Kiosk mode runs unattended and resets.

## Assumptions

- The stray apparition uses a crop of an existing work (the crows of *Les Reflets II* by default), never new illustration.

## Out of Scope

- 3D ceramics (separate, blocked track).

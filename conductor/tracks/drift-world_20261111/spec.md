# Spec: The Drift (WebGL World Core)

**Track ID:** `drift-world_20261111` · **Type:** Feature · **Phase:** 2 · **Depends on:** `launch_20261111`

## Overview

A Three.js island mounted on the awake home `/{lang}/` that turns it into a continuous foggy field the visitor drifts through. Works appear as apparitions on approach. Capable devices get the world; others keep the awake HTML underneath, which is never removed from the DOM (it stays the accessible, indexable layer).

## Functional Requirements

- **FR1 Capability routing (`DeviceProfile`):** world enabled only if WebGL2 is available, `prefers-reduced-motion` is not set, Save-Data is off, and (when exposed) `deviceMemory ≥ 4` and hardware concurrency ≥ 4. Produces a quality tier (`high | low`) and a decision (`world | awake`). Manual override stored in `localStorage` ("Wake up" / "Drift" toggle).
- **FR2 Layout (`FieldLayout`):** deterministic placement of works in a 3D field. Territories are distant regions; within Dreamland the zones run along a soft path Arrival → Lens → Leak; positions are seeded by slug (stable across builds) with minimum spacing.
- **FR3 Drift motion (`DriftController`):** scroll/wheel and drag move the camera with inertia; device tilt (after permission on iOS) on phones; arrow keys + Tab cycle to the nearest works; speed is clamped. Pure state-update function, testable without WebGL.
- **FR4 Rendering:** exponential fog in night blue; works as textured planes with soft-edged alpha masks that fade in by distance (apparition curve); the background colour shifts toward the nearest work's palette; a faint horizon/compass line indicates the current zone and the way to the others.
- **FR5 Texture streaming (`TextureBudget`):** only works within radius R get loaded; LOD (low-res first ~480 px, full ≤ 2400 px when close); GPU memory budget per tier; textures disposed when far.
- **FR6 Deep links:** `/{lang}/?w=<slug>` starts the camera facing that work; work pages' "see it in the drift" links use this. URL updates (replaceState) when the visitor settles in front of a work.
- **FR7 Focus & exit:** clicking/tapping an apparition shows an overlay with title, fragment and links (awake work page, contact). A permanent small "Wake up / Se réveiller" control switches to the awake layer.
- **FR8 Metrics:** analytics events `drift-time` (bucketed) and `work-approached` through the existing `track()`.

## Non-Functional Requirements

- ≥ 60 fps on a 2020+ laptop, ≥ 40 fps on a mid-range phone (tier `low`: smaller textures, no post-processing).
- World JS lazy-loaded after first paint; initial world bundle ≤ 250 KB gzipped (enforced by a bundle-size test).
- Pure modules (DeviceProfile, FieldLayout, DriftController, TextureBudget, apparition curve) have 100% coverage plus property tests (layout: min spacing holds, deterministic; drift: speed never exceeds clamp; budget: never exceeds memory cap).
- Playwright (Chromium with SwiftShader) smoke: canvas renders, deep link lands on the right work (assert via exposed debug state, test-only flag), reduced-motion emulation yields the awake layer.

## Acceptance Criteria

1. The awake HTML remains present and reachable; axe passes with the world mounted.
2. Deep links work from every work page.
3. Bundle and fps budgets are met (fps measured in a Playwright performance trace on desktop; phone tier verified manually and documented).

## Assumptions

- No React; plain TypeScript classes around Three.js.
- Tilt navigation requires an explicit tap on iOS (permission prompt); without permission, drag is used.

## Out of Scope

- Lens shaders, threshold screen, gaze, fragments, sound, leak.

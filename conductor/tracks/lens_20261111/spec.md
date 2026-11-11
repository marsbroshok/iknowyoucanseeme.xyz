# Spec: The Lens (Camera-Technique Shaders)

**Track ID:** `lens_20261111` · **Type:** Feature · **Phase:** 2 · **Depends on:** `drift-world_20261111`

## Overview

The cursor (or finger) becomes a lens that applies the artist's real camera techniques to the work under it, as a reversible overlay. The unaltered work is always one step away.

## Functional Requirements

- **FR1 Six lens modes** (GLSL fragment shaders on apparition materials, within a soft circular region around the pointer):
  1. *Colour filter / gel*: hue-shift toward a gel colour sampled from another work's palette.
  2. *Mirror fold*: reflection across an axis through the pointer (kaleidoscope with 2–6 segments).
  3. *Multiple exposure*: screen/lighten blend with a second work's texture (from the same zone).
  4. *Fracture & re-collage*: Voronoi shards offset and rotated slightly.
  5. *Light leak / flare*: additive streaks and chromatic ghosts from the pointer.
  6. *Motion blur / ICM*: directional blur following pointer velocity.
- **FR2 Mode selection (`LensDirector`):** each work gets a default mode from its `techniques` (falling back to a seeded choice); modes can be cycled with a key/long-press; mode changes crossfade.
- **FR3 Touch:** on phones, the lens follows the finger while touching; releasing lets it fade out over ~600 ms.
- **FR4 Purity:** lenses never change the stored image; a "see unaltered" affordance (hold Shift / two-finger tap) disables the lens.

## Non-Functional Requirements

- The `low` tier uses cheaper variants (fewer samples, no fracture).
- Pure TS for uniform computation, mode selection and crossfade timing; 100% coverage + property tests (selection deterministic per slug; crossfade weights sum to 1).
- Visual regression: Playwright SwiftShader screenshots per mode on a fixed test texture (tolerance-based), stored under `tests/visual/`.

## Acceptance Criteria

1. All six modes render and are reachable on desktop and touch.
2. Frame budget holds (≥ 60 fps desktop with the lens active over a work).

## Assumptions

- Mode defaults map: caption techniques "mirror" → Mirror fold; "ND/filter" → Colour filter; "ICM" → Motion blur; "multiple exposure" → Multiple exposure; otherwise seeded.

## Out of Scope

- Sound reactivity; leak effect.

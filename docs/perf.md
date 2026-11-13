# Performance of the drift world

Budgets (`conductor/product-guidelines.md`, track `drift-world_20261111`):
≥ 60 fps on a 2020+ laptop, ≥ 40 fps on a mid-range phone (tier `low`), and
≤ 250 KB gzipped for the world's JavaScript, loaded after first paint.

## Bundle (measured 2026-11-13, `tests/e2e/bundle.spec.ts`)

| Part | Gzipped | Budget | When it loads |
|---|---|---|---|
| Boot module (home pages only) | 6.3 KB | 8 KB | with the page (module script) |
| World chunk (Three.js + scene code + lens + boreal threshold & 3D portals, gaze, fragments, specimens) | 140.2 KB | 250 KB | dynamic import after load + frame + idle, only when the world is shown |
| Sound chunk (Tone.js + generative ambience) | 64.3 KB | — | dynamic import after the visitor's gesture |

Re-measured 2026-11-12 after track `lens_20261111`: the lens (six shaders,
its pure logic and input) adds about 5.5 KB gzipped to the world chunk and
nothing to the boot module (before: 3.7 KB / 124.2 KB).

Re-measured 2026-11-12 after track `threshold-gaze_20261111`: the threshold
(state machine, overlay, visit memory) adds about 1 KB to the boot module;
the leak shader, gaze and fragments add about 3 KB to the world chunk.
Territory pages carry one small inline script for "Fragments found" (within
the 2 KB inline budget of `DistGuard`).

Re-measured 2026-11-13 after track `drift-navigation-and-density_20261112`
(including sound, leak/kiosk, and deep-link Wake-up override): boot 6.2 KB gz,
world 136.1 KB gz, sound 64.3 KB gz.

Re-measured 2026-11-13 after track `aurora-thresholds-and-zones_20261112`
(multi-ribbon boreal Threshold curtain, per-zone atmospheres, 3D `BorealGateMesh`
portals, `ZoneBanner`, and interactive `HorizonCompass` strip): boot 6.3 KB gz,
world 140.2 KB gz (+4.1 KB gz), sound 64.3 KB gz.

Other pages load no JavaScript file. Devices that get the awake layer
(Save-Data, no WebGL2, < 4 GB or < 4 cores; reduced motion does not route,
ADR 0009) never request
the world chunk (`tests/e2e/drift.spec.ts`).

## Frame rate (measured 2026-11-13, `npm run perf:trace`)

Chromium 138 (Playwright, headless, GPU through ANGLE Metal) on an Apple
M4 Pro laptop, after compacting the spatial layout (`FieldLayout` pitch 4.6,
alternating lateral framing, `FOG_DENSITY = 0.03`, 6 Arrival works simultaneously
visible at staggered depths on `1440 × 900`). The trace drifts for 10 s from the
start of Dreamland with steady wheel input and a few turns, counting
`requestAnimationFrame` frames in the page; a Chrome trace is saved to
`test-results/drift-perf-trace.json`.

| Run | Viewport | Tier | fps (mean) | p95 frame | worst frame |
|---|---|---|---|---|---|
| Desktop | 1440 × 900, DPR 1 | high | 59.8 | 16.8 ms | 50.1 ms |
| Emulated phone (Pixel 7 profile) | 412 × 839, DPR 2.6 → capped 1.25 | low | 60.0 | 16.8 ms | 16.8 ms |

### With the lens active (measured 2026-11-13, compact field + boreal portals)

Same machine and command. The visitor stands in front of *Arrivée*; for
10 s the pointer (mouse, or a held finger on the emulated phone) circles
over the work and L goes through the lenses, so every lens of the tier is
drawn. The lens was on the work in every measured frame.

| Run | Tier | fps (mean) | p95 frame | worst frame |
|---|---|---|---|---|
| Desktop, lens on (mouse) | high (12 blur samples, 3 ghosts, fracture) | 60.0 | 16.8 ms | 16.8 ms |
| Emulated phone, lens on (finger) | low (5 samples, 1 ghost, no fracture) | 60.0 | 16.7 ms | 16.8 ms |
| Desktop, drift only (same run) | high | 59.8 | 16.8 ms | 50.1 ms |
| Emulated phone, drift only (same run) | low | 60.0 | 16.8 ms | 16.8 ms |

The display refresh caps the rate at 60 fps, so both runs are at the cap.
The emulated phone uses the same laptop GPU: it checks the `low` tier code
path (smaller textures, pixel-ratio cap, no MSAA), not a phone's speed.

## Phone tier (manual check)

A real mid-range phone cannot be driven from this machine, so the ≥ 40 fps
phone budget is checked by hand before release:

1. Open `https://www.iknowyoucanseeme.xyz/fr/` (or a local build served on
   the network) on a mid-range Android phone (2021+, e.g. Pixel 6a or
   Galaxy A54) and on an iPhone 12 or newer.
2. In Chrome on Android, enable *Developer options → Show refresh rate*, or
   on iOS connect Safari's Web Inspector (*Timelines → Rendering Frames*).
3. Drift for 30 s (drag, then tap "Bouger avec le téléphone" and tilt).
4. Expected: ≥ 40 fps sustained, textures sharpen as works come close, no
   reload or crash. Note device, browser and the numbers in this file.

Status: not yet done (the artist is away during this track); to be filled
in at the next release review.

## What keeps it fast

- Only works within 44 units (35 on phones) get a texture; full images only
  within 11 (8) units; a GPU memory cap per tier (192 MB / 64 MB).
- Fully faded works are not drawn; one shared plane geometry.
- Pixel ratio capped (2 / 1.25), MSAA only in the high tier, no
  post-processing.
- The lens runs on one work only, inside a soft circle (other pixels and
  works return early); the `low` tier compiles a cheaper variant (5 blur
  samples instead of 12, 1 flare ghost instead of 3, no fracture). One
  shader program per tier is shared by all works.
- Boreal curtains (`ThresholdLeak` and `BorealGateMesh`, ADR 0013) scale FBM
  ray octaves by tier (`4` on `high`, `2` on `low`), share one `32 × 1` unit
  plane across all 3D portals, cull portals beyond `72` units, and release the
  Threshold's WebGL context as soon as the Threshold closes.

# Performance of the drift world

Budgets (`conductor/product-guidelines.md`, track `drift-world_20261111`):
≥ 60 fps on a 2020+ laptop, ≥ 40 fps on a mid-range phone (tier `low`), and
≤ 250 KB gzipped for the world's JavaScript, loaded after first paint.

## Bundle (measured 2026-11-12, `tests/e2e/bundle.spec.ts`)

| Part | Gzipped | Budget | When it loads |
|---|---|---|---|
| Boot module (home pages only) | 3.7 KB | 8 KB | with the page (module script) |
| World chunk (Three.js + scene code) | 124.2 KB | 250 KB | dynamic import after load + frame + idle, only when the world is shown |

Other pages load no JavaScript file. Devices that get the awake layer
(reduced motion, Save-Data, no WebGL2, < 4 GB or < 4 cores) never request
the world chunk (`tests/e2e/drift.spec.ts`).

## Frame rate (measured 2026-11-12, `npm run perf:trace`)

Chromium 138 (Playwright, headless, GPU through ANGLE Metal) on an Apple
M4 Pro laptop. The trace drifts for 10 s from the start of Dreamland with
steady wheel input and a few turns, counting `requestAnimationFrame`
frames in the page; a Chrome trace is saved to
`test-results/drift-perf-trace.json`.

| Run | Viewport | Tier | fps (mean) | p95 frame | worst frame |
|---|---|---|---|---|---|
| Desktop | 1440 × 900, DPR 1 | high | 60.0 | 16.8 ms | 16.8 ms |
| Emulated phone (Pixel 7 profile) | 412 × 839, DPR 2.6 → capped 1.25 | low | 59.9 | 16.8 ms | 50.1 ms |

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

- Only works within 42 units (32 on phones) get a texture; full images only
  within 9 (7) units; a GPU memory cap per tier (192 MB / 64 MB).
- Fully faded works are not drawn; one shared plane geometry.
- Pixel ratio capped (2 / 1.25), MSAA only in the high tier, no
  post-processing.

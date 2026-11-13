# ADR 0013: Boreal light curtain threshold, zone atmospheres, 3D portals, and interactive zone strip

- **Status:** Accepted
- **Date:** 2026-11-13
- **Track:** `aurora-thresholds-and-zones_20261112`

## Context

Two visual-direction upgrades were requested for the immersive world:

1. **Threshold as a wall of boreal lights.** A single faint blurred colour dot on the Threshold screen read too weakly as the permeable border into *Dreamland*; the threshold needed an atmospheric multi-ribbon aurora borealis curtain in deep night indigo (`#070b22`), emerald-green, boreal violet, and magenta-pink while staying light enough for phones (`low` tier).
2. **Unmistakable zone and territory transitions.** Keeping a uniform `#0b1030` sky across *Arrival*, *Lens*, *Leak*, and *The border is thin*—with only a faint bottom text compass—made crossing from one zone to another hard to perceive. Visitors needed spatial, chromatic, and typographic cues when crossing zones, plus a direct way to jump between zones or territories without breaking keyboard focus order (`Tab × 3`), WCAG 2.2 AA contrast (`axe`), or exhibition mode (`?kiosk=1` zero-link rule).

All new logic also had to obey ADR 0006: 100% unit/property coverage on pure TypeScript and DOM controllers, with only Three.js/GLSL wiring in `src/world/gl/`.

## Decision

- **Pure palette, atmosphere, gate, and crossing modules under 100% coverage (`src/world/core/`).**
  - `ThresholdPalette` anchors the threshold in `#070b22` and blends 12% (`BOREAL_THRESHOLD.tintMix = 0.12`) of the chosen *Arrival* work's brightest palette stop into emerald (`#12b886`), violet (`#6d3ccf`), and pink (`#d9468f`) ribbons so every 24-bit work colour preserves strict green, violet, and pink channel dominance (verified by `fast-check`). `borealDefines(tier)` sets `BOREAL_OCTAVES` to `4` (`high`) or `2` (`low`).
  - `ZoneAtmosphere` assigns each region a distinct nocturnal sky/fog base and AA-legible UI accent: *Arrival* (`#081a34` / `#5eead4`), *Lens* (`#072622` / `#34d399`), *Leak* (`#240d2b` / `#f472b6`), and *The border is thin* (`#180e38` / `#c084fc`). `PaletteSky` blends the active region's base toward the nearest work's colour while capping luminance at `SKY.minContrast = 4.65` so 8-bit hex rounding during exponential smoothing always stays `≥ 4.6:1` against `SKY.dimText`.
  - `ZoneGates` places `16 × 6.5` m portals perpendicular to the curved path at every intra-territory `zoneGap` midpoint (*Arrival → Lens*, *Lens → Leak*) and `5` m ahead of secondary territories (*The border is thin*), guaranteeing `≥ 5.0` m clearance from every artwork placement and omitting `regions[0]` (already fronted by the 2D Threshold curtain).
  - `ZoneCrossing` tracks the active region after `ThresholdOverlay` releases its hold, requires `CROSSING.hysteresis = 1.6` m segment-distance advantage before switching regions so lingering on a border never flickers, and emits `{ title, subtitle, accent, opacity }` over a `3.0` s envelope (`0.35` s fade-in, plateau, `0.55` s fade-out), using each zone's 1-sentence manifest excerpt (falling back to the territory's opening sentence).
- **Thin GLSL shaders in `src/world/gl/`, verified in Chromium WebGL2.**
  - `ThresholdLeak` renders three interwoven vertical aurora sheets (emerald, violet, rose-pink) with sharp lower hems, upward-fading magnetic-field FBM rays, a `9` s breathing envelope, and film grain on `[data-threshold-leak]`, disposed as soon as the threshold closes.
  - `BorealGateMesh` shares one `32 × 1` subdivided plane geometry across portals, displaces subtle horizontal sway in the vertex shader, renders additive double-sided aurora curtains attenuated by exponential-squared fog, parts smoothly within `GATE.partRadius = 2.5` m of the camera so visitors pass through a softening veil without hard pops, culls beyond `72` m, and disables `raycast` so clicks always reach artworks behind a gate.
- **HTML/CSS crossing card and segmented zone strip (`src/world/island/`, `DriftIsland.astro`).**
  - `ZoneBanner` drives `[data-zone-banner]`, a centered, `pointer-events: none` `Fraunces` card over `rgb(7 11 34 / 0.9)` (`≥ 7.3:1` contrast for all region accents and `#f0f0f5` body text).
  - `HorizonCompass` retains its polite live region (`.drift-compass-here`, visually hidden) and directional bearing markers (`.drift-horizon`, `aria-hidden="true"`), and adds a segmented progression strip (`.drift-zones`, `role="group"`) of `<button type="button" data-zone-pill>` controls with `aria-current="true"` and `--zone-accent` styling. Clicking a pill invokes `DriftSession.jumpToRegion`, landing cleanly at `layout.start` for `regions[0]` or `region.start.z + 2` (`3` m past the region's boreal curtain, `≥ 5.9` m hysteresis advantage) and refreshing the compass and texture plan on the next frame. `[data-drift-compass]` sits after `[data-drift-works]` in DOM order so `Tab × 3` reaches the nearest work first.

## Considered & Rejected Alternatives

- **Pre-rendered video or bitmap aurora textures on the Threshold and 3D gates.** Rejected: looping video or large alpha textures would inflate asset weight and band in fog, whereas procedural multi-ribbon GLSL costs ~4 KB gzipped total and scales cleanly across aspect ratios and quality tiers (`BOREAL_OCTAVES`).
- **Post-processing bloom pass (`EffectComposer` / `UnrealBloomPass`) for boreal glow.** Rejected: full-screen render targets hurt fill-rate on mobile GPUs (`low` tier) and increase bundle weight; analytical ray envelopes and additive blending on `BorealGateMesh` achieve luminous boreal curtains at 60 fps without post-processing.
- **Anchor links (`<a href="?w=...">`) or a `<nav>` landmark for the bottom zone strip.** Rejected: `<a href>` links would either reload the world or require stripping in `?kiosk=1` exhibition mode (`KioskMode` removes all `a[href]`), and a second `<nav>` on the home page would require disambiguating landmarks against the awake header; `<button type="button">` inside a labelled `role="group"` works identically in normal and kiosk modes.
- **Slow `DriftController.focus` camera glide across distant territories when clicking a zone pill.** Rejected: at `DRIFT.maxSpeed = 6` units/s, gliding `50–125` units from *Arrival* to *Leak* or *The border is thin* takes `8–21` seconds and cuts through intermediate zones (triggering intermediate crossing banners); `DriftSession.jumpToRegion` places the camera directly inside the chosen region's entry sightline.
- **Placing a portal mesh in front of `regions[0]` (*Dreamland · Arrival*).** Rejected: the visitor spawns at `z = +4.6` m right in front of *Arrival* after dismissing the full-screen boreal Threshold, so a second 3D curtain at *Arrival*'s start would duplicate the Threshold and partially veil the opening sightline of works.

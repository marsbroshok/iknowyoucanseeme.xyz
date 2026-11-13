# Spec: Boreal Light Curtain Threshold & Unmistakable Zone Transitions

**Track ID:** `aurora-thresholds-and-zones_20261112` · **Type:** Feature (Visual & Spatial UX) · **Depends on:** `drift-navigation-and-density_20261112`

## Overview

Deliver two visual-direction upgrades requested by the artist:
1. **Threshold as a Wall of Boreal Lights:** Replace the faint single blurred dot on the Threshold screen with an atmospheric **aurora / boreal light curtain** shader—shimmering vertical folds and ribbons in deep night hues, emerald/teal greens, violets, and pinks representing the permeable border into Dreamland.
2. **Visually Obvious Zone Switches:** Make crossing between zones (*Arrival → Lens → Leak*) and territories (*Dreamland ↔ The border is thin*) unmistakable in three ways: distinct per-zone sky/fog colour atmospheres, translucent **3D boreal curtain walls** hanging across the path at every zone/territory border that the visitor drifts through, and a clear typographic **zone-crossing title apparition** + segmented zone bar.

## Functional Requirements

- **FR1 Aurora Borealis Curtain Shader on the Threshold (`ThresholdPalette.ts`, `ThresholdLeak.ts`):**
  - Pure `ThresholdPalette` supplies a rich boreal palette anchored in deep night indigo (`#070b22`) with three aurora ribbon stops—deep emerald/teal green, luminous violet, and magenta-pink—modulated subtly by the Arrival work palette.
  - `ThresholdLeak.ts` renders an animated multi-ribbon **aurora borealis wall** in GLSL: vertical streaky light curtains swaying and breathing across the viewport, with upward-fading rays, subtle interference folds, and film grain (`low`-tier step count for mobile efficiency).
  - Visual Playwright test verifies vertical curtain structure and distinct green, violet, and pink chromatic presence on `[data-threshold-leak]`.
- **FR2 Distinct Per-Zone Sky & Fog Atmospheres (`ZoneAtmosphere.ts`, `PaletteSky.ts`):**
  - Pure `ZoneAtmosphere` assigns each region a distinct nocturnal base colour instead of uniform `#0b1030`:
    - *Dreamland · Arrival*: deep abyssal ultramarine-teal (`#081a34`)
    - *Dreamland · Lens (La Loupe)*: deep nocturnal emerald-pine (`#072622`)
    - *Dreamland · Leak (L'Infiltration)*: deep nocturnal plum-rose (`#240d2b`)
    - *The border is thin (La frontière s'efface)*: deep boreal violet-indigo (`#180e38`)
  - `PaletteSky` blends the active region's base atmosphere smoothly with the nearest work's dominant colour while strictly preserving ≥ 4.6:1 contrast against UI text (`SKY.dimText`, verified by `fast-check` property test across all zones and arbitrary work colours).
- **FR3 3D Boreal Curtain Portals at Zone & Territory Borders (`ZoneGates.ts`, `BorealGateMesh.ts`):**
  - Pure `ZoneGates` computes portal placements in each `zoneGap` along a territory's path (Arrival→Lens, Lens→Leak) and at the entry border of *The border is thin*, pairing each gate with the upcoming region's boreal ribbon colours.
  - `BorealGateMesh` (`src/world/gl/`) renders translucent, shimmering vertical **aurora curtain walls** spanning across the path (`~16` units wide × `~6` units tall) that part/soften smoothly within `~2.5` units of the camera so the visitor feels themselves passing *through* a glowing veil of boreal light without any hard pop or artwork occlusion.
- **FR4 Zone-Crossing Banner & Segmented Zone Bar (`ZoneCrossing.ts`, `HorizonCompass.ts`, `DriftIsland.astro`):**
  - Pure `ZoneCrossing` detects when the visitor crosses from one region into another (ignoring initial spawn while the threshold is up, then announcing on entry and every subsequent region switch) and emits `{ title, subtitle, accent }` for ~3.0 seconds.
  - `DriftIsland.astro` renders a centered, pointer-events-none `Fraunces` **zone-crossing title card** (`[data-zone-banner]`, showing the region title + a 1-line zone/territory excerpt) that fades in and out gracefully on crossing.
  - Upgrade `HorizonCompass` so all regions appear as a clear, legible progression strip at the bottom with a prominent active indicator pill (tinted by the zone's accent) and clickable region buttons allowing the visitor to drift/jump cleanly to any zone or territory if desired!

## Non-Functional Requirements

- Respect ADR 0006: all pure geometry, palette, contrast, and state logic (`ThresholdPalette`, `ZoneAtmosphere`, `ZoneGates`, `ZoneCrossing`) resides in 100%-covered modules; only Three.js/GLSL meshes/shaders reside in `src/world/gl/`.
- Maintain bundle budgets (world chunk ≤ 250 KB gz, boot ≤ 8 KB gz), ≥ 60 fps desktop, and 0 axe accessibility violations (including while `[data-zone-banner]` is visible!).
- Bilingual EN + FR via `ui.yaml` / `zones/*.yaml` / `territories/*.yaml` (`CopyGuard` + `LanguageGuard` green).

## Acceptance Criteria

1. Threshold canvas renders a multi-hue boreal curtain (emerald green, violet, pink ribbons verified by pixel statistics in Playwright).
2. Drifting from Arrival → Lens → Leak visibly shifts the sky/fog atmosphere, passes through 3D boreal curtain gates in the `zoneGap`s, triggers the `Fraunces` `[data-zone-banner]` announcement on crossing, and updates the highlighted zone pill in the bottom bar.
3. Clicking a region in the bottom compass bar moves the visitor to that zone/territory cleanly.
4. `npm run check` and `npm run test:e2e` pass under both `CI=true` and `CI` unset with 100% coverage and 0 axe violations.

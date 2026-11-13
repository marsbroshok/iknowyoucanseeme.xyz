# Plan: Boreal Light Curtain Threshold & Unmistakable Zone Transitions

Track: `aurora-thresholds-and-zones_20261112` · Spec: [spec.md](./spec.md) · Workflow: [../../workflow.md](../../workflow.md)

## Phase 1: Pure Boreal Palettes, Zone Atmospheres, Gates & Crossing Logic

- [x] Task: Boreal `ThresholdPalette` & `ZoneAtmosphere` + contrast-guarded `PaletteSky` `3d0939e`
    - [x] Red: unit + `fast-check` property tests verifying distinct region base colours, boreal green/violet/pink stops, and contrast ≥ 4.6:1 against `SKY.dimText` for every region and arbitrary work hex colour
    - [x] Green: implement `src/world/core/ZoneAtmosphere.ts`, extend `ThresholdPalette.ts` and `PaletteSky.ts`
- [x] Task: `ZoneGates` placement & `ZoneCrossing` state machine `97203e8`
    - [x] Red: unit + property tests (`ZoneGates` places portals inside every `zoneGap` and territory entry without colliding with any work placement; `ZoneCrossing` fires on region changes, suppresses duplicate fires inside hysteresis band, expires after duration)
    - [x] Green: implement `src/world/core/ZoneGates.ts` and `src/world/core/ZoneCrossing.ts`
- [~] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Boreal Shaders & 3D Zone Portals

- [ ] Task: Aurora Borealis curtain shader on `ThresholdLeak.ts`
    - [ ] Red: Playwright visual pixel-statistics test asserting vertical curtain structure and green + violet + pink chromatic presence on `[data-threshold-leak]`
    - [ ] Green: implement multi-ribbon boreal curtain GLSL shader in `src/world/gl/ThresholdLeak.ts` (with high/low tier step count)
- [ ] Task: `BorealGateMesh` 3D aurora curtain portals in `src/world/gl/` + wire `ZoneAtmosphere` & `BorealGateMesh` into `DriftWorld.ts`
    - [ ] Red: Playwright WebGL visual/e2e test verifying 3D gate meshes render across zone gaps and soften near the camera
    - [ ] Green: implement `src/world/gl/BorealGateMesh.ts` and wire into `DriftWorld.ts`
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Zone-Crossing Banner & Interactive Zone Strip

- [ ] Task: Centered `Fraunces` zone-crossing banner (`[data-zone-banner]`) & upgraded interactive `HorizonCompass` strip
    - [ ] Red: unit tests for `HorizonCompass` region pills + click callbacks and `ZoneBanner` view updates; Playwright e2e tests verifying crossing Arrival → Lens triggers `[data-zone-banner]`, clicking a zone pill jumps to that zone, and axe reports 0 violations while the banner is visible (EN + FR)
    - [ ] Green: implement `ZoneBanner` + upgraded `HorizonCompass` + CSS in `DriftIsland.astro` + any `ui.yaml` labels (EN + FR)
- [ ] Task: Record ADR for Boreal Threshold & Zone Portals, update `README.md` and `docs/perf.md`
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Inherited Findings

From `drift-navigation-and-density_20261112` review (non-blocking; do first):

- [x] Task: `src/world/island/DriftBoot.ts`: extract `DeviceProfile.canAutoEnterDeepLink(caps)` so all device-capability policy stays in `DeviceProfile` rather than splitting `saveData` across `DriftBoot` and `DeviceProfile`; and pass the already-parsed manifest from boot into `enter()` when present to avoid parsing `#drift-manifest` twice. `db0e479`

## Assumptions & Domain Invariants Ledger

- **Boreal stop modulation & contrast rounding margin (`ThresholdPalette.ts`, `PaletteSky.ts`):** `BOREAL_THRESHOLD.tintMix = 0.12` blends 12% of the chosen Arrival work's brightest palette colour into the emerald (`#12b886`), violet (`#6d3ccf`), and pink (`#d9468f`) anchors so every arbitrary 24-bit work palette preserves strict green (`G > B && G > R`), violet (`B > R && R > G`), and pink (`R > B && B > G`) channel dominance. `PaletteSky.targetFor` uses `SKY.minContrast = 4.65` so 8-bit hex rounding during exponential `PaletteSky.update` smoothing across region transitions stays strictly `≥ 4.6:1` against `SKY.dimText`.
- **Portal geometry & crossing hysteresis (`ZoneGates.ts`, `ZoneCrossing.ts`):** `ZoneGates.compute` omits `regions[0]` (already fronted by the 2D Threshold curtain) and places `16 × 6.5` m portals perpendicular to the curved path at intra-territory `zoneGap` midpoints and `GATE.entryLead = 5` m ahead of secondary territories, guaranteeing `≥ 5.0` m clearance from every artwork placement. `ZoneCrossing` requires `CROSSING.hysteresis = 1.6` m segment-distance advantage before switching active regions so lingering on a zone curtain never flickers.

# Plan: Deep-Link Wake-Up Entry Fix & Compact Spatial Layout

Track: `drift-navigation-and-density_20261112` · Spec: [spec.md](./spec.md) · Workflow: [../../workflow.md](../../workflow.md)

## Phase 1: Deep-Link Wake-Up Fix

- [x] Task: Override stored `'awake'` preference on valid `?w=<slug>` deep links (`src/world/island/DriftBoot.ts`) `60350d1`
    - [x] Red: unit tests in `DriftBoot.test.ts` (stored `'awake'` + valid `?w=arrivee` on capable device switches preference to `'world'` and enters world; invalid `?w=unknown` or Save-Data/no-WebGL2 stays `'awake'`; `?kiosk=1&w=arrivee` still ignores `?w=`)
    - [x] Red: Playwright e2e test in `drift.spec.ts` reproducing the full user journey: click **Wake up** → visit `/en/works/arrivee/` → click `[data-drift-link]` ("See it in the drift") → world opens directly on `arrivee`
    - [x] Green: implement in `DriftBoot.ts` and verify all existing `drift.spec.ts` / `kiosk.spec.ts` / `sound.spec.ts` tests pass
- [~] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Compact Field Layout & Visibility Depth

- [ ] Task: Compact `FieldLayout` geometry & alternating sightline framing (`src/world/core/FieldLayout.ts`)
    - [ ] Red: unit + `fast-check` property tests for updated `FIELD` constants, alternating left/right sightline framing, pairwise minimum spacing ≥ `FIELD.spacing`, and cross-territory minimum distance ≥ `FIELD.territoryGap`
    - [ ] Green: implement updated `FIELD` constants and alternating lateral framing in `FieldLayout.ts`
- [ ] Task: Tune fog density & apparition curve for multi-work depth (`src/world/core/StageSettings.ts`, `src/world/gl/DriftWorld.ts`)
    - [ ] Red: unit tests for `StageSettings` + desktop Playwright e2e test asserting ≥ 4 works are simultaneously visible inside the `1440×900` viewport at Arrival start
    - [ ] Green: tune `FOG_DENSITY`, `ApparitionCurve`, and streaming radius while keeping `TextureBudget` caps intact
- [ ] Task: Update `docs/perf.md` if frame/bundle metrics shift and verify 60 fps
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Inherited Findings

From `voice-and-gaze-dedup_20261112` review (non-blocking; do first):

- [x] Task: `src/tools/CopyGuard.ts`: JS `\b` is ASCII-only so French deny-list entries starting with a diacritic (e.g. `évanescent`) do not match after whitespace; switch to Unicode letter boundaries `(?<!\p{L})…(?!\p{L})` with `/iu` (escaping regex metacharacters cleanly) and add a unit test confirming `évanescent` after a space fails; also inline `cachedListReady` if present. `378274b`

## Assumptions & Domain Invariants Ledger

- **Deep-link capability vs manual `[data-drift-start]` override (`DriftBoot.ts`):** `DeviceProfile.decide(caps, 'world')` intentionally permits `saveData: true` when the visitor explicitly clicks `[data-drift-start]` on the Awake page (`DeviceProfile.test.ts` / `DriftBoot.test.ts`). For `?w=<slug>` deep links, `bootDrift` requires `!caps.saveData && DeviceProfile.decide(caps, 'world').mode === 'world'` so WebGL2 devices without Save-Data (including `< 4 GB` / `< 4` core devices in the `low` tier) override a stored `'awake'` choice, while Save-Data and WebGL2-incapable devices remain safely on the Awake layer.

# Plan: The Drift (World Core)

Track: `drift-world_20261111` · Spec: [spec.md](./spec.md) · Workflow: [../../workflow.md](../../workflow.md)

## Phase 1: Pure core [checkpoint: 9ed231e]

- [x] Task: `DeviceProfile` — Red: table + property tests over capability inputs — Green `9d03a35` (+ `ModePreference` localStorage override)
- [x] Task: `FieldLayout` — Red: determinism, min spacing, zone ordering along path (property tests) — Green `979afc4`
- [x] Task: `DriftController` — Red: inertia decay, speed clamp, keyboard nearest-work cycling — Green `06dce91`
- [x] Task: `ApparitionCurve` + `TextureBudget` — Red: monotonic opacity by distance; budget cap never exceeded — Green `9ed231e`
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) — `npm run check` exit 0 / `npm run test:e2e` exit 0 with `CI=true`; check 0 / e2e 0 with `CI` unset (423 unit tests, 100% coverage; 140 e2e).

## Phase 2: Rendering [checkpoint: 0aef2d7]

- [x] Task: Install `three`; `WorldStage` (renderer, fog, camera, resize, DPR cap by tier) `50cff7d` (ADR 0006: GPU code in `src/world/gl/`, verified by Playwright)
- [x] Task: `ApparitionMesh` (alpha-mask shader, distance fade) + `TextureLoader` LOD adapter `fd80309` (`TextureStreamer` generic + `WorkTextureLoader`)
- [x] Task: `PaletteSky` background shift + `HorizonCompass` `0f35afc`
- [x] Task: Input adapters (wheel, pointer drag, keyboard, device orientation with iOS permission flow) `0aef2d7`
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) — `npm run check` 0 / `npm run test:e2e` 0 with `CI=true`; 0 / 0 with `CI` unset. Rendering is not mounted yet; its browser verification (SwiftShader smoke, deep link, reduced motion, axe, bundle size) lands with the island in phase 3.

## Phase 3: Integration [checkpoint: 97d8557]

- [x] Task: `DriftIsland` mount on `/{lang}/` (lazy import after first paint; awake DOM preserved; Wake up/Drift toggle) `1c89cb3` (manifest), `5a30e79` (island, ADR 0007)
- [x] Task: Deep links `?w=<slug>` + replaceState; enable "see it in the drift" links on work pages `eeef18a`
- [x] Task: Focus overlay (accessible dialog: focus trap, Esc, links) `e544884`
- [x] Task: Metrics events through `track()` `a21226b`
- [x] Task: Bundle-size test (≤ 250 KB gz) + Playwright SwiftShader smoke + reduced-motion e2e + axe with world mounted `bc5ee2f` (boot 3.7 KB gz, world 124.2 KB gz)
- [x] Task: Performance trace script and `docs/perf.md` with measured numbers `97d8557` (desktop 60.0 fps; phone tier manual)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) — `npm run check` 0 / `npm run test:e2e` 0 with `CI=true`; 0 / 0 with `CI` unset (unit 100% coverage; e2e incl. drift and bundle specs). `npm run perf:trace` (not a gate) 0.

## Inherited Findings

From `launch_20261111` review (non-blocking; do them as the first small task):

- [x] Task: `5421d70` `tests/catalogueReader.test.ts` leaves empty `out_dir4/5/7` folders in the working directory; write them under `os.tmpdir()` and clean up.
- [x] Task: `9806022` `src/content/copy/pages/legal.yaml` states cookieless analytics are used even when `PUBLIC_GOATCOUNTER_CODE` is unset; make the wording conditional (render the analytics sentence only when analytics is enabled), EN + FR, CopyGuard/LanguageGuard green.
- Note (no action now): `qrcode` pinned to 1.4.1 because the local npm proxy lacks 1.5.x; upgrade when available.

## Assumptions & Domain Invariants Ledger

- **Capability thresholds (FR1):** hidden `deviceMemory` / `hardwareConcurrency` (Safari, Firefox) count as sufficient. High tier = fine pointer and (when known) ≥ 8 GB and ≥ 8 cores; everything else that gets the world is `low`.
- **Override (FR1):** "Drift" can show the world on a device routed to the awake layer automatically (deliberate choice of the visitor), never without WebGL2; such devices render in the low tier. "Wake up" always wins.
- **Layout (FR2):** works sit in single file along each territory path with seeded sideways offsets (±7 units), so minimum spacing is provable by construction and Tab cycling is natural. Territory paths are 300 units apart.
- **Keyboard (FR3):** the first Tab goes to the nearest work, then Tab/Shift+Tab follow path order (wrapping).
- **Sky (FR4):** the sky leans at most 30 % towards the nearest work's dominant colour (within 20 units) and is capped so the light UI text over the world keeps ≥ 4.5:1.
- **Compass (FR4):** HTML over the canvas (real text, translatable, read by screen readers); current region = nearest stretch of path.
- **Input (FR3):** drag "pulls the world"; tilt uses a 5° dead zone with the first reading as neutral; a texture that fails to load is reported once and not retried (the work keeps its colour veil).
- **Awake layer while drifting (AC1):** the world is a fixed layer (direct child of `<body>`); the awake page stays in the DOM but is `inert` until "Wake up" (always visible).
- **Keyboard (FR3):** works are real buttons; one tab stop on the nearest work; Tab/Shift+Tab move along the path and leave the list at either end (no keyboard trap).
- **Work-page link (FR6):** a plain link with no script, shown on every work page; devices routed to the awake layer land on the home page, which offers "Drift" when WebGL2 exists (ADR 0007).
- **Settling (FR6):** the address follows a work after 1.2 s standing still (< 0.15 units/s) in front of it (≤ 7.2 units, ≤ 0.35 rad).
- **Metrics (FR8):** drift time only as buckets (0-30s, 30s-2m, 2-5m, 5-15m, 15m+), sent on Wake up or `pagehide`; a work counts as approached within 6 units, once per visit.
- **Debug flag:** `PUBLIC_DRIFT_DEBUG=true` (e2e keyed build only) exposes read-only `window.__driftDebug`; production builds contain no such code (checked by `tests/e2e/bundle.spec.ts`).
- **Phone tier:** ≥ 40 fps cannot be measured on this machine; documented as a manual check in `docs/perf.md`.
- **Texture memory (FR5):** RGBA8 × 4/3 per texture; high tier 192 MB (2400 px full images), low tier 64 MB (1200 px full images).

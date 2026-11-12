# Plan: The Drift (World Core)

Track: `drift-world_20261111` · Spec: [spec.md](./spec.md) · Workflow: [../../workflow.md](../../workflow.md)

## Phase 1: Pure core

- [x] Task: `DeviceProfile` — Red: table + property tests over capability inputs — Green `9d03a35` (+ `ModePreference` localStorage override)
- [x] Task: `FieldLayout` — Red: determinism, min spacing, zone ordering along path (property tests) — Green `979afc4`
- [x] Task: `DriftController` — Red: inertia decay, speed clamp, keyboard nearest-work cycling — Green `06dce91`
- [x] Task: `ApparitionCurve` + `TextureBudget` — Red: monotonic opacity by distance; budget cap never exceeded — Green `9ed231e`
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Rendering

- [ ] Task: Install `three`; `WorldStage` (renderer, fog, camera, resize, DPR cap by tier)
- [ ] Task: `ApparitionMesh` (alpha-mask shader, distance fade) + `TextureLoader` LOD adapter
- [ ] Task: `PaletteSky` background shift + `HorizonCompass`
- [ ] Task: Input adapters (wheel, pointer drag, keyboard, device orientation with iOS permission flow)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Integration

- [ ] Task: `DriftIsland` mount on `/{lang}/` (lazy import after first paint; awake DOM preserved; Wake up/Drift toggle)
- [ ] Task: Deep links `?w=<slug>` + replaceState; enable "see it in the drift" links on work pages
- [ ] Task: Focus overlay (accessible dialog: focus trap, Esc, links)
- [ ] Task: Metrics events through `track()`
- [ ] Task: Bundle-size test (≤ 250 KB gz) + Playwright SwiftShader smoke + reduced-motion e2e + axe with world mounted
- [ ] Task: Performance trace script and `docs/perf.md` with measured numbers
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

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
- **Texture memory (FR5):** RGBA8 × 4/3 per texture; high tier 192 MB (2400 px full images), low tier 64 MB (1200 px full images).

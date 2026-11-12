# Plan: The Lens

Track: `lens_20261111` · Spec: [spec.md](./spec.md) · Workflow: [../../workflow.md](../../workflow.md)

## Phase 1: Lens logic [checkpoint: 0a432ca]

- [x] Task: `LensDirector` (technique → mode mapping, seeded fallback, cycling) — Red/Green with property tests `36d7b06`
- [x] Task: `LensCrossfade` + `LensUniforms` (pointer region, velocity smoothing, touch fade) — Red/Green `0a432ca`
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) `0a432ca` — check 0/0, test:e2e 0/0 (CI=true / CI unset)

## Phase 2: Shaders

- [x] Task: Shared GLSL chunk (pointer mask, tier defines) + shader compile test harness (headless WebGL in Playwright) `05a2893`
- [ ] Task: Colour filter + Mirror fold shaders with visual snapshots
- [ ] Task: Multiple exposure + Fracture shaders with visual snapshots
- [ ] Task: Light leak + ICM shaders with visual snapshots
- [ ] Task: Low-tier variants
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Integration

- [ ] Task: Wire lens into `ApparitionMesh`; Shift / two-finger "see unaltered"
- [ ] Task: Touch behaviour e2e (emulated touch) + fps trace with lens active
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Inherited Findings

From `drift-world_20261111` review (non-blocking; do first):

- [x] Task: `src/components/DriftIsland.astro` (~L44) embeds the world manifest JSON in a `<script type="application/json">` unescaped; a `</script>` in any copy string would break the page. Escape `<` as `\u003c` (and `>`/`&` for safety) via a tested pure helper; add a test with a fragment containing `</script>`. `b74c9df`
- [x] Task: `[...route].astro` `resolveImage` holds image-scaling logic in an `.astro` file (not covered). Move it to a pure, tested helper. `f303883`
- [x] Task: `src/world/core/DriftSession.ts` (~L76): unused `manifest` field (astro check hint). Remove. `8068759`
- [x] Task: `ZONE_ORDER` is defined in both `src/domain/WorkQueries` and `src/world/core/FieldLayout`. Single source of truth + test. `128f8b6`
- Note (artist decision pending, no action): a saved "Drift" choice keeps the world on even with prefers-reduced-motion; current behaviour stays unless the artist decides otherwise.
- Note (manual, not for agents): real-phone ≥ 40 fps check in `docs/perf.md` is pending.

## Assumptions

- A1 (LensDirector): every work's `techniques[]` is empty today, so "caption techniques" are read at build time from the declared techniques, both titles and the work's own caption notes (`sourceNotes`, the artist's words and hashtags), by whole-word EN/FR matching (`src/world/manifest/TechniqueHints.ts`). Only the keys (`mirror`, `filter`, `icm`, `multiple-exposure`) reach the page. Priority when several match: mirror → filter → ICM → multiple exposure (spec order), so the eclipse works (mirror deflections + ND) get the mirror fold. "Gel" is not a keyword (French for frost).
- A2 (LensDirector): cycled lenses are remembered per work for the visit only (not stored). The gel is the most colourful palette entry of another work (others in a slug-seeded order, grey palettes skipped; amber `#ff9a3c` if none). Multiple-exposure partners are works of the same zone, or of the same territory for works without a zone; the first partner whose texture is already loaded is used.

# Plan: The Lens

Track: `lens_20261111` · Spec: [spec.md](./spec.md) · Workflow: [../../workflow.md](../../workflow.md)

## Phase 1: Lens logic [checkpoint: 0a432ca]

- [x] Task: `LensDirector` (technique → mode mapping, seeded fallback, cycling) — Red/Green with property tests `36d7b06`
- [x] Task: `LensCrossfade` + `LensUniforms` (pointer region, velocity smoothing, touch fade) — Red/Green `0a432ca`
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) `0a432ca` — check 0/0, test:e2e 0/0 (CI=true / CI unset)

## Phase 2: Shaders [checkpoint: 15d0198]

- [x] Task: Shared GLSL chunk (pointer mask, tier defines) + shader compile test harness (headless WebGL in Playwright) `05a2893`
- [x] Task: Colour filter + Mirror fold shaders with visual snapshots `9c0e820`
- [x] Task: Multiple exposure + Fracture shaders with visual snapshots `93163ff`
- [x] Task: Light leak + ICM shaders with visual snapshots `e4888e2`
- [x] Task: Low-tier variants `8d71f14`
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) `15d0198` — check 0/0, test:e2e 0/0 (CI=true / CI unset; first run: check 2 from an e2e type error, fixed in 15d0198)

## Phase 3: Integration [checkpoint: d8dce9b]

- [x] Task: Wire lens into `ApparitionMesh`; Shift / two-finger "see unaltered" `90ec068`
- [x] Task: Touch behaviour e2e (emulated touch) + fps trace with lens active `2bfd05f`
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) `d8dce9b` — check 0/0, test:e2e 0/0 (CI=true / CI unset), 190 e2e passed

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
- A3 (Integration): L (either case) cycles forwards only (Shift is reserved for "see unaltered"); the first L with no lens shown brings the lens to the faced work. A two-finger tap toggles "see unaltered"; a single short tap still opens the work, long presses and two-finger taps never do. Fade-outs: finger lifted 600 ms, mouse left 250 ms, see unaltered 120 ms.
- A4 (Tests): high-tier touch is emulated as a fine-pointer laptop with touch switched on after boot, because Chromium reports a coarse pointer for emulated touch devices (which selects the low tier). The ADR 0008 harness is served through `page.route`, so the site build is unchanged.
- A5 (Scope): the inline-JSON fix was applied to the two other inline JSON blocks with the same flaw (contact form work titles, JSON-LD), using the same helper.

## Out-of-scope findings

- On very dark works (e.g. *Arrivée*) the motion-blur lens with a still pointer is subtle (idle vertical pan of 2.5 % of the work's height); the artist may want a longer idle streak. No change made.
- The real-phone ≥ 40 fps check in `docs/perf.md` is still manual and pending (now also with the lens).

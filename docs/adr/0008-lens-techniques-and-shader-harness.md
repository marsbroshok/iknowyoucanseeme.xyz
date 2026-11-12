# 8. The lens: techniques read from captions, shaders checked in a route-served harness

Date: 2026-11-12

## Status

Accepted

## Context

Track `lens_20261111` adds the lens: six fragment-shader effects, each one of the artist's real camera techniques, drawn over the work under the pointer. Two questions had no obvious answer.

1. **Default lens per work.** The spec maps caption techniques to lenses (mirror → mirror fold, ND / filter → colour filter, ICM → motion blur, multiple exposure → multiple exposure). Every work's `techniques[]` field is empty; the techniques are named only in titles ("Cygne (ICM) 7", "Éclipse au miroir") and in the artist's own caption notes (`sourceNotes`: "Custom handheld mirror deflections, selective neutral density", `#icm`).
2. **Verifying the shaders.** The spec asks for screenshots per lens on a fixed test texture, tolerance-based, stored under `tests/visual/`. The shaders live in `src/world/gl/` (ADR 0006), and the site build contains no page that could show them on a test texture.

## Decision

- At build time, `src/world/manifest/TechniqueHints.ts` reads the declared techniques, both titles and the caption notes, and keeps only technique keys (`mirror`, `filter`, `icm`, `multiple-exposure`), by whole-word EN/FR matching. Only the keys enter the page's world manifest; caption text does not. `LensDirector` maps the first key in priority order (mirror, filter, ICM, multiple exposure) to the default lens, else picks one seeded by the slug.
- All lens decisions (mapping, cycling, gel colour, partner work, crossfade weights, pointer smoothing, touch fade, tier variants) are pure modules in `src/world/core/` under the 100 % gate. The GLSL (`src/world/gl/LensShader.ts`) and the uniform wiring (`ApparitionMesh`, `DriftWorld`) stay in `src/world/gl/`. The coverage exclusion does not grow.
- The shaders are checked in Chromium by `tests/e2e/lens.visual.spec.ts`. It serves a harness page (`tests/e2e/visual/harness.ts`) through `page.route`: TypeScript is transpiled per request with the `typescript` package that is already a dependency, and Three.js comes from `node_modules`. The harness draws the real `ApparitionMesh` with a computed test texture (no image file, no font). Every lens is checked by pixel statistics that hold on any GPU and in SwiftShader (only the soft circle changes, in the way the technique would; a redraw without lens after any lens equals the first one), and by a reference picture in `tests/visual/` compared with a tolerance (`snapshotPathTemplate` without a platform suffix).
- The fracture lens uses a hash without `sin()`, so its shard layout is the same on every GPU.
- **Declared techniques override inferred hints** (artist decision 2026-11-12, track `threshold-gaze_20261111`): when a work declares techniques (`techniques:` in its work file, written by the intake from `intake-config/selection.yaml`), the lens keys come only from them (`lensTechniques` in `TechniqueHints.ts`); titles and caption notes are read only when nothing is declared. *Les Reflets I–III* declare a colour filter, so the word "reflets" in their titles no longer gives them the mirror lens. Declared techniques are shown on work pages through `ui.yaml` labels (`technique_<key>`), so French pages stay French.

## Considered & Rejected Alternatives

- **Fill in `techniques[]` in the work YAML files.** Rejected: the field is shown on the work pages ("size · year · medium · techniques"), so this would change published copy in both languages while the artist is away; the caption notes already hold the artist's own words.
- **Ship the caption notes to the page and match there.** Rejected: it adds text to every home page that is not shown to anyone, and moves a build-time decision into the visitor's browser.
- **A test page in the site build (or behind `PUBLIC_DRIFT_DEBUG`).** Rejected: the dist guard keeps module scripts off every page except the home pages (ADR 0007), and test code would sit in the production source tree.
- **Bundle the harness with esbuild or Vite.** Rejected: neither is a direct dependency; `typescript.transpileModule` with an import map is enough for a handful of modules.
- **Exact PNG snapshots only.** Rejected: GPU and SwiftShader differ in the last bits; exact snapshots would be flaky, and a loose snapshot alone could pass an unchanged picture. The pixel statistics are the real check; the pictures are a visual record with a tolerance.
- **Fracture hash with `fract(sin(x) * 43758.5453)`.** Rejected: `sin` precision differs between GPUs, which moves the shards and breaks reference pictures across machines.

## Consequences

- A new work whose caption names a technique gets the matching lens without any data change; a wrong match is fixed by editing the caption or by declaring `techniques[]`.
- New lens code must keep its decisions in `src/world/core/` and add a harness check in `tests/e2e/lens.visual.spec.ts`; reference pictures are refreshed with `npx playwright test tests/e2e/lens.visual.spec.ts --update-snapshots` after a deliberate change.

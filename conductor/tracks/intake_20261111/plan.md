# Plan: Content Intake Pipeline

Track: `intake_20261111` · Spec: [spec.md](./spec.md) · Workflow: [../../workflow.md](../../workflow.md)

Every task follows Red → Green → Refactor, commits per task (Conventional Commits), and keeps 100% coverage on new code. Work happens in `./.worktrees/intake_20261111` on branch `track/intake_20261111`.

## Phase 1: Toolchain & schemas

- [x] Task: Bootstrap npm/TypeScript toolchain
    - [ ] Add `package.json` (type: module, scripts: test, test:coverage, lint, typecheck, check, intake), strict `tsconfig.json`, `vitest.config.ts` (v8 coverage, 100% thresholds on `src/**` + `tools/**`), ESLint flat config + Prettier
    - [ ] Write a smoke test proving the coverage gate fails below 100% (config assertion test)
    - [ ] Verify the legacy Hugo files are untouched (`git diff --stat` shows only new files plus `.gitignore` additions)
- [x] Task: Zod content schemas (`src/content/schema/`)
    - [ ] Red: tests for `Territory`, `Zone`, `Work`, `Exhibition` (valid fixtures pass; missing FR title, bad slug, unknown zone, Leak zone outside Dreamland, people without consent rejected)
    - [ ] Red: invariant test that no schema has a `price`-like key (`price`, `prix`, `cost`, `eur`)
    - [ ] Green: implement one schema per file plus `index.ts` barrel; export inferred types
    - [ ] Property test (fast-check): every generated valid `Work` round-trips through YAML stringify/parse unchanged
- [x] Task: Phase Verification - [x] Task: Phase Verification - [x] Task: Phase Verification - [x] Task: Phase Verification - [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md) Checkpoint (Refer to workflow.md) Checkpoint (Refer to workflow.md) Checkpoint (Refer to workflow.md) Checkpoint (Refer to workflow.md)

## Phase 2: Readers (export & catalogue)

- [x] Task: `IgExportParser`
    - [ ] Red: synthetic HTML fixtures mirroring the export structure (caption `h2`, media links, date div; carousel; reel; entity-encoded caption; missing caption)
    - [ ] Red: path-whitelist test: the parser refuses paths outside `your_instagram_activity/media/` and `media/{posts,reels}/`
    - [ ] Red: dates parsed to ISO (`Nov 10, 2026 1:29 am` → `2026-11-10T01:29`)
    - [ ] Green: implement with `node-html-parser`; clear error on missing files
- [x] Task: `CatalogueReader` + `intake-config/catalogue.yaml`
    - [ ] Author `catalogue.yaml`: the 15 works (FR title, size w×h cm, PDF image index, proposed zone); **no prices**
    - [ ] Red: schema validation of the config; 15 unique slugs; slugify keeps French meaning (`les-echos-du-passe`, `la-frontiere-s-estompe`, `un-etranger`)
    - [ ] Green: reader + `PdfThumbnailExtractor` adapter (spawns `pdfimages -j`); adapter integration-tested against a tiny generated PDF fixture or skipped with an explicit prerequisite check that fails loudly (never silently)
- [x] Task: Phase Verification - [x] Task: Phase Verification - [x] Task: Phase Verification - [x] Task: Phase Verification - [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md) Checkpoint (Refer to workflow.md) Checkpoint (Refer to workflow.md) Checkpoint (Refer to workflow.md) Checkpoint (Refer to workflow.md)

## Phase 3: Image analysis

- [x] Task: `PerceptualHasher` (dHash 64-bit)
    - [ ] Red: properties: distance(a,a)=0; symmetry; 0 ≤ d ≤ 64; a resized/re-encoded copy stays within threshold; unrelated synthetic images exceed it
    - [ ] Green: pure function over a grayscale 9×8 pixel buffer + `sharp` adapter producing the buffer
- [x] Task: `PaletteExtractor`
    - [ ] Red: properties: returns exactly k (≤5) valid `#rrggbb` hex values; deterministic (seeded); a single-colour image returns that colour first
    - [ ] Green: deterministic k-means on a downsampled RGB buffer
- [x] Task: `ImageProcessor`
    - [ ] Red: long edge ≤ 2400 px, never upscales, aspect ratio preserved (property test over dimensions); output has no EXIF/GPS (fixture with GPS EXIF); sRGB output
    - [ ] Green: `sharp` pipeline writing JPEG q≈88, deterministic output
- [x] Task: Phase Verification - [x] Task: Phase Verification - [x] Task: Phase Verification - [x] Task: Phase Verification - [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md) Checkpoint (Refer to workflow.md) Checkpoint (Refer to workflow.md) Checkpoint (Refer to workflow.md) Checkpoint (Refer to workflow.md)

## Phase 4: Proposals & review loop

- [x] Task: `ProposalEngine` + `intake-config/rules.yaml`
    - [ ] Author `rules.yaml`: territory-2 posts (2026-11-10 ICM, 2026-08-29 eclipse); Leak candidates (2025-05-02 Venice portraits, 2026-10-19 Calaca clay); 2019 origin posts (2019-12-03…13)
    - [ ] Red: best match plus ≤2 alternatives per catalogue work ranked by distance; rules select by post date/ID only (no hardcoded IDs in code); deterministic ordering
    - [ ] Green: implement
- [x] Task: `SelectionStore` (selection.yaml)
    - [ ] Red: property test: merging new proposals into an edited selection never overwrites artist-edited fields and never drops entries; new entries are appended
    - [ ] Green: implement with `yaml` (comments preserved where possible)
- [x] Task: `ReviewSheetRenderer`
    - [ ] Red: HTML snapshot contains each catalogue thumbnail beside its match and alternatives, scores, post dates and caption excerpts; all text HTML-escaped (XSS test with `<script>` caption)
    - [ ] Green: static HTML + inline CSS written to `intake/review/index.html` (relative image paths)
- [x] Task: Phase Verification - [x] Task: Phase Verification - [x] Task: Phase Verification - [x] Task: Phase Verification - [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md) Checkpoint (Refer to workflow.md) Checkpoint (Refer to workflow.md) Checkpoint (Refer to workflow.md) Checkpoint (Refer to workflow.md)

## Phase 5: Generation & CLI

- [x] Task: `ContentGenerator`
    - [ ] Red: kept entries → schema-valid `src/content/{works,territories,zones,exhibitions}/*.yaml`; dropped entries absent; source notes carry the original caption and date; exhibitions MPAA 2019 + Atelier 51 2025; `sources/origin-2019.yaml` written
    - [ ] Red: originals swap: `intake/originals/<slug>.*` or `<slug>-<n>.*` replaces the Instagram source and sets `source: original`
    - [ ] Red: idempotency: two runs → byte-identical output
    - [ ] Green: implement
- [ ] Task: CLI (`tools/intake/cli.ts`: `catalogue`, `propose`, `generate`)
    - [ ] Red: argument parsing and help text test (interface parity); non-zero exit with a readable message on missing export
    - [ ] Green: implement with `node:util.parseArgs`
- [ ] Task: Guard test against forbidden committed content
    - [ ] Red/Green: test scanning `src/content/**` and `src/assets/**`: no `€`, no price keys, no files > 2400 px, no EXIF GPS, nothing under `intake/`
- [x] Task: Real-data run (no new code)
    - [ ] Run `catalogue` → `propose` on the real export; pre-fill `selection.yaml` (catalogue matches keep=true; territory-2 all keep=true; Leak portraits keep=true with consent confirmed; clay creatures keep=true)
    - [ ] Run `generate`; commit generated content and web masters; record match confidence and doubtful matches in the track report for the artist's morning review
- [ ] Task: Docs: README "Content intake" section (prerequisites, folders, propose → edit → generate loop, originals swap)
- [x] Task: Phase Verification - [x] Task: Phase Verification - [x] Task: Phase Verification - [x] Task: Phase Verification - [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md) Checkpoint (Refer to workflow.md) Checkpoint (Refer to workflow.md) Checkpoint (Refer to workflow.md) Checkpoint (Refer to workflow.md)

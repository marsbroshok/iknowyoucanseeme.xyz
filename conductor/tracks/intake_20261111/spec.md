# Spec: Content Intake Pipeline (Instagram export + Dreamland catalogue)

**Track ID:** `intake_20261111` · **Type:** Feature · **Phase:** 0 (Intake)

## Overview

Turn the artist's raw material (Instagram HTML export, the *Dreamland* catalogue PDF, and later the high-res originals) into **reviewed, schema-valid content files and web-ready images** that the Astro site (Phase 1) will consume. Selection stays in the artist's hands: the tool *proposes*, the artist *approves* in a plain YAML file, and the tool *generates*. The track also sets up the project's TypeScript toolchain and defines the shared content schemas once.

## Context

- The Instagram export is HTML (not JSON): canonical posts are in `your_instagram_activity/media/posts_1.html` and `reels.html`, with media under `media/posts/` and `media/reels/` (~1080 px).
- The catalogue PDF holds 15 works (FR title, size in cm, price) as 15 embedded JPEGs (`pdfimages`).
- Territories (see `conductor/product.md`): **Dreamland** (zones Arrival / Lens / Leak) and **The border is thin / La frontière s'efface** (2026).
- Raw material lives in the git-ignored `intake/` directory and is never committed.

## Functional Requirements

### FR1 Toolchain foundation
- Root `package.json` (npm), strict `tsconfig.json`, Vitest with v8 coverage, fast-check, ESLint (typescript-eslint) + Prettier.
- Scripts: `test`, `test:coverage`, `lint`, `typecheck`, `check`, and `intake` (CLI entry).
- Coexists with the legacy Hugo files; no Hugo file is modified or removed in this track.

### FR2 Shared content schemas (Zod)
- Module `src/content/schema/` exporting Zod schemas and inferred types for: `Territory`, `Zone`, `Work`, `Exhibition`.
- `Work` fields: `slug`, `title` `{fr, en}` (FR original title; EN may be empty for now), `territory`, `zone` (Dreamland only), `year`, `medium` (`photo | ceramic`), `techniques[]`, `size` (`{w, h, unit: 'cm'}`, optional), `availability` (`available | sold | not-for-sale | unknown`), `people` (`{consent: 'confirmed'}` when identifiable people appear), `images[]` (`{src, source: 'instagram' | 'original', width, height, palette[]}`), `sourceNotes` (original caption text and post date).
- **No price field exists anywhere in the schema** (product rule: no prices).
- Schemas are framework-agnostic so Astro content collections can import them in Phase 1.

### FR3 Instagram export parser
- Parses `posts_1.html` and `reels.html` into typed `IgPost { id, date (ISO), caption, media[] }`, decoding HTML entities and preserving caption line breaks.
- Ignores `posts.html` metadata duplicates, stories, and every private folder (messages, contacts, logins); the parser never reads outside `your_instagram_activity/media/` and `media/{posts,reels}/`.
- Fails loudly with a clear error if the expected files or structure are missing.

### FR4 Catalogue ingestion
- A committed `intake-config/catalogue.yaml` lists the 15 works (FR title, size, PDF image index). Prices from the PDF are deliberately **not** transcribed.
- `intake catalogue` extracts the PDF's embedded thumbnails into `intake/catalogue/` (via `pdfimages`), for matching only.

### FR5 Matching & proposals
- Perceptual hash (dHash) of every Instagram image and catalogue thumbnail; for each catalogue work, propose the best Instagram match with a similarity score and up to 2 alternatives.
- Propose candidates for:
  - **Territory 2:** media from the 2026 ICM post (Nov 2026) and the eclipse post (Aug 2026).
  - **Dreamland / Leak:** Venice colour-leak portraits (May 2025, Paul Rousteau workshop) and clay creatures from the Calaca workshop post (Oct 2026).
- Proposals are rules over post date/ID, configured in `intake-config/rules.yaml`, never hardcoded in code.

### FR6 Review loop
- `intake propose` writes:
  - `intake/review/index.html`: a local contact sheet showing each catalogue thumbnail next to its proposed match and alternatives, and every candidate image with its post date and caption excerpt.
  - `intake-config/selection.yaml` (committed): one entry per proposed image, with `keep`, `slug`, `title`, `territory`, `zone`, `people.consent`, and pre-filled values.
- Re-running `propose` **preserves the artist's existing edits** in `selection.yaml` and only adds new entries.

### FR7 Generation
- `intake generate` reads `selection.yaml` (kept entries only), validates against the Zod schemas, and writes:
  - `src/content/works/<slug>.yaml`, `src/content/territories/*.yaml`, `src/content/zones/*.yaml`, `src/content/exhibitions/*.yaml` (MPAA 2019, Atelier 51 2025).
  - Web masters at `src/assets/works/<slug>/<n>.jpg`: sRGB, EXIF/GPS stripped, long edge ≤ 2400 px (never upscaled).
  - A dominant palette (5 colours, hex) per image, stored in the work file.
- **Originals swap:** if a file in `intake/originals/` is named `<slug>.*` (or `<slug>-<n>.*`), it replaces the Instagram source and the image's `source` becomes `original`.
- Idempotent: re-running with unchanged input produces byte-identical output.

### FR8 Origin story source
- The 2019 *L'Emprunt, la Citation* posts' captions and dates are exported into `src/content/sources/origin-2019.yaml` as raw source notes for the future About and gaze copy. No images from 2019 are published in this track.

## Non-Functional Requirements

- **Privacy:** the tool only reads the whitelisted export paths; no private export data is written anywhere in the repo.
- **Quality gates (workflow.md):** TDD; 100% statement and branch coverage for new code; zero ESLint/TypeScript errors. Property-based tests (fast-check) for: dHash distance (symmetry, identity, bounds), palette extraction (count, valid hex, determinism), size downscale (never upscales, preserves aspect ratio), selection merge (artist edits are never lost).
- **Architecture:** one primary class/module per file (`IgExportParser`, `CatalogueReader`, `PerceptualHasher`, `PaletteExtractor`, `ProposalEngine`, `SelectionStore`, `ReviewSheetRenderer`, `ContentGenerator`, `ImageProcessor`, CLI). Pure logic is separated from filesystem/sharp I/O so it can be unit-tested; I/O adapters get integration tests on small fixture files (synthetic fixtures, **not** the artist's private export).
- **Dependencies:** `sharp` (images), `zod`, `yaml`, `node-html-parser` (or equivalent), `fast-check`. `pdfimages` (poppler) is a documented system prerequisite.
- **Docs:** README section "Content intake" (prerequisites, folder layout, the propose → edit → generate loop, originals swap).

## Acceptance Criteria

1. `npm run check` passes (typecheck, lint, tests at 100% coverage for new code).
2. Running `npm run intake -- propose` on the real export yields a review sheet in which all 15 catalogue works have a proposed Instagram match (verified by the artist).
3. After the artist edits `selection.yaml`, `npm run intake -- generate` produces schema-valid content for both territories and the 2 exhibitions, with web images ≤ 2400 px and no EXIF/GPS.
4. No committed file contains prices, private export data, or print-master images (verified by a test scanning `src/content/` and `src/assets/`).
5. Dropping `intake/originals/<slug>.jpg` and re-running `generate` swaps the source to `original` without other changes.
6. Hugo legacy site still builds unchanged (no legacy file touched).

## Assumptions (overnight draft; for the artist to review)

- A1. For the first generation run, selection is pre-filled automatically: best catalogue match kept, all territory-2 media kept, Venice portraits kept (consent confirmed by the artist), clay creatures kept. The artist edits `selection.yaml` in the morning and reruns `generate`.
- A2. Years: Dreamland catalogue works = 2025; territory 2 = 2026; Venice portraits = 2025; clay sketches = 2026.
- A3. Zone split for the 15 works follows the exhibition logic: **Arrival** = Immersion I, Immersion II, Solitude, Rêver en rose, Perdu dans les étoiles, Arrivée, Nouveau Soleil, Les échos du passé; **Lens** = La Découverte, Dissonance, Les Reflets I–III, La Frontière s'estompe, Un Étranger.
- A4. Availability = `unknown` for all works until the artist says otherwise.
- A5. Techniques are left empty unless the caption states them (e.g. eclipse: mirror deflection, ND filter, internal reflections; ICM).

## Out of Scope

- Astro site, pages, or any UI (Phase 1).
- Writing or translating copy, fragments or statements (separate copy track).
- Stories; the 2020–21 archive series; travel/personal posts.
- Ceramics beyond the unfired workshop creatures (later).
- 3D scans, audio.

## Prerequisites

- Package manager is npm (see tech-stack Decision Notes); Node v25 is present.
- `pdfimages` (poppler) is present.

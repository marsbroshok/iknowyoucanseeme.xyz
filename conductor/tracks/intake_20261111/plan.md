# Plan: Content Intake Pipeline

Track: `intake_20261111` · Spec: [spec.md](./spec.md) · Workflow: [../../workflow.md](../../workflow.md)

Every task follows Red → Green → Refactor, commits per task (Conventional Commits), and keeps 100% coverage on new code. Work happens in `./.worktrees/intake_20261111` on branch `track/intake_20261111`.

## Review fixes
- [x] Fix `src/intake/CatalogueReader.ts:52,55` TS18046/TS2339 (narrow via `if (error instanceof Error...)`): `3825d99`
- [x] Fix `src/intake/IgExportParser.ts:25,44` TS2339/TS2551 (cast `root as import('node-html-parser').HTMLElement` and use `.text`): `f248bbb`
- [x] Fix `tests/catalogueReader.test.ts:64,67,76,88` TS18046/TS2345 (narrow `e instanceof Error` and type `fakeExec`): `6d07767`
- [x] Fix `tests/cli.test.ts:53,82,94-95,110,136` TS2345/TS2741 (type `p: fs.PathLike` and add `pdf_index: 0`): `4a180ff`
- [x] Worktree environment: `npm run lint` crashes with `Cannot find module 'eslint-scope/dist/eslint-scope.cjs'`. Fix: run `npm ci`
- [x] Fix 4 & 10: Placeholder titles in schema and generator.
- [x] Fix 1: Broken catalogue image link in `ReviewSheetRenderer.ts`.
- [x] Fix 2: Remove error swallowing in `ContentGenerator.ts` and fix tests.
- [x] Fix 3: Fix metadata for sketches and Venice portraits in `ContentGenerator.ts`.
- [x] Fix 5: Filter out 2019 posts from matching & assets.
- [x] Fix 6: Test evasion in `forbidden.test.ts`.
- [x] Fix 7 & 12: Never upscale pipeline & test, plus fast-check property test.
- [x] Fix 14: Exclude matched images from t2/leak proposals.
- [x] Fix 11 & 13: Remove `v8 ignore` in CLI, fix any warnings, add TSDocs.
- [x] Fix 8 & 9: Manual re-matching of La Découverte and Venice portraits (during propose/generate).

## Phase 1: Toolchain & schemas

- [x] Task: Bootstrap npm/TypeScript toolchain
- [x] Task: Zod content schemas (`src/content/schema/`)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Readers (export & catalogue)

- [x] Task: `IgExportParser`
- [x] Task: `CatalogueReader` + `intake-config/catalogue.yaml`
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Image analysis

- [x] Task: `PerceptualHasher` (dHash 64-bit)
- [x] Task: `PaletteExtractor`
- [x] Task: `ImageProcessor`
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 4: Proposals & review loop

- [x] Task: `ProposalEngine` + `intake-config/rules.yaml`
- [x] Task: `SelectionStore` (selection.yaml)
- [x] Task: `ReviewSheetRenderer`
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 5: Generation & CLI

- [x] Task: `ContentGenerator`
- [x] Task: CLI (`tools/intake/cli.ts`: `catalogue`, `propose`, `generate`)
- [x] Task: Guard test against forbidden committed content
- [x] Task: Real-data run (no new code)
- [x] Task: Docs: README "Content intake" section (prerequisites, folders, propose → edit → generate loop, originals swap)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

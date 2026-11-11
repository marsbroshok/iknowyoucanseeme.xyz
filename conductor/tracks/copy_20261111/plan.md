# Plan: Copy Drafts

Track: `copy_20261111` · Spec: [spec.md](./spec.md) · Workflow: [../../workflow.md](../../workflow.md)

## Phase 1: Schema & guards

- [x] Task: `TextBlock` schema (97ce9ce) and extensions to `Work`, `Territory`, `Zone`, plus the `pages` collection
    - [x] Red: schema tests (status enum, both languages required, sources non-empty)
    - [x] Green: implement; regenerate nothing yet
- [x] Task: Vocabulary - [ ] Task: Vocabulary & typography guards typography guards (fa33f8c)
    - [x] Red: guard tests over fixture texts (a literary word fails; a long sentence fails; missing NBSP before `?` in FR fails; straight quotes in FR fail)
    - [x] Green: `CopyGuard` module (deny-list in `content-config/vocabulary-deny.yaml`, not in code)
- [x] Task: Phase Verification - [x] Task: Phase Verification - [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md) Checkpoint (Refer to workflow.md) Checkpoint (Refer to workflow.md)

## Phase 2: Drafting

- [x] Task: Territory and zone statements (16f7303) (EN + FR) with sources
- [x] Task: Work fragments for every kept work (16f7303) (EN + FR) with sources
- [x] Task: Pages: about (16f7303) (incl. 2019 origin), gaze, threshold, contact, legal (© all rights reserved, privacy: cookieless analytics)
- [x] Task: Microcopy file `src/content/pages/ui.yaml` (16f7303)
- [x] Task: Instagram bio proposal `docs/copy/instagram-bio.md` (16f7303)
- [x] Task: Run guards on all content; fix drafts until green (16f7303)
- [x] Task: Generate `docs/copy/REVIEW.md` (script `npm run copy:review`, tested) (16f7303) listing every text block side by side EN | FR with status
- [x] Task: Phase Verification - [x] Task: Phase Verification - [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md) Checkpoint (Refer to workflow.md) Checkpoint (Refer to workflow.md)

## Inherited Findings

From the `intake_20261111` review (non-blocking, fix as the first task of this track):

- [x] Task: `tests/catalogueReader.test.ts` (91ab906) (~L58–70): a try/catch test passes even if no error is thrown (`expect(true).toBe(true)`). Rewrite it with `await expect(...).rejects.toThrow(...)` so it fails when nothing throws.
- [x] Task: `src/intake/CatalogueReader.ts` (91ab906) `PdfThumbnailExtractor` builds a shell string with interpolated paths (`pdfimages -j "${pdfPath}" ...`). Switch to `execFile('pdfimages', ['-j', pdfPath, prefix])` (no shell), and add a test with a path containing quotes/spaces.

## Review fixes
6de8bcf docs: regenerate REVIEW.md
1c7b6b2 test: fix test suites for concurrent execution
8b29f46 content: fix facts in about and zone statements
e1ba32d content: add unique fragments to all 40 works
2f6b9c6 test: add integrity tests for works fragments and facts
7005e76 test: fix copyReview.test.ts temp file leak preventing vitest exit

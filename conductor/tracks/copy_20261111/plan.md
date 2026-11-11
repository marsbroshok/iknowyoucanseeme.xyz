# Plan: Copy Drafts

Track: `copy_20261111` · Spec: [spec.md](./spec.md) · Workflow: [../../workflow.md](../../workflow.md)

## Phase 1: Schema & guards

- [ ] Task: `TextBlock` schema and extensions to `Work`, `Territory`, `Zone`, plus the `pages` collection
    - [ ] Red: schema tests (status enum, both languages required, sources non-empty)
    - [ ] Green: implement; regenerate nothing yet
- [ ] Task: Vocabulary & typography guards
    - [ ] Red: guard tests over fixture texts (a literary word fails; a long sentence fails; missing NBSP before `?` in FR fails; straight quotes in FR fail)
    - [ ] Green: `CopyGuard` module (deny-list in `content-config/vocabulary-deny.yaml`, not in code)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Drafting

- [ ] Task: Territory and zone statements (EN + FR) with sources
- [ ] Task: Work fragments for every kept work (EN + FR) with sources
- [ ] Task: Pages: about (incl. 2019 origin), gaze, threshold, contact, legal (© all rights reserved, privacy: cookieless analytics)
- [ ] Task: Microcopy file `src/content/pages/ui.yaml`
- [ ] Task: Instagram bio proposal `docs/copy/instagram-bio.md`
- [ ] Task: Run guards on all content; fix drafts until green
- [ ] Task: Generate `docs/copy/REVIEW.md` (script `npm run copy:review`, tested) listing every text block side by side EN | FR with status
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

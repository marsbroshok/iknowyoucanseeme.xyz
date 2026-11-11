# Plan: Launch

Track: `launch_20261111` · Spec: [spec.md](./spec.md) · Workflow: [../../workflow.md](../../workflow.md)

## Phase 1: Retire Hugo

- [ ] Task: Create annotated tag `legacy-hugo` on the base commit (local only)
- [ ] Task: Remove Hugo files in one commit; verify `npm run check` still green
- [ ] Task: Rewrite `README.md`; update `LICENSE.md` holder/year (all rights reserved notice for images documented)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Deploy & analytics

- [ ] Task: `deploy.yml` + `public/CNAME`; test: workflow YAML schema/`actionlint` script check
- [ ] Task: `Analytics` module (`track()` + script injection when code set) — Red: tests for enabled/disabled config — Green
- [ ] Task: Old-URL redirect pages — Red: build test that each legacy path exists with meta-refresh + canonical — Green
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Exhibition labels & docs

- [ ] Task: `QrCode` wrapper (SVG) — Red: decode round-trip test — Green
- [ ] Task: Labels page `/{lang}/labels/` (noindex, print CSS, excluded from sitemap)
- [ ] Task: `docs/deploy.md` cutover + rollback runbook
- [ ] Task: Clean-clone build test
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

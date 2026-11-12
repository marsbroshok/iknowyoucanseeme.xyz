# Plan: Launch

Track: `launch_20261111` · Spec: [spec.md](./spec.md) · Workflow: [../../workflow.md](../../workflow.md)

## Phase 1: Retire Hugo [checkpoint: 2b3b3e0]

- [x] Task: Create annotated tag `legacy-hugo` on the base commit (local only) — tag on `d8c2ee8` (no commit; tags are repo-global)
- [x] Task: Remove Hugo files in one commit; verify `npm run check` still green `8c8b021`
- [x] Task: Rewrite `README.md`; update `LICENSE.md` holder/year (all rights reserved notice for images documented) `2b3b3e0`
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) — at `2b3b3e0`: `npm run check` exit 0 (CI=true) / 0 (CI unset); `npm run test:e2e` exit 0 (CI=true, 116 passed) / 0 (CI unset)

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

## Inherited Findings

- [ ] Task (BLOCKING for deploy): `package-lock.json` has ~650 `resolved` URLs pointing at the local machine's internal npm proxy (`http://airlock-proxy…:999/npm/artifact-foundry-prod/npm-3p-limited-internal-use/...`), because this machine's npm `registry` is that proxy. GitHub Actions cannot reach it, so `npm ci` in `deploy.yml` would fail. Fix so that CI on GitHub installs from the public registry while local installs on this machine keep working:
    - Preferred: a tested script `scripts/normalize-lockfile.ts` that rewrites `resolved` to canonical public URLs (`https://registry.npmjs.org/<name>/-/<basename>-<version>.tgz`, handling scoped names) keeping `integrity`; run it in a test that asserts no private host remains in the committed lockfile; verify locally that `npm ci` still works (npm maps registry hosts via `replace-registry-host`; set it in a project `.npmrc` if needed, never edit the user's `~/.npmrc`).
    - Verify integrity hashes match public tarballs for a sample (and document any mismatch); if public access is blocked from this machine, document the verification step for the artist in `docs/deploy.md` (first GitHub Actions run).
    - Add a lockfile guard test (no `airlock-proxy`/private hosts) to the gates.
- [ ] Task: Footer/skip-link localisation was fixed in awake-layer; keep the FR/EN UI-string regression test green when removing Hugo.

## Assumptions ledger

- `.github/FUNDING.yml` (gcushen / HugoBlox sponsor links) is template boilerplate and was removed with the template.
- `package.json` name/description were leftovers (intake track, HugoBlox); renamed to `iknowyoucanseeme`, marked `private`.
- Code license stays MIT (holder → Alexander Usoltsev, 2026); works, images and texts are all rights reserved (matches `legal.yaml` `image_use`).

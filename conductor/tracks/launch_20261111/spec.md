# Spec: Launch (Deploy, Cutover, Labels, Analytics)

**Track ID:** `launch_20261111` · **Type:** Chore/Feature · **Phase:** 1 (go live) · **Depends on:** `awake-layer_20261111`

## Overview

Make the Astro site deployable on GitHub Pages, retire the Hugo site safely, add cookieless analytics and printable exhibition QR labels. **Pushing and switching the Pages source are human actions**: this track prepares everything locally and documents the exact cutover steps.

## Functional Requirements

- **FR1 Legacy preservation:** annotated local tag `legacy-hugo` on the last Hugo commit before removal.
- **FR2 Hugo removal:** delete Hugo-only files (`config/`, `content/`, `layouts/`, `assets/`, `hugo-blox/`, `static/`, `_archived/`, `notebooks/`, `go.mod`, `hugoblox.yaml`, `netlify.toml`, Hugo workflows) in one commit; keep `LICENSE.md` (update holder/year), rewrite `README.md` (project overview, dev commands, content intake, deploy).
- **FR3 Deploy workflow:** `.github/workflows/deploy.yml` (on push to `main` + manual): `npm ci`, `npm run check`, `astro build`, upload with `actions/upload-pages-artifact`, deploy with `actions/deploy-pages`. Secrets/vars: `PUBLIC_WEB3FORMS_KEY`, `PUBLIC_GOATCOUNTER_CODE` read from repository variables. `public/CNAME` = `www.iknowyoucanseeme.xyz`.
- **FR4 Analytics:** GoatCounter script only when `PUBLIC_GOATCOUNTER_CODE` is set; custom events helper `track(event, data)` (no-op only when analytics is disabled by config, documented) for later drift metrics (`drift-time`, `work-approached`).
- **FR5 QR labels:** `/{lang}/labels/` (noindex, excluded from sitemap): printable A4 sheet, one label per work (FR title, size, year, medium, QR → canonical work URL). QR SVG generated at build (tested library wrapper).
- **FR6 Redirects of old URLs:** `/dreamland/` → `/en/territories/dreamland/`, `/blog/…`, `/uses/`, `/tags/` → `/en/` via static meta-refresh pages with canonical links.
- **FR7 Cutover doc:** `docs/deploy.md`: set Pages source to "GitHub Actions", add repository variables, push `main` and the `legacy-hugo` tag, verify DNS/HTTPS, rollback = redeploy `legacy-hugo`.

## Acceptance Criteria

1. Workflow passes `actionlint` (tested in CI script) and builds locally via `act`-free dry run (`npm run build` in clean clone).
2. Tag `legacy-hugo` exists locally; no Hugo file remains on the track branch.
3. Labels page prints one label per work with a scannable QR (QR decode test).
4. Old URLs resolve to the new pages.

## Assumptions

- GitHub Pages remains the host; the custom domain is already configured at the DNS level.
- Nothing is pushed by the agent. The artist pushes after reviewing.

## Out of Scope

- DNS changes; the WebGL world.

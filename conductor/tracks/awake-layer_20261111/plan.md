# Plan: Awake Layer Pages

Track: `awake-layer_20261111` · Spec: [spec.md](./spec.md) · Workflow: [../../workflow.md](../../workflow.md)

## Phase 1: Data helpers

- [ ] Task: `WorkQueries` (by territory, by zone order, prev/next, index sort) — Red: unit + property tests (prev/next form a consistent chain; zone order Arrival→Lens→Leak) — Green
- [ ] Task: `Availability` label resolver (never outputs a price; unknown/available → contact label) — Red/Green
- [ ] Task: `JsonLd` builders (`Person`, `VisualArtwork`) — Red: schema-shape tests — Green
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Pages

- [ ] Task: Awake home `/{lang}/` (Red: container render test of required sections → Green)
- [ ] Task: Territory pages
- [ ] Task: Work pages (+ prev/next, contact link with `?work=`)
- [ ] Task: Works index with territory anchors
- [ ] Task: Exhibitions, About, Legal
- [ ] Task: Contact page + `ContactForm` (key present vs absent behaviour; honeypot; progressive enhancement script tested in jsdom)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: SEO & quality

- [ ] Task: Sitemap with hreflang + robots (`@astrojs/sitemap` config test)
- [ ] Task: OG image build script `tools/og/OgImageRenderer.ts` (sharp + SVG text with embedded Fraunces) — Red: dimensions/format/determinism — Green
- [ ] Task: Guard test over `dist/`: no `€`, no price strings, every page has lang/canonical/hreflang
- [ ] Task: Playwright e2e: crawl all routes, axe on each, contact form flows (with mocked Web3Forms endpoint in the test harness only)
- [ ] Task: Lighthouse CI config (`lighthouserc.json`) with budgets for 3 representative pages
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Inherited Findings

From `astro-foundation_20261111` (non-blocking):

- [x] Task: `vitest.config.ts` excludes `tools/download-fonts.ts` from coverage. Either test it (pure parts: URL list, subset ranges) with the network call injected, or move it out of `tools/` into `scripts/` and document it as a one-off, network-dependent maintenance script that is excluded from coverage on purpose (ADR-worthy only if you keep it excluded).
- [x] Task: Build-time tooling quirks fixed on main (keep them): `typecheck` runs `astro sync` first; `typescript` pinned `~5.8.3` (typescript-eslint peer range); `overrides.@emnapi/runtime = 1.4.3`; Vitest excludes `.worktrees/**` and nested `node_modules`. Do not undo these.

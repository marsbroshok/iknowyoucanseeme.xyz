# Plan: Awake Layer Pages

Track: `awake-layer_20261111` · Spec: [spec.md](./spec.md) · Workflow: [../../workflow.md](../../workflow.md)

## Phase 1: Data helpers [checkpoint: db6d660]

- [x] Task: `WorkQueries` (by territory, by zone order, prev/next, index sort) — Red: unit + property tests (prev/next form a consistent chain; zone order Arrival→Lens→Leak) — Green `5bbe3ce`, property tests + coverage fix `db6d660`
- [x] Task: `Availability` label resolver (never outputs a price; unknown/available → contact label) — Red/Green `5bbe3ce`
- [x] Task: `JsonLd` builders (`Person`, `VisualArtwork`) — Red: schema-shape tests — Green `5bbe3ce`
- [x] Task: Phase Verification & Checkpoint — the fab8a50 checkpoint was red (coverage 99.91%, 2 lint warnings); fixed in `db6d660`

## Phase 2: Pages [checkpoint: 09c1066]

- [x] Task: Awake home `/{lang}/` (Red: container render test of required sections → Green) `a68b1cd`
- [x] Task: Territory pages `240d151`
- [x] Task: Work pages (+ prev/next, contact link with `?work=`) `c0c6413`
- [x] Task: Works index with territory anchors `3995ef0`
- [x] Task: Exhibitions, About, Legal `8945ecf`
- [x] Task: Contact page + `ContactForm` (key present vs absent behaviour; honeypot; progressive enhancement script tested in jsdom) `e63dbc2`
- [x] Task: Phase Verification & Checkpoint — axe landmark fix `09c1066`; `npm run check` and `npm run test:e2e` exit 0 with CI=true and with CI unset

## Phase 3: SEO & quality

- [ ] Task: Sitemap with hreflang + robots (`@astrojs/sitemap` config test)
- [ ] Task: OG image build script `tools/og/OgImageRenderer.ts` (sharp + SVG text with embedded Fraunces) — Red: dimensions/format/determinism — Green
- [ ] Task: Guard test over `dist/`: no `€`, no price strings, every page has lang/canonical/hreflang
- [ ] Task: Playwright e2e: crawl all routes, axe on each, contact form flows (with mocked Web3Forms endpoint in the test harness only)
- [ ] Task: Lighthouse CI config (`lighthouserc.json`) with budgets for 3 representative pages
- [ ] Task: Phase Verification & Checkpoint

## Inherited Findings

From `astro-foundation_20261111` (non-blocking):

- [x] Task: `vitest.config.ts` excludes `tools/download-fonts.ts` from coverage. Either test it (pure parts: URL list, subset ranges) with the network call injected, or move it out of `tools/` into `scripts/` and document it as a one-off, network-dependent maintenance script that is excluded from coverage on purpose (ADR-worthy only if you keep it excluded).
- [x] Task: Build-time tooling quirks fixed on main (keep them): `typecheck` runs `astro sync` first; `typescript` pinned `~5.8.3` (typescript-eslint peer range); `overrides.@emnapi/runtime = 1.4.3`; Vitest excludes `.worktrees/**` and nested `node_modules`. Do not undo these.

## Assumptions ledger

- FR territory name *La frontière s'efface* (product.md); zone names Arrival/Arrivée, Lens/La Loupe, Leak/L'Infiltration (product-guidelines.md).
- All site paths end with a trailing slash (spec URLs, GitHub Pages directory output); canonical = route-map URL, so it always matches hreflang.
- Header: the dangling `#drift` link was removed; the drift-world track owns the Drift/Wake up toggle.
- Image alt text = work title (+ EN subtitle on the EN site) until the schema has an alt field.
- Exhibitions: `year`/`venue`/`dates` added to the schema and the intake generator (facts from product.md); titles are proper names (original FR title on both sites).
- Publisher identity on the legal page = artist name + contact email (spec).
- Contact without JavaScript: plain POST lands on the Web3Forms result page; the `work` field is filled only by the enhancement script.

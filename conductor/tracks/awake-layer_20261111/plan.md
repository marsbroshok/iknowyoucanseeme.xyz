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

## Phase 3: SEO & quality [checkpoint: 69e21e7]

- [x] Task: Sitemap with hreflang + robots (`@astrojs/sitemap` config test) `a396700`
- [x] Task: OG image build script `tools/og/OgImageRenderer.ts` (sharp + SVG text with embedded Fraunces) — Red: dimensions/format/determinism — Green `7854a2a` (text as Fraunces outlines, ADR 0003 `69b4c65`)
- [x] Task: Guard test over `dist/`: no `€`, no price strings, every page has lang/canonical/hreflang `d153fc7`
- [x] Task: Playwright e2e: crawl all routes, axe on each, contact form flows (with mocked Web3Forms endpoint in the test harness only) `eff2b1a` (found + fixed fetch receiver bug `7231b1b`; lint fix `b983138`)
- [x] Task: Lighthouse CI config (`lighthouserc.json`) with budgets for 3 representative pages `69e21e7` — local run (`@lhci/cli` 0.14, Playwright Chromium, mobile): /en/ perf 0.99 · a11y 1 · BP 0.96 · SEO 1; /fr/territoires/dreamland/ 0.98 · 1 · 0.96 · 1; /en/works/arrivee/ 0.99 · 1 · 0.96 · 1
- [x] Task: Phase Verification & Checkpoint — `npm run check` (213 unit tests, 100% coverage) and `npm run test:e2e` (113 passed: 97 routes axe-clean, guard, contact flows) exit 0 with CI=true and with CI unset

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
- OG text is drawn as Fraunces outlines (opentype.js) instead of SVG `<text>`: Pango/librsvg ignored the font file (ADR 0003).
- The e2e suite builds a second, keyed variant (`ASTRO_OUT_DIR=dist-e2e-keyed`, `PUBLIC_WEB3FORMS_KEY=e2e-test-key`) served next to `dist/` by a small static server.
- `opentype.js` pinned to ^1.3.4: the npm proxy's `latest` tag pointed at 0.8.0.
- Contact without JavaScript: plain POST lands on the Web3Forms result page; the `work` field is filled only by the enhancement script.

## Out-of-scope findings

- `src/i18n/UIStrings.ts#getUIString` silently falls back (warn + EN/key); pages now use the strict `UiText`, the old helper is unused by pages and could be removed.
- The root chooser `src/pages/index.astro` has no canonical/hreflang (it is excluded from the sitemap; the guard only requires `lang` there).

## Review fixes

Round base `07eeb2b`.

- [x] Fix (blocking): FR pages showed English skip link and footer (WCAG 3.1.2). `SkipLink` takes a localized `label` (ui.yaml `skip_content`); `Footer` reads `footer_rights` and `nav_legal` (also fixes the "Légales" capitalisation); container tests for both locales `050556e`
- [x] Fix: availability labels moved from `src/domain/Availability.ts` into ui.yaml (`availability_sold`, `availability_not_for_sale`, `contact`), CopyGuard-checked; never-a-price test kept `04026ec`
- [x] Fix: generic regression `LanguageGuard` + `PageText` (`src/tools/`): no other-locale ui.yaml string in a page's visible text (title, description, body, alt/aria-label/title/placeholder; elements marked with their `lang` excluded). Unit + property tests, rendered-layout test, e2e over all 96 localized pages of `dist/` `7457536`
- [x] Fix: dist guard and language guard also run over `dist-e2e-keyed/` (explicit check of both keyed contact pages) `945f1a9`
- [x] Fix: ADR 0002 gets "Considered & Rejected Alternatives"; test that every ADR has Context, Decision and that section `a4639df`
- [x] Verification: `npm run check` (232 unit tests, 100% coverage) and `npm run test:e2e` (116 passed) exit 0 with CI=true and with CI unset
- Assumption: new ui.yaml key `footer_rights` (EN "all rights reserved", FR "tous droits réservés"); strings identical in both locales are not checked by the language guard; no allow-list needed (0 hits on proper nouns or work titles).
- Deferred (orchestrator): lockfile `resolved` URLs → launch track; empty no-JS `work` field accepted.


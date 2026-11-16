# Plan: Awake Layer Wayfinding, Persistent Drift Bridge, Zero-JS Curatorial Filters & Work Context Navigation

Track: `awake-navigation_20261114` · Spec: [spec.md](./spec.md) · Workflow: [../../workflow.md](../../workflow.md)

## Phase 1: Domain Models, `?drift=1` Bridge & Global Header / Footer Wayfinding [checkpoint: 72849f2]

- [x] Task: Pure `?drift=1` intent helpers in `DeepLink.ts` + `DriftBoot.ts` awake-override & `?w=<slug>` Awake resume banner wiring `797812c`
    - [x] Red: unit tests in `tests/world/core/DeepLink.test.ts` and `tests/world/island/DriftBoot.test.ts` verifying `?drift=1` overrides stored `'awake'` on capable non-kiosk devices, cleans `?drift=1` via `replaceState`, and reveals `[data-awake-resume]` when waking up with `?w=<slug>` while keeping `[data-drift-start]` focused
    - [x] Green: implement in `src/world/core/DeepLink.ts`, `src/world/island/DriftBoot.ts`, and `src/components/pages/HomePage.astro`
- [x] Task: Aligned responsive `Header.astro` (`[data-header-drift]` contextual portal, active section state, touch targets) & colophon `Footer.astro` `72849f2`
    - [x] Red: container & language-guard tests in `tests/components.test.ts`, `tests/languageGuard.test.ts`, and `tests/pages/HomePage.test.ts` (contextual `driftHref` per route, `max-width: 72rem` alignment, single `iknowyoucanseeme` on Home, zero `"search"` strings, EN/FR `ui.yaml` + `docs/copy/REVIEW.md` sync)
    - [x] Green: implement `Header.astro`, `Footer.astro`, `BaseLayout.astro`, `ui.yaml`, and regenerate `docs/copy/REVIEW.md`
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) `72849f2`

## Phase 2: Zero-JS Curatorial Index Filters, Breadcrumb Work Plinth & Territory Continuity [checkpoint: 986dbc0]

- [x] Task: Rich `TerritoryView` / `WorkQueries` view-model extensions (counts, medium tags, work sequence `i / N`, zone anchors, other-territory link, first-work drift hrefs) `79e2634`
    - [x] Red: unit tests in `tests/domain/` and `tests/pages/` covering section/zone/medium counts, work position `index / total`, breadcrumb models, and cross-territory continuation
    - [x] Green: extend `src/domain/WorkView.ts`, `src/domain/TerritoryView.ts`, `src/domain/WorkQueries.ts`, and `src/pages/[lang]/[...route].astro` (100% coverage)
- [x] Task: Zero-JS reversible filters on `WorksIndexPage.astro`, breadcrumb + sticky plinth + thumbnail `Prev/Next` on `WorkPage.astro`, and zone jump + continuation on `TerritoryPage.astro` `986dbc0`
    - [x] Red: container unit tests (`WorksIndexPage.test.ts`, `WorkPage.test.ts`, `TerritoryPage.test.ts`) + Playwright E2E tests (`tests/e2e/awakeNavigation.spec.ts`) verifying 1-click `[data-header-drift]` from Awake pages, `:target` reset + CSS `:has()` medium filtering with `javaScriptEnabled: false`, breadcrumbs, Leak margin non-overlap, `DistGuard` `0 B` JS budget, and `0` axe violations (EN + FR)
    - [x] Green: implement in `WorksIndexPage.astro`, `WorkPage.astro`, `TerritoryPage.astro`, and `WorkCard.astro`; update `README.md`
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md) `986dbc0`

## Inherited Findings

From `ux-sociological-survey_20261114` empirical telemetry & review (address in this track):

- [x] Task: Align Awake touch targets, header inset, and `tests/e2e/uxSurvey.spec.ts` mid-chain assertions `986dbc0`:
    - `.site-header .signature` (`21 px`), `.site-header nav a` (`18 px`), `.site-header nav a[hreflang]` (`16.81 × 18 px` — failing BOTH axes!), `footer a` (`18 px`), `.works-index nav a` (`20 px`), and `WorkPage` CTAs (`[data-drift-link]`, `.work a[href*="contact"]`, `18–20 px`) all failed `24×24 px` WCAG 2.5.8 AA and `44×44 px` coarse comfort. Enforce `min-inline-size: 24px; min-block-size: 24px` (and `min-inline-size: 2.75rem; min-block-size: 2.75rem` under `@media (pointer: coarse)`) on all interactive links/labels across `Header`, `Footer`, `WorksIndexPage`, `WorkPage`, `TerritoryPage`, and `HomePage` `[data-awake-resume]`.
    - Align `.site-header` inner container left/right edge with `.page` (`max-width: 72rem; margin: 0 auto; padding-inline: var(--space-3)`) so `uxSurveyCollector`'s `headerPageInsetDeltaPx` drops from `144–384 px` to `<= 2 px`.
    - Match `tests/e2e/uxSurveyCollector.ts` selectors (`[data-header-drift]`, `.works-index nav a[href="#all-works"]`, `.works-index input[name="medium-filter"]`, `article.work .work-breadcrumb`, `i / N` sequence text, `article.work .prev-next img`, `TerritoryPage` `id="zone-<slug>"` + `a[href^="#zone-"]` + Drift link + sibling territory link, and `[data-awake-resume]`) and update `tests/e2e/uxSurvey.spec.ts` from the Track 14 baseline assertions (`passedCount === 0`, `worksCountRestoredAfterReset === 28`, `awakeModeDriftClicksFromNonHome === 2`, `headerPageInsetDeltaPx > 100`, `numericScore < 40`) to assert the post-Track-15 mid-chain state (`5 / 8` Awake wayfinding checks `true`: `globalDriftEntry`, `reversibleWorksFilter`, `workBreadcrumbAndContext`, `territoryContinuity`, `awakeWakeContinuity`; `worksCountRestoredAfterReset === 40`; `awakeModeDriftClicksFromNonHome === 1`; `headerPageInsetDeltaPx <= 2`).

## Assumptions & Domain Invariants Ledger

- **`?drift=1` short-threshold entry & URL cleanup (`src/world/core/DeepLink.ts`, `src/world/island/DriftBoot.ts`):** Arriving at `/{lang}/?drift=1` on a capable non-kiosk device (`DeviceProfile.canAutoEnterDeepLink(caps)`) overrides a stored `'awake'` mode preference, strips `drift` immediately via `history.replaceState` while preserving other query parameters and hashes, and treats the initial entry as `deepLink: true` in `ThresholdState` (showing the short threshold so muted visitors glide in automatically while sound-enabled visitors unlock WebAudio on a single `Enter` press).
- **Kiosk zero-link safety for `[data-awake-resume]` (`src/world/island/DriftBoot.ts`):** When `?kiosk=1` is active, `syncAwakeResume` keeps `[data-awake-resume]` hidden and never assigns an `href`, preserving `KioskMode`'s zero-link guarantee even if `Wake up` is triggered.
- **Colophon landmark & Home signature uniqueness (`src/components/Footer.astro`):** `Footer.astro` renders secondary navigation inside `<footer class="site-footer">` as `<ul class="footer-links" role="list">` without a nested `<nav>` landmark or a second `iknowyoucanseeme` string, preserving single-`<nav>` (`axe` `landmark-unique`) and single-signature invariants on Home.
- **Non-nested CSS `:has()` medium filtering (`src/domain/TerritoryView.ts`, `src/components/pages/WorksIndexPage.astro`):** Static `data-has-photo` and `data-has-ceramic` flags on territory sections and zone subgroups allow top-level `.works-index:has(#medium-filter-*:checked)` rules to hide empty groups cleanly without nested `:has()` selectors, keeping `WorksIndexPage` at `0 B` JavaScript.
- **Top-level landmark safety on Territory continuation (`src/components/pages/TerritoryPage.astro`):** Cross-territory continuation cards render inside `<div class="other-territory">` rather than `<aside>` inside `<main>` so `axe` `landmark-complementary-is-top-level` remains clean across every localized territory route.

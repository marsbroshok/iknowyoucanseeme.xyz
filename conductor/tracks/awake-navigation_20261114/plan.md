# Plan: Awake Layer Wayfinding, Persistent Drift Bridge, Zero-JS Curatorial Filters & Work Context Navigation

Track: `awake-navigation_20261114` · Spec: [spec.md](./spec.md) · Workflow: [../../workflow.md](../../workflow.md)

## Phase 1: Domain Models, `?drift=1` Bridge & Global Header / Footer Wayfinding

- [ ] Task: Pure `?drift=1` intent helpers in `DeepLink.ts` + `DriftBoot.ts` awake-override & `?w=<slug>` Awake resume banner wiring
    - [ ] Red: unit tests in `tests/world/core/DeepLink.test.ts` and `tests/world/island/DriftBoot.test.ts` verifying `?drift=1` overrides stored `'awake'` on capable non-kiosk devices, cleans `?drift=1` via `replaceState`, and reveals `[data-awake-resume]` when waking up with `?w=<slug>` while keeping `[data-drift-start]` focused
    - [ ] Green: implement in `src/world/core/DeepLink.ts`, `src/world/island/DriftBoot.ts`, and `src/components/pages/HomePage.astro`
- [ ] Task: Aligned responsive `Header.astro` (`[data-header-drift]` contextual portal, active section state, touch targets) & colophon `Footer.astro`
    - [ ] Red: container & language-guard tests in `tests/components.test.ts`, `tests/languageGuard.test.ts`, and `tests/pages/HomePage.test.ts` (contextual `driftHref` per route, `max-width: 72rem` alignment, single `iknowyoucanseeme` on Home, zero `"search"` strings, EN/FR `ui.yaml` + `docs/copy/REVIEW.md` sync)
    - [ ] Green: implement `Header.astro`, `Footer.astro`, `BaseLayout.astro`, `ui.yaml`, and regenerate `docs/copy/REVIEW.md`
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: Zero-JS Curatorial Index Filters, Breadcrumb Work Plinth & Territory Continuity

- [ ] Task: Rich `TerritoryView` / `WorkQueries` view-model extensions (counts, medium tags, work sequence `i / N`, zone anchors, other-territory link, first-work drift hrefs)
    - [ ] Red: unit tests in `tests/domain/` and `tests/pages/` covering section/zone/medium counts, work position `index / total`, breadcrumb models, and cross-territory continuation
    - [ ] Green: extend `src/domain/WorkView.ts`, `src/domain/TerritoryView.ts`, `src/domain/WorkQueries.ts`, and `src/pages/[lang]/[...route].astro` (100% coverage)
- [ ] Task: Zero-JS reversible filters on `WorksIndexPage.astro`, breadcrumb + sticky plinth + thumbnail `Prev/Next` on `WorkPage.astro`, and zone jump + continuation on `TerritoryPage.astro`
    - [ ] Red: container unit tests (`WorksIndexPage.test.ts`, `WorkPage.test.ts`, `TerritoryPage.test.ts`) + Playwright E2E tests (`tests/e2e/awakeNavigation.spec.ts`) verifying 1-click `[data-header-drift]` from Awake pages, `:target` reset + CSS `:has()` medium filtering with `javaScriptEnabled: false`, breadcrumbs, Leak margin non-overlap, `DistGuard` `0 B` JS budget, and `0` axe violations (EN + FR)
    - [ ] Green: implement in `WorksIndexPage.astro`, `WorkPage.astro`, `TerritoryPage.astro`, and `WorkCard.astro`; update `README.md`
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Inherited Findings

*(Populated automatically from `ux-sociological-survey_20261114` upon Track 14 merge.)*

## Assumptions & Domain Invariants Ledger

*(Implementer appends assumptions made during execution here.)*

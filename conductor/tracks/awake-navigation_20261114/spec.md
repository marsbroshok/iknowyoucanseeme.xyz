# Spec: Awake Layer Wayfinding, Persistent Drift Bridge, Zero-JS Curatorial Filters & Work Context Navigation

**Track ID:** `awake-navigation_20261114` · **Type:** Feature (Awake UI/UX & Wayfinding) · **Depends on:** `ux-sociological-survey_20261114`

## Overview

Dramatically improve navigation across the entire **Awake Layer** (`Header`, `Footer`, `WorksIndexPage`, `WorkPage`, `TerritoryPage`, `HomePage`) and the **Awake ↔ Drift bridge** (`DeepLink`, `DriftBoot`), addressing curator, collector, gallery-QR, non-gamer, and mobile visitor friction while strictly preserving the **`0 B` static-page JavaScript budget** (`DistGuard`), WCAG 2.2 AA accessibility, bilingual EN/FR parity (`LanguageGuard`), and Leak margin clearance.

## Functional Requirements

- **FR1 Persistent Global Drift Portal & Aligned Responsive `Header.astro` + Colophon `Footer.astro`:**
  - Constrain `.site-header` and `.site-footer` inner containers to `max-width: 72rem; margin: 0 auto` so desktop/ultrawide navigation aligns cleanly with `.page` rather than drifting to screen edges.
  - Enforce WCAG 2.5.8 AA touch targets (`≥ 24×24` CSS px everywhere; `min-block-size: 2.75rem` on `@media (pointer: coarse)`), clear `aria-current="page"` on exact routes plus visual section highlight (`data-section-active="true"`) when viewing child routes (`/works/<slug>/`, `/territories/<slug>/`).
  - Add a prominent, luminous **Drift / Dériver** portal link (`[data-header-drift]`) in `Header.astro` on every non-Home Awake route:
    - On a Work page (`/{lang}/works/<slug>/`), link directly to `/{lang}/?w=<slug>` so clicking **Drift / Dériver** in the header opens the 3D world right in front of that work.
    - On a Territory page (`/{lang}/territories/<slug>/`), link directly to `/{lang}/?w=<first-work-slug-of-territory>`.
    - On all other non-Home Awake routes (`works`, `exhibitions`, `about`, `contact`, `legal`), link to `/{lang}/?drift=1`.
  - Extend `DeepLink.ts` (`DeepLink.DRIFT_PARAM = 'drift'`, `DeepLink.hasDriftIntent(search)`, `DeepLink.withoutDriftIntent(url)`) and `DriftBoot.ts` so arriving at `/{lang}/?drift=1` (when `!kiosk` and `DeviceProfile.canAutoEnterDeepLink(caps)`) overrides a stored `'awake'` mode preference (`preference.write('world')`), enters the world cleanly (cleaning `?drift=1` via `history.replaceState`), and unlocks seamless 1-click Drift entry from anywhere on the site.
  - Upgrade `Footer.astro` (removing inline `style="..."`) into a structured colophon with secondary navigation (`Works`, `Dreamland`, `The border is thin`, `Exhibitions`, `About`, `Contact`, `Legal notice`, language switch) while keeping `© {year} Alexander Usoltsev, {footer_rights}.` intact.
  - **Hard Invariants:** Keep literal `iknowyoucanseeme` appearing **exactly once** across `header, main, footer` on `/{lang}/` (`tests/e2e/threshold.spec.ts`); never emit the word `"search"` or `<search>` in `BaseLayout`/`Header`/`Footer` (`tests/components.test.ts`).
- **FR2 Zero-JS Reversible Territory, Zone & Medium Filtering on `WorksIndexPage.astro`:**
  - Eliminate the irreversible `:target` trap on `/{lang}/works/` and `/{lang}/oeuvres/`:
    - Keep `#dreamland` and `#the-border-is-thin` section anchors working (`WorksIndexPage.test.ts`), and add an explicit **`All works (40)` / `Toutes les œuvres (40)`** reset anchor (`href="#all-works"` / base route) with active-state CSS so visitors can always return to all 40 works in 1 click without browser Back.
    - Add **zero-JS medium filter pills** (`All` · `Photographs (36)` · `Ceramics (4)`) implemented with accessible native `<input type="radio" name="medium-filter">` + `<label>` pills styled via `label:has(:checked)` and filtering work cards (`li[data-medium="photo" | "ceramic"]`) purely via CSS `:has()` — shipping **0 bytes of JavaScript** (`DistGuard` stays at `0 B`!).
    - Surface zone sub-groupings/badges (`Arrival`, `Lens`, `Leak`) inside *Dreamland* on the works index along with work counts and direct Territory / `"See in the drift"` portal links.
- **FR3 Top Breadcrumb Trail, Sticky Desktop Curatorial Plinth & Visual Thumbnail `Prev / Next` Cards on `WorkPage.astro`:**
  - Add a top `<nav class="work-breadcrumb" aria-label={ui.t('breadcrumb_label')}>` showing `Works` → `Territory` (→ `#zone-<slug>` when applicable) plus the work's sequence counter (`i / N` within its territory).
  - Upgrade `WorkPage.astro` at desktop widths (`≥ 60rem`) to a balanced two-column editorial split (`work-images` alongside a `position: sticky` curatorial plinth holding `<h1>`, subtitle, poetic fragment, `metaLine`, `availabilityLabel`, primary button-styled `[data-drift-link]` CTA, and secondary `Ask about this work` CTA), collapsing cleanly to a single column on mobile.
  - Upgrade `.prev-next` into tactile visual cards with small artwork thumbnails, `rel="prev"` / `rel="next"`, directional labels (`Previous work` / `Next work`), and titles (`min-block-size: 3.5rem`).
- **FR4 Territory Zone Jump Bar, Cross-Territory Continuation & Awake Home Resume Context:**
  - On `TerritoryPage.astro`: add a top Zone Jump Bar (`#zone-arrival`, `#zone-lens`, `#zone-leak` with work counts) + `"See in the drift"` territory/zone links, and a bottom **"Other territory →"** continuation card (*Dreamland* ↔ *The border is thin*) so visitors never hit a dead end at the bottom of a territory.
  - On `HomePage.astro` + `DriftBoot.ts`: when Awake Home is visible while `?w=<slug>` is in `location.search` (for instance immediately after clicking `Wake up` in front of a work in the Drift), reveal a contextual `[data-awake-resume]` link beside `[data-drift-start]` pointing directly to that work's Awake page (`/{lang}/works/<slug>/` with its title), while still keeping `[data-drift-start]` focused upon `Wake up` (`drift.spec.ts`).

## Non-Functional Requirements

- **Zero Static-Page JS Regression:** `DistGuard` (`jsBudgetFor`) MUST pass unchanged (`0 B` on `works/**`, `about`, `exhibitions`, `legal`, `home` inline).
- **Leak Margin Safety:** All `<main>` content MUST remain inside `max-width: 72rem; margin: 0 auto` so `.leak-apparition` in the outer margin at `≥ 89rem` (`1600×900` E2E test) never overlaps any text.
- **Bilingual Hygiene (`LanguageGuard` & `CopyGuard`):** Use distinct, non-colliding EN/FR phrases in `src/content/copy/pages/ui.yaml` (never single-word cognates or words that appear in prose of the opposite language) and regenerate `docs/copy/REVIEW.md` via `npx tsx tools/copy/review.ts`.
- `100%` test coverage on all TypeScript domain/world modules; `0` axe accessibility violations across all 97 routes.

## Acceptance Criteria

1. Clicking `[data-header-drift]` from any Awake route (`/en/works/`, `/fr/a-propos/`, `/en/works/solitude/`) enters the 3D Drift in 1 click—even when `iknowyoucanseeme:mode` was previously `'awake'`—and lands directly on `solitude` when clicked from `/en/works/solitude/`.
2. On `/en/works/` and `/fr/oeuvres/`, clicking `#dreamland` can be reversed in 1 click via the `All works` pill, and toggling the `Ceramics` vs `Photographs` radio pill filters the grid with JS disabled (`0 B` JS).
3. Every work page displays a breadcrumb trail, `i / N` sequence position, sticky desktop curatorial plinth, and thumbnail `Prev / Next` cards; every territory page displays zone jumps (when zoned) and a cross-territory continuation link.
4. `npm run check` and `npm run test:e2e` pass with exit code `0` under both `CI=true` and `CI` unset.

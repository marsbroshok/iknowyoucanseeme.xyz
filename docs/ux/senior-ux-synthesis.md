# Senior UI/UX Expert Synthesis & Cross-Layer Wayfinding Blueprint

**Track:** `ux-sociological-survey_20261114` · **Governs:** Track 15 (`awake-navigation_20261114`) & Track 16 (`drift-navigation_20261114`) · **Decision Records:** [ADR 0014](../adr/0014-sociological-ux-survey-and-wayfinding-architecture.md), [ADR 0015](../adr/0015-drift-wayfinding-ergonomics-and-focus-stepping.md)

## 1. Executive Architectural Diagnosis

Empirical browser telemetry across 7 sociological visitor personas (`12.45 / 100` to `22.91 / 100` baseline) reveals that `iknowyoucanseeme.xyz`'s core artistic atmosphere—boreal threshold curtains, nocturnal zone skies, optical lens shaders, generative sound, and contrast-safe Leak staining—is already strong, yet **three systemic UX fractures** bottleneck comprehension and flow:

1. **Unbounded Mobile & Tablet HUD Chrome in the Drift:** Permanent two-paragraph help copy (`.drift-help`), a 3-button touch `.drift-top` bar (`Mute` + `Wake up` + `Move with the phone`), and multi-row wrapped `.drift-zones` pills collide across `20,580–21,120 px²` on iPhones (`4,489 px²` even on French `820×1180` iPads) and occlude up to **`55.11%`** of `375×667` French screens.
2. **One-Way Doors Between Awake & Drift Layers:** Once `iknowyoucanseeme:mode` is `'awake'`, non-Home Awake pages offer zero 1-click path back into the Drift (`2` hops via Home); conversely, clicking `Wake up` from a settled work (`/?w=<slug>`) drops the visitor onto generic Awake Home without a link to that work's Awake page.
3. **Missing Guided Progression & Curatorial Context:** In the Drift, visitors without 3D drag/keybinding fluency lack clickable `‹ Prev · Current (i / N) · Next ›` work stepping, a 1-tap Lens cycle control, and curatorial metadata + in-place stepping inside `FocusOverlay`. On Awake pages, `#territory` `:target` filtering traps visitors at `28 / 40` works without a reset pill or photography/ceramics medium filter, `WorkPage` omits top breadcrumbs and `i / N` sequence context, `TerritoryPage` lacks zone jumps and sibling-territory continuation, and `13` standalone link controls measure `18–21 px` tall (below WCAG 2.5.8 `24×24 px` and coarse `44×44 px` thresholds).

---

## 2. Hard Artistic & Technical Invariants (Non-Negotiable Constraints)

Every UX improvement in Tracks 15 and 16 MUST preserve the following invariants from `conductor/product.md`, `conductor/product-guidelines.md`, and ADRs 0006–0013:

| Invariant | Source | Architectural Constraint on Tracks 15 & 16 |
|---|---|---|
| **UX Principle 1: *"Drift, don't navigate"*** | `product-guidelines.md` | **Never** place a conventional site navbar (`Works / About / Contact`) inside `.drift`. Spatial controls must operate as diegetic/instrument wayfinding (compass, work stepper, lens pill, Wake up). |
| **UX Principle 2: *"Never truly lost"*** | `product-guidelines.md` | Keep `Wake up`, zone orientation, `i / N` work sequence, and Awake ↔ Drift portals reachable in 1 click/tap. |
| **Artwork, never a shop** | `product.md`, `DistGuard` | Surface availability strictly as curatorial inquiry status (*"Contact for availability"* / *"Disponibilité sur demande"*); zero commercial valuation figures anywhere. |
| **`0 B` Static-Page JS Budget** | ADR 0007, `DistGuard` | `WorksIndexPage`, `WorkPage`, `AboutPage`, `ExhibitionsPage`, and `LegalPage` must ship **0 bytes** of new JS. Reversible territory & medium filtering MUST use pure HTML + CSS (`:target` reset + `:has(:checked)` radio pills). |
| **Single `iknowyoucanseeme` on Home & No Search Chrome** | `threshold.spec.ts`, `components.test.ts` | Literal `iknowyoucanseeme` appears **exactly once** across `header, main, footer` on `/{lang}/`; never emit `"search"` or `<search>` in layout chrome. |
| **`Tab × 3` Keyboard Path** | `drift.spec.ts` | Inside `.drift`, DOM order must remain `Mute` → `Wake up` → `[data-drift-works]` **before** any bottom dock controls (`WorkStepper`, `LensToggle`, `HorizonCompass`, `DriftHelp` toggle) so `Tab × 3` focuses the nearest work. |
| **Reduced Motion Non-Routing** | ADR 0009 | `prefers-reduced-motion` never hides the Drift automatically; `Wake up` + `[data-awake-resume]` ensures effortless 1-click transition to the viewed work's still page. |
| **Exhibition Mode (`?kiosk=1`) Zero-Link Rule** | ADR 0012, `kiosk.spec.ts` | All interactive controls inside `.drift` and `FocusOverlay` stepping must be `<button type="button">` (never `<a href>`), and `FocusOverlay` hides work/contact links in kiosk mode in favor of the build-time SVG QR code. |
| **Leak Apparition Outer-Margin Safety** | ADR 0012, `leak.spec.ts` | All `<main>` and aligned `.site-header` / `.site-footer` inner containers stay within `max-width: 72rem; margin: 0 auto` so `.leak-apparition` in wide margins (`≥ 89rem`) never overlaps text. |
| **100% Pure Logic Coverage** | ADR 0006, `vitest.config.ts` | All state/DOM controllers (`DeepLink`, `DriftBoot`, `DriftHelp`, `WorkStepper`, `LensToggle`, `FocusOverlay`, `WorldManifest`) live outside `src/world/gl/` under 100% Vitest coverage. |

---

## 3. Prioritized UX Intervention Blueprint (`P0` / `P1` / `P2`)

### `P0` — Critical Mobile Ergonomics & Cross-Layer Continuity Blockers

1. **`P0.1` Collision-Free Top HUD, Pointer-Aware Transient Onboarding & Toggleable Controls Sheet (Track 16 · FR1):**
   - Replace the permanently visible two-paragraph `.drift-help` overlay with:
     - A concise, pointer-aware `[data-drift-onboarding]` hint (touch gesture copy on `pointer: coarse` vs mouse/keyboard copy on `pointer: fine`) positioned cleanly **below** `.drift-top` (never sharing the same unguarded `top: 16px` horizontal band) that softly dismisses after `≥ 2.5 m` of camera drift or `6 s`, while keeping `[data-drift-lens]` (`aria-live="polite"`) unobstructed.
     - Ensure `.drift-top` handles 3 visible controls on touch devices (`Mute`, `Wake up`, and `[data-drift-tilt]` when supported) without overflowing `375 px` viewports or colliding with any sibling HUD element across `320px–1920px` in EN and FR.
     - Move full bilingual help copy into a toggleable `[data-drift-help-panel]` controlled by a compact `44 px` `[data-drift-help-toggle]` button (`aria-expanded`, `Escape` dismissible) in the bottom wayfinding dock (after `[data-drift-works]`).
2. **`P0.2` Persistent Global Header Drift Portal & `?drift=1` Intent Override (Track 15 · FR1 · `globalDriftEntry`):**
   - Add `[data-header-drift]` in `Header.astro` on every non-Home Awake route:
     - On `WorkPage` (`/{lang}/works/<slug>/`): link to `/{lang}/?w=<slug>` (opens Drift directly facing that work).
     - On `TerritoryPage` (`/{lang}/territories/<slug>/`): link to `/{lang}/?w=<first-work-slug>`.
     - On all other non-Home Awake routes: link to `/{lang}/?drift=1`.
   - Extend `DeepLink` (`DRIFT_PARAM = 'drift'`, `hasDriftIntent`, `withoutDriftIntent`) and `DriftBoot` so `/{lang}/?drift=1` overrides a stored `'awake'` preference on capable devices (`DeviceProfile.canAutoEnterDeepLink(caps)`), enters the world in **1 click**, and cleans `?drift=1` via `history.replaceState`.
3. **`P0.3` Zero-JS Reversible Territory & Medium Filtering on `WorksIndexPage` (Track 15 · FR2 · `reversibleWorksFilter`):**
   - Keep `#dreamland` and `#the-border-is-thin` anchors intact, and add an explicit **`All works (40)` / `Toutes les œuvres (40)`** anchor (`href="#all-works"`) so `:target` isolation is always 1-click reversible back to all `40` works without browser Back.
   - Add accessible native `<input type="radio" name="medium-filter">` + `<label>` pills (`All`, `Photographs (36)`, `Ceramics (4)`) filtering `li[data-medium="photo" | "ceramic"]` via pure CSS `:has(:checked)` with **`0 B` JavaScript**.
4. **`P0.4` Awake Home `Wake up` Work-Resume Continuity (Track 15 · FR4 · `awakeWakeContinuity`):**
   - When Awake Home is shown while `?w=<slug>` is present in `location.search` (immediately after clicking `Wake up` in front of a work in the Drift), unhide `[data-awake-resume]` beside `[data-drift-start]` linking directly to `/{lang}/works/<slug>/` with the work's title, while keeping initial focus on `[data-drift-start]`.

### `P1` — Guided Spatial Wayfinding & Curatorial Inspection

5. **`P1.1` Bottom Guided Work Stepper & Tactile Lens Cycle Pill (Track 16 · FR2 · `driftGuidedStepping`, `tactileLensControl`):**
   - Place a unified bottom wayfinding dock **after `[data-drift-works]`** in DOM order containing:
     - `WorkStepper` (`[data-drift-prev]`, `[data-drift-current]` displaying `<Title> · i / 40` and opening `FocusOverlay` on click/tap, `[data-drift-next]`) gliding along the exhibition path via `session.cycle` + `session.focus`.
     - `LensToggle` (`[data-lens-cycle]`, `min-height: 44px`) displaying the active localized optical lens (or prompt) and cycling `lens.cycle()` + `announcer.announce()` in 1 tap/click.
   - Render `.drift-zones` as a single-row horizontal scroll strip (`flex-wrap: nowrap; overflow-x: auto; touch-action: pan-x`) on narrow/tablet portrait viewports (`≤ 900px` so French `820×1180` iPads also stay single-row rather than wrapping into 2 rows, eliminating the `4`-row `228 px` French stack on mobile).
6. **`P1.2` Rich In-Place `FocusOverlay` with Curatorial Metadata & `‹ Prev / Next ›` Stepping (Track 16 · FR3 · `focusInPlaceBrowsing`):**
   - Enrich `ManifestWork` (`WorldManifest` + `WorldManifestBuilder`) with localized `metaLine`, `availabilityLabel`, `contextLabel`, `positionIndex`, and `positionTotal`.
   - Upgrade `[data-drift-focus]` with a header (`[data-focus-context]` + `≥ 44×44 px` `[data-focus-close]`), `dvh`-bounded `[data-focus-image]`, `[data-focus-meta]`, and in-dialog `[data-focus-prev]` / `[data-focus-next]` `<button type="button">` controls + `ArrowLeft` / `ArrowRight` support that update the dialog in place, glide the camera (`session.focus`), and sync `?w=<slug>` via `replaceState` (outside `?kiosk=1`).
7. **`P1.3` Work Breadcrumbs, Sticky Desktop Plinth & Visual `Prev / Next` Cards (Track 15 · FR3 · `workBreadcrumbAndContext`):**
   - Add `<nav class="work-breadcrumb">` (`Works → Territory → #zone-<slug>` + `i / N` counter) above `.work`.
   - Use a two-column split at `≥ 60rem` with a `position: sticky` curatorial plinth so title, fragment, metadata, availability, primary button-styled `[data-drift-link]`, and inquiry link are visible beside the artwork without scrolling.
   - Upgrade `.prev-next` links into `≥ 3.5rem` tactile cards with artwork thumbnails.
8. **`P1.4` Territory Zone Jump Bar & Cross-Territory Continuation (Track 15 · FR4 · `territoryContinuity`):**
   - Add `id="zone-<slug>"` to zoned sections on `TerritoryPage`, a top Zone Jump Bar (`#zone-arrival`, `#zone-lens`, `#zone-leak` with counts) + `"See in the drift"` portal links, and a bottom sibling-territory continuation card (*Dreamland* ↔ *The border is thin*).

### `P2` — Ergonomic Alignment, Target Sizing & Colophon Polish

9. **`P2.1` `72rem` Aligned Header/Footer Containers & Universal Touch Targets (Track 15 · FR1, Track 16 · FR3):**
   - Constrain `.site-header` and `.site-footer` inner layout to `max-width: 72rem; margin: 0 auto` (eliminating the `144 px` / `384 px` edge drift on `1440×900` / `1920×1080`).
   - Enforce `≥ 24×24 px` minimum target boxes on all pointers (including the `FR`/`EN` switcher) and `min-block-size: 2.75rem` (`44 px`, plus `min-inline-size: 2.75rem` on short pills like `FR`/`EN`) on `@media (pointer: coarse)` across header, footer, works filters, work CTAs, and `FocusOverlay` action links (`[data-focus-work]`, `[data-focus-contact]`).
   - Replace `Footer.astro`'s inline `style` attribute with a structured colophon exposing secondary navigation while preserving `© {year} Alexander Usoltsev, {footer_rights}.` and single-`iknowyoucanseeme` Home compliance.

---

## 4. Eight-Capability Traceability & Target Score Verification Matrix

### 4.1 Wayfinding Capability Ownership

| Wayfinding Check (`NavigationAudit`) | Priority | Owning Track | Target State After Overhaul |
|---|---|---|---|
| `globalDriftEntry` | `P0` | Track 15 (`awake-navigation_20261114`) | `true` (`1` click from any Awake page via `[data-header-drift]`) |
| `reversibleWorksFilter` | `P0` | Track 15 (`awake-navigation_20261114`) | `true` (`40 / 40` restored via `#all-works` + `3` zero-JS medium radio pills) |
| `workBreadcrumbAndContext` | `P1` | Track 15 (`awake-navigation_20261114`) | `true` (`.work-breadcrumb` + `i / N` counter + thumbnail `.prev-next` cards) |
| `territoryContinuity` | `P1` | Track 15 (`awake-navigation_20261114`) | `true` (`3` `#zone-*` jumps + Drift portal + cross-territory card) |
| `awakeWakeContinuity` | `P0` | Track 15 (`awake-navigation_20261114`) | `true` (`[data-awake-resume]` links directly to settled `?w=` work) |
| `driftGuidedStepping` | `P1` | Track 16 (`drift-navigation_20261114`) | `true` (`[data-drift-prev]`, `[data-drift-current]`, `[data-drift-next]` visible) |
| `tactileLensControl` | `P1` | Track 16 (`drift-navigation_20261114`) | `true` (`[data-lens-cycle]` cycles optical lenses on click/tap) |
| `focusInPlaceBrowsing` | `P1` | Track 16 (`drift-navigation_20261114`) | `true` (`[data-focus-meta]` + `[data-focus-prev]` / `[data-focus-next]`) |

### 4.2 Empirical Before-vs-After Persona UX Score Verification (Tracks 14 → 15 → 16)

Re-running `tests/e2e/uxSurvey.spec.ts` after Track 15 (`awake-navigation_20261114`) and Track 16 (`drift-navigation_20261114`) against the unchanged `NavigationAudit` rubric confirms that all 8 cross-site wayfinding capabilities pass (`8 / 8` across `en:1440×900`, `fr:390×844`, `en:390×844`, and `fr:1440×900`), HUD collisions drop to `0 px²` across all 10 `(locale × viewport)` runs, HUD chrome coverage stays strictly `≤ 25%` everywhere (`24.46%` on `fr:375×667`, `19.17%` on `fr:390×844`, `16.66%` on `en:390×844`, `12.63%` on `fr:820×1180`, `11.55–12.24%` on `1440×900`, `8.98–9.41%` on `1920×1080`), interactive target pass ratios reach `100%` (`45 / 45` on coarse touch profiles, `44 / 44` on fine desktop profiles), and all 7 sociological personas achieve **`100 / 100`** (exceeding the `≥ 90 / 100` gate):

| Persona ID | Locale & Viewport | Baseline UX Score (Track 14) | Post-Overhaul Collision | Post-Overhaul Clearance | Post-Overhaul Targets | Post-Overhaul Wayfinding (`8/8`) | **Measured Post-Track 16 Score** | Net Gain |
|---|---|---|---|---|---|---|---|---|
| `curator` | `fr` · `1440×900` (`fine`) | `16.91 / 100` | `6 / 6` (`0 px²`) | `6 / 6` (`12.24%`) | `12 / 12` (`44/44`) | `76 / 76` | **`100 / 100`** | **`+83.09`** |
| `instagram-mobile` | `en` · `390×844` (`coarse`) | `16.64 / 100` | `16 / 16` (`0 px²`) | `10 / 10` (`16.66%`) | `18 / 18` (`45/45`) | `56 / 56` | **`100 / 100`** | **`+83.36`** |
| `collector` | `fr` · `820×1180` (`coarse`) | `16.97 / 100` | `8 / 8` (`0 px²`) | `8 / 8` (`12.63%`) | `16 / 16` (`45/45`) | `68 / 68` | **`100 / 100`** | **`+83.03`** |
| `peer-artist` | `en` · `1440×900` (`fine`) | `22.09 / 100` | `8 / 8` (`0 px²`) | `10 / 10` (`11.55%`) | `10 / 10` (`44/44`) | `72 / 72` | **`100 / 100`** | **`+77.91`** |
| `gallery-qr` | `fr` · `390×844` (`coarse`) | `12.45 / 100` | `14 / 14` (`0 px²`) | `10 / 10` (`19.17%`) | `16 / 16` (`45/45`) | `60 / 60` | **`100 / 100`** | **`+87.55`** |
| `non-gamer` | `en` · `1440×900` (`fine`) | `22.91 / 100` | `10 / 10` (`0 px²`) | `8 / 8` (`11.55%`) | `12 / 12` (`44/44`) | `70 / 70` | **`100 / 100`** | **`+77.09`** |
| `keyboard-a11y` | `en` · `1440×900` (`fine`) | `21.73 / 100` | `10 / 10` (`0 px²`) | `6 / 6` (`11.55%`) | `14 / 14` (`44/44`) | `70 / 70` | **`100 / 100`** | **`+78.27`** |

### 4.3 Post-Overhaul Multi-Viewport HUD Geometry Summary

| Locale | Viewport | Pointer | HUD Overlaps (`px²`) | Zone Strip Rows (Before → After) | Union HUD Coverage (Before → After) | Target Comfort Pass |
|---|---|---|---|---|---|---|
| `en` | `375×667` | `coarse` | `20,580` → **`0 px²`** | `2` → **`1` row** | `38.19%` → **`21.40%`** | `45 / 45` (`100%`) |
| `fr` | `375×667` | `coarse` | `20,580` → **`0 px²`** | `4` → **`1` row** | `55.11%` → **`24.46%`** | `45 / 45` (`100%`) |
| `en` | `390×844` | `coarse` | `21,120` → **`0 px²`** | `2` → **`1` row** | `29.73%` → **`16.66%`** | `45 / 45` (`100%`) |
| `fr` | `390×844` | `coarse` | `21,120` → **`0 px²`** | `4` → **`1` row** | `43.03%` → **`19.17%`** | `45 / 45` (`100%`) |
| `en` | `820×1180` | `coarse` | `54.12` → **`0 px²`** | `1` → **`1` row** | `13.76%` → **`11.58%`** | `45 / 45` (`100%`) |
| `fr` | `820×1180` | `coarse` | `4,489.32` → **`0 px²`** | `2` → **`1` row** | `18.48%` → **`12.63%`** | `45 / 45` (`100%`) |
| `en` | `1440×900` | `fine` | `0` → **`0 px²`** | `1` → **`1` row** | `13.61%` → **`11.55%`** | `44 / 44` (`100%`) |
| `fr` | `1440×900` | `fine` | `0` → **`0 px²`** | `1` → **`1` row** | `14.30%` → **`12.24%`** | `44 / 44` (`100%`) |
| `en` | `1920×1080` | `fine` | `0` → **`0 px²`** | `1` → **`1` row** | `10.45%` → **`8.98%`** | `44 / 44` (`100%`) |
| `fr` | `1920×1080` | `fine` | `0` → **`0 px²`** | `1` → **`1` row** | `10.88%` → **`9.41%`** | `44 / 44` (`100%`) |

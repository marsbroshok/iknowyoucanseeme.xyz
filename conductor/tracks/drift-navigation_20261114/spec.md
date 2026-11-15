# Spec: Drift World Mobile/Desktop Ergonomics, Guided Work Stepper, Rich In-Place Focus Dialog & Tactile Lens/Help Controls

**Track ID:** `drift-navigation_20261114` · **Type:** Feature (Immersive World Spatial UX & Ergonomics) · **Depends on:** `awake-navigation_20261114`

## Overview

Dramatically improve navigation, mobile thumb ergonomics, discoverability, and curatorial inspection inside **The Drift** (`src/world/**`, `DriftIsland.astro`) while honoring UX Principle 1 (*"Drift, don't navigate — no conventional menu in the world; movement is exploration"*) and UX Principle 2 (*"Never truly lost"*). Resolve mobile HUD collisions, replace permanent multi-paragraph help clutter with pointer-aware transient onboarding + a toggleable controls card, add a bottom **Guided Work Stepper** (`‹ Prev · Title (i / 40) · Next ›`) and **1-Tap Lens Cycle Pill**, compact the mobile zone strip into a thumb-friendly horizontal row, and upgrade `FocusOverlay` with curatorial metadata and **in-place `Previous / Next` work browsing** (`‹` / `›` buttons + `ArrowLeft` / `ArrowRight` keys). Conclude by re-running the 7-persona sociological UX survey to prove dramatic measurable improvement across every visitor archetype.

## Functional Requirements

- **FR1 Collision-Free Responsive Top HUD, Pointer-Aware Transient Onboarding & Toggleable Controls Card (`DriftHelp.ts`, `DriftIsland.astro`):**
  - Eliminate viewport overlap between `.drift-top` and `.drift-help` across all screen sizes (`320px–1920px`, EN & FR).
  - Replace the permanently visible two-paragraph `.drift-help` block with:
    - A concise, **pointer-aware transient onboarding hint** (`[data-drift-onboarding]`: touch-specific gesture hint on `pointer: coarse` vs mouse/keyboard hint on fine pointers) that softly dismisses once the visitor drifts beyond a small movement threshold (`≥ 2.5` m) or after `6` seconds, keeping `[data-drift-lens]` (`aria-live="polite"`) active and unobstructed at all times.
    - A compact **`Controls` / `Aide` toggle button** (`[data-drift-help-toggle]`, `aria-expanded`, `min-height: 44px`) placed in the bottom wayfinding dock (**after** `[data-drift-works]` in DOM order) that opens/closes the full bilingual controls sheet (`[data-drift-help-panel]`, dismissible via `Escape` or clicking the toggle again).
- **FR2 Unified Bottom Wayfinding Dock: Guided Work Stepper, Tactile Lens Pill & Single-Row Mobile Zone Strip (`WorkStepper.ts`, `LensToggle.ts`, `HorizonCompass.ts`, `DriftIsland.astro`):**
  - **Strict DOM Tab-Order Invariant:** All bottom wayfinding controls MUST sit **after** `[data-drift-works]` in DOM order (matching visual top-to-bottom layout) so `Tab × 3` (`Mute` → `Wake up` → `nearest work button in [data-drift-works]`, `tests/e2e/drift.spec.ts`) remains 100% intact.
  - **Guided Work Stepper (`src/world/island/WorkStepper.ts`):**
    - `[data-drift-prev]` (`<button type="button">`, `aria-label={ui.t('work_prev')}`): smoothly glides the camera along the exhibition path to the previous work (`session.cycle(activeSlug, -1)` → `session.focus(slug)`).
    - `[data-drift-current]` (`<button type="button">`): displays the currently faced/nearest work title and sequence position (`<Title> · i / N`), and opens `FocusOverlay` for that work when clicked/tapped—giving mobile visitors and non-gamers an effortless 1-tap way to inspect works without 3D raycast hunting.
    - `[data-drift-next]` (`<button type="button">`, `aria-label={ui.t('work_next')}`): smoothly glides the camera along the exhibition path to the next work (`session.cycle(activeSlug, 1)` → `session.focus(slug)`).
  - **Tactile Lens Cycle Pill (`src/world/island/LensToggle.ts`):**
    - `<button type="button" data-lens-cycle>` (`min-height: 44px`) showing the localized active lens label (or prompt before first hover/aim) and cycling `lens.cycle()` + `announcer.announce()` on click/tap, making all 6 camera techniques discoverable to mouse-only and iPhone visitors without hidden shortcuts.
  - **Thumb-Friendly Mobile Zone Strip:**
    - On narrow viewports (`≤ 640px`), `.drift-zones` lays out as a compact single-row horizontal scroll strip (`flex-wrap: nowrap; overflow-x: auto; touch-action: pan-x`) so zone pills never wrap into multi-row stacks occluding the 3D field.
- **FR3 Rich In-Place `FocusOverlay` with Curatorial Metadata & `‹ Prev / Next ›` Work Stepping (`WorldManifest.ts`, `WorldManifestBuilder.ts`, `FocusOverlay.ts`, `DriftIsland.astro`):**
  - Enrich `ManifestWork` (`WorldManifest.ts` + `WorldManifestBuilder.ts`) with localized curatorial fields (`metaLine`, `availabilityLabel`, `contextLabel`, `positionIndex`, `positionTotal` — zero prices!).
  - Upgrade `<dialog class="drift-focus" data-drift-focus closedby="any">`:
    - Header row with `[data-focus-context]` (`Dreamland · Arrival · 1 / 40`) and always-reachable top-right `[data-focus-close]` button (`≥ 44×44` px).
    - Unaltered `[data-focus-image]` sized with `dvh`-safe bounds so title, metadata, and controls fit cleanly on `390×844` iPhones.
    - Curatorial `[data-focus-meta]` displaying `metaLine` and `availabilityLabel` alongside `<h2>`, `[data-focus-fragment]`, and `[data-focus-specimen]`.
    - **In-Dialog `‹ Previous work` (`[data-focus-prev]`) and `Next work ›` (`[data-focus-next]`) `<button type="button">` buttons + `ArrowLeft` / `ArrowRight` keyboard support while the dialog is open:** stepping updates the dialog in place AND glides the camera (`session.focus(nextSlug)`) + updates `?w=<nextSlug>` via `replaceState` (when `!kiosk`), so closing the dialog leaves the visitor standing directly in front of the work they browsed to.
    - Preserve `?kiosk=1` exhibition mode invariants (`0` `<a href>` elements on the page; QR code shown instead of `[data-focus-work-row]` / `[data-focus-contact-row]`).
- **FR4 Post-Overhaul 7-Persona Sociological Survey Verification & Documentation (`tests/e2e/uxSurvey.spec.ts`, `docs/ux/`, `docs/adr/`, `README.md`, `docs/perf.md`):**
  - Update and assert `tests/e2e/uxSurvey.spec.ts` so all 8 wayfinding capability checks pass (`true`), HUD collisions on mobile (`375px` / `390px`) and desktop (`1440px` / `1920px`) equal `0`, touch targets pass, and all 7 visitor persona UX scores achieve **`≥ 90 / 100`**.
  - Update `docs/ux/senior-ux-synthesis.md` with before-vs-after empirical persona score tables, record sequential ADR in `docs/adr/`, and update `README.md` & `docs/perf.md`.

## Non-Functional Requirements

- Respect ADR 0006: all new state/UI controllers (`DriftHelp.ts`, `WorkStepper.ts`, `LensToggle.ts`, `FocusOverlay.ts`, `WorldManifest.ts`) live outside `src/world/gl/` with **100% Vitest coverage**.
- Maintain bundle budgets (`≤ 8 KB` gz boot, `≤ 250 KB` gz world), ≥ 60 fps desktop, and `0` axe violations across EN + FR (including with `[data-drift-help-panel]` open and `[data-drift-focus]` open).

## Acceptance Criteria

1. Zero bounding-box collisions in `.drift` on `375×667` and `390×844` in both EN and FR; onboarding hint adapts to pointer type and `[data-drift-help-toggle]` toggles the controls sheet cleanly.
2. Clicking `[data-drift-next]` / `[data-drift-prev]` glides between works along the path, `[data-drift-current]` opens the active work in `FocusOverlay`, and `[data-lens-cycle]` cycles camera lenses on click/tap while `Tab × 3` still reaches `[data-drift-works] button:focus`.
3. `FocusOverlay` displays curatorial metadata and steps `Prev / Next` via buttons or `ArrowLeft` / `ArrowRight`, syncing camera pose and `?w=` URL (outside `?kiosk=1`).
4. All 7 sociological visitor personas in `tests/e2e/uxSurvey.spec.ts` score `≥ 90 / 100`, and `npm run check` + `npm run test:e2e` pass under both `CI=true` and `CI` unset.

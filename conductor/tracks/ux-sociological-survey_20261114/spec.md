# Spec: Multi-Persona Sociological UI/UX Visitor Survey & Senior UX Expert Synthesis

**Track ID:** `ux-sociological-survey_20261114` · **Type:** UX Research, Telemetry & Synthesis · **Depends on:** `aurora-thresholds-and-zones_20261112`

## Overview

Conduct an empirical, reproducible **sociological UI/UX survey** of `iknowyoucanseeme.xyz` across **7 distinct visitor archetypes** spanning contemporary art curators, mobile Instagram followers, collectors, peer photographers/ceramists, exhibition QR-code visitors, non-gamer cultural visitors, and assistive-tech / keyboard-only visitors. Measure real browser layout geometry, touch-target ergonomics, click-depth, filter reversibility, and cross-layer continuity across Desktop (`1440×900`, `1920×1080`), Tablet (`820×1180`), and Mobile iPhone (`390×844`, `375×667`) in both English and French. Synthesize the empirical data as a **Senior UI/UX Expert** into a prioritized navigation blueprint and ADR governing the Awake and Drift navigation tracks.

## Functional Requirements

- **FR1 Sociological Visitor Persona Model & Pure UX Audit Engine (`src/ux/VisitorPersonas.ts`, `src/ux/NavigationAudit.ts`):**
  - Model 7 sociological visitor personas with explicit goals, device/pointer profiles, cultural/3D literacy levels, and weighted wayfinding criteria:
    1. `curator` — Pressed contemporary art curator / open-call juror (FR, Desktop `1440×900`, 90 s dossier review).
    2. `instagram-mobile` — Mobile social follower arriving from link-in-bio (EN/FR, iPhone `390×844`, coarse thumb pointer).
    3. `collector` — Collector / patron evaluating physical print/ceramic details & availability (FR/EN, Tablet `820×1180` & Desktop).
    4. `peer-artist` — Fellow photographer / ceramic artist exploring camera lenses & Dreamland's dual medium (EN, Desktop trackpad + keyboard).
    5. `gallery-qr` — Physical exhibition visitor scanning a wall QR code onto a work or deep link (FR, Mobile `390×844`).
    6. `non-gamer` — Cultural visitor / older art lover unfamiliar with 3D game controls, drag-to-move, or hidden keyboard shortcuts (EN/FR, Mouse-only Desktop).
    7. `keyboard-a11y` — Keyboard-only, screen-reader, or motion-sensitive visitor switching between Drift and Awake (EN/FR, Keyboard + assistive tech).
  - Implement pure, deterministic evaluation functions (`100%` Vitest + `fast-check` property coverage):
    - `detectRectOverlaps(rects)` & `viewportCoverageRatio(rects, viewport)` to quantify HUD collisions (such as `.drift-help` vs `.drift-top` on `375–390px` viewports) and chrome occlusion.
    - `auditTouchTargets(targets, pointerKind)` checking WCAG 2.5.8 AA (`≥ 24×24` CSS px minimum) and mobile thumb comfort (`≥ 44×44` CSS px on coarse pointers).
    - `evaluateWayfindingChecks(snapshot)` scoring 8 concrete cross-site navigation capabilities:
      1. `globalDriftEntry`: 1-click Drift entry reachable from non-Home Awake routes even when `mode === 'awake'`.
      2. `reversibleWorksFilter`: Works index supports resetting `:target` / filters back to all 40 works in 1 click plus filtering photography vs ceramics.
      3. `workBreadcrumbAndContext`: Work page surfaces top-of-page hierarchy (Works → Territory → Zone + `i / N` position) and visual prev/next navigation.
      4. `territoryContinuity`: Territory page provides in-page zone jump links, a Drift portal link, and cross-territory continuation.
      5. `awakeWakeContinuity`: Waking up from a settled/deep-linked work (`/?w=<slug>`) keeps a direct link to that work's Awake page.
      6. `driftGuidedStepping`: Drift HUD offers clickable/tappable `Previous / Current (i / N) / Next` work glide controls without requiring 3D drag or `Tab`.
      7. `tactileLensControl`: Drift HUD exposes a visible 1-tap/click Lens indicator & cycle button without requiring secret `L` key or 500 ms hold discovery.
      8. `focusInPlaceBrowsing`: Drift `FocusOverlay` exposes curatorial metadata (`year`, dimensions, medium, availability) and in-dialog `Previous / Next` work stepping.
    - `scorePersona(persona, report)` computing a bounded `0–100` UX score per persona with a `fast-check` monotonicity invariant (resolving any check failure or HUD collision never decreases any persona's score).
- **FR2 Empirical Playwright Multi-Persona Survey Suite (`tests/e2e/uxSurvey.spec.ts`):**
  - Drive real Chromium sessions across EN & FR on Desktop (`1440×900`, `1920×1080`) and Mobile (`390×844`, `375×667`) across Threshold, Drift, Focus dialog, Awake Home, Works Index (`#dreamland`), Territory page, and Work page.
  - Measure actual DOM bounding boxes, HUD overlap pixels, touch target dimensions, click hops, and wayfinding check states, feeding them into `NavigationAudit` to verify the baseline diagnostic profile cleanly and reproducibly.
- **FR3 Sociological Survey Report, Senior UI/UX Expert Synthesis & ADR (`docs/ux/sociological-survey.md`, `docs/ux/senior-ux-synthesis.md`, `docs/adr/`):**
  - Author `docs/ux/sociological-survey.md`: detailed sociological field study for all 7 visitor personas, with exact measured viewport geometry, task-completion transcripts, cognitive/cultural friction analysis, and baseline persona scores.
  - Author `docs/ux/senior-ux-synthesis.md`: Senior UI/UX Principal synthesis distilling `P0` (Critical Friction), `P1` (Structural Wayfinding), and `P2` (Ergonomic Polish) recommendations across both layers while strictly honoring `conductor/product.md` & `conductor/product-guidelines.md` (*"Drift, don't navigate"*, *"Never truly lost"*, zero prices, `DistGuard` `0 B` static-page JS budget, single `iknowyoucanseeme` on Awake Home, `Tab × 3` keyboard path, and `?kiosk=1` zero-link invariant).
  - Record a sequential Architecture Decision Record in `docs/adr/` (`Context`, `Decision`, `Considered & Rejected Alternatives` — e.g. rejecting a conventional top navbar inside the 3D Drift world and rejecting client-side JS filter bundles on Awake pages).

## Non-Functional Requirements

- `100%` statement, branch, function, and line coverage on `src/ux/**` (`vitest.config.ts`).
- Zero regressions to existing unit (`npm run check`) or E2E (`npm run test:e2e`) suites; zero local absolute paths (`/Users/...`) in docs or ADRs.
- Any newly discovered empirical navigation defects outside Track 14's read-only audit scope must be reported under `OUT-OF-SCOPE FINDINGS` so the coordinator carries them into Tracks 15 and 16.

## Acceptance Criteria

1. `src/ux/VisitorPersonas.ts` and `src/ux/NavigationAudit.ts` achieve 100% test coverage including `fast-check` property invariants.
2. `tests/e2e/uxSurvey.spec.ts` executes real multi-viewport EN/FR browser probes across all 7 visitor archetypes and passes deterministically.
3. `docs/ux/sociological-survey.md`, `docs/ux/senior-ux-synthesis.md`, and the new sequential ADR in `docs/adr/` are complete, grounded in measured DOM/viewport evidence, and free of absolute paths or price terms.
4. `npm run check` and `npm run test:e2e` pass with exit code `0` under both `CI=true` and `CI` unset.

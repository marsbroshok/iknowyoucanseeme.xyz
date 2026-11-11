# Spec: Astro Foundation & Design System

**Track ID:** `astro-foundation_20261111` · **Type:** Feature · **Phase:** 1 · **Depends on:** `intake_20261111`, `copy_20261111`

## Overview

Install Astro (static output) next to the legacy Hugo files, wire content collections to the shared Zod schemas, set up FR/EN i18n routing, and build the design system (tokens, fonts, base layout, accessibility primitives) that every later page and the WebGL world will use.

## Functional Requirements

- **FR1 Astro setup:** Astro (latest stable) with TypeScript strict, `output: 'static'`, `site: 'https://www.iknowyoucanseeme.xyz'`, source in `src/`, static files in `public/`. Hugo files are left untouched (removed in `launch_20261111`).
- **FR2 Content collections:** `src/content.config.ts` defines `works`, `territories`, `zones`, `exhibitions`, `pages`, `sources` using the glob loader and **imports the existing Zod schemas** (no duplicated schema definitions). Work images resolve via `astro:assets` `image()`.
- **FR3 i18n:** locales `en` and `fr`, both prefixed (`/en/…`, `/fr/…`). Localised path segments come from one route map (`works` ↔ `oeuvres`, `territories` ↔ `territoires`, `exhibitions` ↔ `expositions`, `about` ↔ `a-propos`, `legal` ↔ `mentions-legales`, `contact` ↔ `contact`). Helpers: `localizedPath(routeKey, lang, params)`, `alternateLinks(...)`. The root `/` is a tiny bilingual chooser: it picks the language from `navigator.language` in JS and, without JS, shows two plain links.
- **FR4 Design tokens (CSS custom properties, `@layer`):** night-blue base `--ink: #0b1030`, text colours with AA contrast, an accent variable `--accent` set per page from the nearest work's palette, a spacing and type scale, motion tokens respecting `prefers-reduced-motion`.
- **FR5 Typography:** self-hosted Fraunces (variable: opsz, SOFT, WONK) and JetBrains Mono, subset to Latin + Latin-1 + Latin Extended-A (French diacritics), `font-display: swap`, preloaded.
- **FR6 Base layout:** `BaseLayout.astro` with `<html lang>`, hreflang alternates, canonical URL, OG/Twitter meta from props, skip link, a minimal header (signature *iknowyoucanseeme*, language switch, "Drift / Dériver" placeholder link) and footer (© year Alexander Usoltsev, all rights reserved, legal link). No search, no theme toggle.
- **FR7 Components:** `WorkImage` (responsive AVIF/WebP via `<Picture>`, ≤ 2400 px, alt text from content, palette-derived placeholder background), `Fragment` (styled poetic text), `Meta` (mono metadata line `30 × 40 · 2025`). One component per file.

## Non-Functional Requirements

- Zero client JS on awake pages except the root language chooser (≤ 1 KB).
- Unit tests (Vitest) for i18n helpers, route map completeness (property test: every route key has both locales; round-trip path ↔ key), palette → accent contrast helper (always ≥ 4.5:1 against `--ink` after adjustment; property test).
- `astro check` zero errors; 100% coverage for TS modules.

## Acceptance Criteria

1. `npm run build` produces a static site; `/`, `/en/`, `/fr/` render with the base layout.
2. Content collections load the intake output without schema errors.
3. Lighthouse (local) on `/en/`: Accessibility = 100, Best Practices ≥ 95.

## Assumptions

- Both locales are prefixed for symmetry; EN is the fallback when a FR text is missing (logged at build as a warning, never silently invented).

## Out of Scope

- Actual pages (next track), deployment, the WebGL world.

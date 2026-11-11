# Plan: Astro Foundation & Design System

Track: `astro-foundation_20261111` · Spec: [spec.md](./spec.md) · Workflow: [../../workflow.md](../../workflow.md)

## Phase 1: Astro & content

- [ ] Task: Install Astro + `@astrojs/check`; `astro.config.mjs` (static, site, i18n); extend `npm run check` to include `astro check` and `astro build`
- [ ] Task: Content collections reuse the Zod schemas
    - [ ] Red: test that `content.config.ts` collection schemas are the same objects exported by `src/content/schema` (no duplication)
    - [ ] Green: implement; build loads intake and copy output
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 2: i18n

- [ ] Task: Route map & helpers
    - [ ] Red: property tests (every key has en+fr; `pathToKey(localizedPath(k, l, p))` round-trips; no collisions)
    - [ ] Green: `src/i18n/RouteMap.ts`, `src/i18n/LocalizedPath.ts`, `src/i18n/Alternates.ts`
- [ ] Task: UI strings loader from `pages/ui.yaml` with EN fallback + build warning (tested)
- [ ] Task: Root language chooser page (`src/pages/index.astro`) + tiny inline script (tested logic in `src/i18n/ChooseLocale.ts`)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Phase 3: Design system

- [ ] Task: Tokens & base CSS (`src/styles/tokens.css`, `base.css`, layers, reduced-motion)
- [ ] Task: Accent contrast helper
    - [ ] Red: property test: for any hex palette colour, `accentFor(hex)` ≥ 4.5:1 vs `--ink`
    - [ ] Green: `src/design/AccentColor.ts`
- [ ] Task: Self-hosted fonts (subset files in `public/fonts/`, licence files included, preload in layout)
- [ ] Task: `BaseLayout`, `Header`, `Footer`, `SkipLink`, `WorkImage`, `Fragment`, `Meta` components
    - [ ] Red: Astro container-API rendering tests (lang attr, hreflang, canonical, alt text present, no search/theme toggle)
    - [ ] Green: implement
- [ ] Task: Playwright + axe setup; e2e smoke for `/`, `/en/`, `/fr/` (axe zero violations)
- [ ] Task: Phase Verification & Checkpoint (Refer to workflow.md)

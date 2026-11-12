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

- [x] Task: Tokens & base CSS (`src/styles/tokens.css`, `base.css`, layers, reduced-motion)
- [x] Task: Accent contrast helper
    - [x] Red: property test: for any hex palette colour, `accentFor(hex)` ≥ 4.5:1 vs `--ink`
    - [x] Green: `src/design/AccentColor.ts`
- [x] Task: Self-hosted fonts (subset files in `public/fonts/`, licence files included, preload in layout)
- [x] Task: `BaseLayout`, `Header`, `Footer`, `SkipLink`, `WorkImage`, `Fragment`, `Meta` components
    - [x] Red: Astro container-API rendering tests (lang attr, hreflang, canonical, alt text present, no search/theme toggle)
    - [x] Green: implement
- [x] Task: Playwright + axe setup; e2e smoke for `/`, `/en/`, `/fr/` (axe zero violations)
- [x] Task: Phase Verification & Checkpoint (Refer to workflow.md)

## Review fixes
- `7f248fd` build: add astro build and test:e2e to check script
- `294928e` fix(components): remove invalid React key from Astro Fragment
- `3a671e0` build: typecheck e2e files properly using dedicated tsconfig
- `7330427` test: remove v8 ignore comments and strengthen assertions
- `0b5168e` feat(content): implement copy join helper with tests
- `b53712f` test(components): implement Astro container-API tests for all components

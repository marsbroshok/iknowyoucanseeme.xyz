# Tech Stack

## Current (legacy, to be replaced)

- Hugo 0.136 + Hugo Blox academic/blog starter (Go modules), Scrollama, Pagefind.
- GitHub Pages hosting via GitHub Actions; leftover `netlify.toml`.
- Will be tagged `legacy-hugo` in git and removed from the main branch during Phase 1.

## Target

| Layer | Choice | Rationale |
|---|---|---|
| Language | **TypeScript** (strict) | Typed content schemas and shader/scene modules |
| Site framework | **Astro** (static output) | Content collections in markdown/YAML, built-in i18n routing, image pipeline, ships zero JS for the awake layer |
| Immersive world | **Three.js** + custom **GLSL** shaders, mounted as an Astro island | Full control over fog, colour bleed, mirror folds, double exposure, leak effects; no React overhead |
| Audio | **Tone.js** behind an in-house `SoundEngine` interface, **dynamically imported only after the threshold click** | Generative ambience needs LFOs, scheduling, reverb, filters and noise, all built into Tone. Lazy loading means its ~100 KB gz never affects first view. The interface keeps it swappable for native Web Audio (see Decision Notes below) |
| Styling | Plain modern **CSS** (custom properties, container queries, `@layer`), no CSS framework | Bespoke art direction; small payload |
| Content | Astro **content collections** with **Zod** schemas (`territories`, `zones`, `works`, `exhibitions`, `pages`) | Artist edits files in git; build fails on invalid content |
| Images | Astro `astro:assets` (Sharp): AVIF/WebP, ≤ 2400 px, responsive `srcset`; build-time dominant-palette extraction | Fast, never exposes print masters |
| 3D assets (later) | glTF/GLB via Three.js `GLTFLoader` (+ Draco/Meshopt) | Ceramic photogrammetry scans |
| i18n | Astro i18n routing: `/fr/…`, `/en/…`; per-locale slugs (`oeuvres` / `works`) | Bilingual FR + EN |
| Forms | Web3Forms (static form endpoint; access key via env/build secret) | Contact for availability without a backend |
| Analytics | GoatCounter (cookieless) | No consent banner |
| Database | None | Static site; content in git |

## Tooling & Quality

| Concern | Tool |
|---|---|
| Package manager / runtime | Node.js (v25 present) + **npm** (see Decision Notes, 2026-11-11) |
| Unit & component tests | **Vitest** (+ `@vitest/coverage-v8`); Astro container API for page components; **jsdom** (per-file `@vitest-environment jsdom`) for the small client scripts (added 2026-11-12, awake-layer) |
| SEO | **@astrojs/sitemap** with hreflang alternates derived from the route map (added 2026-11-12, awake-layer) |
| Property-based tests | **fast-check** (content schema, routing, palette, drift math invariants) |
| End-to-end & visual | **Playwright** (awake layer flows, device routing, i18n, screenshots of the world) |
| Accessibility | `@axe-core/playwright` |
| Performance | Lighthouse CI on awake pages |
| Lint / format | ESLint (typescript-eslint, astro plugin) + Prettier; `astro check` for types |
| Mutation testing (optional) | Stryker on core logic modules |

## Hosting & Delivery

- **GitHub Pages**, built and deployed by GitHub Actions on `main`. Canonical domain `www.iknowyoucanseeme.xyz`; the apex redirects (current setup kept).
- Feature work in isolated git worktrees under `./.worktrees/`, one branch per Conductor track.
- Repository limits respected (files < 100 MB, repo ≲ 1 GB). Large audio/video may later move to the artist's Monarobase (cPanel) hosting as a static media origin.

## Media & Intake Pipeline

- **Print masters never enter git.** Originals and the Instagram export live in a git-ignored `intake/` directory (plus the artist's own backups).
- A **TypeScript (Node) intake CLI**, tested with Vitest, will:
  1. parse the Instagram JSON export into candidate work/exhibition entries for review;
  2. generate committed web masters (≤ 2400 px long edge, sRGB, metadata stripped) into `src/assets/works/`;
  3. extract dominant palettes for the runtime accent colour;
  4. generate per-work QR codes / printable wall labels.

## Decision Notes

- **Tone.js vs native Web Audio.** Native Web Audio is the more durable standard, but writing reverbs, LFO modulation and generative scheduling by hand costs a lot of time for little artistic gain. Tone.js (v15, maintained) gives these out of the box, and lazy loading after the threshold removes its weight concern. "Future-proofing" comes from the `SoundEngine` interface, not from the library choice: the world talks only to `SoundEngine`, so Tone.js can be replaced without touching scene code. To be recorded as an ADR in `docs/adr/` during the sound track.

## Secrets

- Web3Forms access key and any tokens provided via environment variables / GitHub Actions secrets; never committed.

- **npm instead of pnpm (2026-11-11).** pnpm is not installed and Node v25 no longer bundles Corepack. Installing a global tool overnight without the artist's OK was rejected; npm is already present, is one less tool for the artist to learn, and is sufficient for a single-package static site.

- **GoatCounter integration (2026-11-12, launch).** `PUBLIC_GOATCOUNTER_CODE` (GitHub repository variable) enables GoatCounter's async `https://gc.zgo.at/count.js`, the only external script the dist guard allows; unset or blank means no script and `Analytics.track()` is a no-op. A set but invalid code fails the build.
- **QR codes (2026-11-12, launch).** `qrcode` generates the exhibition-label QR codes as SVG at build time (`src/qr/QrCode.ts`); tests decode them with `jsqr` (dev) after rasterizing with Sharp. `qrcode` is pinned at 1.4.1, the newest version this machine's npm mirror serves (public latest: 1.5.4); upgrade when the mirror has it.
- **Three.js in the drift (2026-11-12, drift-world).** `three` 0.177 (+ `@types/three`) is the only runtime dependency of the world. GPU code lives in `src/world/gl/` (excluded from unit coverage, verified by Playwright with SwiftShader; ADR 0006); everything else of the world is pure TypeScript under the 100% gate.

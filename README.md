# iknowyoucanseeme.xyz

The website of Alexander Usoltsev, photographer and ceramicist, signing as
**iknowyoucanseeme**. It is a static, bilingual (French and English) site
built with [Astro](https://astro.build) and hosted on GitHub Pages at
<https://www.iknowyoucanseeme.xyz>.

The site has two layers. The **awake layer** is plain, fast HTML for every
work, territory and exhibition. **The drift** is a Three.js world mounted
on the home pages `/en/` and `/fr/` on capable devices (see "The drift"
below), opening on **the threshold**, with **the lens** over the work under
the pointer, **the gaze**, **fragments** of text near the works, **sound**
(a generative ambience that follows the drift) and framed **specimens**.
Through **the leak**, drift time colours the awake pages without hurting
contrast; an **exhibition mode** (`?kiosk=1`) runs the drift unattended on a
gallery screen.

The former Hugo site is preserved under the git tag `legacy-hugo`.

## Quick start

Requirements: Node.js (v22 or newer; v25 is used locally) and npm.

```bash
npm ci              # install exactly what package-lock.json lists
npm run dev         # local dev server
npm run check       # types + astro check + lint + unit tests (100% coverage) + build
npm run test:e2e    # Playwright: builds the site, then crawls every page with axe
npm run build       # production build into dist/
```

Useful extras:

| Command | What it does |
|---|---|
| `npm test` | Unit and property tests (Vitest) without coverage |
| `npm run test:coverage` | The same with the 100% coverage gate |
| `npm run lint` | ESLint |
| `npm run lint:workflows` | Optional: [actionlint](https://github.com/rhysd/actionlint) on `.github/workflows/` (needs `actionlint` installed, e.g. `brew install actionlint`; CI always runs it) |
| `npm run typecheck` | `astro sync` + TypeScript (site, tools and e2e tests) |
| `npm run intake <step>` | Content intake from the Instagram export (see below) |
| `npm run copy:review` | Writes `docs/copy/REVIEW.md`, the copy review sheet |
| `npm run lockfile:normalize` | Rewrites `package-lock.json` to public registry URLs (run after `npm install <pkg>`) |
| `npm run perf:trace` | Frame-rate trace of the drift world in Chromium on this machine's GPU (desktop + emulated phone); not a gate, numbers go to `docs/perf.md` |
| `npm run verify:clean-clone` | Clones the current commit into a temp folder, installs from the public npm registry, runs the check and builds (rehearsal of the deploy job) |

## Pages

Every page exists in English and French, both prefixed (`/en/…`, `/fr/…`),
always with a trailing slash.

| Page | EN | FR |
|---|---|---|
| Home | `/en/` | `/fr/` |
| Works index | `/en/works/` | `/fr/oeuvres/` |
| Work | `/en/works/<slug>/` | `/fr/oeuvres/<slug>/` |
| Territory | `/en/territories/<slug>/` | `/fr/territoires/<slug>/` |
| Exhibitions | `/en/exhibitions/` | `/fr/expositions/` |
| About | `/en/about/` | `/fr/a-propos/` |
| Contact | `/en/contact/` | `/fr/contact/` |
| Legal | `/en/legal/` | `/fr/mentions-legales/` |
| Exhibition labels (print, not indexed) | `/en/labels/` | `/fr/labels/` |

All routes come from `src/i18n/SiteRoutes.ts` (one Astro route,
`src/pages/[lang]/[...route].astro`). UI strings live in
`src/content/copy/pages/ui.yaml`; a missing key fails the build. No page
shows a price: availability is "contact for availability / disponibilité
sur demande" unless a work is marked sold or not for sale.

Old addresses of the Hugo site (`/dreamland/`, `/blog/`,
`/blog/colors-and-shapes/`, `/uses/`, `/tags/`) are small redirect pages
(`src/i18n/LegacyRedirects.ts`, see `docs/adr/0005-legacy-redirect-pages.md`).

## The drift

On `/en/` and `/fr/` a small boot script (`src/world/island/DriftBoot.ts`)
decides between the world and the awake page: the world needs WebGL2,
Save-Data off and, where the browser says, at least 4 GB of memory and 4
cores. `prefers-reduced-motion` does not route (artist decision,
`docs/adr/0009-reduced-motion-does-not-route.md`): the always-visible
"Wake up / Se réveiller" control is the opt-out. The visitor's "Wake up / Se réveiller"
and "Drift / Dériver" choice is remembered in `localStorage`. Three.js is
loaded only after the first paint and only when the world is shown
(≤ 250 KB gzipped, checked by `tests/e2e/bundle.spec.ts`). The awake HTML is
never removed; while the world is shown it is made `inert`.

- Threshold: a first visit opens on a deep night-indigo void with the *Dreamland*
  closing border line (`pages/threshold.yaml` `blocks.line`), a shimmering
  multi-ribbon **aurora borealis curtain** (`ThresholdPalette` + `ThresholdLeak`:
  vertical folds of emerald-green, violet and magenta-pink modulated subtly by an
  Arrival work's palette) and **Enter / Entrer** (focused; Enter or Space
  works). "Wake up / Se réveiller" stays visible above it. Returning
  visitors (`localStorage`) and deep links get a short threshold: while
  sound is on it still waits for Enter (the click unlocks audio); muted, it
  fades in 1 s by itself. Sound is on by default, so a visitor who arrives
  from a QR wall label or another deep link clicks Enter once (that click
  is the gesture that allows audio); muting while the short threshold waits
  lets it fade by itself. "Drift" on the awake page skips it. Entering
  dispatches a bubbling `entered` event (`detail: { gesture, returning }`)
  on the world layer. Without JavaScript the awake page shows as before.
- Zones and portals: each region carries its own nocturnal sky and fog
  atmosphere (`ZoneAtmosphere` + contrast-guarded `PaletteSky`: ultramarine-teal
  in Arrival, emerald-pine in Lens, plum-rose in Leak, boreal violet-indigo in
  *The border is thin*), separated by translucent **3D boreal light curtains**
  (`ZoneGates` + `BorealGateMesh`) across every zone gap and territory entry
  that part smoothly near the camera. Crossing into a region reveals a centered
  `Fraunces` title and excerpt card (`ZoneCrossing` + `ZoneBanner`,
  `[data-zone-banner]`) for 3 s and updates the segmented bottom zone strip
  (`HorizonCompass`), whose `<button type="button">` pills also let visitors
  jump cleanly to any zone or territory (`DriftSession.jumpToRegion`). Design
  notes: `docs/adr/0013-boreal-threshold-and-zone-portals.md`.
- Sound: a generative ambience per zone (Arrival: a filtered sea and slow
  drones; Lens: brighter, with glints as works approach; Leak: a low dry
  pulse and a faint hum; the border is thin: wind, slow bends and a low
  swell near the eclipse works), crossfading over 2 s as the camera moves.
  Nothing audio exists before a gesture (Enter, Drift, or unmuting): Tone.js
  is loaded only then, in its own chunk. **Mute sound / Couper le son**
  stays visible next to "Wake up" and is remembered in `localStorage`; a
  hidden tab, "Wake up" or mute suspend the audio; the level never goes
  above −12 dBFS. Optional field recordings are listed in
  `public/audio/manifest.json` (shipped empty: `{ "zones": {} }`; add
  `{ "zones": { "arrival": [{ "src": "/audio/sea.ogg", "gain": 0.6 }] } }`
  with the files under `public/audio/`); they stream only while their zone
  is heard. Design notes: `docs/adr/0011-tone-js-behind-sound-engine.md`.
- Gaze: after the pointer stays on a work for more than 2 s, it turns
  slightly toward it. After 3 minutes of drifting, the line may surface once
  in the fog (at most once per tab session, `sessionStorage`).
- Fragments: when the camera settles near a work, its fragment (or a
  sentence of the territory's statement, spread along the path) fades in
  above it and is read out through a polite live region. Read fragments are
  stored in `localStorage`; each territory page then shows "Fragments found:
  n / N" (JavaScript only). Design notes:
  `docs/adr/0010-threshold-gaze-fragments.md`.
- Leak: the longer someone drifts, the more the awake pages take on dream
  colour. The world keeps the drift time and the colour of the last work
  seen up close in `localStorage` (`iknowyoucanseeme.leak`, local only; it
  fades over days of absence); a ~1.2 KB inline script in the head of every
  awake page tints the background and gives work images a soft colour edge
  (`src/styles/leak.css`, `@layer leak`) before first paint, never below
  4.5:1 contrast for any text (`src/leak/LeakStyle.ts`). From level 0.4 a
  faint cut-out of *Les Reflets II* may drift once down the page margin
  (wide screens only, never over text). "Clear the leak / Effacer
  l'infiltration" on the legal page removes it. Design notes:
  `docs/adr/0012-leak-specimens-and-exhibition-mode.md`.
- Specimens: the Leak zone's Venice portraits and clay sketches carry
  museum tags (`spécimen 03 · Venise · 2025`, `esquisse 01 · argile ·
  2026`): a framed specimen grid on the awake Dreamland page, a thin frame
  and a tag under the work in the world, and the tag in its dialog.
- Exhibition mode: `/{lang}/?kiosk=1` runs the drift unattended for a
  gallery screen (no threshold, auto-drift, reset after 90 s, hidden
  cursor, sound after the first tap, QR codes instead of links). Setup:
  [`docs/exhibition-mode.md`](docs/exhibition-mode.md).
- Move: scroll or drag; arrow keys; tilt on phones (after a tap, with the
  iOS permission prompt). Tab goes to the nearest work, then along the
  path; Enter opens it in a dialog with its links.
- Deep links: `/{lang}/?w=<slug>` opens the world in front of a work; every
  work page has a "See it in the drift" link, which also overrides a stored
  "Wake up" choice back into the world on WebGL2 devices without Save-Data.
  The address follows the work the visitor stops at.
- Lens: pointing at a work (mouse, or a finger while it touches) shows it
  through one of the artist's camera techniques inside a soft circle:
  colour filter, mirror fold, multiple exposure, fracture and collage,
  light leak, motion blur. Each work starts with the lens its caption names
  (mirror, ND / filter, ICM, multiple exposure; otherwise a fixed choice per
  work); techniques declared in a work file (`techniques:`, from
  `intake-config/selection.yaml`) override what the title and caption say.
  L or a long press changes the lens (with a crossfade); holding
  Shift or a two-finger tap shows the photo unaltered; a lifted finger lets
  the lens fade out over ~600 ms. Phones get cheaper variants and no
  fracture. The lens never changes the stored image. Shaders are checked in
  Chromium on a fixed test texture with reference pictures in
  `tests/visual/` (`docs/adr/0008-lens-techniques-and-shader-harness.md`);
  refresh them after a deliberate change with
  `npx playwright test tests/e2e/lens.visual.spec.ts --update-snapshots`.
- Code: pure logic in `src/world/core/`, `src/sound/core/`, `src/leak/`,
  `src/kiosk/` and `src/ux/`, DOM in
  `src/world/island/` and `src/sound/island/`, Tone.js only in
  `src/sound/engine/` (unit-tested in Node with `node-web-audio-api` and
  `Tone.Offline`; on Linux `npm run check` needs the ALSA library,
  `libasound2`), GPU code only in `src/world/gl/` (verified by Playwright, see
  `docs/adr/0006-webgl-code-verified-in-browser.md`; module scripts on the
  home pages: `docs/adr/0007-home-pages-load-world-modules.md`).
- UX survey & synthesis: 7-persona sociological browser telemetry and
  cross-layer wayfinding blueprint in
  [`docs/ux/sociological-survey.md`](docs/ux/sociological-survey.md),
  [`docs/ux/senior-ux-synthesis.md`](docs/ux/senior-ux-synthesis.md), and
  `docs/adr/0014-sociological-ux-survey-and-wayfinding-architecture.md`.
- Test-only flag: building with `PUBLIC_DRIFT_DEBUG=true` exposes read-only
  state as `window.__driftDebug` for the e2e suite (only the e2e "keyed"
  build sets it; production builds do not contain the code).
- Performance numbers: `docs/perf.md`.

## Content

- **Works, territories, zones, exhibitions:** YAML files in `src/content/`,
  validated by Zod schemas (`src/content/schema/`). The build fails on
  invalid content.
- **Texts (copy):** separate files in `src/content/copy/` (FR + EN side by
  side, see `docs/adr/0001-separate-copy-files.md`), written in the *Dreamland*
  manifesto register. `CopyGuard` (`src/tools/CopyGuard.ts`) rejects words from
  `content-config/vocabulary-deny.yaml`, enforces sentence bounds (EN ≤ 38,
  FR ≤ 42 words) and French typography, and requires ≥ 10 words per sentence on
  average across narrative prose blocks so telegraphic prose cannot pass.
- **Images:** web masters (≤ 2400 px) in `src/assets/works/<slug>/`. Print
  masters never enter git.

### Content intake

The intake pipeline turns the artist's Instagram export and the Dreamland
catalogue PDF into `src/content/works` entries and web images.

Prerequisites: `ffmpeg` (videos) and `poppler` (`pdfimages`), via Homebrew.

1. Put the Instagram export in `intake/instagram/your_instagram_activity` and
   the catalogue PDF at `intake/catalogue/Dreamland_artifacts_and_texts.pdf`.
   The `intake/` folder is git-ignored: it holds private messages and print
   masters and must never be committed.
2. `npm run intake catalogue`
3. `npm run intake propose -- --export intake/instagram/your_instagram_activity`
   writes a review sheet (`intake/review/index.html`) and
   `intake-config/selection.yaml`.
4. Edit `intake-config/selection.yaml` (`keep: false` drops a match), then
   `npm run intake generate -- --export intake/instagram/your_instagram_activity`.

## Configuration

Both values are public (they end up in the HTML) and are read at build time.
Locally they are usually unset; on GitHub they come from repository
variables (see `docs/deploy.md`).

| Variable | Set | Not set |
|---|---|---|
| `PUBLIC_WEB3FORMS_KEY` | The contact form is rendered and posts to [Web3Forms](https://web3forms.com) | No form; the contact page shows only the email address |
| `PUBLIC_GOATCOUNTER_CODE` | The [GoatCounter](https://www.goatcounter.com) script (cookieless) is added to every page | No analytics script at all; `track()` does nothing |

```bash
PUBLIC_WEB3FORMS_KEY=<key> PUBLIC_GOATCOUNTER_CODE=<code> npm run build
```

### Contact form

With a key, the form (name, email, message, a hidden `work` field and a
honeypot) works as a plain POST without JavaScript; a small script (under
3 KB) fills `work` from `?work=<slug>` and sends in place. Without a key the
form is deliberately not rendered, so a build without the key never ships a
broken form. The email address is always visible.

### Analytics

`src/analytics/` holds the GoatCounter setup. The script is only added when
`PUBLIC_GOATCOUNTER_CODE` is a valid GoatCounter code (lowercase letters,
digits, dashes); any other non-empty value fails the build. For later drift
metrics, `Analytics.track(event, data)` sends custom events such as
`drift-time` or `work-approached`. It does nothing **only** when analytics is
disabled by configuration; when enabled it sends right away, or queues the
event until the GoatCounter script has loaded.

### Exhibition labels

`/{lang}/labels/` is a printable A4 sheet with one label per work: French
title, size, year, medium and a QR code to the work's page. Print it from the
browser (A4, margins "none" or "default"). The page is not indexed and not in
the sitemap.

### Exhibition screen

`/{lang}/?kiosk=1` turns the home page into an unattended gallery screen;
the build also writes one QR code per work and language to
`/qr/<lang>/<slug>.svg` for it. How to set up a screen:
[`docs/exhibition-mode.md`](docs/exhibition-mode.md).

## Deploy

GitHub Actions (`.github/workflows/deploy.yml`) builds and publishes the site
on every push to `main` (and on manual runs): `npm ci`, `npm run check`,
`astro build`, then GitHub Pages. The exact first-time cutover steps, the
DNS/HTTPS check and the rollback to `legacy-hugo` are in
[`docs/deploy.md`](docs/deploy.md).

`package-lock.json` must only point at the public npm registry; a test fails
otherwise. After `npm install <pkg>` on a machine with a private registry
mirror, run `npm run lockfile:normalize` (see
`docs/adr/0004-public-registry-lockfile.md`).

## Rules of the repository

- No prices anywhere (content, pages, sitemap); tests enforce it.
- Nothing from `intake/` is committed; no `.env` files; no secrets in code.
- FR pages are fully French, EN pages fully English (language guard).
- Decisions are recorded in `docs/adr/`.

## License

Source code: MIT. Works, images and texts: © Alexander Usoltsev, all rights
reserved. See [`LICENSE.md`](LICENSE.md).

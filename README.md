# iknowyoucanseeme.xyz

The website of Alexander Usoltsev, photographer and ceramicist, signing as
**iknowyoucanseeme**. It is a static, bilingual (French and English) site
built with [Astro](https://astro.build) and hosted on GitHub Pages at
<https://www.iknowyoucanseeme.xyz>.

Today the site is the **awake layer**: plain, fast HTML pages for every work,
territory and exhibition. The immersive world (Three.js) comes in later
tracks; see `conductor/product.md` and `conductor/tracks.md`.

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

All routes come from `src/i18n/SiteRoutes.ts` (one Astro route,
`src/pages/[lang]/[...route].astro`). UI strings live in
`src/content/copy/pages/ui.yaml`; a missing key fails the build. No page
shows a price: availability is "contact for availability / disponibilité
sur demande" unless a work is marked sold or not for sale.

## Content

- **Works, territories, zones, exhibitions:** YAML files in `src/content/`,
  validated by Zod schemas (`src/content/schema/`). The build fails on
  invalid content.
- **Texts (copy):** separate files in `src/content/copy/` (FR + EN side by
  side, see `docs/adr/0001-separate-copy-files.md`). Plain words only; the
  copy guard rejects words from `content-config/vocabulary-deny.yaml`.
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

The value is public (they end up in the HTML) and are read at build time.
Locally it is usually unset; on GitHub it comes from a repository
variable (see `docs/deploy.md`).

| Variable | Set | Not set |
|---|---|---|
| `PUBLIC_WEB3FORMS_KEY` | The contact form is rendered and posts to [Web3Forms](https://web3forms.com) | No form; the contact page shows only the email address |

```bash
PUBLIC_WEB3FORMS_KEY=<key> npm run build
```

### Contact form

With a key, the form (name, email, message, a hidden `work` field and a
honeypot) works as a plain POST without JavaScript; a small script (under
3 KB) fills `work` from `?work=<slug>` and sends in place. Without a key the
form is deliberately not rendered, so a build without the key never ships a
broken form. The email address is always visible.

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

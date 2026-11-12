# iknowyoucanseeme.xyz

Dreamland scrollytelling web experience.

## Awake layer (site pages)

The plain, bilingual HTML layer: every page exists in English and French,
both prefixed (`/en/…`, `/fr/…`), always with a trailing slash.

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

### Contact form

The contact page uses [Web3Forms](https://web3forms.com). Set the public
access key at build time:

```bash
PUBLIC_WEB3FORMS_KEY=<your key> npm run build
```

- **Key set:** the form is rendered (name, email, message, a hidden `work`
  field and a honeypot). It works as a plain POST without JavaScript; a
  small script (under 3 KB) fills `work` from `?work=<slug>` (the work
  pages link to `/{lang}/contact/?work=<slug>`) and sends in place.
- **Key not set:** the form is **not rendered**; the page shows only the
  email address. This is deliberate, so a build without the secret never
  ships a broken form.

The email address is always visible as a fallback.

## Intake Pipeline

The intake pipeline processes raw content from the artist's Instagram export and the Dreamland catalogue PDF to generate structured `src/content/works` collections and `src/assets/works` WebP images.

### Prerequisites

- Node.js v25
- `npm`
- `ffmpeg` (for videos, via Homebrew)
- `poppler` (for `pdfimages`, via Homebrew)

### Usage

1. **Place raw data:**
   - Put your Instagram HTML export in `intake/instagram/your_instagram_activity`.
   - Put the catalogue PDF at `intake/catalogue/Dreamland_artifacts_and_texts.pdf`.

2. **Run catalogue extraction:**
   ```bash
   npm run intake catalogue
   ```

3. **Run proposals engine:**
   ```bash
   npm run intake propose -- --export intake/instagram/your_instagram_activity
   ```
   This will perceptual-hash the media, run date-based rules, and propose matches. It outputs an HTML sheet at `intake/review/index.html` and a proposed config at `intake-config/selection.yaml`.

4. **Review and generate:**
   - Review the HTML sheet. Edit `intake-config/selection.yaml` to confirm or drop (`keep: false`) matches.
   - Generate web-ready masters and Astro content schemas:
   ```bash
   npm run intake generate -- --export intake/instagram/your_instagram_activity
   ```

### Privacy & Secrets
- Never commit the raw `intake/instagram` export directory, which contains private messages and PI.
- Do not check in `.env` files or prices. `src/content` is checked by automated tests to forbid the `€` symbol and `price:` keys.

### Testing
- Run `npm run check` for static analysis, unit tests, and the Astro build check.
- End-to-end tests (`npm run test:e2e`) run Playwright and require a built application. Run `npm run check` (or `npm run build`) before running them.

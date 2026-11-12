# iknowyoucanseeme.xyz

Dreamland scrollytelling web experience.

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

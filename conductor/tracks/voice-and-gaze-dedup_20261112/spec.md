# Spec: Dreamland Manifesto Voice & Gaze De-duplication

**Track ID:** `voice-and-gaze-dedup_20261112` · **Type:** Feature / Content & UX · **Depends on:** `leak_20261111`

## Overview

Address two direct artist feedback items after live review:
1. **Voice & Prose ("Simple does not mean dumb"):** The previous `CopyGuard` 22/24-word sentence cap produced telegraphic, childish sentences (*"I am a photographer and ceramic artist. I live in France. I left my country."*). Rewrite the site's prose and all 40 work fragments (EN + FR) in the authentic, measured, lyrical-philosophical voice of the artist's *Dreamland* exhibition manifesto and 2025–2026 captions—clear and unpretentious, never choppy or infantile.
2. **Remove Redundant *"I know you can see me"* Repetitions:** Eliminate simultaneous/stacked occurrences of `iknowyoucanseeme` and `"I know you can see me"` on the Awake home page and the Threshold screen so the phrase regains its rare, uncanny power inside the fog.

## Functional Requirements

- **FR1 Calibrate `CopyGuard` to the Manifesto Register (`src/tools/CopyGuard.ts`):**
  - Raise max sentence length to **EN ≤ 38 words, FR ≤ 42 words** (matching the natural 20–33 word sentences of the *Dreamland* manifesto).
  - Keep the vocabulary deny-list (`content-config/vocabulary-deny.yaml`) against pretentious dictionary/meta words, plus French typography checks (NBSP before `: ; ? !`, guillemets `« »`).
  - Add an **anti-telegraphic prose guard** (`checkNarrativeCadence`) applied to narrative prose blocks (`pages/about.yaml` `bio` & `origin`, `territories/*.yaml` `statement`, `zones/*.yaml` `statement`): reject any narrative block whose average sentence length is **< 10 words** in EN or FR.
- **FR2 Rewrite Narrative Pages & Statements (`src/content/copy/`):**
  - `pages/about.yaml`: Rewrite `bio`, `origin` (the 2019 *L'Emprunt, la Citation* AI portrait colourisation work where a machine hallucinated colours and biases, originating *iknowyoucanseeme*), and `exhibitions` in the *Dreamland* manifesto style (EN + idiomatic FR).
  - `pages/threshold.yaml`: Add `blocks.line` carrying the manifesto's closing border line (*"The border is blurred, the realities are mixing, and the Dreamland is leaking into our world."* / *« La frontière se trouble, les réalités se mêlent, et le Dreamland s'infiltre dans notre monde. »*).
  - `territories/dreamland.yaml`, `territories/the-border-is-thin.yaml`, and `zones/{arrival,lens,leak}.yaml`: Restore full manifesto cadence and imagery (exile, home as internal dreamscape, permeable boundary, custom filters/mirrors/multiple exposures, celestial mechanics, autumn splashes).
- **FR3 Rewrite All 40 Work Fragments (`src/content/copy/works/*.yaml`):**
  - Rewrite every work's EN and FR `fragment` in the *Dreamland* manifesto & 2025–2026 caption voice (each 7–24 words; evocative, grounded in the work's title, series, and camera/clay technique; all 40 EN unique and all 40 FR unique; zero 4-word flat labels).
  - Regenerate `docs/copy/REVIEW.md` and update `docs/copy/instagram-bio.md`.
- **FR4 De-duplicate *"I know you can see me"* & `iknowyoucanseeme` (`HomePage.astro`, `DriftIsland.astro`, `ui.yaml`):**
  - **Awake Home (`HomePage.astro`):** Change `<h1>` from `iknowyoucanseeme` to **`Alexander Usoltsev`** (honouring `product.md`: *"Alexander Usoltsev leads; iknowyoucanseeme is the signature/domain"*, as `Header.astro` already displays `iknowyoucanseeme`). Replace the `<p class="artist">` line with `ui.t('artist_practice')` (*Photographer & ceramic artist* / *Photographe et artiste céramiste*), and replace `ui.t('gaze')` in `.threshold-line` with `threshold.yaml`'s `blocks.line`!
  - **Threshold Overlay (`DriftIsland.astro`):** Render `threshold.yaml`'s `blocks.line` in `.drift-threshold-line` instead of `ui.t('gaze')`.
  - **Exclusive Gaze Invariant:** `"I know you can see me"` / `"Je sais que tu me vois"` appears ONLY in `[data-drift-gaze]` (the rare fog whisper), never on the Awake home page and never on the Threshold screen.

## Non-Functional Requirements

- 100% statement/branch/function/line test coverage on changed TS modules; zero `v8 ignore` comments, zero skips, zero `any`.
- Update `conductor/product-guidelines.md` to reflect the artist's explicit voice clarification (*Dreamland manifesto cadence: clear and resonant, never telegraphic baby-talk*).

## Acceptance Criteria

1. `CopyGuard` enforces EN ≤ 38 / FR ≤ 42 max words, ≥ 10-word average sentence length on narrative prose blocks, deny-list, and FR typography; all copy files pass.
2. On `/en/` and `/fr/` Awake home, `<h1>` is `Alexander Usoltsev`, `iknowyoucanseeme` appears only once (header signature), and the gaze phrase (`I know you can see me` / `Je sais que tu me vois`) does not appear in Awake home content or on `[data-threshold]`.
3. `npm run check` and `npm run test:e2e` pass under both `CI=true` and `CI` unset with 0 axe violations.

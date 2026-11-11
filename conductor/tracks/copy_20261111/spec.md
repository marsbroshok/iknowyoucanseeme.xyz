# Spec: Copy Drafts (EN/FR) in the Artist's Voice

**Track ID:** `copy_20261111` · **Type:** Feature (content) · **Phase:** 0 · **Depends on:** `intake_20261111`

## Overview

Draft every text the site needs, in plain words the artist would actually use (see the *Authentic, simple vocabulary* rule in `product-guidelines.md`), as schema-valid content files marked `status: draft`. Nothing is final until the artist edits it and a native French reader proofs it.

## Functional Requirements

- **FR1 Schema extension:** add `TextBlock { status: 'draft' | 'artist-edited' | 'proofed', fr, en, sources[] }` and optional `fragment: TextBlock` on `Work`; `statement: TextBlock` on `Territory` and `Zone`; a `pages` collection (`about`, `gaze`, `threshold`, `contact`, `legal`).
- **FR2 Territory statements:** Dreamland (condensed from the exhibition statement, ≤ 120 words per language, keeping its key sentences) and *The border is thin / La frontière s'efface* (built from the artist's 2026 ICM and eclipse captions).
- **FR3 Zone statements:** Arrival / Arrivée, Lens / La Loupe, Leak / L'Infiltration: 1–3 short sentences each, derived from the exhibition structure.
- **FR4 Work fragments:** one fragment (≤ 2 lines) per kept work, EN + FR, sourced from the work's title, the artist's captions and statement; never a description of the image.
- **FR5 About page:** short bio (artist, photographer and ceramic artist living in France, exile/home theme stated plainly), the 2019 origin of *iknowyoucanseeme* (AI colourisation at *L'Emprunt, la Citation*, MPAA, Dec 2019), exhibitions list.
- **FR6 Microcopy:** threshold line, gaze line (*I know you can see me / Je sais que tu me vois*), Enter/Entrer, Wake up/Se réveiller, Drift/Dériver, contact form labels, "contact for availability / disponibilité sur demande", © notice, accessibility labels.
- **FR7 Instagram bio proposal:** a ≤ 150-character bio in EN and FR, written to `docs/copy/instagram-bio.md` (not published).
- **FR8 Vocabulary guard:** an automated test with a deny-list of literary words (seeded from the guidelines, e.g. *liminal, gossamer, s'amincir, ineffable, évanescent*) and a maximum sentence length (EN ≤ 22 words, FR ≤ 24 words) applied to all `TextBlock`s; French typography test (non-breaking space before `: ; ? !`, « » quotes).

## Non-Functional Requirements

- Every text records its `sources` (caption ID, statement paragraph) so the artist can trace it.
- 100% coverage for new schema/guard code; texts themselves are content.

## Acceptance Criteria

1. All kept works have an EN and FR fragment with `status: draft`.
2. Vocabulary and typography guard tests pass.
3. `docs/copy/REVIEW.md` lists every text in a single, readable page for the artist to edit and send to a native proofreader.

## Assumptions

- The artist lives in France (inferred from the French captions and exhibitions); the country he left is not named in copy.
- Tone: first person is used sparingly (About only).

## Out of Scope

- Final proofing (human). Translations into other languages.

# Product Guidelines

## Voice & Tone

- **Primary voice:** the voice of the *Dreamland* exhibition manifesto. Lyrical, philosophical, atmospheric, and measured, with first person used sparingly and cadenced sentences (typically 15–35 words) that breathe naturally.
- **Ceramics & process:** the same voice, but warmer and more tactile (clay, hands, kiln, glaze, time).
- **Never:** "quirky", "coffee-fueled", emoji, marketing superlatives, sales language ("buy now", "limited offer"), exclamation marks—and **never choppy, infantile A1 baby-sentences** (*"I live in France. I left my country."*).
- **Recurring motifs:** border, threshold, leak, drift, lens, echo, reflection, arrival, strangeness made familiar, permeable boundary, boreal curtain.
- **Work fragments:** each work gets a genuine 1–2 line poetic fragment (7–24 words), never a literal image description or flat 3–4 word label.
- **Clear, resonant vocabulary ("Simple does not mean dumb" — artist's directive, 2026-11-12):** write in the authentic register of the *Dreamland* manifesto and the artist's 2025–2026 captions. Avoid obscure dictionary jargon (*gossamer*, *ineffable*, *évanescent*), but embrace natural compound clauses, quiet metaphors (*anchor*, *resonant space*, *permeable boundary*, *strange new light*), and mature prose rhythm. Automated `CopyGuard` checks enforce this manifesto cadence (EN ≤ 38 words and FR ≤ 42 words per sentence; ≥ 10 words average sentence length across narrative prose blocks so telegraphic baby-talk cannot pass).

## Language

- Bilingual **FR + EN**, equal status. French titles are the original titles and are never translated in the UI chrome of the French version; English versions may show the French title with an English subtitle.
- Correct French typography: non-breaking spaces before `: ; ? !`, guillemets « », proper accents (*Arrivée, Étranger*).
- All copy drafted by AI in the artist's voice → edited by the artist → proofed by a native French reader before publishing.

## Naming

- Artist: **Alexander Usoltsev**. Signature/universe: **iknowyoucanseeme** (lowercase, one word).
- Zones: **Arrival / Arrivée**, **Lens / La Loupe**, **Leak / L'Infiltration**. Awake layer toggle: **Wake up / Se réveiller** and **Drift / Dériver**. Threshold: **Enter / Entrer**. (Final FR wording is subject to native proof.)
- The gaze line: *"I know you can see me" / « Je sais que tu me vois »*. Reserved strictly for the rare Gaze whisper in the fog—never duplicated on the Awake home page or Threshold screen (artist directive, 2026-11-12).

## Visual Identity

- **Base:** deep night blue (≈ `#0b1030`) taken from *Arrivée* / *Un Étranger*.
- **Accent:** sampled at runtime from the dominant palette of the nearest work, so the palette breathes. No fixed brand accent.
- **Typography:** **Fraunces** (variable serif; its optical-size and "wonk"/soft axes carry Dreamland's strangeness) for titles, fragments and statements; **JetBrains Mono** at small sizes for metadata (`30 × 40 · 2025 · tirage pigmentaire`). Both are self-hosted, subset for Latin + French diacritics. No other families.
- **Imagery is the interface:** no decorative stock, icons or illustrations. Effects must come from the artist's own techniques: custom colour filters/gels, mirror fold/kaleidoscope, multiple exposure, fracture & re-collage, light leaks/lens flare, motion blur/ICM.
- **Text in the world:** fragments only (≤ 2 lines), surfacing near works; never paragraphs. Full texts live in the awake layer.
- **No prices.** Availability is shown only as "contact for availability / disponibilité sur demande".

## UX Principles

1. **Drift, don't navigate.** No conventional menu in the world; movement is exploration.
2. **Never truly lost.** A horizon/compass and the "Wake up" exit are always reachable.
3. **The border is permeable.** Dream and awake layers bleed into each other (the Leak), but awake pages stay perfectly legible.
4. **Consent for the senses.** Sound and heavy motion start only after a deliberate threshold click; mute is always visible.
5. **Respect the visitor's device.** Weak GPUs and save-data get the awake layer automatically. `prefers-reduced-motion` is intentionally not used for routing (artist decision, 2026-11-12): the world is the artwork, and **Wake up / Se réveiller** is always visible and one click away for anyone who wants a still page.
6. **Every work is addressable.** Each work has a shareable URL that opens the world focused on it and has an awake-layer equivalent.
7. **The photo is sacred.** Lens effects are reversible overlays; the original work is always viewable unaltered.

## Accessibility

- WCAG 2.2 AA for the awake layer (contrast, focus states, keyboard navigation, alt text in FR/EN for every work).
- The world provides a keyboard path (arrow keys drift; Tab cycles nearby works) and an always-visible link to the awake layer.
- Text inside the world is also available as real HTML.

## Performance Budgets

- First meaningful view < 2.5 s on 4G; awake pages Lighthouse ≥ 95 in all categories.
- World: ≥ 60 fps desktop, ≥ 40 fps mid-range phone; textures streamed progressively; initial JS for the world ≤ 250 KB gzipped (Three.js tree-shaken).
- Images ≤ 2400 px, AVIF/WebP with fallbacks; audio streamed, never preloaded before the threshold.

## Privacy

- Cookieless analytics only (GoatCounter); no consent banner; no third-party trackers or embedded social widgets.

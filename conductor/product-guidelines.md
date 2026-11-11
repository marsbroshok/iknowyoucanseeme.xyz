# Product Guidelines

## Voice & Tone

- **Primary voice:** the voice of the *Dreamland* statement. Quiet, poetic, conceptual, first person used sparingly. Short sentences that leave space.
- **Ceramics & process:** the same voice, but warmer and more tactile (clay, hands, kiln, glaze, time).
- **Never:** "quirky", "coffee-fueled", emoji, marketing superlatives, sales language ("buy now", "limited offer"), exclamation marks.
- **Recurring motifs:** border, threshold, leak, drift, lens, echo, reflection, arrival, strangeness made familiar.
- **Work fragments:** each work gets a 1–2 line poetic fragment, not a description.
- **Authentic, simple vocabulary (artist's directive):** neither FR nor EN is the artist's native language. Use only plain words he would actually say in real life. Do NOT use rare, literary or "writerly" words (e.g. *s'amincir*, *gossamer*, *liminal*); a simple phrase beats an elegant one. The artist's own captions are the reference register.

## Language

- Bilingual **FR + EN**, equal status. French titles are the original titles and are never translated in the UI chrome of the French version; English versions may show the French title with an English subtitle.
- Correct French typography: non-breaking spaces before `: ; ? !`, guillemets « », proper accents (*Arrivée, Étranger*).
- All copy drafted by AI in the artist's voice → edited by the artist → proofed by a native French reader before publishing.

## Naming

- Artist: **Alexander Usoltsev**. Signature/universe: **iknowyoucanseeme** (lowercase, one word).
- Zones: **Arrival / Arrivée**, **Lens / La Loupe**, **Leak / L'Infiltration**. Awake layer toggle: **Wake up / Se réveiller** and **Drift / Dériver**. Threshold: **Enter / Entrer**. (Final FR wording is subject to native proof.)
- The gaze line: *"I know you can see me" / « Je sais que tu me vois »*. Used at the threshold and rarely after that.

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
5. **Respect the visitor's device.** `prefers-reduced-motion`, weak GPUs, and save-data get the awake layer automatically.
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

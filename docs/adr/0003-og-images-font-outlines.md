# ADR 0003: Open Graph images draw text as font outlines

## Context

Each work needs a 1200×630 Open Graph image with its title set in Fraunces,
generated at build time (awake-layer track, FR10). The obvious tool is
`sharp`, which renders SVG with librsvg and text with Pango.

## Decision

`tools/og/OgImageRenderer.ts` converts the committed `public/fonts/Fraunces.woff2`
to an SFNT with `subset-font`, parses it with `opentype.js`, and turns every
line of text into SVG `<path>` outlines. `sharp` only rasterises paths and
composites the work image. The output is byte-for-byte deterministic and does
not depend on fonts installed on the build machine.

## Considered & Rejected Alternatives

- **`sharp` text input with `fontfile` (Pango):** rejected. With both the WOFF2
  and a converted TTF, Pango ignored the file and fell back to a system sans
  (fontconfig reported "Cannot load default config file"). Output would also
  vary between machines and CI.
- **SVG `<text>` with an embedded `@font-face` data URI:** rejected. librsvg
  does not load web fonts from `@font-face`, so it falls back the same way.
- **Headless browser screenshots:** rejected as too heavy for a build step.

Do NOT render OG text with SVG `<text>` or Pango; keep the outline approach
(the renderer tests check output dimensions, determinism and light text pixels).

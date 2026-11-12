# 7. The home pages load the drift world as first-party modules

Date: 2026-11-12

## Status

Accepted

## Context

Until the drift-world track, the built-site guard (`src/tools/DistGuard.ts`) allowed JavaScript only inline and within a small per-page budget (contact form, root language chooser), plus GoatCounter's external script. The awake layer ships no JavaScript.

The drift world (Three.js, ~125 KB gzipped) must be lazy-loaded after first paint, only on capable devices, from a small boot script on the home pages `/{lang}/`. Astro inlines a page script only when it has no imports and no dynamic imports (`@astro/plugin-scripts`); a boot script that does `import('../world/gl/DriftWorld.js')` is always emitted as `<script type="module" src="/_astro/….js">`, and the world itself becomes a separate chunk in `/_astro/`.

## Decision

- On `en/index.html` and `fr/index.html` only, the guard accepts external module scripts whose URL is a file directly in the site's own `/_astro/` folder (`isAllowedExternalScript`). Every other page keeps a zero external-script rule (GoatCounter excepted), and the home pages keep a zero inline budget.
- Size is enforced where it matters: the e2e bundle-size test reads the built home page, follows the boot script's static imports (the initial JavaScript, which must not contain Three.js) and its dynamic import (the world chunk and its static imports), and fails when the world exceeds 250 KB gzipped or the boot script grows beyond its own small budget.
- Work pages get no JavaScript: their "See it in the drift" link is a plain link to `/{lang}/?w=<slug>`.

## Considered & Rejected Alternatives

- **Keep everything inline.** Rejected: Astro will not inline a script with a dynamic import, and inlining 125 KB of Three.js into both home pages would block nothing but would ship the world to every visitor, including those who get the awake layer (phones with reduced motion, Save-Data).
- **An `is:inline` boot script that fetches a hard-coded chunk URL.** Rejected: chunk file names carry content hashes that are only known after bundling; hard-coding or post-processing them is brittle and bypasses Vite's module preloading.
- **Allow `/_astro/*.js` on every page.** Rejected: the awake pages are meant to ship no JavaScript; widening the rule would let future scripts slip onto them unnoticed.
- **Reveal the work-page link with a small script (only on capable devices).** Rejected: it would add JavaScript to all 80 work pages for one link. The link is a plain link instead; on a device that gets the awake layer it leads to the home page, which offers the "Drift" button when WebGL2 is available.

## Consequences

- A new module script on any other page still fails the e2e dist guard.
- The bundle-size test, not the inline budget, protects the home pages' JavaScript weight.

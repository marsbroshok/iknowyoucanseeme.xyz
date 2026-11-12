# ADR 0012: The leak, specimens and exhibition mode

- **Status:** Accepted
- **Date:** 2026-11-12
- **Track:** `leak_20261111`

## Context

The product says the Dreamland is leaking into our world: the longer
someone drifts, the more the awake pages should take on dream colour, yet
awake pages must stay perfectly legible (WCAG 2.2 AA) and ship almost no
JavaScript (ADR 0007, `DistGuard` budgets). The Leak zone's inhabitants
(Venice portraits, clay sketches) should read as specimens, and a gallery
needs an unattended screen mode with QR codes instead of a contact form.
Reduced motion is deliberately not used to change behaviour (ADR 0009).

## Decision

- **Pure core, thin wiring.** `LeakMeter` (curve `(t / 15 min)²`, 5-day
  half-life of absence, bounded store), `LeakStyle` (background mix toward
  the last-seen work's dominant colour, capped with `AccentColor.contrast`
  so every awake text colour keeps ≥ 4.6:1, floored to hundredths),
  `KioskState` (cursor 5 s, reset 90 s, auto-drift 10 s / 12 s) and
  `specimenLabels` are pure modules under the 100 % gate with fast-check
  properties (level in [0, 1] and monotonic; contrast ≥ 4.5 at every level
  for every colour, even with a forged cap; resets never before 90 s and at
  most once per idle period; numbering without gaps).
- **The world writes, the awake page reads.** `LeakRecorder` in the world
  stores `{ ms, at, color, cap }` in `localStorage` (every 5 s of drift, on
  close and on `pagehide`). The cap is computed there, when the colour
  changes, so the awake page needs no contrast code.
- **A 1.2 KB inline script in the head of every awake page** (`LeakScript`,
  budget 1.5 KB) reads the record before first paint and sets
  `--leak-bg`, `--leak-color`, `--leak-level` on `<html>` for an
  `@layer leak` (after `utilities`). Only colours and a box-shadow change:
  no layout shift. Its constants are written in from `LeakMeter` /
  `LeakStyle`, and a jsdom property test runs the script against random
  records and compares with the TypeScript result. `DistGuard` counts the
  *exact* script on its own 1.5 KB budget on top of each page's budget;
  any other inline code is counted as before.
- **Stray apparition: a cut-out of an existing work.** An Astro integration
  crops the swan of *Les Reflets II* from the committed web master into
  `leak/apparition.webp` (radial alpha). It sits hidden at the end of
  `<main>`, shows only when the script marks the page (level ≥ 0.4, chance
  0.5 × level, once per page view) and only on screens wide enough for the
  margin beside the 72 rem column; it moves with a transform-only CSS
  animation inside a size container, so it never covers text, the
  full-width header or the footer, and never shifts layout.
- **"Clear the leak"** on the legal page (EN + FR) is handled by the same
  inline script; hidden without JavaScript; a polite status line confirms.
- **Specimens.** Tags are whole `ui.yaml` templates (`specimen {n} ·
  Venise · {year}`, `esquisse {n} · argile · {year}`), numbered per kind,
  oldest first. The awake Leak group is a framed specimen grid; in the
  world specimens get a thin frame, the tag hangs under the faced work and
  shows in the focus dialog.
- **Exhibition mode** (`?kiosk=1`): `DriftBoot` enters without the
  threshold and without a gesture; `KioskMode` strips every link, hands the
  first tap to `SoundDirector.gesture()`, toggles `html.kiosk-idle` and
  calls the world's `advance()` / `restart()`. The focus dialog shows a QR
  code (`/qr/<lang>/<slug>.svg`, made at build time with the launch
  track's `QrCode`) instead of its links.

## Considered & Rejected Alternatives

- **Bundled module script on awake pages (importing `LeakMeter`).**
  Rejected: Astro would emit it as an external `/_astro/` module (ADR 0010
  saw the same with `FragmentProgress`), deferred until after first paint,
  so the stain would flash in; and ADR 0007 keeps first-party modules off
  awake pages.
- **`color-mix()` in CSS from a stored percentage.** Rejected: the
  browser's rounding of the mixed colour is not under test, and axe reads
  the computed colour; the script computes the exact hex that the
  property test checks.
- **Computing the contrast cap in the inline script.** Rejected: it would
  roughly double the script for no gain; the world computes it once per
  colour with the real `AccentColor` helper.
- **Single-word UI strings for tag parts (« Venise », « argile »).**
  Rejected: the French titles kept on English pages contain the same words
  and the language guard flagged them; whole tag templates do not collide.
- **QR codes inlined in the world manifest or generated in the browser.**
  Rejected: 40 inline SVGs would add tens of KB to every home page, and a
  QR library in the world chunk costs weight for a mode most visitors never
  use; build-time SVG files load only when a kiosk dialog opens.
- **Reloading the page for the idle reset.** Rejected: a reload loses the
  sound's gesture (a new tap would be needed) and re-downloads the world;
  `restart()` goes back to the start in place.
- **Changing the apparition for `prefers-reduced-motion`.** Rejected by the
  artist's decision (ADR 0009); it is slow, faint and margin-only instead.

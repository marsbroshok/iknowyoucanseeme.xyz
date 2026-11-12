# 9. Reduced motion does not route to the awake layer

Date: 2026-11-12

## Status

Accepted (artist decision, 2026-11-12). Supersedes the reduced-motion rule of track `drift-world_20261111`.

## Context

Until now `DeviceProfile` sent every visitor whose system asks for `prefers-reduced-motion: reduce` to the awake layer, and the world never loaded for them. The artist reviewed this: the drift world is the artwork itself, not a decoration on top of a portfolio, and many people turn on reduced motion for reasons that have nothing to do with this site (battery saving, a setting made years ago, an OS default on some devices). Sending all of them to the plain pages hides the work from a large share of visitors.

The site already has an opt-out that does not depend on a system setting: the **Wake up / Se réveiller** control is visible on the threshold and in the world at every moment, one click or key press away, and the choice is remembered. The awake layer is a complete, static page with nothing that moves.

## Decision

- `prefers-reduced-motion` no longer takes part in routing. `DeviceProfile.decide` ignores it; `CapabilityProbe` still reads it (it is part of `DeviceCapabilities`) so the decision can be tested for invariance. The awake reason `reduced-motion` is removed.
- WebGL2, Save-Data, low memory (< 4 GB) and few cores (< 4) still route to the awake layer, and the visitor's stored Wake up / Drift choice still wins (except that the world is never forced without WebGL2).
- The threshold and the world are shown under reduced motion exactly as for everyone else. Wake up / Se réveiller stays always visible and keyboard-reachable.
- Tests: a unit test and a fast-check property (`tests/world/core/DeviceProfile.test.ts`) assert that the decision is identical with and without reduced motion for any device and override; `tests/world/island/DriftBoot.test.ts` boots the world under reduced motion; the Playwright test in `tests/e2e/drift.spec.ts` emulates reduced motion and checks that the world mounts, Wake up is visible, axe passes, and Wake up leads to the awake page.

### WCAG note

WCAG 2.3.3 *Animation from Interactions* is a level **AAA** criterion; the project's target is **AA**. AA (2.2.2 *Pause, Stop, Hide*) is met because the moving content can be left at any time through the always-visible Wake up control, which leads to the awake layer: a static page with no auto-playing motion. The choice is remembered for the next visit.

## Considered & Rejected Alternatives

- **Keep sending reduced-motion visitors to the awake layer automatically (the previous rule).** Rejected by the artist: the world is the work; a system-wide setting, often set for other reasons, should not hide it. Wake up gives the same result to anyone who wants it, by their own choice.
- **A low-motion variant of the world under reduced motion** (no drift inertia, no breathing leak, no gaze turns, instant fades). Rejected by the artist: it would be a second, weaker version of the artwork to design, test and keep in sync, and it would still not be what the visitor asked for if they wanted no motion at all. The awake layer is the still version.
- **Ask on first visit ("Do you want motion?")** Rejected: the threshold already is that choice (Enter or Wake up), without an extra dialog.

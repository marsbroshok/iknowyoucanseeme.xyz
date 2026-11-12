# 6. WebGL code is verified in the browser, not by the unit-coverage gate

Date: 2026-11-12

## Status

Accepted

## Context

The drift world (track `drift-world_20261111`) draws with Three.js and custom GLSL shaders. The unit-coverage gate in `vitest.config.ts` requires 100% statements, branches, functions and lines for everything under `src/**`. Code that creates a `WebGLRenderer`, compiles shaders or runs the frame loop needs a real WebGL2 context: Node and jsdom have none. The workflow already says that "WebGL shaders and Three.js render loops are verified with Playwright visual/e2e tests instead; their pure math/state modules are unit-tested".

## Decision

- All code that needs a GPU context lives in one directory, `src/world/gl/`, and that directory is excluded from Vitest coverage (`coverage.exclude` in `vitest.config.ts`).
- `src/world/gl/` stays thin: it only wires Three.js objects to decisions made elsewhere. Every decision (capability routing, layout, motion, apparition curve, texture budget and streaming, sky colour, compass bearings, deep links, metrics, DOM controls) lives in `src/world/core/`, `src/world/stream/` or `src/world/island/`, which stay under the 100% gate with unit and fast-check property tests.
- The GL code is verified by Playwright in Chromium (WebGL2 through SwiftShader): the canvas renders, a deep link lands on the right work, reduced motion keeps the awake layer, axe passes with the world mounted, and a bundle-size test keeps the world chunk within its budget.
- A unit test asserts that no file outside `src/world/gl/` imports `three`, so GPU code cannot spread into covered directories unnoticed, and that the exclusion stays limited to that one directory.

## Considered & Rejected Alternatives

- **Mock Three.js and WebGL in unit tests.** Rejected: the tests would check calls into a fake renderer, not that anything is drawn; shader compile errors and wrong uniforms would still pass. The project also forbids hollow mocks that only satisfy a gate.
- **Run the unit tests in a headless browser with WebGL (Vitest browser mode).** Rejected for now: it adds a second test runner and browser download to `npm run check`, and coverage of a render loop says little about whether the picture is right. Playwright already runs Chromium with WebGL for the e2e gate.
- **Coverage-ignore comments in the GL files.** Rejected: the project forbids them, and they scatter the exception across many lines instead of one reviewed directory.
- **Lower the global threshold.** Rejected: it would weaken the gate for every other module to accommodate one directory.

## Consequences

- New GPU code must go into `src/world/gl/`, and any logic in it that can be pure should be moved out and unit-tested.
- Regressions in drawing are caught by the Playwright suite (and the manual phone check documented in `docs/perf.md`), not by Vitest.

# 2. Exclude download-fonts from coverage

Date: 2026-11-12

## Status

Accepted

## Context

The script `download-fonts.ts` performs network calls to download Google Fonts directly and subset them. It is a one-off, network-dependent maintenance script used only occasionally to update local font assets. Testing it fully would require mocking the Google Fonts API, downloading large binary payloads in unit tests, or injecting network endpoints purely to satisfy test coverage gates.

## Decision

We moved `download-fonts.ts` out of the `tools/` directory (which is strictly covered by 100% threshold gates in `vitest.config.ts`) and into `scripts/`. We will document it as an untracked, network-dependent utility and explicitly exclude it from the 100% coverage constraints. 

## Consequences

- The `vitest.config.ts` coverage gates (100% for `src/**` and `tools/**`) are maintained without artificial mocks or brittle network tests.
- If we ever need to rely on `download-fonts.ts` dynamically in a pipeline, we will need to refactor it, separate the pure data-transform functions, and bring it back under test coverage.

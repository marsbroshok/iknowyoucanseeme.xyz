# 2. Exclude download-fonts from coverage

Date: 2026-11-12

## Status

Accepted

## Context

The script `download-fonts.ts` performs network calls to download Google Fonts directly and subset them. It is a one-off, network-dependent maintenance script used only occasionally to update local font assets. Testing it fully would require mocking the Google Fonts API, downloading large binary payloads in unit tests, or injecting network endpoints purely to satisfy test coverage gates.

## Decision

We moved `download-fonts.ts` out of the `tools/` directory (which is strictly covered by 100% threshold gates in `vitest.config.ts`) and into `scripts/`. We document it as a one-off, network-dependent maintenance utility that is outside the 100% coverage constraints on purpose (coverage only includes `src/**`, `tools/**` and `tests/**`).

## Considered & Rejected Alternatives

- **Unit-test it with a mocked Google Fonts API.** Rejected: the tests would only check the mock (canned CSS and font payloads), not the real service, and the script would still break silently when Google changes its CSS or URLs. It is run by hand, and a broken download is seen right away.
- **Inject the fetch function and test the pure parts (URL list, subset ranges) in `tools/`.** Rejected for now: it adds an injection seam to a script nobody runs in the build or CI, only to meet the coverage gate. If the script ever joins a pipeline, this is the way to bring it back under coverage (see Consequences).
- **Keep it in `tools/` with a coverage-ignore comment or a per-file exclude.** Rejected: the project forbids coverage-ignore comments, and a per-file exclude under a 100% gate hides untested code in a directory where everything is expected to be tested.
- **Download fonts during the build.** Rejected: builds would need network access to Google, and the site would depend on a third-party service at build time. Fonts are committed as self-hosted subsets instead.

## Consequences

- The `vitest.config.ts` coverage gates (100% for `src/**` and `tools/**`) are maintained without artificial mocks or brittle network tests.
- If we ever need to rely on `download-fonts.ts` dynamically in a pipeline, we will need to refactor it, separate the pure data-transform functions, and bring it back under test coverage.

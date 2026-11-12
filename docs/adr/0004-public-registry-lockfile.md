# ADR 0004: The committed lockfile points only at the public npm registry

- **Status:** Accepted
- **Date:** 2026-11-12
- **Track:** `launch_20261111`

## Context

The site is built and deployed by GitHub Actions, which installs with
`npm ci` from the public registry (`https://registry.npmjs.org/`).

The development machine uses a private npm mirror as its `registry`.
npm writes the URL it downloaded from into `package-lock.json`, so the
committed lockfile had about 700 `resolved` URLs on a private host that
GitHub cannot reach: the first deploy would have failed at `npm ci`.

The mirror also caused a second, quieter defect. It did not serve one
optional platform package (`@img/sharp-linuxmusl-arm64@0.33.5`, nested under
`astro`), and npm left a half-written entry for it (`{ dev, optional }`, no
`version`). Against the mirror npm skips it; against the public registry npm
fetches it and crashes (`Invalid Version`). We found this by running
`npm ci --registry=https://registry.npmjs.org/ --replace-registry-host=never`
on the normalized lockfile.

## Decision

1. The committed `package-lock.json` only contains public registry URLs:
   `https://registry.npmjs.org/<name>/-/<unscoped name>-<version>.tgz`.
   `integrity` hashes are kept unchanged, so npm still checks that the public
   tarball is byte-for-byte the one installed locally.
2. `tools/lockfile/LockfileNormalizer.ts` (tested, including a property test
   over scoped and unscoped names and the mirror's
   `<name>/-/@scope/<name>-<version>.tgz` shape) rewrites the URLs;
   `npm run lockfile:normalize` applies it. It refuses anything that is not a
   registry tarball of the entry's own name and version (git or file
   dependencies, wrong versions) instead of guessing.
3. Local installs keep working through npm's `replace-registry-host=npmjs`
   setting (npm's default, written explicitly in the project `.npmrc`): npm
   swaps the public host for the configured mirror at download time.
4. The half-written entry was repaired with
   `npm install --package-lock-only` against the public registry (one entry
   added, nothing else changed).
5. `tests/lockfile/committedLockfile.test.ts` is part of `npm run check`: it
   fails when any `resolved` URL is not on `https://registry.npmjs.org`, when
   a private host name appears, when an entry has no `integrity`, when an
   entry has no `version`, or when the file is not normalized.

Workflow after `npm install <pkg>` on the mirror machine:
`npm run lockfile:normalize`, then commit.

## Considered & Rejected Alternatives

- **Edit the user's `~/.npmrc` to use the public registry.** Rejected: the
  machine's registry is a managed setting outside this repository, and the
  mirror exists for a reason on that machine.
- **Set `registry=https://registry.npmjs.org/` in the project `.npmrc`.**
  Rejected: it would bypass the mirror on the development machine, where
  direct public access may be blocked or unwanted.
- **Delete the lockfile in CI and run `npm install`.** Rejected: CI would
  build with dependency versions nobody tested, and `npm ci` integrity
  checks would be lost.
- **Rewrite the URLs with `sed` in the workflow before `npm ci`.** Rejected:
  hides the problem in CI only, leaves an unusable lockfile in git for any
  other machine, and cannot be unit tested.
- **Regenerate the whole lockfile against the public registry.** Rejected:
  it can silently change hundreds of resolved versions; the targeted
  normalizer and the one-entry repair keep the tested dependency tree.

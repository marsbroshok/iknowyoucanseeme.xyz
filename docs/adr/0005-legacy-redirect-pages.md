# ADR 0005: Old Hugo addresses become static refresh pages

- **Status:** Accepted
- **Date:** 2026-11-12
- **Track:** `launch_20261111`

## Context

The Hugo site (preserved under the tag `legacy-hugo`) published
`/dreamland/`, `/blog/`, `/blog/colors-and-shapes/`, `/uses/` and `/tags/`
(menu links and the one blog post). Author pages were never rendered and the
post had no tags, so there were no `/author/…` or `/tag/…` pages. The new
site has no such pages; people may still have these addresses in bookmarks,
links or search results.

GitHub Pages serves static files only: no server-side redirects, no
`_redirects` file, no rewrite rules.

## Decision

- Each old address is a small static page, built from one list
  (`src/i18n/LegacyRedirects.ts`) by `src/pages/[...legacy].astro`:
  `<meta http-equiv="refresh" content="0; url=…">` to the new page, a
  canonical link to the new page, `noindex`, and a plain link as fallback.
  No JavaScript.
- Targets: `/dreamland/` → `/en/territories/dreamland/` (the same world);
  everything else → `/en/` (no equivalent page exists).
- They are not in the sitemap (`isLocalizedPage` only accepts localized
  pages).
- Enforced by tests: `tests/i18n/LegacyRedirects.test.ts` (exact list, no
  shadowing of a real page, every target exists), the dist guard
  (`redirect` rule: refresh target = canonical, `noindex`), and
  `tests/e2e/legacyRedirects.spec.ts` (each old address lands on its page,
  with and without trailing slash; none in the sitemap).
- The Hugo RSS feeds (`/index.xml`, `/blog/index.xml`) are not redirected:
  a feed cannot carry a refresh and the new site has no feed. They return
  404.

## Considered & Rejected Alternatives

- **Astro's `redirects` config.** For static output Astro also generates
  meta-refresh pages, but from its own fixed template (no `<html lang>`,
  fixed English text outside `ui.yaml`), which our dist guard's `lang` rule
  and the copy rules would reject, and the list would live in
  `astro.config.mjs` instead of a tested module shared with the guards.
  Rejected in favour of our own page, which we control and test.
- **JavaScript `location.replace()`.** Rejected: the awake layer ships no
  JavaScript by rule, and it does nothing for crawlers or with JS off.
- **A custom `404.html` that guesses the new page.** Rejected: GitHub Pages
  answers 404 status for it (bad for search engines), and guessing is
  fragile; an explicit list is clearer.
- **Moving hosting to a server or Netlify for real 301 redirects.**
  Rejected: out of scope; GitHub Pages stays the host
  (`conductor/tech-stack.md`).
- **Redirecting the RSS feeds with an XML page.** Rejected: feed readers do
  not follow such hints; an honest 404 is clearer.

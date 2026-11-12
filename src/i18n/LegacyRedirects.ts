import { localizedPath } from './LocalizedPath.js';

/** An address of the former Hugo site and the page that replaces it. */
export interface LegacyRedirect {
  /** Old path, with trailing slash (e.g. `/dreamland/`). */
  from: string;
  /** New site path, with trailing slash. */
  to: string;
}

/** One entry of `getStaticPaths()` for `src/pages/[...legacy].astro`. */
export interface LegacyRedirectPath {
  params: { legacy: string };
  props: { redirect: LegacyRedirect };
}

const HOME_EN = localizedPath('home', 'en');

/**
 * Addresses of the Hugo site (tag `legacy-hugo`) that people may still have
 * in bookmarks or links. GitHub Pages has no server redirects, so each one
 * becomes a small static page that refreshes to the new page (see
 * docs/adr/0005-legacy-redirect-pages.md). The Hugo RSS feeds (`/index.xml`,
 * `/blog/index.xml`) are not redirected: a feed cannot hold a refresh, and
 * the new site has no feed.
 */
export const LEGACY_REDIRECTS: readonly LegacyRedirect[] = [
  { from: '/dreamland/', to: localizedPath('territories', 'en', ['dreamland']) },
  { from: '/blog/', to: HOME_EN },
  { from: '/blog/colors-and-shapes/', to: HOME_EN },
  { from: '/uses/', to: HOME_EN },
  { from: '/tags/', to: HOME_EN },
];

/**
 * Static paths of the redirect pages.
 *
 * @returns One entry per legacy address (rest param without outer slashes).
 */
export function legacyRedirectPaths(): LegacyRedirectPath[] {
  return LEGACY_REDIRECTS.map((redirect) => ({
    params: { legacy: redirect.from.slice(1, -1) },
    props: { redirect },
  }));
}

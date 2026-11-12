import { alternateLinks } from '../i18n/Alternates.js';
import { pathToKey } from '../i18n/LocalizedPath.js';

/** One `<xhtml:link rel="alternate">` entry of a sitemap URL. */
export interface SitemapLink {
  lang: string;
  url: string;
}

/**
 * Hreflang alternates of a page URL for `@astrojs/sitemap` (`serialize`).
 * Localized first segments differ per locale (`works` / `oeuvres`), so the
 * pairing goes through the route map rather than a locale-prefix swap.
 *
 * @param pageUrl - Absolute page URL as produced by the build.
 * @returns EN, FR and x-default links; empty for non-localized URLs.
 */
export function sitemapLinks(pageUrl: string): SitemapLink[] {
  const url = new URL(pageUrl);
  const key = pathToKey(url.pathname);
  if (!key) return [];
  const params = url.pathname.split('/').filter(Boolean).slice(key === 'home' ? 1 : 2);
  return alternateLinks(key, url.origin, { en: params, fr: params }).map((l) => ({ lang: l.hreflang, url: l.href }));
}

/**
 * Whether a built page belongs in the sitemap: every localized page; not
 * the root language chooser.
 *
 * @param pageUrl - Absolute page URL.
 * @returns `true` when the page has a locale prefix.
 */
export function isLocalizedPage(pageUrl: string): boolean {
  return sitemapLinks(pageUrl).length > 0;
}

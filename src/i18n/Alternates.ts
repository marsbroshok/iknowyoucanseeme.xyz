import type { Locale, RouteKey } from './RouteMap.js';
import { localizedPath } from './LocalizedPath.js';

/** One `<link rel="alternate" hreflang>` entry. */
export interface AlternateLink {
  href: string;
  hreflang: Locale | 'x-default';
}

/** Per-locale path parameters (slugs may differ by locale). */
export interface LocalizedParams {
  en?: readonly string[];
  fr?: readonly string[];
}

/**
 * Builds the absolute hreflang alternates (EN, FR and `x-default` → EN) of a
 * route.
 *
 * @param routeKey - Route key.
 * @param site - Site origin, with or without trailing slash.
 * @param params - Optional per-locale path parameters.
 * @returns Three alternate links.
 */
export function alternateLinks(routeKey: RouteKey, site: string, params?: LocalizedParams): AlternateLink[] {
  const cleanSite = site.replace(/\/$/, '');
  const enHref = `${cleanSite}${localizedPath(routeKey, 'en', params?.en)}`;
  const frHref = `${cleanSite}${localizedPath(routeKey, 'fr', params?.fr)}`;

  return [
    { href: enHref, hreflang: 'en' },
    { href: frHref, hreflang: 'fr' },
    { href: enHref, hreflang: 'x-default' }
  ];
}

/**
 * Canonical absolute URL of a route in a locale.
 *
 * @param routeKey - Route key.
 * @param lang - Locale of the page.
 * @param site - Site origin.
 * @param params - Optional per-locale path parameters.
 * @returns The canonical URL (always with trailing slash).
 */
export function canonicalUrl(routeKey: RouteKey, lang: Locale, site: string, params?: LocalizedParams): string {
  return `${site.replace(/\/$/, '')}${localizedPath(routeKey, lang, params?.[lang])}`;
}

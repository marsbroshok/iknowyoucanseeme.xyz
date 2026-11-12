import type { Locale, RouteKey } from './RouteMap.js';
import { localizedPath } from './LocalizedPath.js';

export interface AlternateLink {
  href: string;
  hreflang: Locale | 'x-default';
}

export function alternateLinks(routeKey: RouteKey, site: string, params?: { en?: string[], fr?: string[] }): AlternateLink[] {
  const enPath = localizedPath(routeKey, 'en', params?.en);
  const frPath = localizedPath(routeKey, 'fr', params?.fr);
  
  // site should not have trailing slash, and enPath starts with slash
  const cleanSite = site.replace(/\/$/, '');

  return [
    { href: `${cleanSite}${enPath}`, hreflang: 'en' },
    { href: `${cleanSite}${frPath}`, hreflang: 'fr' },
    { href: `${cleanSite}${enPath}`, hreflang: 'x-default' }
  ];
}

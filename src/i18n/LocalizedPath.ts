import { RouteMap, type Locale, type RouteKey } from './RouteMap.js';

/**
 * Builds the site path for a route in a locale. Paths always start with the
 * locale prefix and end with a trailing slash (e.g. `/fr/oeuvres/arrivee/`),
 * matching the static `directory` build output.
 *
 * @param routeKey - Route key from {@link RouteMap}.
 * @param lang - Target locale.
 * @param params - Extra path segments (e.g. a work slug).
 * @returns The absolute site path.
 * @throws Error when parameters are given for the `home` route.
 */
export function localizedPath(routeKey: RouteKey, lang: Locale, params: readonly string[] = []): string {
  if (routeKey === 'home' && params.length > 0) {
    throw new Error('[i18n] The home route takes no path parameters');
  }
  const segments = [lang, RouteMap[routeKey][lang], ...params].filter((s) => s.length > 0);
  return `/${segments.join('/')}/`;
}

/**
 * Resolves the route key of a site path (inverse of {@link localizedPath} for
 * the first segment after the locale).
 *
 * @param path - Site path, with or without trailing slash.
 * @returns The route key, or `undefined` for unknown locales/segments.
 */
export function pathToKey(path: string): RouteKey | undefined {
  const [lang, segment = ''] = path.split('/').filter(Boolean);
  if (lang !== 'en' && lang !== 'fr') return undefined;

  for (const [key, value] of Object.entries(RouteMap)) {
    if (value[lang] === segment) {
      return key as RouteKey;
    }
  }
  return undefined;
}

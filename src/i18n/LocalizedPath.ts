import { RouteMap, type Locale, type RouteKey } from './RouteMap.js';

export function localizedPath(routeKey: RouteKey, lang: Locale, params?: string[]): string {
  const pathSegment = RouteMap[routeKey][lang];
  let p = `/${lang}/${pathSegment}`;
  if (params && params.length > 0) {
    p += `/${params.join('/')}`;
  }
  return p;
}

export function pathToKey(path: string): RouteKey | undefined {
  const parts = path.split('/').filter(Boolean);
  if (parts.length < 2) return undefined;
  
  const [lang, segment] = parts;
  if (lang !== 'en' && lang !== 'fr') return undefined;

  for (const [key, value] of Object.entries(RouteMap)) {
    if (value[lang as Locale] === segment) {
      return key as RouteKey;
    }
  }
  return undefined;
}

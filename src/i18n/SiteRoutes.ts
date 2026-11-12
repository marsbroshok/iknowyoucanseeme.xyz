import { LOCALES, type Locale } from './RouteMap.js';
import { localizedPath } from './LocalizedPath.js';

/** Static (non-parameterised) page kinds; each equals its route key. */
export type StaticPageKind = 'home' | 'works' | 'exhibitions' | 'about' | 'legal' | 'contact' | 'labels';

/** Which page a generated route renders. */
export type PageRef = { kind: StaticPageKind } | { kind: 'work'; slug: string } | { kind: 'territory'; slug: string };

/** One entry of Astro's `getStaticPaths()` for `src/pages/[lang]/[...route].astro`. */
export interface SiteRoute {
  params: { lang: Locale; route: string | undefined };
  props: { page: PageRef };
}

/** Slugs of the content that gets its own page. */
export interface SiteSlugs {
  works: readonly string[];
  territories: readonly string[];
}

const STATIC_PAGES: readonly StaticPageKind[] = ['home', 'works', 'exhibitions', 'about', 'legal', 'contact', 'labels'];

/**
 * Site path of a route (e.g. `/fr/oeuvres/arrivee/`).
 *
 * @param page - Page reference.
 * @param lang - Locale.
 * @returns The path, with trailing slash.
 */
function pagePath(page: PageRef, lang: Locale): string {
  if (page.kind === 'work') return localizedPath('works', lang, [page.slug]);
  if (page.kind === 'territory') return localizedPath('territories', lang, [page.slug]);
  return localizedPath(page.kind, lang);
}

/**
 * Builds every awake-layer route in both locales: the seven static pages
 * (including the printable labels sheet) plus
 * one page per work and per territory.
 *
 * @param slugs - Work and territory slugs.
 * @returns Routes for `getStaticPaths()`.
 */
export function buildSiteRoutes(slugs: SiteSlugs): SiteRoute[] {
  const pages: PageRef[] = [
    ...STATIC_PAGES.map((kind): PageRef => ({ kind })),
    ...slugs.works.map((slug): PageRef => ({ kind: 'work', slug })),
    ...slugs.territories.map((slug): PageRef => ({ kind: 'territory', slug })),
  ];
  return LOCALES.flatMap((lang) =>
    pages.map((page) => {
      const rest = pagePath(page, lang).slice(`/${lang}/`.length, -1);
      return { params: { lang, route: rest === '' ? undefined : rest }, props: { page } };
    }),
  );
}

/**
 * Site path of a generated route.
 *
 * @param route - A route from {@link buildSiteRoutes}.
 * @returns The path, with trailing slash.
 */
export function routePath(route: SiteRoute): string {
  return pagePath(route.props.page, route.params.lang);
}

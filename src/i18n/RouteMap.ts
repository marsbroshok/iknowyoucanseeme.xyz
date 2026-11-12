/**
 * Localized first path segment of every awake-layer route. Both locales are
 * prefixed (`/en/…`, `/fr/…`); `home` is the bare locale root.
 */
export const RouteMap = {
  home: { en: '', fr: '' },
  works: { en: 'works', fr: 'oeuvres' },
  territories: { en: 'territories', fr: 'territoires' },
  exhibitions: { en: 'exhibitions', fr: 'expositions' },
  about: { en: 'about', fr: 'a-propos' },
  legal: { en: 'legal', fr: 'mentions-legales' },
  contact: { en: 'contact', fr: 'contact' },
  /** Printable exhibition labels (not indexed, not in the sitemap or menu). */
  labels: { en: 'labels', fr: 'labels' }
} as const;

/** Supported locales. */
export type Locale = 'en' | 'fr';
/** Key of a route in {@link RouteMap}. */
export type RouteKey = keyof typeof RouteMap;
/** All supported locales, in display order. */
export const LOCALES: readonly Locale[] = ['en', 'fr'];

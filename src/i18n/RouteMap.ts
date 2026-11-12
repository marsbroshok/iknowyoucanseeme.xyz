export const RouteMap = {
  works: { en: 'works', fr: 'oeuvres' },
  territories: { en: 'territories', fr: 'territoires' },
  exhibitions: { en: 'exhibitions', fr: 'expositions' },
  about: { en: 'about', fr: 'a-propos' },
  legal: { en: 'legal', fr: 'mentions-legales' },
  contact: { en: 'contact', fr: 'contact' }
} as const;

export type Locale = 'en' | 'fr';
export type RouteKey = keyof typeof RouteMap;

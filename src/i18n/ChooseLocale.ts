import type { Locale } from './RouteMap.js';

export function getPreferredLocale(navigatorLanguage: string | undefined): Locale {
  if (!navigatorLanguage) return 'en';
  // Check if it starts with 'fr'
  if (navigatorLanguage.toLowerCase().startsWith('fr')) {
    return 'fr';
  }
  return 'en';
}

import type { Work } from '../content/schema/index.js';

/**
 * Human label for a work's availability. Never outputs a price: anything not
 * marked `sold` or `not-for-sale` (i.e. `available` or `unknown`) resolves to
 * the "contact for availability" label.
 *
 * @param work - The work (only `availability` is read).
 * @param lang - Display locale.
 * @returns The localized label.
 */
export function getAvailabilityLabel(work: Pick<Work, 'availability'>, lang: 'en' | 'fr'): string {
  if (work.availability === 'sold') {
    return lang === 'fr' ? 'Vendu' : 'Sold';
  }
  if (work.availability === 'not-for-sale') {
    return lang === 'fr' ? 'Non disponible' : 'Not for sale';
  }
  return lang === 'fr' ? 'Disponibilité sur demande' : 'Contact for availability';
}

/**
 * Whether visitors may ask about acquiring the work (shows the contact link).
 *
 * @param work - The work (only `availability` is read).
 * @returns `true` for `available` and `unknown`.
 */
export function isEnquirable(work: Pick<Work, 'availability'>): boolean {
  return work.availability === 'available' || work.availability === 'unknown';
}

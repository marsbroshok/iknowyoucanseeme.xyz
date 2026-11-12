import type { Work } from '../content/schema/index.js';

export function getAvailabilityLabel(work: Work, lang: 'en' | 'fr'): string {
  if (work.availability === 'sold') {
    return lang === 'fr' ? 'Vendu' : 'Sold';
  }
  if (work.availability === 'not-for-sale') {
    return lang === 'fr' ? 'Non disponible' : 'Not for sale';
  }
  return lang === 'fr' ? 'Disponibilité sur demande' : 'Contact for availability';
}

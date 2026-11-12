import type { Work } from '../../src/content/schema/index.js';

/** A schema-valid work using a real committed asset (`arrivee/0.jpg`). */
export function fixtureWork(over: Partial<Work> = {}): Work {
  return {
    slug: 'arrivee',
    title: { fr: 'Arrivée' },
    territory: 'dreamland',
    zone: 'arrival',
    year: 2025,
    medium: 'photo',
    availability: 'unknown',
    images: [{ src: '0.jpg', source: 'instagram', width: 1440, height: 1800, palette: ['#8299fa'] }],
    ...over,
  };
}

/** A text block fixture. */
export function tb(en: string, fr: string) {
  return { status: 'draft' as const, en, fr, sources: ['spec'] };
}


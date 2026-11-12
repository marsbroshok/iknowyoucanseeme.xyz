import type { WorldManifest } from '../../src/world/core/WorldManifest.js';

/** A small, valid world manifest (one work per territory). */
const image = (w: number, h: number) => ({ url: `/_astro/x_${w}.webp`, width: w, height: h });
export const sampleManifest: WorldManifest = {
  lang: 'fr',
  territories: [
    { slug: 'dreamland', title: 'Dreamland', sentences: ['Un voyage est un cycle.', 'Le rêve est la maison.'] },
    { slug: 'the-border-is-thin', title: 'La frontière est mince', sentences: [] },
  ],
  zones: [
    { slug: 'arrival', title: 'Arrivée' },
    { slug: 'lens', title: 'La Loupe' },
    { slug: 'leak', title: "L'Infiltration" },
  ],
  works: [
    {
      slug: 'arrivee',
      territory: 'dreamland',
      zone: 'arrival',
      title: 'Arrivée',
      fragment: 'Le moment du retour.',
      href: '/fr/oeuvres/arrivee/',
      contactHref: '/fr/contact/?work=arrivee',
      color: '#8299fa',
      palette: ['#8299fa', '#0b1030'],
      techniques: [],
      images: { low: image(384, 480), mid: image(960, 1200), high: image(1440, 1800) },
    },
    {
      slug: 'cygne-icm-1',
      territory: 'the-border-is-thin',
      zone: null,
      title: 'Cygne ICM 1',
      fragment: null,
      href: '/fr/oeuvres/cygne-icm-1/',
      contactHref: null,
      color: '#203040',
      palette: ['#203040'],
      techniques: ['icm'],
      images: { low: image(480, 320), mid: image(1200, 800), high: image(1440, 960) },
    },
  ],
};

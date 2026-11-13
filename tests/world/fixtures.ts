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
    { slug: 'arrival', title: 'Arrivée', excerpt: "Le parcours s'ouvre dans les champs colorés." },
    { slug: 'lens', title: 'La Loupe', excerpt: 'Ce passage précise le regard.' },
    { slug: 'leak', title: "L'Infiltration", excerpt: "Le Dreamland s'infiltre dans notre monde." },
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
      specimen: null,
      qr: '/qr/fr/arrivee.svg',
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
      specimen: null,
      qr: '/qr/fr/cygne-icm-1.svg',
      images: { low: image(480, 320), mid: image(1200, 800), high: image(1440, 960) },
    },
  ],
};

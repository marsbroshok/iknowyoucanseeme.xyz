import { describe, it, expect } from 'vitest';
import { buildWorldManifest, IMAGE_EDGES, type ImageResolver } from '../../../src/world/manifest/WorldManifestBuilder.js';
import { parseManifest } from '../../../src/world/core/WorldManifest.js';
import { uiText } from '../../../src/i18n/UiCatalog.js';
import { fixtureWork, tb } from '../../pages/fixtures.js';

const territories = [
  { slug: 'dreamland', title: { en: 'Dreamland', fr: 'Dreamland' }, statement: tb('A journey is a cycle. Home is the dream.', 'Un voyage est un cycle : le rêve est la maison.') },
  { slug: 'the-border-is-thin', title: { en: 'The border is thin', fr: 'La frontière est mince' } },
];
const zones = [
  { slug: 'arrival', title: { en: 'Arrival', fr: 'Arrivée' }, statement: tb('The journey begins in deep blue. More follows.', "Le parcours s'ouvre dans le bleu. Suite.") },
  { slug: 'lens', title: { en: 'Lens', fr: 'La Loupe' } },
  { slug: 'leak', title: { en: 'Leak', fr: "L'Infiltration" } },
];
/** Fake astro:assets: scales the source to the requested long edge (never up). */
const resolve: ImageResolver = async (work, index, edge) => {
  const { width, height } = work.images[index];
  const scale = Math.min(1, edge / Math.max(width, height));
  return { url: `/_astro/${work.slug}-${edge}.webp`, width: Math.round(width * scale), height: Math.round(height * scale) };
};

describe('buildWorldManifest', () => {
  const works = [
    fixtureWork({ fragment: tb('The moment of return.', 'Le moment du retour.'), title: { fr: 'Arrivée', en: 'Arrival' } }),
    fixtureWork({ slug: 'cygne', title: { fr: 'Cygne' }, territory: 'the-border-is-thin', zone: undefined, availability: 'sold', images: [{ src: '0.jpg', source: 'instagram', width: 1200, height: 800, palette: [] }] }),
  ];

  it('describes every work in the page language, ready for the world', async () => {
    const m = await buildWorldManifest({ works, territories, zones, ui: uiText('en'), resolve });
    expect(parseManifest(JSON.parse(JSON.stringify(m)))).toEqual(m);
    expect(m.lang).toBe('en');
    expect(m.territories).toEqual([
      { slug: 'dreamland', title: 'Dreamland', sentences: ['A journey is a cycle.', 'Home is the dream.'] },
      { slug: 'the-border-is-thin', title: 'The border is thin', sentences: [] },
    ]);
    expect(m.zones).toEqual([
      { slug: 'arrival', title: 'Arrival', excerpt: 'The journey begins in deep blue.' },
      { slug: 'lens', title: 'Lens', excerpt: null },
      { slug: 'leak', title: 'Leak', excerpt: null },
    ]);
    expect(m.works[0]).toEqual({
      slug: 'arrivee',
      territory: 'dreamland',
      zone: 'arrival',
      title: 'Arrivée (Arrival)',
      fragment: 'The moment of return.',
      metaLine: '2025 · photograph',
      availabilityLabel: 'Contact for availability',
      contextLabel: 'Dreamland · Arrival',
      positionIndex: 1,
      positionTotal: 2,
      href: '/en/works/arrivee/',
      contactHref: '/en/contact/?work=arrivee',
      color: '#8299fa',
      palette: ['#8299fa'],
      techniques: [],
      specimen: null,
      qr: '/qr/en/arrivee.svg',
      images: {
        low: { url: '/_astro/arrivee-480.webp', width: 384, height: 480 },
        mid: { url: '/_astro/arrivee-1200.webp', width: 960, height: 1200 },
        high: { url: '/_astro/arrivee-2400.webp', width: 1440, height: 1800 },
      },
    });
  });

  it('keeps French titles on the French site, populates French curatorial metadata, and leaves out what a work does not have', async () => {
    const m = await buildWorldManifest({ works, territories, zones, ui: uiText('fr'), resolve });
    const cygne = m.works[1];
    expect(cygne.title).toBe('Cygne');
    expect(cygne.metaLine).toBe('2025 · photographie');
    expect(cygne.availabilityLabel).toBe('Vendu');
    expect(cygne.contextLabel).toBe('La frontière est mince');
    expect(cygne.positionIndex).toBe(2);
    expect(cygne.positionTotal).toBe(2);
    expect(m.works[0].contextLabel).toBe('Dreamland · Arrivée');
    expect(m.works[0].availabilityLabel).toBe('Disponibilité sur demande');
    expect(m.territories[0].sentences).toEqual(['Un voyage est un cycle : le rêve est la maison.']);
    expect(cygne.zone).toBeNull();
    expect(cygne.fragment).toBeNull();
    expect(cygne.contactHref).toBeNull();
    expect(cygne.color).toBe('#0b1030');
    expect(cygne.palette).toEqual([]);
    expect(m.zones.map((z) => z.title)).toEqual(['Arrivée', 'La Loupe', "L'Infiltration"]);
  });

  it('labels the Leak zone\'s works as specimens, like the awake territory page, and points every work to its QR code', async () => {
    const leakWorks = [
      fixtureWork({ slug: 'venise-portrait-7', zone: 'leak' }),
      fixtureWork({ slug: 'venise-portrait-5', zone: 'leak' }),
      fixtureWork({ slug: 'esquisse-argile-1', zone: 'leak', medium: 'ceramic', year: 2026 }),
      fixtureWork({ slug: 'solitude', zone: 'lens' }),
    ];
    const m = await buildWorldManifest({ works: leakWorks, territories, zones, ui: uiText('fr'), resolve });
    expect(m.works.map((w) => w.specimen)).toEqual(['spécimen 02 · Venise · 2025', 'spécimen 01 · Venise · 2025', 'esquisse 01 · argile · 2026', null]);
    expect(m.works.map((w) => w.qr)).toEqual(['/qr/fr/venise-portrait-7.svg', '/qr/fr/venise-portrait-5.svg', '/qr/fr/esquisse-argile-1.svg', '/qr/fr/solitude.svg']);
  });

  it('lists the techniques named in a work\'s declared techniques, titles and caption notes (keys only, no text)', async () => {
    const named = [
      fixtureWork({ slug: 'a', techniques: ['multiple-exposure'] }),
      fixtureWork({ slug: 'b', title: { fr: 'Cygne (ICM) 7' } }),
      fixtureWork({ slug: 'c', title: { fr: 'Éclipse', en: 'Mirror eclipse' } }),
      fixtureWork({ slug: 'd', sourceNotes: 'Tech details: selective neutral density. Single exposure / in-camera.' }),
      fixtureWork({ slug: 'e', title: { fr: 'Solitude' }, sourceNotes: 'A walk at night.' }),
    ];
    const m = await buildWorldManifest({ works: named, territories, zones, ui: uiText('en'), resolve });
    expect(m.works.map((w) => w.techniques)).toEqual([['multiple-exposure'], ['icm'], ['mirror'], ['filter'], []]);
    expect(JSON.stringify(m)).not.toContain('Tech details');
  });

  it('takes the lens techniques only from declared techniques when there are any (artist decision 2026-11-12)', async () => {
    const works = [
      fixtureWork({ slug: 'declared', title: { fr: 'Les Reflets II' }, techniques: ['colour filter'] }),
      fixtureWork({ slug: 'inferred', title: { fr: 'Les Reflets III' }, techniques: [] }),
      fixtureWork({ slug: 'icm', title: { fr: 'Éclipse au miroir' }, sourceNotes: 'mirror deflections', techniques: ['ICM'] }),
    ];
    const m = await buildWorldManifest({ works, territories, zones, ui: uiText('en'), resolve });
    expect(m.works.map((w) => w.techniques)).toEqual([['filter'], ['mirror'], ['icm']]);
  });

  it('asks for the low, mid and high sizes', () => {
    expect(IMAGE_EDGES).toEqual({ low: 480, mid: 1200, high: 2400 });
  });

  it('falls back to the territory title in contextLabel when zones are omitted, and fails for a work without an image or a zone without a title', async () => {
    const withoutZones = await buildWorldManifest({ works, territories, zones: [], ui: uiText('en'), resolve });
    expect(withoutZones.works[0].contextLabel).toBe('Dreamland');

    await expect(buildWorldManifest({ works: [fixtureWork({ images: [] })], territories, zones, ui: uiText('en'), resolve })).rejects.toThrow(
      /Work "arrivee" has no image/,
    );
    await expect(buildWorldManifest({ works, territories, zones: [{ slug: 'arrival' }], ui: uiText('en'), resolve })).rejects.toThrow(/Missing en title for "arrival"/);
  });
});

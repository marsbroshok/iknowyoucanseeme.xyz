import { describe, it, expect } from 'vitest';
import { buildTerritoryView, buildTerritoryTeaser, TEASER_EXCERPT_CHARS } from '../../src/domain/TerritoryView.js';
import { uiText } from '../../src/i18n/UiCatalog.js';
import type { Work } from '../../src/content/schema/index.js';

const tb = (en: string, fr: string) => ({ status: 'draft' as const, en, fr, sources: ['x'] });
const w = (slug: string, territory: string, zone?: Work['zone'], year = 2025): Work => ({
  slug,
  title: { fr: slug.toUpperCase() },
  territory,
  zone,
  year,
  medium: 'photo',
  availability: 'unknown',
  images: [],
});

const zones = [
  { slug: 'arrival', title: { en: 'Arrival', fr: 'Arrivée' }, statement: tb('Come in.', 'Entrez.') },
  { slug: 'lens', title: { en: 'Lens', fr: 'La Loupe' } },
  { slug: 'leak', title: { en: 'Leak', fr: "L'Infiltration" } },
];
const dreamland = { slug: 'dreamland', title: { en: 'Dreamland', fr: 'Dreamland' }, statement: tb('A dream. Another.', 'Un rêve. Un autre.') };
const border = { slug: 'border', title: { en: 'The border is thin', fr: "La frontière s'efface" } };
const works = [w('l1', 'dreamland', 'leak'), w('a1', 'dreamland', 'arrival'), w('n1', 'dreamland'), w('a2', 'dreamland', 'arrival', 2024), w('b1', 'border'), w('le1', 'dreamland', 'lens')];

describe('buildTerritoryView', () => {
  it('groups works Arrival → Lens → Leak → no zone with localized zone titles and statements', () => {
    const v = buildTerritoryView(dreamland, zones, works, uiText('fr'));
    expect(v.title).toBe('Dreamland');
    expect(v.statement).toBe('Un rêve. Un autre.');
    expect(v.href).toBe('/fr/territoires/dreamland/');
    expect(v.groups.map((g) => g.slug)).toEqual(['arrival', 'lens', 'leak', undefined]);
    expect(v.groups[0].title).toBe('Arrivée');
    expect(v.groups[0].statement).toBe('Entrez.');
    expect(v.groups[1].statement).toBeUndefined();
    expect(v.groups[0].works.map((x) => x.slug)).toEqual(['a1', 'a2']);
    expect(v.groups[3].title).toBeUndefined();
  });

  it('a territory without zones has a single untitled group and no statement when copy is missing', () => {
    const v = buildTerritoryView(border, zones, works, uiText('en'));
    expect(v.groups).toHaveLength(1);
    expect(v.groups[0].slug).toBeUndefined();
    expect(v.groups[0].works.map((x) => x.slug)).toEqual(['b1']);
    expect(v.statement).toBeUndefined();
  });

  it('gives the Leak zone its specimen labels (and only that zone)', () => {
    const v = buildTerritoryView(dreamland, zones, [...works, w('esquisse-argile-1', 'dreamland', 'leak', 2026)].map((x) => (x.slug === 'esquisse-argile-1' ? { ...x, medium: 'ceramic' as const } : x)), uiText('en'));
    const leakGroup = v.groups.find((g) => g.slug === 'leak');
    expect(leakGroup?.specimens).toEqual({ l1: 'specimen 01 · 2025', 'esquisse-argile-1': 'sketch 01 · clay · 2026' });
    expect(v.groups.filter((g) => g.slug !== 'leak').every((g) => g.specimens === undefined)).toBe(true);
  });

  it('fails loudly on a missing title or unknown zone', () => {
    expect(() => buildTerritoryView({ slug: 'x' }, zones, [], uiText('en'))).toThrow(/Missing en title for "x"/);
    expect(() => buildTerritoryView(dreamland, [], works, uiText('en'))).toThrow(/Unknown zone "arrival"/);
  });
});

describe('buildTerritoryTeaser', () => {
  it('has an excerpt, a link and three works spread over the zones', () => {
    const t = buildTerritoryTeaser(dreamland, works, uiText('en'));
    expect(t.excerpt).toBe('A dream. Another.');
    expect(t.href).toBe('/en/territories/dreamland/');
    expect(t.featured.map((x) => x.slug)).toEqual(['a1', 'le1', 'n1']);
  });

  it('shortens long statements and handles a missing statement', () => {
    const long = 'Word '.repeat(100).trim() + '.';
    const t = buildTerritoryTeaser({ ...dreamland, statement: tb(long, long) }, works, uiText('en'));
    expect(t.excerpt!.length).toBeLessThanOrEqual(TEASER_EXCERPT_CHARS + 1);
    expect(buildTerritoryTeaser(border, works, uiText('fr')).excerpt).toBeUndefined();
  });
});

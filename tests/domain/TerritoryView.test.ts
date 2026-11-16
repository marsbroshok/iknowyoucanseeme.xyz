import { describe, it, expect } from 'vitest';
import {
  buildTerritoryView,
  buildTerritoryTeaser,
  buildWorkBreadcrumb,
  buildIndexSections,
  TEASER_EXCERPT_CHARS,
} from '../../src/domain/TerritoryView.js';
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
    expect(v.groups[0].anchorId).toBe('zone-arrival');
    expect(v.groups[0].count).toBe(2);
    expect(v.groups[0].driftHref).toBe('/fr/?w=a1');
    expect(v.groups[3].title).toBeUndefined();
    expect(v.groups[3].anchorId).toBeUndefined();
    expect(v.count).toBe(5);
    expect(v.driftHref).toBe('/fr/?w=a1');
    expect(v.zoneJumps).toEqual([
      { slug: 'arrival', anchorId: 'zone-arrival', title: 'Arrivée', count: 2, driftHref: '/fr/?w=a1' },
      { slug: 'lens', anchorId: 'zone-lens', title: 'La Loupe', count: 1, driftHref: '/fr/?w=le1' },
      { slug: 'leak', anchorId: 'zone-leak', title: "L'Infiltration", count: 1, driftHref: '/fr/?w=l1' },
    ]);
    expect(v.otherTerritories).toEqual([]);
  });

  it('populates cross-territory continuation links (skipping self and empty territories) and handles empty own works', () => {
    const allTerritories = [dreamland, border, { slug: 'empty', title: { en: 'Empty', fr: 'Vide' } }];
    const dreamlandView = buildTerritoryView(dreamland, zones, works, uiText('en'), allTerritories);
    expect(dreamlandView.otherTerritories).toEqual([
      {
        slug: 'border',
        title: 'The border is thin',
        excerpt: undefined,
        href: '/en/territories/border/',
        count: 1,
        driftHref: '/en/?w=b1',
      },
    ]);

    const borderView = buildTerritoryView(border, zones, works, uiText('fr'), allTerritories);
    expect(borderView.zoneJumps).toEqual([]);
    expect(borderView.otherTerritories).toEqual([
      {
        slug: 'dreamland',
        title: 'Dreamland',
        excerpt: 'Un rêve. Un autre.',
        href: '/fr/territoires/dreamland/',
        count: 5,
        driftHref: '/fr/?w=a1',
      },
    ]);

    const emptyView = buildTerritoryView({ slug: 'empty', title: { en: 'Empty', fr: 'Vide' } }, zones, works, uiText('en'));
    expect(emptyView.count).toBe(0);
    expect(emptyView.driftHref).toBeUndefined();
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

describe('buildWorkBreadcrumb & buildIndexSections', () => {
  it('builds zoned and unzoned breadcrumb models with sequence position, and fails on unknown zone', () => {
    const zonedWork = works.find((x) => x.slug === 'le1')!;
    expect(buildWorkBreadcrumb(zonedWork, dreamland, zones, works, uiText('en'))).toEqual({
      worksHref: '/en/works/',
      worksLabel: 'Works',
      territoryHref: '/en/territories/dreamland/',
      territoryTitle: 'Dreamland',
      zoneHref: '/en/territories/dreamland/#zone-lens',
      zoneTitle: 'Lens',
      sequence: { index: 3, total: 5 },
    });

    const unzonedWork = works.find((x) => x.slug === 'b1')!;
    expect(buildWorkBreadcrumb(unzonedWork, border, zones, works, uiText('fr'))).toEqual({
      worksHref: '/fr/oeuvres/',
      worksLabel: 'Œuvres',
      territoryHref: '/fr/territoires/border/',
      territoryTitle: "La frontière s'efface",
      sequence: { index: 1, total: 1 },
    });

    expect(buildWorkBreadcrumb(unzonedWork, border, zones, [], uiText('en')).sequence).toBeUndefined();
    expect(() => buildWorkBreadcrumb(zonedWork, dreamland, [], works, uiText('en'))).toThrow(/Unknown zone "lens"/);
  });

  it('builds index sections with zone subgroups, medium presence flags, counts, and drift hrefs', () => {
    const mixedWorks = [
      ...works,
      { ...w('c1', 'dreamland', 'leak', 2026), medium: 'ceramic' as const },
    ];
    const sections = buildIndexSections([dreamland, border], mixedWorks, uiText('en'), zones);
    expect(sections).toHaveLength(2);
    expect(sections[0]).toMatchObject({
      slug: 'border',
      count: 1,
      hasPhoto: true,
      hasCeramic: false,
      href: '/en/territories/border/',
      driftHref: '/en/?w=b1',
    });
    expect(sections[0].subgroups).toHaveLength(1);
    expect(sections[0].subgroups[0].title).toBeUndefined();

    expect(sections[1]).toMatchObject({
      slug: 'dreamland',
      count: 6,
      hasPhoto: true,
      hasCeramic: true,
      href: '/en/territories/dreamland/',
      driftHref: '/en/?w=a1',
    });
    expect(sections[1].subgroups.map((sg) => sg.slug)).toEqual(['arrival', 'lens', 'leak', undefined]);
    expect(sections[1].subgroups[0]).toMatchObject({
      slug: 'arrival',
      title: 'Arrival',
      href: '/en/territories/dreamland/#zone-arrival',
      driftHref: '/en/?w=a1',
      count: 2,
      hasPhoto: true,
      hasCeramic: false,
    });
    expect(sections[1].subgroups[2]).toMatchObject({
      slug: 'leak',
      title: 'Leak',
      href: '/en/territories/dreamland/#zone-leak',
      count: 2,
      hasPhoto: true,
      hasCeramic: true,
    });

    // Zoned territory where one zone or the unzoned remainder is empty drops empty subgroups cleanly.
    const partialZoned = buildIndexSections([dreamland], [w('a1', 'dreamland', 'arrival')], uiText('en'), zones);
    expect(partialZoned[0].subgroups.map((sg) => sg.slug)).toEqual(['arrival']);

    expect(() => buildIndexSections([dreamland], mixedWorks, uiText('en'), [{ slug: 'arrival', title: { en: 'Arrival', fr: 'Arrivée' } }])).toThrow(
      /Unknown zone "lens"/,
    );
  });
});

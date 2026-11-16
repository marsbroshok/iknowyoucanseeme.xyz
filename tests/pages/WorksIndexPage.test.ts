import { describe, it, expect, beforeAll } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import WorksIndexPage from '../../src/components/pages/WorksIndexPage.astro';
import { buildIndexSections } from '../../src/domain/TerritoryView.js';
import { uiText } from '../../src/i18n/UiCatalog.js';
import { fixtureWork } from './fixtures.js';
import { scriptBytes } from '../../src/tools/DistGuard.js';

const territories = [
  { slug: 'the-border-is-thin', title: { en: 'The border is thin', fr: "La frontière s'efface" } },
  { slug: 'dreamland', title: { en: 'Dreamland', fr: 'Dreamland' } },
];
const zones = [
  { slug: 'arrival', title: { en: 'Arrival', fr: 'Arrivée' } },
  { slug: 'lens', title: { en: 'Lens', fr: 'La Loupe' } },
  { slug: 'leak', title: { en: 'Leak', fr: "L'Infiltration" } },
];
const works = [
  fixtureWork({ slug: 'cygne-icm-1', title: { fr: 'Cygne 1' }, territory: 'the-border-is-thin', zone: undefined, year: 2026 }),
  fixtureWork({ slug: 'solitude', title: { fr: 'Solitude' }, zone: 'lens' }),
  fixtureWork({ slug: 'esquisse-argile-1', title: { fr: 'Esquisse 1' }, zone: 'leak', medium: 'ceramic', year: 2026 }),
  fixtureWork(),
];

describe('buildIndexSections', () => {
  it('one section per territory (slug order), works in zone order, empty territories dropped', () => {
    const sections = buildIndexSections([...territories, { slug: 'empty', title: { en: 'E', fr: 'E' } }], works, uiText('en'), zones);
    expect(sections.map((s) => s.slug)).toEqual(['dreamland', 'the-border-is-thin']);
    expect(sections[0].works.map((w) => w.slug)).toEqual(['arrivee', 'solitude', 'esquisse-argile-1']);
    expect(sections[1].title).toBe('The border is thin');
  });
});

describe('WorksIndexPage', () => {
  let container: AstroContainer;
  beforeAll(async () => {
    container = await AstroContainer.create();
  });

  const render = (lang: 'en' | 'fr') =>
    container.renderToString(WorksIndexPage, {
      props: { lang, sections: buildIndexSections(territories, works, uiText(lang), zones) },
    });

  it('lists every work with #all-works reset pill, zero-JS medium radio filters, zone subgroups, Drift portals, and 0 B JS', async () => {
    const html = await render('en');
    expect(html).toMatch(/<h1[^>]*>Works<\/h1>/);
    expect(html).toMatch(/<div[^>]*class="page works-index"[^>]*id="all-works"|id="all-works"[^>]*class="page works-index"/);
    expect(html).toContain('href="#all-works"');
    expect(html).toContain('All works (4)');
    expect(html).toContain('href="#dreamland"');
    expect(html).toContain('href="#the-border-is-thin"');
    expect(html).toMatch(/<input[^>]*type="radio"[^>]*name="medium-filter"[^>]*value="all"[^>]*checked/);
    expect(html).toMatch(/<input[^>]*type="radio"[^>]*name="medium-filter"[^>]*value="photo"/);
    expect(html).toMatch(/<input[^>]*type="radio"[^>]*name="medium-filter"[^>]*value="ceramic"/);
    expect(html).toContain('Photographs (3)');
    expect(html).toContain('Ceramics (1)');
    expect(html).toContain('data-medium="photo"');
    expect(html).toContain('data-medium="ceramic"');
    expect(html).toMatch(/<section[^>]*id="dreamland"/);
    expect(html).toMatch(/<section[^>]*id="the-border-is-thin"/);
    expect(html).toContain('href="/en/territories/dreamland/#zone-arrival"');
    expect(html).toContain('href="/en/territories/dreamland/#zone-lens"');
    expect(html).toContain('href="/en/territories/dreamland/#zone-leak"');
    expect(html).toContain('href="/en/?w=arrivee"');
    for (const slug of ['arrivee', 'solitude', 'esquisse-argile-1', 'cygne-icm-1']) {
      expect(html).toContain(`href="/en/works/${slug}/"`);
    }
    expect(html.match(/<picture/g)).toHaveLength(4);
    expect(html).toContain('The border is thin · 2026');
    expect(html).toContain('rel="canonical" href="https://www.iknowyoucanseeme.xyz/en/works/"');
    expect(scriptBytes(html).inlineBytes).toBe(0);
  });

  it('FR: localized heading, territory reset, medium radio pills, and links', async () => {
    const html = await render('fr');
    expect(html).toMatch(/<h1[^>]*>Œuvres<\/h1>/);
    expect(html).toContain('Filtrer par territoire');
    expect(html).toContain('Toutes les œuvres (4)');
    expect(html).toContain('Photographies (3)');
    expect(html).toContain('Céramiques (1)');
    expect(html).toContain('href="/fr/oeuvres/cygne-icm-1/"');
    expect(scriptBytes(html).inlineBytes).toBe(0);
  });
});

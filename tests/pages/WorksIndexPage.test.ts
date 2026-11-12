import { describe, it, expect, beforeAll } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import WorksIndexPage from '../../src/components/pages/WorksIndexPage.astro';
import { buildIndexSections } from '../../src/domain/TerritoryView.js';
import { uiText } from '../../src/i18n/UiCatalog.js';
import { fixtureWork } from './fixtures.js';

const territories = [
  { slug: 'the-border-is-thin', title: { en: 'The border is thin', fr: "La frontière s'efface" } },
  { slug: 'dreamland', title: { en: 'Dreamland', fr: 'Dreamland' } },
];
const works = [
  fixtureWork({ slug: 'cygne-icm-1', title: { fr: 'Cygne 1' }, territory: 'the-border-is-thin', zone: undefined, year: 2026 }),
  fixtureWork({ slug: 'solitude', title: { fr: 'Solitude' }, zone: 'lens' }),
  fixtureWork(),
];

describe('buildIndexSections', () => {
  it('one section per territory (slug order), works in zone order, empty territories dropped', () => {
    const sections = buildIndexSections([...territories, { slug: 'empty', title: { en: 'E', fr: 'E' } }], works, uiText('en'));
    expect(sections.map((s) => s.slug)).toEqual(['dreamland', 'the-border-is-thin']);
    expect(sections[0].works.map((w) => w.slug)).toEqual(['arrivee', 'solitude']);
    expect(sections[1].title).toBe('The border is thin');
  });
});

describe('WorksIndexPage', () => {
  let container: AstroContainer;
  beforeAll(async () => {
    container = await AstroContainer.create();
  });

  const render = (lang: 'en' | 'fr') =>
    container.renderToString(WorksIndexPage, { props: { lang, sections: buildIndexSections(territories, works, uiText(lang)) } });

  it('lists every work with thumbnail, title, territory and year; filter anchors point at sections', async () => {
    const html = await render('en');
    expect(html).toMatch(/<h1[^>]*>Works<\/h1>/);
    expect(html).toContain('href="#dreamland"');
    expect(html).toContain('href="#the-border-is-thin"');
    expect(html).toMatch(/<section[^>]*id="dreamland"/);
    expect(html).toMatch(/<section[^>]*id="the-border-is-thin"/);
    for (const slug of ['arrivee', 'solitude', 'cygne-icm-1']) expect(html).toContain(`href="/en/works/${slug}/"`);
    expect(html.match(/<picture/g)).toHaveLength(3);
    expect(html).toContain('The border is thin · 2026');
    expect(html).toContain('rel="canonical" href="https://www.iknowyoucanseeme.xyz/en/works/"');
  });

  it('FR: localized heading, filter label and links', async () => {
    const html = await render('fr');
    expect(html).toMatch(/<h1[^>]*>Œuvres<\/h1>/);
    expect(html).toContain('Filtrer par territoire');
    expect(html).toContain('href="/fr/oeuvres/cygne-icm-1/"');
  });
});

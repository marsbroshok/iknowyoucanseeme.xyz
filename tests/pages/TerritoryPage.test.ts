import { describe, it, expect, beforeAll } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import TerritoryPage from '../../src/components/pages/TerritoryPage.astro';
import { buildTerritoryView } from '../../src/domain/TerritoryView.js';
import { uiText } from '../../src/i18n/UiCatalog.js';
import { fixtureWork, tb } from './fixtures.js';

const zones = [
  { slug: 'arrival', title: { en: 'Arrival', fr: 'Arrivée' }, statement: tb('Arrive here.', 'Arrivez ici.') },
  { slug: 'lens', title: { en: 'Lens', fr: 'La Loupe' }, statement: tb('Look closer.', 'Regardez de près.') },
  { slug: 'leak', title: { en: 'Leak', fr: "L'Infiltration" }, statement: tb('It leaks.', 'Ça fuit.') },
];
const works = [
  fixtureWork({ slug: 'dissonance', title: { fr: 'Dissonance' }, zone: 'leak' }),
  fixtureWork(),
  fixtureWork({ slug: 'solitude', title: { fr: 'Solitude', en: 'Loneliness' }, zone: 'lens' }),
];
const dreamland = { slug: 'dreamland', title: { en: 'Dreamland', fr: 'Dreamland' }, statement: tb('The whole statement.', 'Tout le texte.') };

describe('TerritoryPage', () => {
  let container: AstroContainer;
  beforeAll(async () => {
    container = await AstroContainer.create();
  });

  const render = (lang: 'en' | 'fr') =>
    container.renderToString(TerritoryPage, {
      props: { lang, territory: buildTerritoryView(dreamland, zones, works, uiText(lang)) },
      request: new Request(`https://www.iknowyoucanseeme.xyz/${lang}/`),
    });

  it('renders the statement then zones Arrival → Lens → Leak with zone statements and works', async () => {
    const html = await render('en');
    expect(html).toMatch(/<h1[^>]*>Dreamland<\/h1>/);
    expect(html).toContain('The whole statement.');
    const order = ['Arrival', 'Lens', 'Leak'].map((z) => html.search(new RegExp(`<h2[^>]*>${z}</h2>`)));
    expect(order.every((i) => i > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(html).toContain('Look closer.');
    expect(html.indexOf('href="/en/works/arrivee/"')).toBeLessThan(html.indexOf('href="/en/works/solitude/"'));
    expect(html.indexOf('href="/en/works/solitude/"')).toBeLessThan(html.indexOf('href="/en/works/dissonance/"'));
    expect(html).toContain('Loneliness');
    expect(html).toContain('rel="canonical" href="https://www.iknowyoucanseeme.xyz/en/territories/dreamland/"');
    expect(html).toContain('hreflang="fr" href="https://www.iknowyoucanseeme.xyz/fr/territoires/dreamland/"');
  });

  it('renders French zone names and never the EN subtitle on the FR site', async () => {
    const html = await render('fr');
    expect(html).toContain('La Loupe');
    expect(html).toContain('href="/fr/oeuvres/solitude/"');
    expect(html).not.toContain('Loneliness');
    expect(html).toContain('href="/en/territories/dreamland/"'); // language switch keeps the page
  });

  it('a territory without zones lists works without zone headings', async () => {
    const border = { slug: 'the-border-is-thin', title: { en: 'The border is thin', fr: "La frontière s'efface" } };
    const html = await container.renderToString(TerritoryPage, {
      props: {
        lang: 'en',
        territory: buildTerritoryView(border, zones, [fixtureWork({ slug: 'cygne-icm-1', territory: 'the-border-is-thin', zone: undefined })], uiText('en')),
      },
    });
    expect(html).not.toMatch(/<h2/);
    expect(html).toContain('href="/en/works/cygne-icm-1/"');
  });
});

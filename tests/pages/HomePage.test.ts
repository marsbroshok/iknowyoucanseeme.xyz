import { describe, it, expect, beforeAll } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import HomePage from '../../src/components/pages/HomePage.astro';
import { buildTerritoryTeaser } from '../../src/domain/TerritoryView.js';
import { uiText } from '../../src/i18n/UiCatalog.js';
import { fixtureWork, tb } from './fixtures.js';

const works = [
  fixtureWork(),
  fixtureWork({ slug: 'solitude', title: { fr: 'Solitude' }, zone: 'lens' }),
  fixtureWork({ slug: 'dissonance', title: { fr: 'Dissonance' }, zone: 'leak' }),
  fixtureWork({ slug: 'un-etranger', title: { fr: 'Un étranger' }, zone: 'leak', year: 2024 }),
  fixtureWork({ slug: 'cygne-icm-1', title: { fr: 'Cygne 1' }, territory: 'the-border-is-thin', zone: undefined, year: 2026 }),
];
const territories = [
  { slug: 'dreamland', title: { en: 'Dreamland', fr: 'Dreamland' }, statement: tb('A dream. More.', 'Un rêve. Plus.') },
  { slug: 'the-border-is-thin', title: { en: 'The border is thin', fr: "La frontière s'efface" }, statement: tb('Thin.', 'Fine.') },
];

describe('HomePage', () => {
  let container: AstroContainer;
  beforeAll(async () => {
    container = await AstroContainer.create();
  });

  const render = (lang: 'en' | 'fr') =>
    container.renderToString(HomePage, {
      props: { lang, territories: territories.map((t) => buildTerritoryTeaser(t, works, uiText(lang))) },
      request: new Request(`https://www.iknowyoucanseeme.xyz/${lang}/`),
    });

  it('renders signature, threshold line, both territory blocks with 3 works max, and page links (EN)', async () => {
    const html = await render('en');
    expect(html).toContain('<html lang="en"');
    expect(html).toMatch(/<h1[^>]*>iknowyoucanseeme<\/h1>/);
    expect(html).toContain('I know you can see me');
    expect(html).toContain('href="/en/territories/dreamland/"');
    expect(html).toContain('href="/en/territories/the-border-is-thin/"');
    expect(html).toContain('A dream. More.');
    const dreamland = html.split('data-territory="dreamland"')[1].split('</article>')[0];
    expect(dreamland.match(/class="work-card"/g)).toHaveLength(3);
    expect(dreamland).toContain('href="/en/works/arrivee/"');
    for (const href of ['/en/about/', '/en/exhibitions/', '/en/contact/', '/en/works/']) {
      expect(html).toContain(`href="${href}"`);
    }
    expect(html).toContain('rel="canonical" href="https://www.iknowyoucanseeme.xyz/en/"');
    expect(html).toContain('hreflang="fr" href="https://www.iknowyoucanseeme.xyz/fr/"');
    // axe landmark-unique: only the header navigation is a <nav> landmark.
    expect(html.match(/<nav\b/g)).toHaveLength(1);
  });

  it('renders the French home with French copy and FR links', async () => {
    const html = await render('fr');
    expect(html).toContain('<html lang="fr"');
    expect(html).toContain('Je sais que tu me vois');
    expect(html).toContain("La frontière s'efface".replace("'", '&#39;'));
    expect(html).toContain('href="/fr/a-propos/"');
    expect(html).toContain('href="/fr/expositions/"');
    expect(html).toContain('href="/fr/oeuvres/arrivee/"');
    expect(html).not.toContain('€');
  });
});

import { describe, it, expect, beforeAll } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import WorkPage from '../../src/components/pages/WorkPage.astro';
import { buildWorkView } from '../../src/domain/WorkView.js';
import { buildVisualArtworkJsonLd } from '../../src/domain/JsonLd.js';
import { uiText } from '../../src/i18n/UiCatalog.js';
import { localizedPath } from '../../src/i18n/LocalizedPath.js';
import { fixtureWork, tb } from './fixtures.js';

const current = fixtureWork({
  slug: 'solitude',
  title: { fr: 'Solitude', en: 'Loneliness' },
  size: { w: 30, h: 40, unit: 'cm' },
  techniques: ['ICM'],
  fragment: tb('Alone, not lonely.', 'Seul, pas isolé.'),
});
const prevWork = fixtureWork();
const nextWork = fixtureWork({ slug: 'dissonance', title: { fr: 'Dissonance' } });

describe('WorkPage', () => {
  let container: AstroContainer;
  beforeAll(async () => {
    container = await AstroContainer.create();
  });

  const render = (lang: 'en' | 'fr', over: Record<string, unknown> = {}) => {
    const ui = uiText(lang);
    return container.renderToString(WorkPage, {
      props: {
        lang,
        work: buildWorkView(current, ui),
        prev: buildWorkView(prevWork, ui),
        next: buildWorkView(nextWork, ui),
        territory: { title: 'Dreamland', href: localizedPath('territories', lang, ['dreamland']) },
        jsonLd: buildVisualArtworkJsonLd(current, 'Alexander Usoltsev', 'https://www.iknowyoucanseeme.xyz/en/works/solitude/'),
        ogImage: '/og/solitude.jpg',
        ...over,
      },
    });
  };

  it('EN: FR title + EN subtitle, image, fragment, metadata, availability, contact link, prev/next', async () => {
    const html = await render('en');
    expect(html).toMatch(/<h1[^>]*>Solitude<\/h1>/);
    expect(html).toContain('Loneliness');
    expect(html).toContain('<picture');
    expect(html).toContain('loading="eager"');
    expect(html).toContain('Alone, not lonely.');
    expect(html).toContain('30 × 40 cm · 2025 · photograph · ICM');
    expect(html).toContain('Contact for availability');
    expect(html).toContain('href="/en/contact/?work=solitude"');
    expect(html).toMatch(/rel="prev"[^>]*href="\/en\/works\/arrivee\/"|href="\/en\/works\/arrivee\/"[^>]*rel="prev"/);
    expect(html).toMatch(/rel="next"[^>]*href="\/en\/works\/dissonance\/"|href="\/en\/works\/dissonance\/"[^>]*rel="next"/);
    expect(html).toContain('href="/en/territories/dreamland/"');
    expect(html).toContain('"@type":"VisualArtwork"');
    expect(html).toContain('og:image" content="https://www.iknowyoucanseeme.xyz/og/solitude.jpg"');
    expect(html).toContain('hreflang="fr" href="https://www.iknowyoucanseeme.xyz/fr/oeuvres/solitude/"');
    expect(html).not.toMatch(/€|\bprice\b|\bprix\b/i);
  });

  it('keeps the "see it in the drift" link hidden until the drift world exists', async () => {
    const html = await render('en');
    expect(html).toMatch(/<[a-z]+[^>]*data-drift-link[^>]*hidden|<[a-z]+[^>]*hidden[^>]*data-drift-link/);
  });

  it('FR: no EN subtitle, French labels and links', async () => {
    const html = await render('fr');
    const main = html.slice(html.indexOf('<main'));
    expect(main).not.toContain('Loneliness');
    expect(html).toContain('Seul, pas isolé.');
    expect(html).toContain('photographie');
    expect(html).toContain('Disponibilité sur demande');
    expect(html).toContain('href="/fr/contact/?work=solitude"');
    expect(html).toContain('Œuvre suivante');
    expect(html).toContain('href="/fr/territoires/dreamland/"');
  });

  it('sold work: no contact link; first/last work: no prev/next', async () => {
    const ui = uiText('en');
    const html = await render('en', { work: buildWorkView({ ...current, availability: 'sold' }, ui), prev: null, next: null });
    expect(html).toContain('Sold');
    expect(html).not.toContain('/en/contact/?work=');
    expect(html).not.toContain('rel="prev"');
    expect(html).not.toContain('rel="next"');
  });
});

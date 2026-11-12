import { describe, it, expect, beforeAll } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import LabelsPage from '../../src/components/pages/LabelsPage.astro';
import BaseLayout from '../../src/components/BaseLayout.astro';
import { QrCode } from '../../src/qr/QrCode.js';

const SITE = 'https://www.iknowyoucanseeme.xyz';

describe('LabelsPage', () => {
  let container: AstroContainer;
  beforeAll(async () => {
    container = await AstroContainer.create();
  });

  const render = async (lang: 'en' | 'fr') => {
    const url = `${SITE}/${lang === 'fr' ? 'fr/oeuvres' : 'en/works'}/arrivee/`;
    const labels = [
      { slug: 'arrivee', title: 'Arrivée', meta: '2025 · photographie', url, displayUrl: url.replace('https://www.', ''), qrSvg: await QrCode.svg(url) },
      { slug: 'solitude', title: 'Solitude', meta: '2025 · photographie', url, displayUrl: 'x', qrSvg: await QrCode.svg(url) },
    ];
    return container.renderToString(LabelsPage, {
      props: { lang, labels },
      request: new Request(`${SITE}/${lang}/labels/`),
    });
  };

  it('renders one label per work with title, meta, QR (named image) and readable URL', async () => {
    const html = await render('fr');
    expect(html.match(/<li class="label"/g)).toHaveLength(2);
    expect(html).toContain('Arrivée');
    expect(html).toContain('2025 · photographie');
    expect(html).toMatch(/role="img" aria-label="Code QR vers la page de l'œuvre"/);
    expect(html).toContain('<svg');
    expect(html).toContain('iknowyoucanseeme.xyz/fr/oeuvres/arrivee/');
  });

  // Print rules (A4, hidden chrome) live in bundled CSS: checked in tests/e2e/labels.spec.ts.
  it('is not indexed and in the page language', async () => {
    const fr = await render('fr');
    expect(fr).toContain('<meta name="robots" content="noindex">');
    expect(fr).toMatch(/<h1[^>]*>Étiquettes pour l(?:'|&#39;)exposition<\/h1>/);
    const en = await render('en');
    expect(en).toMatch(/<h1[^>]*>Exhibition labels<\/h1>/);
    expect(en).toContain('Print this page on A4');
  });

  it('BaseLayout adds noindex only when asked', async () => {
    const props = { lang: 'en', routeKey: 'about', title: 'About' } as const;
    const request = new Request(`${SITE}/en/about/`);
    expect(await container.renderToString(BaseLayout, { props, request })).not.toContain('noindex');
    expect(await container.renderToString(BaseLayout, { props: { ...props, noindex: true }, request })).toContain(
      '<meta name="robots" content="noindex">',
    );
  });
});

import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import ExhibitionsPage from '../../src/components/pages/ExhibitionsPage.astro';
import AboutPage from '../../src/components/pages/AboutPage.astro';
import LegalPage from '../../src/components/pages/LegalPage.astro';
import { buildExhibitionViews } from '../../src/domain/ExhibitionQueries.js';
import { requireBlock } from '../../src/content/PageBlocks.js';
import { buildPersonJsonLd } from '../../src/domain/JsonLd.js';
import { tb } from './fixtures.js';
import { readAnalyticsConfig } from '../../src/analytics/AnalyticsConfig.js';

const exhibitions = [
  { slug: 'mpaa-2019', title: { fr: "L'Emprunt, la Citation" }, year: 2019, venue: 'MPAA', dates: { en: 'Dec 2019', fr: 'déc. 2019' } },
  { slug: 'atelier-51-2025', title: { fr: 'Dreamland' }, year: 2025, venue: 'Atelier 51' },
];

describe('buildExhibitionViews', () => {
  it('reverse-chronological, original title, localized dates', () => {
    const v = buildExhibitionViews(exhibitions, 'fr');
    expect(v.map((e) => e.slug)).toEqual(['atelier-51-2025', 'mpaa-2019']);
    expect(v[1]).toEqual({ slug: 'mpaa-2019', title: "L'Emprunt, la Citation", venue: 'MPAA', year: 2019, dates: 'déc. 2019' });
    expect(v[0].dates).toBeUndefined();
  });
  it('uses a locale title when present and fails without any title', () => {
    expect(buildExhibitionViews([{ ...exhibitions[1], title: { fr: 'Rêve', en: 'Dream' } }], 'en')[0].title).toBe('Dream');
    expect(() => buildExhibitionViews([{ slug: 'x', year: 2020, venue: 'V' }], 'en')).toThrow(/title for exhibition "x"/);
  });
});

describe('requireBlock', () => {
  const page = { slug: 'about' as const, blocks: { bio: tb('Bio', 'Biographie') } };
  it('returns the block text in the locale', () => {
    expect(requireBlock(page, 'bio', 'fr')).toBe('Biographie');
  });
  it('throws when the block is missing', () => {
    expect(() => requireBlock(page, 'nope', 'en')).toThrow(/Missing block "nope" in page "about"/);
    expect(() => requireBlock({ slug: 'legal' }, 'x', 'en')).toThrow(/page "legal"/);
  });
});

describe('static pages', () => {
  let container: AstroContainer;
  beforeAll(async () => {
    container = await AstroContainer.create();
  });

  it('ExhibitionsPage: newest first with venue, year and dates', async () => {
    const html = await container.renderToString(ExhibitionsPage, { props: { lang: 'en', exhibitions: buildExhibitionViews(exhibitions, 'en') } });
    expect(html).toMatch(/<h1[^>]*>Exhibitions<\/h1>/);
    expect(html.indexOf('Dreamland')).toBeLessThan(html.indexOf('Emprunt'));
    expect(html).toContain('Atelier 51');
    expect(html).toContain('Dec 2019');
    expect(html).toContain('rel="canonical" href="https://www.iknowyoucanseeme.xyz/en/exhibitions/"');
    const empty = await container.renderToString(ExhibitionsPage, { props: { lang: 'fr', exhibitions: [] } });
    expect(empty).toContain("Pas encore d&#39;exposition.");
  });

  it('AboutPage: bio, origin story, exhibitions summary, Person JSON-LD, no portrait', async () => {
    const html = await container.renderToString(AboutPage, {
      props: {
        lang: 'fr',
        title: 'À propos',
        bio: 'Je suis photographe.',
        origin: 'Tout a commencé en 2019.',
        exhibitionsSummary: 'MPAA 2019, Atelier 51 2025.',
        personJsonLd: buildPersonJsonLd('Alexander Usoltsev', 'https://www.iknowyoucanseeme.xyz/fr/a-propos/'),
      },
    });
    expect(html).toMatch(/<h1[^>]*>À propos<\/h1>/);
    expect(html).toContain('Je suis photographe.');
    expect(html).toContain('Tout a commencé en 2019.');
    expect(html).toContain('MPAA 2019, Atelier 51 2025.');
    expect(html).toContain('"@type":"Person"');
    expect(html).toContain('href="/fr/expositions/"');
    expect(html).not.toContain('<picture');
  });

  it('LegalPage: copyright, image use, cookieless note, publisher identity with email', async () => {
    const html = await container.renderToString(LegalPage, {
      props: {
        lang: 'en',
        copyright: '© all rights reserved.',
        imageUse: 'Ask first.',
        privacy: 'Cookieless analytics.',
        publisher: 'Published by Alexander Usoltsev.',
        analytics: readAnalyticsConfig('iknowyoucanseeme'),
      },
    });
    expect(html).toMatch(/<h1[^>]*>Legal notice<\/h1>/);
    for (const text of ['© all rights reserved.', 'Ask first.', 'Cookieless analytics.', 'Published by Alexander Usoltsev.']) {
      expect(html).toContain(text);
    }
    expect(html).toContain('href="mailto:marsbroshok+iknowyoucanseeme@gmail.com"');
    expect(html).toContain('hreflang="fr" href="https://www.iknowyoucanseeme.xyz/fr/mentions-legales/"');
  });

  it('LegalPage: no analytics sentence when analytics is disabled (the page never claims a counter that is not there)', async () => {
    const html = await container.renderToString(LegalPage, {
      props: {
        lang: 'fr',
        copyright: '© tous droits réservés.',
        imageUse: 'Demandez avant.',
        privacy: 'Des analyses sans cookies.',
        publisher: 'Publié par Alexander Usoltsev.',
        analytics: readAnalyticsConfig(undefined),
      },
    });
    expect(html).not.toContain('Des analyses sans cookies.');
    for (const text of ['© tous droits réservés.', 'Demandez avant.', 'Publié par Alexander Usoltsev.']) {
      expect(html).toContain(text);
    }
  });

  describe('LegalPage reads PUBLIC_GOATCOUNTER_CODE by default', () => {
    afterEach(() => {
      vi.unstubAllEnvs();
    });
    const renderDefault = () =>
      container.renderToString(LegalPage, {
        props: { lang: 'en', copyright: 'c', imageUse: 'i', privacy: 'Cookieless analytics.', publisher: 'p' },
      });
    it('shows the sentence when the code is set', async () => {
      vi.stubEnv('PUBLIC_GOATCOUNTER_CODE', 'iknowyoucanseeme');
      expect(await renderDefault()).toContain('Cookieless analytics.');
    });
    it('hides it when the code is blank', async () => {
      vi.stubEnv('PUBLIC_GOATCOUNTER_CODE', '');
      expect(await renderDefault()).not.toContain('Cookieless analytics.');
    });
  });
});

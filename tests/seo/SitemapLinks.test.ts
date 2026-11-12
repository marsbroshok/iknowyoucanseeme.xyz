import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { sitemapLinks, isLocalizedPage } from '../../src/seo/SitemapLinks.js';
import config from '../../astro.config.mjs';

const SITE = 'https://www.iknowyoucanseeme.xyz';

describe('sitemapLinks', () => {
  it('pairs a work page with its other-locale URL (localized segment) and x-default', () => {
    expect(sitemapLinks(`${SITE}/fr/oeuvres/arrivee/`)).toEqual([
      { lang: 'en', url: `${SITE}/en/works/arrivee/` },
      { lang: 'fr', url: `${SITE}/fr/oeuvres/arrivee/` },
      { lang: 'x-default', url: `${SITE}/en/works/arrivee/` },
    ]);
  });

  it('handles static pages and home', () => {
    expect(sitemapLinks(`${SITE}/en/about/`)?.[1]).toEqual({ lang: 'fr', url: `${SITE}/fr/a-propos/` });
    expect(sitemapLinks(`${SITE}/fr/`)?.[0]).toEqual({ lang: 'en', url: `${SITE}/en/` });
  });

  it('returns no links for non-localized URLs', () => {
    expect(sitemapLinks(`${SITE}/`)).toEqual([]);
    expect(sitemapLinks(`${SITE}/de/works/`)).toEqual([]);
  });

  it('property: links are symmetric (each alternate links back to the same set)', () => {
    const slug = fc.stringMatching(/^[a-z0-9-]{1,12}$/);
    fc.assert(
      fc.property(fc.constantFrom('en/works', 'fr/oeuvres', 'en/territories', 'fr/territoires'), slug, (prefix, s) => {
        const links = sitemapLinks(`${SITE}/${prefix}/${s}/`);
        expect(links).toHaveLength(3);
        for (const link of links) expect(sitemapLinks(link.url)).toEqual(links);
      }),
    );
  });
});

describe('isLocalizedPage', () => {
  it('excludes the root language chooser only', () => {
    expect(isLocalizedPage(`${SITE}/`)).toBe(false);
    expect(isLocalizedPage(`${SITE}/en/`)).toBe(true);
    expect(isLocalizedPage(`${SITE}/fr/oeuvres/arrivee/`)).toBe(true);
  });
});

describe('astro config', () => {
  it('registers @astrojs/sitemap and keeps the canonical site', () => {
    expect(config.site).toBe(SITE);
    const names = (config.integrations ?? []).flat().map((i) => (i && typeof i === 'object' && 'name' in i ? i.name : ''));
    expect(names).toContain('@astrojs/sitemap');
    expect(names).toContain('og-images');
  });
});

describe('robots.txt', () => {
  it('allows crawling and points to the sitemap index on the canonical host', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const robots = fs.readFileSync(path.resolve(__dirname, '../../public/robots.txt'), 'utf8');
    expect(robots).toMatch(/^User-agent: \*$/m);
    expect(robots).toMatch(/^Allow: \/$/m);
    expect(robots).not.toMatch(/^Disallow: \/\s*$/m);
    expect(robots).toMatch(/^Sitemap: https:\/\/www\.iknowyoucanseeme\.xyz\/sitemap-index\.xml$/m);
  });
});

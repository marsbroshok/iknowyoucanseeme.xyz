import { describe, it, expect } from 'vitest';
import { LEGACY_REDIRECTS, legacyRedirectPaths } from '../../src/i18n/LegacyRedirects.js';
import { buildSiteRoutes, routePath } from '../../src/i18n/SiteRoutes.js';
import { pathToKey } from '../../src/i18n/LocalizedPath.js';

describe('LEGACY_REDIRECTS', () => {
  it('sends every address of the Hugo site to its new page', () => {
    expect(Object.fromEntries(LEGACY_REDIRECTS.map((r) => [r.from, r.to]))).toEqual({
      '/dreamland/': '/en/territories/dreamland/',
      '/blog/': '/en/',
      '/blog/colors-and-shapes/': '/en/',
      '/uses/': '/en/',
      '/tags/': '/en/',
    });
  });

  it('never shadows a page of the site, and every target is a real page', () => {
    const sitePaths = buildSiteRoutes({ works: [], territories: ['dreamland', 'the-border-is-thin'] }).map(routePath);
    for (const { from, to } of LEGACY_REDIRECTS) {
      expect(pathToKey(from), from).toBeUndefined();
      expect(sitePaths, to).toContain(to);
      expect(from).toMatch(/^\/[a-z0-9/-]+\/$/);
    }
  });

  it('gives Astro rest params without slashes at the ends', () => {
    expect(legacyRedirectPaths()).toEqual([
      { params: { legacy: 'dreamland' }, props: { redirect: { from: '/dreamland/', to: '/en/territories/dreamland/' } } },
      { params: { legacy: 'blog' }, props: { redirect: { from: '/blog/', to: '/en/' } } },
      { params: { legacy: 'blog/colors-and-shapes' }, props: { redirect: { from: '/blog/colors-and-shapes/', to: '/en/' } } },
      { params: { legacy: 'uses' }, props: { redirect: { from: '/uses/', to: '/en/' } } },
      { params: { legacy: 'tags' }, props: { redirect: { from: '/tags/', to: '/en/' } } },
    ]);
  });
});

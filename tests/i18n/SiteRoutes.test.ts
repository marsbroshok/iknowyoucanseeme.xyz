import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { buildSiteRoutes, routePath } from '../../src/i18n/SiteRoutes.js';
import { pathToKey } from '../../src/i18n/LocalizedPath.js';

describe('buildSiteRoutes', () => {
  const routes = buildSiteRoutes({ works: ['arrivee', 'solitude'], territories: ['dreamland'] });

  it('creates every static page and every work/territory in both locales', () => {
    // 6 static pages + 2 works + 1 territory, per locale
    expect(routes).toHaveLength(2 * (6 + 2 + 1));
    const paths = routes.map(routePath);
    expect(paths).toContain('/en/');
    expect(paths).toContain('/fr/');
    expect(paths).toContain('/fr/oeuvres/');
    expect(paths).toContain('/en/works/arrivee/');
    expect(paths).toContain('/fr/oeuvres/solitude/');
    expect(paths).toContain('/fr/territoires/dreamland/');
    expect(paths).toContain('/en/exhibitions/');
    expect(paths).toContain('/fr/a-propos/');
    expect(paths).toContain('/fr/mentions-legales/');
    expect(paths).toContain('/en/contact/');
  });

  it('home has an undefined rest param (Astro root of [...route])', () => {
    const home = routes.find((r) => r.props.page.kind === 'home' && r.params.lang === 'fr');
    expect(home?.params.route).toBeUndefined();
  });

  it('carries the slug for work and territory pages', () => {
    const w = routes.find((r) => r.params.route === 'oeuvres/arrivee');
    expect(w?.props.page).toEqual({ kind: 'work', slug: 'arrivee' });
    const t = routes.find((r) => r.params.route === 'territories/dreamland');
    expect(t?.props.page).toEqual({ kind: 'territory', slug: 'dreamland' });
  });

  it('property: paths are unique and resolve back to their route key', () => {
    const slug = fc.stringMatching(/^[a-z0-9-]{1,10}$/);
    fc.assert(
      fc.property(fc.uniqueArray(slug, { maxLength: 15 }), fc.uniqueArray(slug, { maxLength: 4 }), (works, territories) => {
        const all = buildSiteRoutes({ works, territories });
        const paths = all.map(routePath);
        expect(new Set(paths).size).toBe(paths.length);
        expect(all).toHaveLength(2 * (6 + works.length + territories.length));
        for (const r of all) {
          const expected = r.props.page.kind === 'work' ? 'works' : r.props.page.kind === 'territory' ? 'territories' : r.props.page.kind;
          expect(pathToKey(routePath(r))).toBe(expected);
        }
      }),
    );
  });
});

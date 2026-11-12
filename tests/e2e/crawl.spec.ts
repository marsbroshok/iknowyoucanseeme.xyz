import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import path from 'node:path';
import { buildSiteRoutes, routePath } from '../../src/i18n/SiteRoutes.js';
import { listBuiltPages, pageUrlPath } from './builtPages.js';
import { LEGACY_REDIRECTS } from '../../src/i18n/LegacyRedirects.js';

/**
 * Crawls every route (both locales) and runs axe on each; also fails on
 * broken same-origin resources and page errors. The route list comes from
 * the route map + content slugs (available at collection time, before the
 * web server builds), and a first test checks the build matches it exactly.
 * Redirect pages of old addresses are part of the build but are checked in
 * legacyRedirects.spec.ts (they navigate away at once).
 */
const slugsIn = (dir: string) =>
  fs
    .readdirSync(path.resolve(dir))
    .filter((f) => f.endsWith('.yaml'))
    .map((f) => f.replace(/\.yaml$/, ''));

const routes = [
  '/',
  ...buildSiteRoutes({ works: slugsIn('src/content/works'), territories: slugsIn('src/content/territories') }).map(routePath),
].sort();

test.describe('Crawl: every route is accessible', () => {
  test('the build contains exactly the expected routes', () => {
    const built = listBuiltPages(path.resolve('dist')).map(pageUrlPath).sort();
    expect(built).toEqual([...routes, ...LEGACY_REDIRECTS.map((r) => r.from)].sort());
    expect(routes.filter((r) => r.startsWith('/en/'))).toHaveLength(49);
    expect(routes.filter((r) => r.startsWith('/fr/'))).toHaveLength(49);
  });

  for (const route of routes) {
    test(`axe: ${route}`, async ({ page, baseURL }) => {
      const broken: string[] = [];
      const errors: string[] = [];
      const origin = baseURL ?? 'http://localhost:4325';
      page.on('response', (r) => {
        if (r.url().startsWith(origin) && r.status() >= 400) broken.push(`${r.status()} ${r.url()}`);
      });
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(route);
      await page.waitForLoadState('load');
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
      expect(broken).toEqual([]);
      expect(errors).toEqual([]);
    });
  }
});

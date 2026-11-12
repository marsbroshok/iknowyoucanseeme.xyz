import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { inspectPage } from '../../src/tools/DistGuard.js';
import { listBuiltPages } from './builtPages.js';

/**
 * Static checks over the build the web server serves (`dist/`): no price
 * anywhere, lang/canonical/hreflang on every page, the JS budget, and the
 * acceptance criterion that every work has an EN and a FR page.
 */
const DIST = path.resolve('dist');

test.describe('Built site guard (dist/)', () => {
  // Read lazily: test files are collected before the web server builds dist/.
  let pages: string[] = [];
  test.beforeAll(() => {
    pages = listBuiltPages(DIST);
  });

  test('every page passes the price, lang, canonical, hreflang and JS checks', () => {
    expect(pages.length).toBeGreaterThan(0);
    const violations = pages.flatMap((file) => inspectPage(file, fs.readFileSync(path.join(DIST, file), 'utf8')));
    expect(violations).toEqual([]);
  });

  test('no price in the sitemap or other text files', () => {
    for (const file of fs.readdirSync(DIST).filter((f) => /\.(xml|txt)$/.test(f))) {
      expect(fs.readFileSync(path.join(DIST, file), 'utf8'), file).not.toMatch(/€|\bprix\b|\bprice\b/i);
    }
  });

  test('every work has an EN and a FR page, an OG image and sitemap entries', () => {
    const slugs = fs
      .readdirSync(path.resolve('src/content/works'))
      .filter((f) => f.endsWith('.yaml'))
      .map((f) => f.replace(/\.yaml$/, ''));
    const sitemap = fs.readFileSync(path.join(DIST, 'sitemap-0.xml'), 'utf8');
    expect(slugs.length).toBe(40);
    for (const slug of slugs) {
      expect(pages, slug).toContain(`en/works/${slug}/index.html`);
      expect(pages, slug).toContain(`fr/oeuvres/${slug}/index.html`);
      expect(fs.existsSync(path.join(DIST, 'og', `${slug}.jpg`)), slug).toBe(true);
      expect(sitemap).toContain(`<loc>https://www.iknowyoucanseeme.xyz/fr/oeuvres/${slug}/</loc>`);
    }
  });

  test('both locales have the same number of pages', () => {
    const en = pages.filter((p) => p.startsWith('en/'));
    const fr = pages.filter((p) => p.startsWith('fr/'));
    expect(en.length).toBe(fr.length);
    expect(en.length).toBe(6 + 40 + 2);
  });
});

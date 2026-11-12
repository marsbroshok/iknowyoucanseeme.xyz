import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { inspectPage } from '../../src/tools/DistGuard.js';
import { LanguageGuard } from '../../src/tools/LanguageGuard.js';
import { listBuiltPages } from './builtPages.js';
import { loadUiBlocks } from './uiBlocks.js';

/**
 * Static checks over the build the web server serves (`dist/`): no price
 * anywhere, lang/canonical/hreflang on every page, the JS budget, and the
 * acceptance criterion that every work has an EN and a FR page.
 */
const DIST = path.resolve('dist');
/** The keyed build (contact form rendered), served on port 4326. */
const KEYED = path.resolve('dist-e2e-keyed');

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

  test('no page shows UI text in the other language (FR pages: no EN UI strings; EN pages: no FR ones)', () => {
    const guard = new LanguageGuard(loadUiBlocks());
    const localized = pages.filter((p) => /^(en|fr)\//.test(p));
    expect(localized.length).toBe(2 * (6 + 40 + 2));
    const violations = localized.flatMap((file) => guard.inspect(file, fs.readFileSync(path.join(DIST, file), 'utf8')));
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

  test('without PUBLIC_GOATCOUNTER_CODE no page has an analytics script', () => {
    const tagged = pages.filter((file) => fs.readFileSync(path.join(DIST, file), 'utf8').includes('goatcounter'));
    expect(tagged).toEqual([]);
  });

  test('both locales have the same number of pages', () => {
    const en = pages.filter((p) => p.startsWith('en/'));
    const fr = pages.filter((p) => p.startsWith('fr/'));
    expect(en.length).toBe(fr.length);
    expect(en.length).toBe(6 + 40 + 2);
  });
});

test.describe('Built site guard (dist-e2e-keyed/, contact form rendered)', () => {
  let pages: string[] = [];
  test.beforeAll(() => {
    pages = listBuiltPages(KEYED);
  });

  test('the keyed contact pages render the form and pass the page and language checks', () => {
    const guard = new LanguageGuard(loadUiBlocks());
    for (const file of ['en/contact/index.html', 'fr/contact/index.html']) {
      expect(pages, file).toContain(file);
      const html = fs.readFileSync(path.join(KEYED, file), 'utf8');
      expect(html, file).toContain('data-contact-form');
      expect(inspectPage(file, html), file).toEqual([]);
      expect(guard.inspect(file, html), file).toEqual([]);
    }
  });

  test('with PUBLIC_GOATCOUNTER_CODE every localized page loads GoatCounter for that code', () => {
    const localized = pages.filter((p) => /^(en|fr)\//.test(p));
    expect(localized.length).toBeGreaterThan(0);
    for (const file of localized) {
      const html = fs.readFileSync(path.join(KEYED, file), 'utf8');
      expect(html, file).toMatch(/<script[^>]*data-goatcounter="https:\/\/e2e-test\.goatcounter\.com\/count"[^>]*src="https:\/\/gc\.zgo\.at\/count\.js"/);
    }
  });

  test('every keyed page passes the price, lang, canonical, hreflang, JS and language checks', () => {
    const guard = new LanguageGuard(loadUiBlocks());
    expect(pages.length).toBeGreaterThan(0);
    const violations = pages.flatMap((file) => {
      const html = fs.readFileSync(path.join(KEYED, file), 'utf8');
      return [...inspectPage(file, html), ...guard.inspect(file, html)];
    });
    expect(violations).toEqual([]);
  });
});

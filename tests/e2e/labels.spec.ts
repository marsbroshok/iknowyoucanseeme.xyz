import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { decodeQrSvg } from '../qr/decodeQr.js';

/**
 * Exhibition labels (`/{lang}/labels/`): one label per work, each QR code
 * decodes (independent decoder, rasterized like a camera would see it) to
 * the canonical work page of the sheet language; not indexed, not in the
 * sitemap; print layout hides the site chrome.
 */
const SITE = 'https://www.iknowyoucanseeme.xyz';
const slugs = fs
  .readdirSync(path.resolve('src/content/works'))
  .filter((f) => f.endsWith('.yaml'))
  .map((f) => f.replace(/\.yaml$/, ''));

for (const [lang, segment] of [
  ['en', 'works'],
  ['fr', 'oeuvres'],
] as const) {
  test.describe(`/${lang}/labels/`, () => {
    test('one label per work; every QR code decodes to the canonical work page', async () => {
      const html = fs.readFileSync(path.resolve(`dist/${lang}/labels/index.html`), 'utf8');
      const svgs = [...html.matchAll(/<div class="label-qr"[^>]*>(<svg[\s\S]*?<\/svg>)<\/div>/g)].map((m) => m[1]);
      expect(svgs).toHaveLength(slugs.length);
      const decoded = await Promise.all(svgs.map((svg) => decodeQrSvg(svg)));
      expect([...decoded].sort()).toEqual(slugs.map((s) => `${SITE}/${lang}/${segment}/${s}/`).sort());
    });

    test('is noindex and absent from the sitemap', async () => {
      const html = fs.readFileSync(path.resolve(`dist/${lang}/labels/index.html`), 'utf8');
      expect(html).toContain('<meta name="robots" content="noindex">');
      expect(fs.readFileSync(path.resolve('dist/sitemap-0.xml'), 'utf8')).not.toContain('/labels/');
    });

    test('prints on A4 without header, footer or intro', async ({ page }) => {
      await page.goto(`/${lang}/labels/`);
      await expect(page.locator('.site-header')).toBeVisible();
      await page.emulateMedia({ media: 'print' });
      await expect(page.locator('.site-header')).toBeHidden();
      await expect(page.locator('footer')).toBeHidden();
      await expect(page.locator('.labels-intro')).toBeHidden();
      await expect(page.locator('.label')).toHaveCount(slugs.length);
      await expect(page.locator('.label').first()).toBeVisible();
      const pdf = await page.pdf({ format: 'A4', preferCSSPageSize: true });
      expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
    });
  });
}

import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { LEGACY_REDIRECTS } from '../../src/i18n/LegacyRedirects.js';

/**
 * Old addresses of the Hugo site land on their new pages (static refresh
 * pages, as on GitHub Pages), and stay out of the sitemap.
 */
test.describe('Old Hugo addresses', () => {
  for (const { from, to } of LEGACY_REDIRECTS) {
    test(`${from} → ${to}`, async ({ page, baseURL }) => {
      const response = await page.goto(from);
      expect(response?.status()).toBe(200);
      await page.waitForURL(`${baseURL}${to}`);
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      await expect(page.locator('h1').first()).toBeVisible();
    });

    test(`${from} without the trailing slash also arrives`, async ({ page, baseURL }) => {
      await page.goto(from.slice(0, -1));
      await page.waitForURL(`${baseURL}${to}`);
    });
  }

  test('no old address is in the sitemap', () => {
    const sitemap = fs.readFileSync(path.resolve('dist/sitemap-0.xml'), 'utf8');
    for (const { from } of LEGACY_REDIRECTS) {
      expect(sitemap).not.toContain(`<loc>https://www.iknowyoucanseeme.xyz${from}</loc>`);
    }
  });
});

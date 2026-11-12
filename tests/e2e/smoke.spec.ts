import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('E2E Smoke and Accessibility', () => {
  const routes = ['/', '/en/', '/fr/'];

  for (const route of routes) {
    test(`Route ${route} should not have any automatically detectable accessibility issues`, async ({ page }) => {
      await page.goto(route);
      const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
      expect(accessibilityScanResults.violations).toEqual([]);
    });
  }

  test('Root chooser works without JS by displaying links', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/');
    const enLink = page.locator('a[href="/en/"]');
    const frLink = page.locator('a[href="/fr/"]');
    await expect(enLink).toBeVisible();
    await expect(frLink).toBeVisible();
    await context.close();
  });
});

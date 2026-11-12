import { test, expect, type Page, type Request } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Contact flows. Port 4325 serves the build without a Web3Forms key
 * (email-only mode); port 4326 serves the build with a test key (and a
 * test GoatCounter code). The Web3Forms endpoint and GoatCounter are mocked
 * here, in the test harness only, so no test ever reaches either service.
 */
const KEYED = 'http://localhost:4326';
const ENDPOINT = 'https://api.web3forms.com/submit';
const EMAIL = 'marsbroshok+iknowyoucanseeme@gmail.com';
/** The real endpoint answers cross-origin requests; the mock must too. */
const CORS = { 'Access-Control-Allow-Origin': '*' };

async function fill(page: Page) {
  await page.getByLabel('Name').fill('Ada Visitor');
  await page.getByLabel('Email').fill('ada@example.com');
  await page.getByLabel('Message').fill('Is this work still available?');
}

test.describe('Contact without a key: email-only mode', () => {
  for (const route of ['/en/contact/', '/fr/contact/']) {
    test(`${route} shows the email and no form`, async ({ page }) => {
      await page.goto(route);
      await expect(page.locator('form')).toHaveCount(0);
      await expect(page.locator(`a[href="mailto:${EMAIL}"]`)).toBeVisible();
    });
  }
});

test.describe('Contact with a key: Web3Forms form', () => {
  const analyticsLoads: string[] = [];
  test.beforeEach(async ({ page }) => {
    await page.route('https://gc.zgo.at/**', async (route) => {
      analyticsLoads.push(route.request().url());
      await route.fulfill({ status: 200, contentType: 'text/javascript', body: 'window.goatcounter = { count() {} };' });
    });
    await page.route('https://*.goatcounter.com/**', (route) => route.abort());
  });

  test('the keyed build loads the (mocked) GoatCounter script', async ({ page }) => {
    analyticsLoads.length = 0;
    await page.goto(`${KEYED}/en/about/`);
    await expect.poll(() => analyticsLoads).toEqual(['https://gc.zgo.at/count.js']);
    expect(await page.evaluate(() => typeof (window as unknown as { goatcounter?: { count?: unknown } }).goatcounter?.count)).toBe('function');
  });

  for (const route of ['/en/contact/', '/fr/contact/?work=arrivee']) {
    test(`axe on the keyed form ${route}`, async ({ page }) => {
      await page.goto(`${KEYED}${route}`);
      await expect(page.locator('form[data-contact-form]')).toBeVisible();
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations).toEqual([]);
    });
  }

  test('a work page links to the contact form pre-filled with the work; sending posts the slug', async ({ page }) => {
    let posted: Request | undefined;
    await page.route(ENDPOINT, async (route) => {
      posted = route.request();
      await route.fulfill({ status: 200, headers: CORS, contentType: 'application/json', body: JSON.stringify({ success: true, message: 'ok' }) });
    });
    const consoleErrors: string[] = [];
    page.on('console', (m) => {
      if (m.type() === 'error') consoleErrors.push(m.text());
    });
    await page.goto(`${KEYED}/en/works/arrivee/`);
    await page.getByRole('link', { name: 'Ask about this work' }).click();
    await expect(page).toHaveURL(/\/en\/contact\/\?work=arrivee$/);
    await expect(page.locator('input[name="work"]')).toHaveValue('arrivee');
    await expect(page.locator('[data-work-note]')).toContainText('Arrivée');

    await fill(page);
    await page.getByRole('button', { name: 'Send' }).click();
    await expect(page.getByRole('status'), consoleErrors.join('\n')).toHaveText('Message sent successfully.');
    expect(consoleErrors).toEqual([]);

    expect(posted?.method()).toBe('POST');
    const body = posted?.postData() ?? '';
    expect(body).toMatch(/name="work"\r\n\r\narrivee\r\n/);
    expect(body).toMatch(/name="access_key"\r\n\r\ne2e-test-key\r\n/);
    expect(body).toMatch(/name="email"\r\n\r\nada@example\.com\r\n/);
    expect(body).toMatch(/name="message"\r\n\r\nIs this work still available\?\r\n/);
    expect(body).not.toMatch(/name="botcheck"/);
    // The page did not navigate away.
    await expect(page).toHaveURL(/\/en\/contact\//);
  });

  test('a refused submission shows the failure state and keeps the message', async ({ page }) => {
    await page.route(ENDPOINT, (route) =>
      route.fulfill({ status: 400, headers: CORS, contentType: 'application/json', body: JSON.stringify({ success: false }) }),
    );
    await page.goto(`${KEYED}/fr/contact/`);
    await page.getByLabel('Nom').fill('Ada');
    await page.getByLabel('Email').fill('ada@example.com');
    await page.getByLabel('Message').fill('Bonjour');
    await page.getByRole('button', { name: 'Envoyer' }).click();
    await expect(page.getByRole('status')).toHaveText('Une erreur est survenue. Veuillez réessayer.');
    await expect(page.getByLabel('Message')).toHaveValue('Bonjour');
  });

  test('without JavaScript the form is a plain POST to Web3Forms', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    let posted: Request | undefined;
    await page.route(ENDPOINT, async (route) => {
      posted = route.request();
      await route.fulfill({ status: 200, contentType: 'text/html', body: '<html lang="en"><body>Sent</body></html>' });
    });
    await page.goto(`${KEYED}/en/contact/`);
    await fill(page);
    await page.getByRole('button', { name: 'Send' }).click();
    await expect(page.locator('body')).toHaveText('Sent');
    expect(posted?.method()).toBe('POST');
    const params = new URLSearchParams(posted?.postData() ?? '');
    expect(params.get('access_key')).toBe('e2e-test-key');
    expect(params.get('name')).toBe('Ada Visitor');
    expect(params.has('work')).toBe(true);
    expect(params.has('botcheck')).toBe(false);
    await context.close();
  });
});

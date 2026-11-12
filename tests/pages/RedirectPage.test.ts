import { describe, it, expect, beforeAll } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import RedirectPage from '../../src/components/RedirectPage.astro';
import { inspectPage } from '../../src/tools/DistGuard.js';

describe('RedirectPage', () => {
  let container: AstroContainer;
  beforeAll(async () => {
    container = await AstroContainer.create();
  });

  const render = () =>
    container.renderToString(RedirectPage, {
      props: { redirect: { from: '/dreamland/', to: '/en/territories/dreamland/' } },
      request: new Request('https://www.iknowyoucanseeme.xyz/dreamland/'),
    });

  it('refreshes at once to the new page, with the new page as canonical, not indexed', async () => {
    const html = await render();
    expect(html).toContain('<meta http-equiv="refresh" content="0; url=/en/territories/dreamland/">');
    expect(html).toContain('<link rel="canonical" href="https://www.iknowyoucanseeme.xyz/en/territories/dreamland/">');
    expect(html).toContain('<meta name="robots" content="noindex">');
    expect(html).toMatch(/<html lang="en">/);
  });

  it('shows a plain link for browsers that do not follow the refresh, in English from ui.yaml', async () => {
    const html = await render();
    expect(html).toContain('This page has moved.');
    expect(html).toMatch(/<a href="\/en\/territories\/dreamland\/"[^>]*>Go to the new page<\/a>/);
    expect(html).toContain('<title>Page moved</title>');
  });

  it('passes the built-page guard as a redirect page (no JS, no price)', async () => {
    expect(inspectPage('dreamland/index.html', await render())).toEqual([]);
  });
});

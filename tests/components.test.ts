import { describe, it, expect, beforeAll } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import BaseLayout from '../src/components/BaseLayout.astro';

describe('BaseLayout Container', () => {
  let container: AstroContainer;

  beforeAll(async () => {
    container = await AstroContainer.create();
  });

  it('renders lang attr, canonical, hreflang, and no search/theme toggle', async () => {
    const result = await container.renderToString(BaseLayout, {
      props: {
        lang: 'en',
        routeKey: 'works',
        title: 'Test Title'
      },
      request: new Request('https://www.iknowyoucanseeme.xyz/en/works')
    });

    expect(result).toContain('lang="en"');
    expect(result).toContain('<title>Test Title</title>');
    expect(result).toContain('rel="canonical" href="https://www.iknowyoucanseeme.xyz/en/works"');
    expect(result).toContain('hreflang="fr"');
    expect(result).toContain('hreflang="en"');
    
    // Header assertions
    expect(result).toContain('iknowyoucanseeme'); // signature
    expect(result).not.toContain('search');
    expect(result).not.toContain('theme toggle');
    
    // Footer assertions
    expect(result).toContain('Alexander Usoltsev, all rights reserved');
  });
});

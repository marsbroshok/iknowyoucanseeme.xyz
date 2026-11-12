import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import AnalyticsScript from '../../src/components/AnalyticsScript.astro';
import BaseLayout from '../../src/components/BaseLayout.astro';
import { readAnalyticsConfig } from '../../src/analytics/AnalyticsConfig.js';
import { scriptBytes } from '../../src/tools/DistGuard.js';

describe('AnalyticsScript', () => {
  let container: AstroContainer;
  beforeAll(async () => {
    container = await AstroContainer.create();
  });

  it('renders the GoatCounter tag (async, endpoint in data-goatcounter) when enabled', async () => {
    const html = await container.renderToString(AnalyticsScript, { props: { config: readAnalyticsConfig('iknowyoucanseeme') } });
    expect(html).toMatch(/<script[^>]*data-goatcounter="https:\/\/iknowyoucanseeme\.goatcounter\.com\/count"/);
    expect(html).toMatch(/<script[^>]*\basync\b/);
    expect(scriptBytes(html)).toEqual({ inlineBytes: 0, external: ['https://gc.zgo.at/count.js'] });
  });

  it('renders nothing when disabled', async () => {
    const html = await container.renderToString(AnalyticsScript, { props: { config: readAnalyticsConfig('') } });
    expect(html.trim()).toBe('');
  });

  it('is part of every page through BaseLayout, only when enabled', async () => {
    const render = (code: string | undefined) =>
      container.renderToString(BaseLayout, {
        props: { lang: 'fr', routeKey: 'about', title: 'À propos', analytics: readAnalyticsConfig(code) },
        request: new Request('https://www.iknowyoucanseeme.xyz/fr/a-propos/'),
      });
    expect(scriptBytes(await render('iknowyoucanseeme')).external).toEqual(['https://gc.zgo.at/count.js']);
    expect(scriptBytes(await render(undefined)).external).toEqual([]);
  });

  describe('BaseLayout reads PUBLIC_GOATCOUNTER_CODE by default', () => {
    afterEach(() => {
      vi.unstubAllEnvs();
    });
    const renderDefault = () =>
      container.renderToString(BaseLayout, {
        props: { lang: 'en', routeKey: 'about', title: 'About' },
        request: new Request('https://www.iknowyoucanseeme.xyz/en/about/'),
      });

    it('set: script for that code', async () => {
      vi.stubEnv('PUBLIC_GOATCOUNTER_CODE', 'from-env');
      expect(await renderDefault()).toContain('data-goatcounter="https://from-env.goatcounter.com/count"');
    });

    it('blank (unset GitHub variable): no script', async () => {
      vi.stubEnv('PUBLIC_GOATCOUNTER_CODE', '');
      expect(await renderDefault()).not.toContain('goatcounter');
    });
  });
});

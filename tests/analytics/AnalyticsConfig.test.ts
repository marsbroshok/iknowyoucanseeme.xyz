import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { GOATCOUNTER_SCRIPT_SRC, readAnalyticsConfig } from '../../src/analytics/AnalyticsConfig.js';

describe('readAnalyticsConfig', () => {
  it('is disabled when the code is absent or blank (an unset GitHub variable expands to "")', () => {
    for (const code of [undefined, '', '   ', '\n']) {
      expect(readAnalyticsConfig(code)).toEqual({ enabled: false });
    }
  });

  it('is enabled with the GoatCounter endpoint and script for a valid code', () => {
    expect(readAnalyticsConfig('iknowyoucanseeme')).toEqual({
      enabled: true,
      code: 'iknowyoucanseeme',
      endpoint: 'https://iknowyoucanseeme.goatcounter.com/count',
      scriptSrc: 'https://gc.zgo.at/count.js',
    });
    expect(readAnalyticsConfig('  my-site-2 ')).toMatchObject({ enabled: true, code: 'my-site-2' });
    expect(GOATCOUNTER_SCRIPT_SRC).toBe('https://gc.zgo.at/count.js');
  });

  it('fails the build on a code that is not a GoatCounter site code', () => {
    for (const code of ['My Site', 'https://x.goatcounter.com/count', 'x.goatcounter.com', '-x', 'x-', 'a_b', 'é', 'a'.repeat(51)]) {
      expect(() => readAnalyticsConfig(code), code).toThrow(/PUBLIC_GOATCOUNTER_CODE/);
    }
  });

  it('property: every valid code yields an https endpoint on its own goatcounter.com subdomain', () => {
    fc.assert(
      fc.property(fc.stringMatching(/^[a-z0-9](?:[a-z0-9-]{0,20}[a-z0-9])?$/), (code) => {
        const config = readAnalyticsConfig(code);
        expect(config.enabled).toBe(true);
        if (config.enabled) expect(new URL(config.endpoint).host).toBe(`${code}.goatcounter.com`);
      }),
    );
  });
});

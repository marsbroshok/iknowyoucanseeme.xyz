import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { DeepLink } from '../../../src/world/core/DeepLink.js';
import { SettleDetector, SETTLE } from '../../../src/world/core/SettleDetector.js';

const slugs = new Set(['arrivee', 'cygne-icm-1']);

describe('DeepLink', () => {
  it('reads the work of ?w=<slug>', () => {
    expect(DeepLink.parse('?w=arrivee', slugs)).toBe('arrivee');
    expect(DeepLink.parse('?x=1&w=cygne-icm-1', slugs)).toBe('cygne-icm-1');
  });

  it('ignores missing, empty or unknown works (normal start)', () => {
    expect(DeepLink.parse('', slugs)).toBeNull();
    expect(DeepLink.parse('?w=', slugs)).toBeNull();
    expect(DeepLink.parse('?w=%3Cscript%3E', slugs)).toBeNull();
  });

  it('writes the work into the address, keeping the rest', () => {
    expect(DeepLink.withWork('https://www.iknowyoucanseeme.xyz/fr/', 'arrivee')).toBe('/fr/?w=arrivee');
    expect(DeepLink.withWork('https://www.iknowyoucanseeme.xyz/en/?w=old&utm=x#top', 'cygne-icm-1')).toBe('/en/?w=cygne-icm-1&utm=x#top');
  });

  it('builds the link of a work page', () => {
    expect(DeepLink.href('/fr/', 'arrivee')).toBe('/fr/?w=arrivee');
  });

  it('builds the ?drift=1 portal link and detects ?drift=1 intent strictly', () => {
    expect(DeepLink.DRIFT_PARAM).toBe('drift');
    expect(DeepLink.driftHref('/en/')).toBe('/en/?drift=1');
    expect(DeepLink.driftHref('/fr/')).toBe('/fr/?drift=1');
    expect(DeepLink.hasDriftIntent('?drift=1')).toBe(true);
    expect(DeepLink.hasDriftIntent('?utm=x&drift=1')).toBe(true);
    expect(DeepLink.hasDriftIntent('')).toBe(false);
    expect(DeepLink.hasDriftIntent('?drift=0')).toBe(false);
    expect(DeepLink.hasDriftIntent('?drift=true')).toBe(false);
    expect(DeepLink.hasDriftIntent('?drift=')).toBe(false);
    expect(DeepLink.hasDriftIntent('?w=arrivee')).toBe(false);
  });

  it('strips ?drift=1 cleanly while preserving pathname, remaining query params, and hash', () => {
    expect(DeepLink.withoutDriftIntent('https://www.iknowyoucanseeme.xyz/en/?drift=1')).toBe('/en/');
    expect(DeepLink.withoutDriftIntent('https://www.iknowyoucanseeme.xyz/fr/?drift=1&w=arrivee#top')).toBe('/fr/?w=arrivee#top');
    expect(DeepLink.withoutDriftIntent('https://www.iknowyoucanseeme.xyz/en/?utm=x')).toBe('/en/?utm=x');
  });

  it('property: what is written is read back', () => {
    fc.assert(
      fc.property(fc.stringMatching(/^[a-z0-9-]{1,20}$/), (slug) => {
        const url = new URL(DeepLink.withWork('https://example.org/en/?a=1', slug), 'https://example.org');
        expect(DeepLink.parse(url.search, new Set([slug]))).toBe(slug);
      }),
    );
  });

  it('property: withoutDriftIntent removes drift=1 while preserving other query parameters and hash', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-z]{2,8}$/).filter((k) => k !== 'drift'),
        fc.stringMatching(/^[a-z0-9-]{1,12}$/),
        fc.option(fc.stringMatching(/^[a-z0-9-]{1,10}$/), { nil: undefined }),
        (key, value, hash) => {
          const hashPart = hash ? `#${hash}` : '';
          const raw = `https://example.org/en/?drift=1&${key}=${value}${hashPart}`;
          expect(DeepLink.hasDriftIntent(new URL(raw).search)).toBe(true);
          const cleaned = DeepLink.withoutDriftIntent(raw);
          const parsed = new URL(cleaned, 'https://example.org');
          expect(DeepLink.hasDriftIntent(parsed.search)).toBe(false);
          expect(parsed.pathname).toBe('/en/');
          expect(parsed.searchParams.get(key)).toBe(value);
          expect(parsed.hash).toBe(hashPart);
        },
      ),
    );
  });
});

describe('SettleDetector', () => {
  const slow = 0.01;
  const run = (d: SettleDetector, facing: string | null, speed: number, seconds: number) => {
    let out: string | null = null;
    for (let t = 0; t < seconds; t += 0.05) out = d.update(facing, speed, 0.05) ?? out;
    return out;
  };

  it('reports a work once the visitor has stayed in front of it, still, for a moment', () => {
    const d = new SettleDetector();
    expect(run(d, 'arrivee', slow, SETTLE.holdSeconds - 0.2)).toBeNull();
    expect(run(d, 'arrivee', slow, 0.4)).toBe('arrivee');
  });

  it('reports it only once while the visitor stays', () => {
    const d = new SettleDetector();
    run(d, 'arrivee', slow, SETTLE.holdSeconds + 0.1);
    expect(run(d, 'arrivee', slow, 5)).toBeNull();
  });

  it('does not settle while drifting past', () => {
    expect(run(new SettleDetector(), 'arrivee', SETTLE.maxSpeed * 2, 5)).toBeNull();
  });

  it('starts over when the visitor turns to another work or moves', () => {
    const d = new SettleDetector();
    run(d, 'arrivee', slow, SETTLE.holdSeconds - 0.2);
    run(d, 'cygne-icm-1', slow, 0.3);
    expect(run(d, 'arrivee', slow, 0.3)).toBeNull();
    run(d, null, slow, 0.1);
    expect(run(d, 'arrivee', slow, SETTLE.holdSeconds + 0.1)).toBe('arrivee');
  });

  it('settles again on the same work after leaving it', () => {
    const d = new SettleDetector();
    run(d, 'arrivee', slow, SETTLE.holdSeconds + 0.1);
    run(d, 'arrivee', 3, 0.5);
    expect(run(d, 'arrivee', slow, SETTLE.holdSeconds + 0.1)).toBe('arrivee');
  });
});

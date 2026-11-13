import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { ZoneAtmosphere, type RegionKey } from '../../../src/world/core/ZoneAtmosphere.js';
import { NIGHT_BLUE } from '../../../src/world/core/StageSettings.js';
import { SKY } from '../../../src/world/core/PaletteSky.js';
import { contrast } from '../../../src/design/AccentColor.js';

const CANONICAL_REGIONS: readonly RegionKey[] = [
  { territory: 'dreamland', zone: 'arrival' },
  { territory: 'dreamland', zone: 'lens' },
  { territory: 'dreamland', zone: 'leak' },
  { territory: 'the-border-is-thin', zone: null },
];

const rgb = (hex: string): [number, number, number] => [
  Number.parseInt(hex.slice(1, 3), 16),
  Number.parseInt(hex.slice(3, 5), 16),
  Number.parseInt(hex.slice(5, 7), 16),
];

describe('ZoneAtmosphere', () => {
  it('assigns each region its distinct nocturnal sky/fog base colour (FR2)', () => {
    expect(ZoneAtmosphere.forRegion({ territory: 'dreamland', zone: 'arrival' }).base).toBe('#081a34');
    expect(ZoneAtmosphere.forRegion({ territory: 'dreamland', zone: 'lens' }).base).toBe('#072622');
    expect(ZoneAtmosphere.forRegion({ territory: 'dreamland', zone: 'leak' }).base).toBe('#240d2b');
    expect(ZoneAtmosphere.forRegion({ territory: 'the-border-is-thin', zone: null }).base).toBe('#180e38');

    const bases = CANONICAL_REGIONS.map((r) => ZoneAtmosphere.forRegion(r).base);
    expect(new Set(bases).size).toBe(CANONICAL_REGIONS.length);
  });

  it('falls back cleanly to NIGHT_BLUE when region is null or unknown', () => {
    expect(ZoneAtmosphere.forRegion(null).base).toBe(NIGHT_BLUE);
    expect(ZoneAtmosphere.forRegion({ territory: 'future-series', zone: null }).base).toBe(NIGHT_BLUE);
  });

  it('supplies green, violet, and pink boreal curtain ribbons tuned to each region', () => {
    for (const region of [...CANONICAL_REGIONS, null]) {
      const { ribbons } = ZoneAtmosphere.forRegion(region);
      const stops = [ribbons.primary, ribbons.secondary, ribbons.tertiary];
      for (const stop of stops) expect(stop).toMatch(/^#[0-9a-f]{6}$/i);
      const hasGreen = stops.some((s) => {
        const [r, g, b] = rgb(s);
        return g > b && g > r;
      });
      const hasViolet = stops.some((s) => {
        const [r, g, b] = rgb(s);
        return b > r && r > g;
      });
      const hasPink = stops.some((s) => {
        const [r, g, b] = rgb(s);
        return r > b && b > g;
      });
      expect(hasGreen).toBe(true);
      expect(hasViolet).toBe(true);
      expect(hasPink).toBe(true);
    }
  });

  it('property: every region base and accent satisfies AA contrast invariants', () => {
    const arbRegion = fc.option(
      fc.record({
        territory: fc.constantFrom('dreamland', 'the-border-is-thin', 'other'),
        zone: fc.constantFrom('arrival' as const, 'lens' as const, 'leak' as const, null),
      }),
      { nil: null },
    );

    fc.assert(
      fc.property(arbRegion, (region) => {
        const atm = ZoneAtmosphere.forRegion(region);
        expect(contrast(SKY.dimText, atm.base)).toBeGreaterThanOrEqual(4.6);
        expect(contrast(atm.accent, NIGHT_BLUE)).toBeGreaterThanOrEqual(4.6);
        expect(contrast(atm.accent, atm.base)).toBeGreaterThanOrEqual(4.6);
      }),
    );
  });
});

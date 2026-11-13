import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { PaletteSky, SKY } from '../../../src/world/core/PaletteSky.js';
import { ZoneAtmosphere, type RegionKey } from '../../../src/world/core/ZoneAtmosphere.js';
import { NIGHT_BLUE } from '../../../src/world/core/StageSettings.js';
import { contrast } from '../../../src/design/AccentColor.js';

const hex = fc.tuple(fc.integer({ min: 0, max: 255 }), fc.integer({ min: 0, max: 255 }), fc.integer({ min: 0, max: 255 })).map(
  ([r, g, b]) => `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`,
);

const regionArb: fc.Arbitrary<RegionKey | null> = fc.constantFrom(
  { territory: 'dreamland', zone: 'arrival' },
  { territory: 'dreamland', zone: 'lens' },
  { territory: 'dreamland', zone: 'leak' },
  { territory: 'the-border-is-thin', zone: null },
  null,
);

describe('PaletteSky.targetFor', () => {
  it('uses NIGHT_BLUE by default or the active region base colour when no work is nearby', () => {
    expect(PaletteSky.targetFor(null, 0)).toBe(NIGHT_BLUE);
    expect(PaletteSky.targetFor('#ff0000', SKY.reach + 1)).toBe(NIGHT_BLUE);

    const lensBase = ZoneAtmosphere.forRegion({ territory: 'dreamland', zone: 'lens' }).base;
    expect(PaletteSky.targetFor(null, 0, lensBase)).toBe(lensBase);
    expect(PaletteSky.targetFor('#ff0000', SKY.reach + 1, lensBase)).toBe(lensBase);
  });

  it("leans towards the nearest work's dominant colour from the region base as the visitor comes close", () => {
    const leakBase = ZoneAtmosphere.forRegion({ territory: 'dreamland', zone: 'leak' }).base;
    const far = PaletteSky.targetFor('#3050ff', SKY.reach * 0.9, leakBase);
    const near = PaletteSky.targetFor('#3050ff', 1, leakBase);
    const blue = (c: string) => parseInt(c.slice(5, 7), 16);
    expect(blue(near)).toBeGreaterThan(blue(far));
    expect(blue(far)).toBeGreaterThanOrEqual(blue(leakBase));
    expect(near).not.toBe(leakBase);
  });

  it('property: preserves contrast ≥ 4.6:1 against SKY.dimText for every region and arbitrary work hex colour', () => {
    fc.assert(
      fc.property(regionArb, hex, fc.double({ min: 0, max: 60, noNaN: true }), (region, color, d) => {
        const base = ZoneAtmosphere.forRegion(region).base;
        const sky = PaletteSky.targetFor(color, d, base);
        expect(contrast('#f0f0f5', sky)).toBeGreaterThanOrEqual(4.6);
        expect(contrast(SKY.dimText, sky)).toBeGreaterThanOrEqual(4.6);
      }),
    );
  });
});

describe('PaletteSky.update (smooth drift across zones and works)', () => {
  it('moves part of the way each frame and blends smoothly when switching regions', () => {
    const arrivalBase = ZoneAtmosphere.forRegion({ territory: 'dreamland', zone: 'arrival' }).base;
    const lensBase = ZoneAtmosphere.forRegion({ territory: 'dreamland', zone: 'lens' }).base;
    const sky = new PaletteSky(arrivalBase);
    expect(sky.color).toBe(arrivalBase);

    const target = PaletteSky.targetFor('#40ff40', 0, lensBase);
    const first = sky.update('#40ff40', 0, 1 / 60, lensBase);
    expect(first).not.toBe(arrivalBase);
    expect(first).not.toBe(target);
    let c = first;
    for (let i = 0; i < 60 * 10; i++) c = sky.update('#40ff40', 0, 1 / 60, lensBase);
    expect(c).toBe(target);
    expect(sky.color).toBe(target);
  });

  it('property: every channel stays between start and target, and intermediate frames keep ≥ 4.6:1 contrast against SKY.dimText', () => {
    fc.assert(
      fc.property(regionArb, regionArb, hex, fc.double({ min: 0, max: 0.5, noNaN: true }), (r0, r1, color, dt) => {
        const startBase = ZoneAtmosphere.forRegion(r0).base;
        const nextBase = ZoneAtmosphere.forRegion(r1).base;
        const sky = new PaletteSky(startBase);
        const target = PaletteSky.targetFor(color, 0, nextBase);
        const next = sky.update(color, 0, dt, nextBase);
        for (const i of [1, 3, 5]) {
          const [a, b, n] = [startBase, target, next].map((x) => parseInt(x.slice(i, i + 2), 16));
          expect(n).toBeGreaterThanOrEqual(Math.min(a, b));
          expect(n).toBeLessThanOrEqual(Math.max(a, b));
        }
        expect(contrast(SKY.dimText, next)).toBeGreaterThanOrEqual(4.6);
      }),
    );
  });
});

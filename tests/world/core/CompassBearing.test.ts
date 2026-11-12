import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { CompassBearing } from '../../../src/world/core/CompassBearing.js';
import type { Region } from '../../../src/world/core/FieldLayout.js';

const region = (territory: string, zone: Region['zone'], z0: number, z1: number, x = 0): Region => ({
  territory,
  zone,
  start: { x, z: z0 },
  end: { x, z: z1 },
  center: { x, z: (z0 + z1) / 2 },
});

const regions: Region[] = [
  region('dreamland', 'arrival', 0, -40),
  region('dreamland', 'lens', -58, -100),
  region('dreamland', 'leak', -118, -200),
  region('the-border-is-thin', null, 0, -90, 300),
];

describe('CompassBearing.read', () => {
  it('names the region the visitor is in (nearest stretch of path)', () => {
    expect(CompassBearing.read({ x: 2, z: -20, yaw: 0 }, regions).current).toMatchObject({ zone: 'arrival' });
    expect(CompassBearing.read({ x: -3, z: -75, yaw: 0 }, regions).current).toMatchObject({ zone: 'lens' });
    expect(CompassBearing.read({ x: 299, z: -10, yaw: 0 }, regions).current).toMatchObject({ territory: 'the-border-is-thin' });
  });

  it('counts the space between two zones as the nearer one', () => {
    expect(CompassBearing.read({ x: 0, z: -45, yaw: 0 }, regions).current).toMatchObject({ zone: 'arrival' });
    expect(CompassBearing.read({ x: 0, z: -55, yaw: 0 }, regions).current).toMatchObject({ zone: 'lens' });
  });

  it('points to the others: straight ahead is 0, to the right is positive', () => {
    const { others } = CompassBearing.read({ x: 0, z: -20, yaw: 0 }, regions);
    const lens = others.find((o) => o.region.zone === 'lens');
    const border = others.find((o) => o.region.territory === 'the-border-is-thin');
    expect(lens?.bearing).toBeCloseTo(0, 9);
    expect(lens?.distance).toBeCloseTo(59, 9);
    expect(border?.bearing).toBeGreaterThan(Math.PI / 2 - 0.2);
    expect(border?.bearing).toBeLessThan(Math.PI / 2);
    expect(others.map((o) => o.region.zone ?? o.region.territory)).toEqual(['lens', 'leak', 'the-border-is-thin']);
  });

  it('turns with the visitor: facing back, the next zone is behind (±π)', () => {
    const { others } = CompassBearing.read({ x: 0, z: -20, yaw: Math.PI }, regions);
    expect(Math.abs(others[0].bearing)).toBeCloseTo(Math.PI, 9);
  });

  it('has nothing to say without regions', () => {
    expect(CompassBearing.read({ x: 0, z: 0, yaw: 0 }, [])).toEqual({ current: null, others: [] });
  });

  it('property: bearings lie in (−π, π] and the current region is never among the others', () => {
    fc.assert(
      fc.property(fc.double({ min: -400, max: 700, noNaN: true }), fc.double({ min: -300, max: 50, noNaN: true }), fc.double({ min: -10, max: 10, noNaN: true }), (x, z, yaw) => {
        const { current, others } = CompassBearing.read({ x, z, yaw }, regions);
        expect(others).toHaveLength(regions.length - 1);
        expect(others.map((o) => o.region)).not.toContain(current);
        for (const o of others) {
          expect(o.bearing).toBeGreaterThan(-Math.PI);
          expect(o.bearing).toBeLessThanOrEqual(Math.PI);
          expect(o.distance).toBeGreaterThanOrEqual(0);
        }
      }),
    );
  });
});

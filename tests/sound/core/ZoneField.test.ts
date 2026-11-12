import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { ZONE_FIELD, ZoneField } from '../../../src/sound/core/ZoneField.js';
import { SOUND_ZONES, SoundZones } from '../../../src/sound/core/SoundZones.js';
import { FieldLayout, type Region } from '../../../src/world/core/FieldLayout.js';

/** A straight stretch of path along -z at x, from z0 to z1. */
const region = (territory: string, zone: Region['zone'], x: number, z0: number, z1: number): Region => ({
  territory,
  zone,
  start: { x, z: z0 },
  end: { x, z: z1 },
  center: { x, z: (z0 + z1) / 2 },
});

const dreamland = [region('dreamland', 'arrival', 0, 0, -36), region('dreamland', 'lens', 0, -54, -90), region('dreamland', 'leak', 0, -108, -144)];
const border = region('the-border-is-thin', null, 300, 0, -60);
const field = new ZoneField([...dreamland, border]);
const sum = (w: Record<string, number>) => Object.values(w).reduce((a, b) => a + b, 0);
const coord = fc.double({ min: -400, max: 700, noNaN: true });

describe('ZoneField', () => {
  it('sounds like the arrival in a field without regions', () => {
    expect(new ZoneField([]).weightsAt({ x: 5, z: -5 })).toEqual(SoundZones.only('arrival'));
  });

  it('gives the zone the visitor stands in almost all the weight', () => {
    expect(field.weightsAt({ x: 0, z: -18 }).arrival).toBeGreaterThan(0.95);
    expect(field.weightsAt({ x: 0, z: -72 }).lens).toBeGreaterThan(0.95);
    expect(field.weightsAt({ x: 2, z: -126 }).leak).toBeGreaterThan(0.95);
    expect(field.weightsAt({ x: 300, z: -30 }).border).toBeCloseTo(1, 6);
  });

  it('shares the weight equally halfway between two zones', () => {
    const w = field.weightsAt({ x: 0, z: -45 });
    expect(w.arrival).toBeCloseTo(w.lens, 9);
    expect(w.arrival).toBeGreaterThan(0.45);
  });

  it('keeps the nearest stretch when a zone has several (two territories with the same zone)', () => {
    const twoArrivals = new ZoneField([region('dreamland', 'arrival', 0, 0, -10), region('other', 'arrival', 600, 0, -10), region('dreamland', 'lens', 0, -40, -50)]);
    const w = twoArrivals.weightsAt({ x: 0, z: -25 });
    expect(w.arrival).toBeCloseTo(w.lens, 9);
  });

  it('weights always form a mix (property)', () => {
    fc.assert(
      fc.property(coord, coord, (x, z) => {
        const w = field.weightsAt({ x, z });
        expect(sum(w)).toBeCloseTo(1, 9);
        for (const zone of SOUND_ZONES) {
          expect(w[zone]).toBeGreaterThanOrEqual(0);
          expect(w[zone]).toBeLessThanOrEqual(1);
        }
      }),
    );
  });

  it('weights change smoothly with the camera: a small step moves each weight by at most step / falloff (property)', () => {
    fc.assert(
      fc.property(coord, coord, fc.double({ min: -1, max: 1, noNaN: true }), fc.double({ min: -1, max: 1, noNaN: true }), (x, z, dx, dz) => {
        const a = field.weightsAt({ x, z });
        const b = field.weightsAt({ x: x + dx, z: z + dz });
        const step = Math.hypot(dx, dz);
        for (const zone of SOUND_ZONES) expect(Math.abs(a[zone] - b[zone])).toBeLessThanOrEqual(step / ZONE_FIELD.falloff + 1e-9);
      }),
    );
  });

  it('works on the real layout of the field (FieldLayout regions)', () => {
    const layout = FieldLayout.compute(
      [
        { slug: 'a', territory: 'dreamland', zone: 'arrival' },
        { slug: 'b', territory: 'dreamland', zone: 'lens' },
        { slug: 'c', territory: 'the-border-is-thin' },
      ],
      ['dreamland', 'the-border-is-thin'],
    );
    const real = new ZoneField(layout.regions);
    expect(real.weightsAt(layout.start).arrival).toBeGreaterThan(0.5);
    const lens = layout.regions.find((r) => r.zone === 'lens') as Region;
    expect(real.weightsAt(lens.center).lens).toBeGreaterThan(0.5);
    const far = layout.regions.find((r) => r.territory === 'the-border-is-thin') as Region;
    expect(real.weightsAt(far.center).border).toBeCloseTo(1, 6);
  });
});

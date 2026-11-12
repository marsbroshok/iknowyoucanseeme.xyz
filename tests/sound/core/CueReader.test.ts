import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { CUE_RANGE, CueReader } from '../../../src/sound/core/CueReader.js';
import { QUIET_CUES } from '../../../src/sound/core/SoundCues.js';

const works = [
  { slug: 'arrivee', title: 'Arrivée' },
  { slug: 'eclipse-miroir-9', title: 'Éclipse miroir 9' },
  { slug: 'la-nuit', title: 'Une éclipse (I)' },
];
const placements = [
  { slug: 'arrivee', x: 0, z: 0 },
  { slug: 'eclipse-miroir-9', x: 300, z: 0 },
  { slug: 'la-nuit', x: 600, z: 0 },
];
const reader = new CueReader(placements, works);

describe('CueReader', () => {
  it('tells eclipse works from their slug or title (any case or accent)', () => {
    expect(CueReader.isEclipse({ slug: 'eclipse-miroir-9', title: 'x' })).toBe(true);
    expect(CueReader.isEclipse({ slug: 'x', title: 'ÉCLIPSE' })).toBe(true);
    expect(CueReader.isEclipse({ slug: 'x', title: 'Une éclipse (I)' })).toBe(true);
    expect(CueReader.isEclipse({ slug: 'arrivee', title: 'Arrivée' })).toBe(false);
    expect(CueReader.isEclipse({ slug: 'eclipsed-moon', title: 'Eclipsed' })).toBe(false);
  });

  it('closeness is 1 near a work, 0 far from it, and falls smoothly and monotonically in between (property)', () => {
    expect(CueReader.closeness(0)).toBe(1);
    expect(CueReader.closeness(CUE_RANGE.near)).toBe(1);
    expect(CueReader.closeness(CUE_RANGE.far)).toBe(0);
    expect(CueReader.closeness(1000)).toBe(0);
    expect(CueReader.closeness((CUE_RANGE.near + CUE_RANGE.far) / 2)).toBeCloseTo(0.5, 9);
    fc.assert(
      fc.property(fc.double({ min: 0, max: 60, noNaN: true }), fc.double({ min: 0, max: 60, noNaN: true }), (a, b) => {
        const [lo, hi] = a <= b ? [a, b] : [b, a];
        expect(CueReader.closeness(lo)).toBeGreaterThanOrEqual(CueReader.closeness(hi));
        // Smooth: never steeper than 1.5 / (far − near) per metre.
        expect(CueReader.closeness(lo) - CueReader.closeness(hi)).toBeLessThanOrEqual((1.5 * (hi - lo)) / (CUE_RANGE.far - CUE_RANGE.near) + 1e-12);
      }),
    );
  });

  it('reads the approach of the nearest work and the eclipse of the nearest eclipse work', () => {
    expect(reader.read({ x: 2, z: 0 })).toEqual({ approach: 1, eclipse: 0 });
    expect(reader.read({ x: 300, z: 3 })).toEqual({ approach: 1, eclipse: 1 });
    const between = reader.read({ x: 300, z: 14 });
    expect(between.approach).toBeCloseTo(0.5, 9);
    expect(between.eclipse).toBeCloseTo(0.5, 9);
    expect(reader.read({ x: 150, z: 0 })).toEqual(QUIET_CUES);
  });

  it('is quiet in a field without works', () => {
    expect(new CueReader([], []).read({ x: 0, z: 0 })).toEqual(QUIET_CUES);
  });
});

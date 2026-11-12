import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { SOUND_ZONES, SoundZones } from '../../../src/sound/core/SoundZones.js';

const sum = (w: Record<string, number>) => Object.values(w).reduce((a, b) => a + b, 0);

describe('SoundZones', () => {
  it('names one sound zone per Dreamland zone plus the border territory', () => {
    expect(SOUND_ZONES).toEqual(['arrival', 'lens', 'leak', 'border']);
  });

  it('maps a stretch of path to its sound zone: the border territory is one zone, Dreamland follows its zones', () => {
    expect(SoundZones.of('the-border-is-thin', null)).toBe('border');
    expect(SoundZones.of('the-border-is-thin', 'leak')).toBe('border');
    expect(SoundZones.of('dreamland', 'arrival')).toBe('arrival');
    expect(SoundZones.of('dreamland', 'lens')).toBe('lens');
    expect(SoundZones.of('dreamland', 'leak')).toBe('leak');
    // Works without a zone (and any future territory without zones) sound like the arrival.
    expect(SoundZones.of('dreamland', null)).toBe('arrival');
    expect(SoundZones.of('somewhere-else', null)).toBe('arrival');
  });

  it('builds the weights of a single zone', () => {
    expect(SoundZones.only('lens')).toEqual({ arrival: 0, lens: 1, leak: 0, border: 0 });
  });

  it('normalises raw weights so they sum to 1 (property)', () => {
    const raw = fc.record({ arrival: fc.double({ min: 0, max: 50, noNaN: true }), lens: fc.double({ min: 0, max: 50, noNaN: true }), leak: fc.double({ min: 0, max: 50, noNaN: true }), border: fc.double({ min: 0.001, max: 50, noNaN: true }) });
    fc.assert(
      fc.property(raw, (r) => {
        const w = SoundZones.normalize(r);
        expect(sum(w)).toBeCloseTo(1, 9);
        for (const z of SOUND_ZONES) {
          expect(w[z]).toBeGreaterThanOrEqual(0);
          expect(w[z]).toBeCloseTo(r[z] / sum(r), 9);
        }
      }),
    );
  });

  it('rejects raw weights that cannot be normalised', () => {
    expect(() => SoundZones.normalize({ arrival: 0, lens: 0, leak: 0, border: 0 })).toThrow('[sound] zone weights must not all be 0');
    expect(() => SoundZones.normalize({ arrival: -1, lens: 2, leak: 0, border: 0 })).toThrow('[sound] zone weight "arrival" must be a finite number ≥ 0');
    expect(() => SoundZones.normalize({ arrival: 1, lens: Number.NaN, leak: 0, border: 0 })).toThrow('"lens"');
    expect(() => SoundZones.normalize({ arrival: 1, lens: 0, leak: Number.POSITIVE_INFINITY, border: 0 })).toThrow('"leak"');
  });

  it('checks that weights form a mix (each in [0, 1], sum 1)', () => {
    expect(SoundZones.isMix({ arrival: 0.25, lens: 0.25, leak: 0.25, border: 0.25 })).toBe(true);
    expect(SoundZones.isMix({ arrival: 0.5, lens: 0.25, leak: 0.25, border: 0.25 })).toBe(false);
    expect(SoundZones.isMix({ arrival: 1.5, lens: -0.5, leak: 0, border: 0 })).toBe(false);
    expect(SoundZones.isMix({ arrival: Number.NaN, lens: 1, leak: 0, border: 0 })).toBe(false);
  });
});

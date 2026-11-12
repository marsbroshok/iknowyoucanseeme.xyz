import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { SeededRandom } from '../../../src/world/core/SeededRandom.js';

describe('SeededRandom', () => {
  it('hashes with 32-bit FNV-1a (reference values)', () => {
    expect(SeededRandom.hash('')).toBe(0x811c9dc5);
    expect(SeededRandom.hash('a')).toBe(0xe40c292c);
    expect(SeededRandom.hash('foobar')).toBe(0xbf9cf968);
  });

  it('property: the same seed gives the same sequence', () => {
    fc.assert(
      fc.property(fc.string(), (seed) => {
        const a = new SeededRandom(seed);
        const b = new SeededRandom(seed);
        for (let i = 0; i < 5; i++) expect(a.next()).toBe(b.next());
      }),
    );
  });

  it('property: next() stays in [0, 1) and between() in [min, max)', () => {
    fc.assert(
      fc.property(fc.string(), fc.double({ min: -1e3, max: 1e3, noNaN: true }), fc.double({ min: 0.001, max: 1e3, noNaN: true }), (seed, min, span) => {
        const rnd = new SeededRandom(seed);
        const x = rnd.next();
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThan(1);
        const y = rnd.between(min, min + span);
        expect(y).toBeGreaterThanOrEqual(min);
        expect(y).toBeLessThanOrEqual(min + span);
      }),
    );
  });

  it('spreads values (two different seeds rarely agree)', () => {
    const firsts = new Set(['arrivee', 'solitude', 'dissonance', 'un-etranger', 'cygne-icm-1'].map((s) => new SeededRandom(s).next()));
    expect(firsts.size).toBe(5);
  });
});

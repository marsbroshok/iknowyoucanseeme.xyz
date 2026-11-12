import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { LensCrossfade } from '../../../src/world/core/LensCrossfade.js';
import { LENS_MODES } from '../../../src/world/core/LensMode.js';

const modeArb = fc.constantFrom(...LENS_MODES);
const sum = (w: Record<string, number>) => Object.values(w).reduce((a, b) => a + b, 0);

describe('LensCrossfade', () => {
  it('starts on one lens at full weight', () => {
    const f = new LensCrossfade('mirror');
    expect(f.blend()).toEqual({ a: 'mirror', b: 'mirror', mix: 0 });
    expect(f.weights()).toEqual({ mirror: 1 });
    expect(f.target).toBe('mirror');
  });

  it('crossfades to a new lens over its duration, easing in and out', () => {
    const f = new LensCrossfade('gel', 0.4);
    f.to('icm');
    expect(f.blend()).toEqual({ a: 'gel', b: 'icm', mix: 0 });
    f.advance(0.1);
    const early = f.blend().mix;
    f.advance(0.1);
    expect(f.blend().mix).toBeCloseTo(0.5, 5);
    expect(early).toBeLessThan(0.25);
    f.advance(0.5);
    expect(f.blend()).toEqual({ a: 'icm', b: 'icm', mix: 0 });
    expect(f.weights()).toEqual({ icm: 1 });
  });

  it('ignores a change to the lens it is already heading to', () => {
    const f = new LensCrossfade('gel', 0.4);
    f.to('icm');
    f.advance(0.2);
    f.to('icm');
    expect(f.blend().mix).toBeCloseTo(0.5, 5);
  });

  it('starts an interrupted fade from the lens that showed most', () => {
    const f = new LensCrossfade('gel', 0.4);
    f.to('icm');
    f.advance(0.1);
    f.to('flare');
    expect(f.blend()).toEqual({ a: 'gel', b: 'flare', mix: 0 });
    f.advance(0.3);
    f.to('mirror');
    expect(f.blend()).toEqual({ a: 'flare', b: 'mirror', mix: 0 });
  });

  it('jumps without a fade (another work comes under the lens)', () => {
    const f = new LensCrossfade('gel');
    f.to('icm');
    f.advance(0.05);
    f.jump('fracture');
    expect(f.blend()).toEqual({ a: 'fracture', b: 'fracture', mix: 0 });
  });

  it('keeps weights in [0, 1] that always sum to 1, and a mix that only grows during a fade (property)', () => {
    fc.assert(
      fc.property(modeArb, fc.array(fc.tuple(fc.option(modeArb), fc.float({ min: 0, max: 1, noNaN: true })), { maxLength: 30 }), (start, steps) => {
        const f = new LensCrossfade(start);
        let last = f.blend();
        for (const [mode, dt] of steps) {
          if (mode) f.to(mode);
          const before = f.blend();
          f.advance(dt);
          const now = f.blend();
          const w = f.weights();
          expect(sum(w)).toBeCloseTo(1, 9);
          for (const v of Object.values(w)) {
            expect(v).toBeGreaterThanOrEqual(0);
            expect(v).toBeLessThanOrEqual(1);
          }
          if (now.a === before.a && now.b === before.b) expect(now.mix).toBeGreaterThanOrEqual(before.mix);
          last = now;
        }
        expect(last.mix).toBeGreaterThanOrEqual(0);
      }),
    );
  });

  it('rejects a non-positive duration', () => {
    expect(() => new LensCrossfade('gel', 0)).toThrow(/duration/);
  });
});

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { MIX, ZoneMixer } from '../../../src/sound/core/ZoneMixer.js';
import { SOUND_ZONES, SoundZones, type ZoneWeights } from '../../../src/sound/core/SoundZones.js';

const sum = (w: ZoneWeights) => SOUND_ZONES.reduce((a, z) => a + w[z], 0);
const positive = fc.double({ min: 0.001, max: 10, noNaN: true });
/** Any mix of the four zones. */
const mixArb = fc.record({ arrival: positive, lens: positive, leak: positive, border: positive }).map((r) => SoundZones.normalize(r));
const dtArb = fc.double({ min: 0.001, max: 0.25, noNaN: true });

describe('ZoneMixer', () => {
  it('starts on the arrival unless told otherwise, with a ramp of at least 1.5 s', () => {
    expect(new ZoneMixer().current).toEqual(SoundZones.only('arrival'));
    expect(new ZoneMixer(SoundZones.only('border')).current).toEqual(SoundZones.only('border'));
    expect(MIX.rampSeconds).toBeGreaterThanOrEqual(1.5);
    expect(new ZoneMixer().rampSeconds).toBe(MIX.rampSeconds);
  });

  it('refuses a ramp shorter than 1.5 s and a starting mix that is not a mix', () => {
    expect(() => new ZoneMixer(SoundZones.only('arrival'), 1)).toThrow('[sound] the zone ramp must last at least 1.5 s');
    expect(() => new ZoneMixer({ arrival: 0.5, lens: 0, leak: 0, border: 0 })).toThrow('[sound] the starting weights must sum to 1');
  });

  it('crossfades a full zone change linearly over exactly the ramp', () => {
    const m = new ZoneMixer(SoundZones.only('arrival'), 2);
    const lens = SoundZones.only('lens');
    m.step(lens, 0.5);
    expect(m.current.arrival).toBeCloseTo(0.75, 9);
    expect(m.current.lens).toBeCloseTo(0.25, 9);
    m.step(lens, 1);
    expect(m.current.lens).toBeCloseTo(0.75, 9);
    m.step(lens, 0.5);
    expect(m.current).toEqual(lens);
    m.step(lens, 0.5);
    expect(m.current).toEqual(lens);
  });

  it('ignores frames without time and rejects targets that are not a mix', () => {
    const m = new ZoneMixer();
    m.step(SoundZones.only('leak'), 0);
    m.step(SoundZones.only('leak'), -1);
    m.step(SoundZones.only('leak'), Number.NaN);
    expect(m.current).toEqual(SoundZones.only('arrival'));
    expect(() => m.step({ arrival: 1, lens: 1, leak: 0, border: 0 }, 0.1)).toThrow('[sound] target zone weights must sum to 1');
  });

  it('keeps a mix at every step: weights in [0, 1] summing to 1 (property)', () => {
    fc.assert(
      fc.property(mixArb, fc.array(fc.tuple(mixArb, dtArb), { minLength: 1, maxLength: 40 }), (start, steps) => {
        const m = new ZoneMixer(start);
        for (const [target, dt] of steps) {
          const w = m.step(target, dt);
          expect(sum(w)).toBeCloseTo(1, 9);
          for (const z of SOUND_ZONES) {
            expect(w[z]).toBeGreaterThanOrEqual(-1e-12);
            expect(w[z]).toBeLessThanOrEqual(1 + 1e-12);
          }
        }
      }),
    );
  });

  it('ramps smoothly: no weight moves faster than 1 / ramp per second (property)', () => {
    fc.assert(
      fc.property(mixArb, fc.array(fc.tuple(mixArb, dtArb), { minLength: 1, maxLength: 40 }), (start, steps) => {
        const m = new ZoneMixer(start);
        for (const [target, dt] of steps) {
          const before = m.current;
          const after = m.step(target, dt);
          for (const z of SOUND_ZONES) expect(Math.abs(after[z] - before[z])).toBeLessThanOrEqual(dt / m.rampSeconds + 1e-12);
        }
      }),
    );
  });

  it('ramps monotonically towards a fixed target and reaches it (property)', () => {
    fc.assert(
      fc.property(mixArb, mixArb, fc.double({ min: 0.01, max: 0.25, noNaN: true }), (start, target, dt) => {
        const m = new ZoneMixer(start);
        let previous = m.current;
        const frames = Math.ceil(m.rampSeconds / dt) + 1;
        for (let i = 0; i < frames; i++) {
          const w = m.step(target, dt);
          for (const z of SOUND_ZONES) {
            // Each weight only ever moves towards its target and never overshoots it.
            expect(Math.abs(target[z] - w[z])).toBeLessThanOrEqual(Math.abs(target[z] - previous[z]) + 1e-12);
            expect(Math.sign(target[z] - w[z]) * Math.sign(target[z] - previous[z])).toBeGreaterThanOrEqual(0);
          }
          previous = w;
        }
        expect(m.current).toEqual(target);
      }),
    );
  });
});

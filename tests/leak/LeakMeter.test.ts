import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { LEAK, LeakMeter, type LeakRecord } from '../../src/leak/LeakMeter.js';

const MIN = 60_000;
const DAY = 86_400_000;
const T0 = Date.UTC(2026, 10, 12, 20, 0, 0);

const record = (ms: number, at = T0, color: string | null = null, cap = 0): LeakRecord => ({ ms, at, color, cap });

describe('LeakMeter — curve', () => {
  it('is 0 before any drift and 1 from about 15 minutes of drift on', () => {
    expect(LeakMeter.curve(0)).toBe(0);
    expect(LeakMeter.curve(15 * MIN)).toBe(1);
    expect(LeakMeter.curve(40 * MIN)).toBe(1);
  });

  it('eases in: slow at first (a minute leaves almost nothing), faster later', () => {
    expect(LeakMeter.curve(1 * MIN)).toBeLessThan(0.01);
    expect(LeakMeter.curve(7.5 * MIN)).toBeCloseTo(0.25, 6);
    expect(LeakMeter.curve(14 * MIN) - LeakMeter.curve(13 * MIN)).toBeGreaterThan(LeakMeter.curve(2 * MIN) - LeakMeter.curve(1 * MIN));
  });

  it('treats negative or non-finite drift time as none', () => {
    expect(LeakMeter.curve(-5)).toBe(0);
    expect(LeakMeter.curve(Number.NaN)).toBe(0);
  });

  it('property: the level is in [0, 1] and never falls when drift time grows', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 10 * 15 * MIN, noNaN: true }), fc.double({ min: 0, max: 15 * MIN, noNaN: true }), (ms, more) => {
        const a = LeakMeter.curve(ms);
        const b = LeakMeter.curve(ms + more);
        expect(a).toBeGreaterThanOrEqual(0);
        expect(b).toBeLessThanOrEqual(1);
        expect(b).toBeGreaterThanOrEqual(a);
      }),
    );
  });
});

describe('LeakMeter — decay over days of absence', () => {
  it('halves the stored drift time after each half-life of absence', () => {
    expect(LeakMeter.decayed(record(10 * MIN), T0 + LEAK.halfLifeMs)).toBeCloseTo(5 * MIN, 6);
    expect(LeakMeter.decayed(record(10 * MIN), T0 + 2 * LEAK.halfLifeMs)).toBeCloseTo(2.5 * MIN, 6);
  });

  it('is slow: a few hours away change almost nothing, a month away leaves almost nothing', () => {
    expect(LeakMeter.level(record(15 * MIN), T0 + 3 * 3_600_000)).toBeGreaterThan(0.95);
    expect(LeakMeter.level(record(15 * MIN), T0 + 30 * DAY)).toBeLessThan(0.01);
  });

  it('does not grow when the clock went back (a record from the future)', () => {
    expect(LeakMeter.decayed(record(10 * MIN), T0 - DAY)).toBe(10 * MIN);
  });

  it('property: the level never grows with absence', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 20 * MIN, noNaN: true }), fc.integer({ min: 0, max: 60 * DAY }), fc.integer({ min: 0, max: 60 * DAY }), (ms, away, more) => {
        const r = record(ms);
        expect(LeakMeter.level(r, T0 + away + more)).toBeLessThanOrEqual(LeakMeter.level(r, T0 + away));
      }),
    );
  });
});

describe('LeakMeter — accumulate', () => {
  it('starts a record from nothing', () => {
    expect(LeakMeter.accumulate(null, 30_000, T0)).toEqual({ ms: 30_000, at: T0, color: null, cap: 0 });
  });

  it('decays what was stored up to now, then adds the new drift time', () => {
    const next = LeakMeter.accumulate(record(10 * MIN, T0 - LEAK.halfLifeMs, '#eaca92', 0.2), 60_000, T0);
    expect(next.ms).toBeCloseTo(6 * MIN, 6);
    expect(next.at).toBe(T0);
    expect(next).toMatchObject({ color: '#eaca92', cap: 0.2 });
  });

  it('keeps the stored drift time bounded (twice the saturation), so a long visit still decays in days', () => {
    expect(LeakMeter.accumulate(record(2 * LEAK.saturateMs), 60 * MIN, T0).ms).toBe(2 * LEAK.saturateMs);
  });

  it('ignores negative or non-finite additions', () => {
    expect(LeakMeter.accumulate(record(MIN), -5, T0).ms).toBe(MIN);
    expect(LeakMeter.accumulate(record(MIN), Number.POSITIVE_INFINITY, T0).ms).toBe(MIN);
  });

  it('property: accumulating more drift never lowers the level now', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 20 * MIN, noNaN: true }), fc.double({ min: 0, max: 5 * MIN, noNaN: true }), (ms, add) => {
        const r = record(ms);
        expect(LeakMeter.level(LeakMeter.accumulate(r, add, T0), T0)).toBeGreaterThanOrEqual(LeakMeter.level(r, T0));
      }),
    );
  });
});

describe('LeakMeter — stored form', () => {
  it('round-trips a record through JSON', () => {
    const r = record(123_456, T0, '#a6bce0', 0.18);
    expect(LeakMeter.parse(LeakMeter.serialize(r))).toEqual(r);
  });

  it('reads a missing value as no record', () => {
    expect(LeakMeter.parse(null)).toBeNull();
  });

  it.each([
    ['not JSON', '{oops'],
    ['not an object', '42'],
    ['negative time', JSON.stringify({ ms: -1, at: T0, color: null, cap: 0 })],
    ['missing date', JSON.stringify({ ms: 1, color: null, cap: 0 })],
    ['bad colour', JSON.stringify({ ms: 1, at: T0, color: 'red', cap: 0 })],
    ['cap out of range', JSON.stringify({ ms: 1, at: T0, color: null, cap: 2 })],
  ])('rejects a damaged value (%s) with an error naming the problem', (_label, raw) => {
    expect(() => LeakMeter.parse(raw)).toThrow(/\[leak\]/);
  });
});

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { ApparitionCurve } from '../../../src/world/core/ApparitionCurve.js';

describe('ApparitionCurve', () => {
  const curve = new ApparitionCurve(8, 30);

  it('is fully visible up close and invisible far away', () => {
    expect(curve.opacity(0)).toBe(1);
    expect(curve.opacity(8)).toBe(1);
    expect(curve.opacity(30)).toBe(0);
    expect(curve.opacity(1000)).toBe(0);
  });

  it('fades softly in between (smoothstep: half way is half visible)', () => {
    expect(curve.opacity(19)).toBeCloseTo(0.5, 12);
    expect(curve.opacity(10)).toBeGreaterThan(0.9);
    expect(curve.opacity(28)).toBeLessThan(0.1);
  });

  it('treats a negative distance as zero', () => {
    expect(curve.opacity(-3)).toBe(1);
  });

  it('rejects a curve that does not fade outwards', () => {
    expect(() => new ApparitionCurve(10, 10)).toThrow(/near \(10\) must be ≥ 0 and < far \(10\)/);
    expect(() => new ApparitionCurve(-1, 10)).toThrow(/near/);
  });

  const distances = fc.double({ min: -50, max: 200, noNaN: true });

  it('property: opacity stays within [0, 1]', () => {
    fc.assert(
      fc.property(distances, (d) => {
        const o = curve.opacity(d);
        expect(o).toBeGreaterThanOrEqual(0);
        expect(o).toBeLessThanOrEqual(1);
      }),
    );
  });

  it('property: opacity never grows with distance (monotonic)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 50, noNaN: true }),
        fc.double({ min: 0.01, max: 50, noNaN: true }),
        distances,
        distances,
        (near, span, a, b) => {
          const c = new ApparitionCurve(near, near + span);
          const [closer, farther] = a <= b ? [a, b] : [b, a];
          expect(c.opacity(closer)).toBeGreaterThanOrEqual(c.opacity(farther));
        },
      ),
    );
  });
});

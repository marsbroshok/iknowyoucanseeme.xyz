import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { LENS, LensUniforms, type LensInput } from '../../../src/world/core/LensUniforms.js';

const aim = (slug: string, x = 0.5, y = 0.5) => ({ slug, uv: { x, y } });
const input = (over: Partial<LensInput> = {}): LensInput => ({ aim: null, touch: false, unaltered: false, ...over });
/** Runs `seconds` of frames at 60 fps with the same input. */
function run(lens: LensUniforms, inp: LensInput, seconds: number) {
  let f = lens.frame(inp, 0);
  for (let t = 0; t < seconds - 1e-9; t += 1 / 60) f = lens.frame(inp, 1 / 60);
  return f;
}

describe('LensUniforms — strength', () => {
  it('is off until a work is under the pointer, then rises quickly', () => {
    const lens = new LensUniforms();
    expect(lens.frame(input(), 1 / 60)).toMatchObject({ slug: null, strength: 0 });
    const f = run(lens, input({ aim: aim('a') }), LENS.riseSeconds + 0.02);
    expect(f.slug).toBe('a');
    expect(f.strength).toBe(1);
  });

  it('fades out over ~600 ms after a finger lifts, staying where it was (FR3)', () => {
    const lens = new LensUniforms();
    run(lens, input({ aim: aim('a', 0.3, 0.7), touch: true }), 0.5);
    const half = run(lens, input({ touch: true }), 0.3);
    expect(half.strength).toBeGreaterThan(0.4);
    expect(half.strength).toBeLessThan(0.6);
    expect(half.slug).toBe('a');
    expect(half.center.x).toBeCloseTo(0.3, 2);
    const gone = run(lens, input({ touch: true }), 0.32);
    expect(gone).toMatchObject({ slug: null, strength: 0 });
    expect(LENS.releaseSeconds).toBe(0.6);
  });

  it('fades faster when the mouse leaves a work, and fastest for "see unaltered" (FR4)', () => {
    const left = new LensUniforms();
    run(left, input({ aim: aim('a') }), 0.5);
    expect(run(left, input(), LENS.leaveSeconds + 0.02).strength).toBe(0);
    const pure = new LensUniforms();
    run(pure, input({ aim: aim('a') }), 0.5);
    expect(run(pure, input({ aim: aim('a'), unaltered: true }), LENS.hideSeconds + 0.02).strength).toBe(0);
    expect(LENS.hideSeconds).toBeLessThan(LENS.leaveSeconds);
    expect(LENS.leaveSeconds).toBeLessThan(LENS.releaseSeconds);
  });

  it('starts again from nothing on another work, centred on the pointer', () => {
    const lens = new LensUniforms();
    run(lens, input({ aim: aim('a', 0.2, 0.2) }), 0.5);
    const f = lens.frame(input({ aim: aim('b', 0.8, 0.6) }), 1 / 60);
    expect(f.slug).toBe('b');
    expect(f.center).toEqual({ x: 0.8, y: 0.6 });
    expect(f.strength).toBeLessThan(0.2);
    expect(f.velocity).toEqual({ x: 0, y: 0 });
  });

  it('keeps strength in [0, 1] and drops it to 0 within the release time whatever happens (property)', () => {
    const frameArb = fc.record({
      aim: fc.option(fc.record({ slug: fc.constantFrom('a', 'b'), uv: fc.record({ x: fc.double({ min: 0, max: 1, noNaN: true }), y: fc.double({ min: 0, max: 1, noNaN: true }) }) })),
      touch: fc.boolean(),
      unaltered: fc.boolean(),
      dt: fc.double({ min: 0, max: 0.2, noNaN: true }),
    });
    fc.assert(
      fc.property(fc.array(frameArb, { maxLength: 40 }), (frames) => {
        const lens = new LensUniforms();
        for (const { dt, ...inp } of frames) {
          const f = lens.frame(inp, dt);
          expect(f.strength).toBeGreaterThanOrEqual(0);
          expect(f.strength).toBeLessThanOrEqual(1);
          expect(Math.hypot(f.velocity.x, f.velocity.y)).toBeLessThanOrEqual(LENS.maxSpeed + 1e-9);
          expect(Math.hypot(f.blur.x, f.blur.y)).toBeLessThanOrEqual(LENS.maxBlur + 1e-9);
        }
        expect(run(lens, input({ touch: true }), LENS.releaseSeconds + 0.05).strength).toBe(0);
      }),
    );
  });
});

describe('LensUniforms — pointer motion', () => {
  it('follows the pointer smoothly (no jump, converges)', () => {
    const lens = new LensUniforms();
    run(lens, input({ aim: aim('a', 0.2, 0.5) }), 0.3);
    const f = lens.frame(input({ aim: aim('a', 0.8, 0.5) }), 1 / 60);
    expect(f.center.x).toBeGreaterThan(0.2);
    expect(f.center.x).toBeLessThan(0.8);
    expect(run(lens, input({ aim: aim('a', 0.8, 0.5) }), 1).center.x).toBeCloseTo(0.8, 3);
  });

  it('measures pointer velocity (uv per second), smoothed and capped', () => {
    const lens = new LensUniforms();
    lens.frame(input({ aim: aim('a', 0.1, 0.5) }), 1 / 60);
    let f = lens.frame(input({ aim: aim('a', 0.1, 0.5) }), 1 / 60);
    for (let i = 1; i <= 30; i++) f = lens.frame(input({ aim: aim('a', 0.1 + i * 0.005, 0.5) }), 1 / 60);
    expect(f.velocity.x).toBeGreaterThan(0.2);
    expect(f.velocity.x).toBeLessThan(0.31);
    expect(Math.abs(f.velocity.y)).toBeLessThan(1e-9);
    const fast = lens.frame(input({ aim: aim('a', 0.95, 0.5) }), 1 / 60);
    expect(Math.hypot(fast.velocity.x, fast.velocity.y)).toBeLessThanOrEqual(LENS.maxSpeed);
  });

  it('turns velocity into a blur streak along the motion; a still pointer gets the slow vertical pan of an ICM shot', () => {
    const lens = new LensUniforms();
    const still = run(lens, input({ aim: aim('a') }), 0.5);
    expect(still.blur).toEqual(LENS.idleBlur);
    for (let i = 1; i <= 20; i++) lens.frame(input({ aim: aim('a', 0.5 + i * 0.01, 0.5) }), 1 / 60);
    const moving = lens.frame(input({ aim: aim('a', 0.71, 0.5) }), 1 / 60);
    expect(moving.blur.x).toBeGreaterThan(0);
    expect(Math.abs(moving.blur.y)).toBeLessThan(1e-9);
  });

  it('does not measure velocity over a vanishingly short frame (no overflow)', () => {
    const lens = new LensUniforms();
    lens.frame(input({ aim: aim('a', 0.1, 0.5) }), 1 / 60);
    const f = lens.frame(input({ aim: aim('a', 0.9, 0.5) }), 5e-324);
    expect(f.velocity).toEqual({ x: 0, y: 0 });
  });

  it('lets velocity die down when the pointer leaves and ignores a zero frame time', () => {
    const lens = new LensUniforms();
    for (let i = 0; i <= 20; i++) lens.frame(input({ aim: aim('a', 0.2 + i * 0.01, 0.5) }), 1 / 60);
    const zero = lens.frame(input({ aim: aim('a', 0.9, 0.5) }), 0);
    expect(Number.isFinite(zero.velocity.x)).toBe(true);
    const later = run(lens, input({ touch: true }), 0.4);
    expect(Math.abs(later.velocity.x)).toBeLessThan(0.05);
  });
});

describe('LensUniforms.aimFrom', () => {
  it('prefers the work under the pointer, else the faced work centred when the keyboard asked for the lens', () => {
    expect(LensUniforms.aimFrom(aim('a', 0.1, 0.2), true, 'b')).toEqual(aim('a', 0.1, 0.2));
    expect(LensUniforms.aimFrom(null, true, 'b')).toEqual(aim('b', 0.5, 0.5));
    expect(LensUniforms.aimFrom(null, false, 'b')).toBeNull();
    expect(LensUniforms.aimFrom(null, true, null)).toBeNull();
  });
});

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { DriftController, DRIFT, type DriftInput, type DriftState } from '../../../src/world/core/DriftController.js';

const controller = new DriftController();
const still: DriftInput = { thrust: 0, turn: 0 };
const origin = controller.initial({ x: 0, z: 0, yaw: 0 });
const speedOf = (s: DriftState) => Math.hypot(s.vx, s.vz);

/** Runs `frames` steps of `dt` with the same input. */
function run(state: DriftState, input: DriftInput, frames: number, dt = 1 / 60): DriftState {
  let s = state;
  for (let i = 0; i < frames; i++) s = controller.step(s, input, dt);
  return s;
}

describe('DriftController.step', () => {
  it('stays still without input', () => {
    expect(run(origin, still, 60)).toEqual(origin);
  });

  it('moves forward (towards -z at yaw 0) on thrust and keeps drifting afterwards (inertia)', () => {
    const pushed = controller.step(origin, { thrust: 2, turn: 0 }, 1 / 60);
    expect(pushed.z).toBeLessThan(0);
    expect(pushed.x).toBeCloseTo(0, 10);
    const later = run(pushed, still, 30);
    expect(later.z).toBeLessThan(pushed.z);
  });

  it('slows down exponentially once input stops (inertia decay)', () => {
    const pushed = controller.step(origin, { thrust: 3, turn: 0 }, 1 / 60);
    const after1s = run(pushed, still, 60);
    // One time constant later the speed is ~1/e of what it was.
    expect(speedOf(after1s) / speedOf(pushed)).toBeCloseTo(Math.exp(-1 / DRIFT.decaySeconds), 2);
    expect(speedOf(run(pushed, still, 60 * 20))).toBeLessThan(1e-3);
  });

  it('turns on turn input, heading changing the direction of travel', () => {
    const turned = run(origin, { thrust: 0, turn: 0.5 }, 30);
    expect(turned.yaw).toBeGreaterThan(0);
    const moved = controller.step({ ...turned, vx: 0, vz: 0, vyaw: 0 }, { thrust: 2, turn: 0 }, 1 / 60);
    // Forward is (-sin yaw, -cos yaw): a positive yaw drifts towards -x.
    expect(moved.x).toBeLessThan(turned.x);
  });

  it('clamps the speed however hard the visitor scrolls', () => {
    const s = controller.step(origin, { thrust: 1e6, turn: 1e6 }, 1 / 60);
    // Clamped to the maximum, then one frame of inertia decay.
    const oneFrame = Math.exp(-1 / 60 / DRIFT.decaySeconds);
    expect(speedOf(s)).toBeCloseTo(DRIFT.maxSpeed * oneFrame, 9);
    expect(s.vyaw).toBeCloseTo(DRIFT.maxYawSpeed * oneFrame, 9);
    // The frame moved the camera by at most maxSpeed × dt.
    expect(Math.hypot(s.x, s.z)).toBeLessThanOrEqual(DRIFT.maxSpeed / 60 + 1e-12);
  });

  it('caps a long frame (tab in the background) so the camera never jumps', () => {
    const fast = { ...origin, vz: -DRIFT.maxSpeed };
    const s = controller.step(fast, still, 5);
    expect(Math.abs(s.z)).toBeLessThanOrEqual(DRIFT.maxSpeed * DRIFT.maxFrameSeconds + 1e-9);
  });

  const input = fc.record({ thrust: fc.double({ min: -1e4, max: 1e4, noNaN: true }), turn: fc.double({ min: -1e3, max: 1e3, noNaN: true }) });
  const dt = fc.double({ min: 0, max: 2, noNaN: true });

  it('property: speed and turn rate never exceed the clamp', () => {
    fc.assert(
      fc.property(fc.array(fc.tuple(input, dt), { minLength: 1, maxLength: 40 }), (frames) => {
        let s = origin;
        for (const [i, d] of frames) {
          s = controller.step(s, i, d);
          expect(speedOf(s)).toBeLessThanOrEqual(DRIFT.maxSpeed + 1e-9);
          expect(Math.abs(s.vyaw)).toBeLessThanOrEqual(DRIFT.maxYawSpeed + 1e-9);
        }
      }),
    );
  });

  it('property: without input the speed never grows', () => {
    fc.assert(
      fc.property(input, fc.array(dt, { minLength: 1, maxLength: 20 }), (push, dts) => {
        let s = controller.step(origin, push, 1 / 60);
        for (const d of dts) {
          const next = controller.step(s, still, d);
          expect(speedOf(next)).toBeLessThanOrEqual(speedOf(s) + 1e-12);
          expect(Math.abs(next.vyaw)).toBeLessThanOrEqual(Math.abs(s.vyaw) + 1e-12);
          s = next;
        }
      }),
    );
  });
});

describe('DriftController focus (keyboard and deep links)', () => {
  const work = { x: 10, z: -20 };

  it('computes a viewing pose in front of a work, facing it, on the side the visitor comes from', () => {
    const pose = controller.viewPoseFor(origin, work);
    expect(Math.hypot(pose.x - work.x, pose.z - work.z)).toBeCloseTo(DRIFT.viewDistance, 9);
    // Facing the work: forward (-sin yaw, -cos yaw) points from the pose to the work.
    const fx = -Math.sin(pose.yaw);
    const fz = -Math.cos(pose.yaw);
    expect(fx).toBeCloseTo((work.x - pose.x) / DRIFT.viewDistance, 9);
    expect(fz).toBeCloseTo((work.z - pose.z) / DRIFT.viewDistance, 9);
    expect(Math.hypot(pose.x, pose.z)).toBeLessThan(Math.hypot(work.x, work.z));
  });

  it('looks down the path when the visitor stands exactly on the work', () => {
    const pose = controller.viewPoseFor(controller.initial({ ...work, yaw: 1 }), work);
    expect(pose).toEqual({ x: work.x, z: work.z + DRIFT.viewDistance, yaw: 0 });
  });

  it('glides to the target pose and stops there', () => {
    const pose = controller.viewPoseFor(origin, work);
    const arrived = run(controller.focus(origin, pose), still, 60 * 10);
    expect(arrived.x).toBeCloseTo(pose.x, 3);
    expect(arrived.z).toBeCloseTo(pose.z, 3);
    expect(arrived.yaw).toBeCloseTo(pose.yaw, 3);
    expect(arrived.target).toBeNull();
    expect(speedOf(arrived)).toBe(0);
  });

  it('turns the short way round', () => {
    const facingBack = controller.initial({ x: 0, z: 0, yaw: 3 });
    const s = controller.step(controller.focus(facingBack, { x: 0, z: 0, yaw: -3 }), still, 1 / 60);
    expect(s.yaw).toBeGreaterThan(3);
  });

  it('gives control back as soon as the visitor drifts', () => {
    const focused = controller.focus(origin, controller.viewPoseFor(origin, work));
    expect(controller.step(focused, { thrust: 1, turn: 0 }, 1 / 60).target).toBeNull();
    expect(controller.step(focused, { thrust: 0, turn: 1 }, 1 / 60).target).toBeNull();
  });

  it('jumps straight to a pose (deep link start)', () => {
    const pose = { x: 3, z: -4, yaw: 0.5 };
    expect(controller.initial(pose)).toEqual({ ...pose, vx: 0, vz: 0, vyaw: 0, target: null });
  });
});

describe('DriftController.cycle (Tab / Shift+Tab)', () => {
  const works = [
    { slug: 'a', x: 0, z: -10 },
    { slug: 'b', x: 2, z: -20 },
    { slug: 'c', x: -1, z: -30 },
  ];
  const near = (z: number) => controller.initial({ x: 0, z, yaw: 0 });

  it('starts with the nearest work', () => {
    expect(controller.cycle(near(-19), works, null, 1)).toBe('b');
    expect(controller.cycle(near(5), works, null, -1)).toBe('a');
  });

  it('then follows the path forwards and backwards, wrapping around', () => {
    expect(controller.cycle(near(0), works, 'a', 1)).toBe('b');
    expect(controller.cycle(near(0), works, 'c', 1)).toBe('a');
    expect(controller.cycle(near(0), works, 'a', -1)).toBe('c');
  });

  it('falls back to the nearest work when the current one is unknown', () => {
    expect(controller.cycle(near(-31), works, 'gone', 1)).toBe('c');
  });

  it('returns null when there is nothing to visit', () => {
    expect(controller.cycle(near(0), [], null, 1)).toBeNull();
  });

  it('property: always returns one of the works', () => {
    fc.assert(
      fc.property(fc.double({ min: -100, max: 100, noNaN: true }), fc.constantFrom(null, 'a', 'b', 'c', 'x'), fc.constantFrom(1 as const, -1 as const), (z, current, dir) => {
        expect(['a', 'b', 'c']).toContain(controller.cycle(near(z), works, current, dir));
      }),
    );
  });
});

describe('DriftController.shortestAngle', () => {
  it('maps a half turn either way to +π', () => {
    expect(DriftController.shortestAngle(Math.PI)).toBe(Math.PI);
    expect(DriftController.shortestAngle(-Math.PI)).toBe(Math.PI);
    expect(DriftController.shortestAngle(0.5)).toBe(0.5);
    expect(DriftController.shortestAngle(2 * Math.PI + 0.5)).toBeCloseTo(0.5, 12);
  });

  it('property: lands in (−π, π] and differs by whole turns', () => {
    fc.assert(
      fc.property(fc.double({ min: -1e3, max: 1e3, noNaN: true }), (a) => {
        const w = DriftController.shortestAngle(a);
        expect(w).toBeGreaterThan(-Math.PI);
        expect(w).toBeLessThanOrEqual(Math.PI);
        const turns = (a - w) / (2 * Math.PI);
        expect(Math.abs(turns - Math.round(turns))).toBeLessThan(1e-9);
      }),
    );
  });
});

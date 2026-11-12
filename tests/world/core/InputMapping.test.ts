import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { InputMapping, INPUT } from '../../../src/world/core/InputMapping.js';
import { InputAccumulator } from '../../../src/world/core/InputAccumulator.js';

describe('InputMapping', () => {
  it('scrolling down drifts forward, scrolling up drifts back', () => {
    expect(InputMapping.wheel(100, 0)).toEqual({ thrust: 100 * INPUT.wheelThrustPerPixel, turn: 0 });
    expect(InputMapping.wheel(-100, 0).thrust).toBeLessThan(0);
  });

  it('reads line and page wheel deltas as pixels', () => {
    expect(InputMapping.wheel(3, 1).thrust).toBeCloseTo(InputMapping.wheel(3 * 16, 0).thrust, 12);
    expect(InputMapping.wheel(1, 2).thrust).toBeCloseTo(InputMapping.wheel(800, 0).thrust, 12);
  });

  it('dragging pulls the world: right turns left (positive yaw), up drifts forward', () => {
    const d = InputMapping.drag(10, -20);
    expect(d.turn).toBeGreaterThan(0);
    expect(d.thrust).toBeGreaterThan(0);
    expect(InputMapping.drag(-10, 20).turn).toBeLessThan(0);
  });

  it('held arrow keys (and WASD) push continuously, scaled by frame time', () => {
    const keys = new Set(['ArrowUp', 'ArrowLeft']);
    expect(InputMapping.keys(keys, 0.5)).toEqual({ thrust: INPUT.keyThrustPerSecond * 0.5, turn: INPUT.keyTurnPerSecond * 0.5 });
    expect(InputMapping.keys(new Set(['s', 'd']), 1)).toEqual({ thrust: -INPUT.keyThrustPerSecond, turn: -INPUT.keyTurnPerSecond });
    expect(InputMapping.keys(new Set(['ArrowUp', 'ArrowDown']), 1)).toEqual({ thrust: 0, turn: 0 });
    expect(InputMapping.keys(new Set(['x']), 1)).toEqual({ thrust: 0, turn: 0 });
  });

  it('knows which keys are drift keys', () => {
    expect(InputMapping.isDriftKey('ArrowRight')).toBe(true);
    expect(InputMapping.isDriftKey('W')).toBe(true);
    expect(InputMapping.isDriftKey('Tab')).toBe(false);
  });

  it('tilting the phone: left/right turns, forward from where it started drifts forward', () => {
    expect(InputMapping.tilt({ beta: 60, gamma: 0 }, 60, 1)).toEqual({ thrust: 0, turn: 0 });
    const t = InputMapping.tilt({ beta: 40, gamma: -30 }, 60, 1);
    expect(t.thrust).toBeGreaterThan(0);
    expect(t.turn).toBeGreaterThan(0);
  });

  it('ignores small tilts (dead zone) and missing readings', () => {
    expect(InputMapping.tilt({ beta: 60 + INPUT.tiltDeadZone - 0.1, gamma: INPUT.tiltDeadZone - 0.1 }, 60, 1)).toEqual({ thrust: 0, turn: 0 });
    expect(InputMapping.tilt({ beta: null, gamma: null }, 60, 1)).toEqual({ thrust: 0, turn: 0 });
  });

  it('property: tilt impulses grow with the tilt and keep its sign', () => {
    fc.assert(
      fc.property(fc.double({ min: -90, max: 90, noNaN: true }), fc.double({ min: -90, max: 90, noNaN: true }), (g1, g2) => {
        const a = InputMapping.tilt({ beta: 60, gamma: g1 }, 60, 1).turn;
        const b = InputMapping.tilt({ beta: 60, gamma: g2 }, 60, 1).turn;
        if (Math.abs(g1) <= Math.abs(g2) && Math.sign(g1) === Math.sign(g2)) expect(Math.abs(a)).toBeLessThanOrEqual(Math.abs(b));
        expect(a === 0 || Math.sign(a) === -Math.sign(g1)).toBe(true);
      }),
    );
  });
});

describe('InputAccumulator', () => {
  it('sums impulses until the frame drains them', () => {
    const acc = new InputAccumulator();
    acc.add({ thrust: 1, turn: 0.5 });
    acc.add({ thrust: 2, turn: -0.25 });
    expect(acc.drain()).toEqual({ thrust: 3, turn: 0.25 });
    expect(acc.drain()).toEqual({ thrust: 0, turn: 0 });
  });

  it('property: draining returns the sum of everything added', () => {
    const impulse = fc.record({ thrust: fc.integer({ min: -100, max: 100 }), turn: fc.integer({ min: -100, max: 100 }) });
    fc.assert(
      fc.property(fc.array(impulse), (impulses) => {
        const acc = new InputAccumulator();
        impulses.forEach((i) => acc.add(i));
        expect(acc.drain()).toEqual({
          thrust: impulses.reduce((s, i) => s + i.thrust, 0),
          turn: impulses.reduce((s, i) => s + i.turn, 0),
        });
      }),
    );
  });
});

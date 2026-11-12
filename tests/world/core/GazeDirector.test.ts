import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { GAZE, GazeDirector, type GazeInput } from '../../../src/world/core/GazeDirector.js';
import { MemoryStorage } from '../memoryStorage.js';

const DT = 1 / 60;
const over = (slug: string, x = 0.8, y = 0.5): GazeInput => ({ hovered: { slug, uv: { x, y } }, drifting: true });
const away: GazeInput = { hovered: null, drifting: true };
const never = () => 1;
const always = () => 0;

/** Runs `seconds` of frames with the same input (a fake clock: time is only what `dt` says). */
function run(g: GazeDirector, input: GazeInput, seconds: number, dt = DT) {
  let last = g.frame(input, dt);
  let starts = last.lineStarted ? 1 : 0;
  for (let t = dt; t < seconds; t += dt) {
    last = g.frame(input, dt);
    if (last.lineStarted) starts++;
  }
  return { last, starts };
}

describe('GazeDirector — the apparition turns toward a lingering pointer', () => {
  it('does nothing before the pointer has dwelt 2 s on a work', () => {
    const g = new GazeDirector(new MemoryStorage(), never);
    const { last } = run(g, over('arrivee'), GAZE.dwellSeconds - 0.1);
    expect(last.turns).toEqual([]);
  });

  it('turns the work slightly toward the pointer side after 2 s, never past the bound', () => {
    const g = new GazeDirector(new MemoryStorage(), never);
    const { last } = run(g, over('arrivee', 1, 1), GAZE.dwellSeconds + 5);
    expect(last.turns).toHaveLength(1);
    const [turn] = last.turns;
    expect(turn.slug).toBe('arrivee');
    expect(turn.yaw).toBeGreaterThan(GAZE.maxYaw * 0.95);
    expect(turn.yaw).toBeLessThanOrEqual(GAZE.maxYaw);
    expect(turn.pitch).toBeGreaterThan(GAZE.maxPitch * 0.95);
    expect(turn.pitch).toBeLessThanOrEqual(GAZE.maxPitch);
  });

  it('turns the other way for a pointer on the other side', () => {
    const g = new GazeDirector(new MemoryStorage(), never);
    const { last } = run(g, over('arrivee', 0, 0), GAZE.dwellSeconds + 5);
    expect(last.turns[0].yaw).toBeLessThan(0);
    expect(last.turns[0].pitch).toBeLessThan(0);
  });

  it('eases back to rest when the pointer leaves, then drops the work from the list', () => {
    const g = new GazeDirector(new MemoryStorage(), never);
    run(g, over('arrivee'), GAZE.dwellSeconds + 3);
    const soon = g.frame(away, DT);
    expect(soon.turns[0].yaw).toBeGreaterThan(0);
    const { last } = run(g, away, 10);
    expect(last.turns).toEqual([]);
  });

  it('starts the dwell over when the pointer moves to another work', () => {
    const g = new GazeDirector(new MemoryStorage(), never);
    run(g, over('arrivee'), GAZE.dwellSeconds - 0.5);
    const { last } = run(g, over('solitude'), GAZE.dwellSeconds - 0.5);
    expect(last.turns).toEqual([]);
  });

  it('holds still while the visitor is not drifting (threshold up or a work open)', () => {
    const g = new GazeDirector(new MemoryStorage(), never);
    const { last } = run(g, { ...over('arrivee'), drifting: false }, GAZE.dwellSeconds + 3);
    expect(last.turns).toEqual([]);
  });

  it('property: every turn stays within its bounds, whatever the pointer does', () => {
    const step = fc.record({
      slug: fc.constantFrom(null, 'a', 'b'),
      x: fc.double({ min: -1, max: 2, noNaN: true }),
      y: fc.double({ min: -1, max: 2, noNaN: true }),
      dt: fc.double({ min: 0, max: 3, noNaN: true }),
    });
    fc.assert(
      fc.property(fc.array(step, { maxLength: 80 }), (steps) => {
        const g = new GazeDirector(new MemoryStorage(), never);
        for (const s of steps) {
          const f = g.frame({ hovered: s.slug ? { slug: s.slug, uv: { x: s.x, y: s.y } } : null, drifting: true }, s.dt);
          for (const t of f.turns) {
            expect(Math.abs(t.yaw)).toBeLessThanOrEqual(GAZE.maxYaw);
            expect(Math.abs(t.pitch)).toBeLessThanOrEqual(GAZE.maxPitch);
          }
        }
      }),
    );
  });
});

describe('GazeDirector — the gaze line, at most once per session after 3 minutes of drift', () => {
  it('never shows before 3 minutes of drift, even with certain luck', () => {
    const g = new GazeDirector(new MemoryStorage(), always);
    expect(run(g, away, GAZE.lineAfterSeconds - 1, 0.5).starts).toBe(0);
  });

  it('counts only drifting time toward the 3 minutes', () => {
    const g = new GazeDirector(new MemoryStorage(), always);
    expect(run(g, { hovered: null, drifting: false }, GAZE.lineAfterSeconds + 60, 0.5).starts).toBe(0);
  });

  it('shows once after 3 minutes, fades in, holds, fades out, and remembers it for the session', () => {
    const session = new MemoryStorage();
    const g = new GazeDirector(session, always);
    run(g, away, GAZE.lineAfterSeconds - 0.5, 0.5);
    const start = g.frame(away, 0.5);
    expect(start.lineStarted).toBe(true);
    expect(session.items.get(GazeDirector.SESSION_KEY)).toBe('shown');
    expect(start.lineOpacity).toBe(0);
    expect(g.frame(away, GAZE.lineFadeInSeconds).lineOpacity).toBe(1);
    expect(g.frame(away, GAZE.lineHoldSeconds / 2).lineOpacity).toBe(1);
    expect(g.frame(away, GAZE.lineHoldSeconds / 2 + GAZE.lineFadeOutSeconds / 2).lineOpacity).toBeCloseTo(0.5, 5);
    const done = run(g, away, 600, 0.5);
    expect(done.starts).toBe(0);
    expect(done.last.lineOpacity).toBe(0);
  });

  it('is rare: with luck that never comes, nothing shows', () => {
    const g = new GazeDirector(new MemoryStorage(), never);
    expect(run(g, away, 3600, 0.5).starts).toBe(0);
  });

  it('draws its luck per frame with a chance that grows with the frame time', () => {
    const draws: number[] = [];
    const g = new GazeDirector(new MemoryStorage(), () => {
      draws.push(0);
      return 0.999;
    });
    run(g, away, GAZE.lineAfterSeconds + 2, 1);
    expect(draws.length).toBeGreaterThan(0);
    expect(GazeDirector.chance(1)).toBeCloseTo(1 - Math.exp(-1 / GAZE.lineMeanWaitSeconds), 10);
    expect(GazeDirector.chance(0)).toBe(0);
  });

  it('does not show again in the same session, even in a new world (Wake up, then Drift)', () => {
    const session = new MemoryStorage();
    expect(run(new GazeDirector(session, always), away, GAZE.lineAfterSeconds + 1, 0.5).starts).toBe(1);
    expect(run(new GazeDirector(session, always), away, GAZE.lineAfterSeconds * 3, 0.5).starts).toBe(0);
  });

  it('still shows at most once per page when sessionStorage is blocked', () => {
    const g = new GazeDirector(null, always);
    expect(run(g, away, GAZE.lineAfterSeconds * 3, 0.5).starts).toBe(1);
  });

  it('property: never more than one gaze line per session after the threshold', () => {
    const visit = fc.array(fc.record({ dt: fc.double({ min: 0, max: 30, noNaN: true }), drifting: fc.boolean(), luck: fc.double({ min: 0, max: 1, noNaN: true }) }), { maxLength: 200 });
    fc.assert(
      fc.property(fc.array(visit, { minLength: 1, maxLength: 4 }), (visits) => {
        const session = new MemoryStorage();
        let starts = 0;
        for (const steps of visits) {
          let i = 0;
          const g = new GazeDirector(session, () => steps[Math.min(i, steps.length - 1)]?.luck ?? 1);
          for (const s of steps) {
            i++;
            const f = g.frame({ hovered: null, drifting: s.drifting }, s.dt);
            if (f.lineStarted) starts++;
            expect(f.lineOpacity).toBeGreaterThanOrEqual(0);
            expect(f.lineOpacity).toBeLessThanOrEqual(1);
          }
        }
        expect(starts).toBeLessThanOrEqual(1);
      }),
    );
  });
});

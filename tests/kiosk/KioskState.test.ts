import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { KIOSK, KioskState } from '../../src/kiosk/KioskState.js';

const T0 = 1_000_000;

describe('KioskState — cursor', () => {
  it('shows the cursor after input and hides it after 5 s without input', () => {
    const k = new KioskState(T0);
    k.input(T0);
    expect(k.tick(T0 + 4_999).cursorHidden).toBe(false);
    expect(k.tick(T0 + KIOSK.cursorHideMs).cursorHidden).toBe(true);
    k.input(T0 + 6_000);
    expect(k.tick(T0 + 6_001).cursorHidden).toBe(false);
  });

  it('starts with the cursor visible, hiding it 5 s after the page opened', () => {
    const k = new KioskState(T0);
    expect(k.tick(T0).cursorHidden).toBe(false);
    expect(k.tick(T0 + 5_000).cursorHidden).toBe(true);
  });
});

describe('KioskState — idle reset', () => {
  it('resets once, 90 s after the last input', () => {
    const k = new KioskState(T0);
    k.input(T0 + 1_000);
    expect(k.tick(T0 + 1_000 + 89_999).reset).toBe(false);
    expect(k.tick(T0 + 1_000 + KIOSK.idleResetMs).reset).toBe(true);
    expect(k.tick(T0 + 1_000 + 200_000).reset).toBe(false);
  });

  it('does not reset a screen nobody touched (it is already in its start state)', () => {
    const k = new KioskState(T0);
    expect(k.tick(T0 + 10 * KIOSK.idleResetMs).reset).toBe(false);
  });

  it('input before 90 s postpones the reset', () => {
    const k = new KioskState(T0);
    k.input(T0);
    k.input(T0 + 80_000);
    expect(k.tick(T0 + 120_000).reset).toBe(false);
    expect(k.tick(T0 + 170_000).reset).toBe(true);
  });

  it('a clock that goes back counts as no idle time', () => {
    const k = new KioskState(T0);
    k.input(T0);
    expect(k.tick(T0 - 100_000)).toEqual({ cursorHidden: false, reset: false, advance: false });
  });
});

describe('KioskState — auto-drift', () => {
  it('moves to the next work after 10 s without input, then every 12 s', () => {
    const k = new KioskState(T0);
    expect(k.tick(T0 + KIOSK.autoDriftAfterMs - 1).advance).toBe(false);
    expect(k.tick(T0 + KIOSK.autoDriftAfterMs).advance).toBe(true);
    expect(k.tick(T0 + KIOSK.autoDriftAfterMs + 1_000).advance).toBe(false);
    expect(k.tick(T0 + KIOSK.autoDriftAfterMs + KIOSK.autoDriftEveryMs).advance).toBe(true);
  });

  it('pauses while someone uses the screen and resumes 10 s after them', () => {
    const k = new KioskState(T0);
    expect(k.tick(T0 + 10_000).advance).toBe(true);
    k.input(T0 + 11_000);
    expect(k.tick(T0 + 20_000).advance).toBe(false);
    expect(k.tick(T0 + 21_000).advance).toBe(true);
  });
});

describe('KioskState — properties', () => {
  it('property: never resets before 90 s of idle time, at most once per idle period; the cursor is hidden exactly from 5 s', () => {
    const event = fc.record({ dt: fc.integer({ min: 0, max: 40_000 }), input: fc.boolean() });
    fc.assert(
      fc.property(fc.array(event, { maxLength: 60 }), (events) => {
        const k = new KioskState(T0);
        let now = T0;
        let lastInput = T0;
        let resetsThisIdle = 0;
        for (const e of events) {
          now += e.dt;
          if (e.input) {
            k.input(now);
            lastInput = now;
            resetsThisIdle = 0;
            continue;
          }
          const t = k.tick(now);
          expect(t.cursorHidden).toBe(now - lastInput >= KIOSK.cursorHideMs);
          if (t.reset) {
            expect(now - lastInput).toBeGreaterThanOrEqual(KIOSK.idleResetMs);
            resetsThisIdle++;
          }
          expect(resetsThisIdle).toBeLessThanOrEqual(1);
          if (t.advance) expect(now - lastInput).toBeGreaterThanOrEqual(KIOSK.autoDriftAfterMs);
        }
      }),
    );
  });
});

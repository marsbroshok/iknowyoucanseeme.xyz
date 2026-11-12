import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { THRESHOLD, ThresholdState, type EnteredDetail, type ThresholdContext } from '../../../src/world/core/ThresholdState.js';

const first: ThresholdContext = { returning: false, deepLink: false, soundOn: false };

function machine(ctx: ThresholdContext = first) {
  const entered: EnteredDetail[] = [];
  const state = new ThresholdState(ctx, (d) => entered.push(d));
  return { state, entered };
}

describe('ThresholdState — plan', () => {
  it('gives a first visit the full threshold: a click on Enter is needed, nothing enters by itself', () => {
    const { state } = machine();
    expect(state.kind).toBe('full');
    expect(state.needsClick).toBe(true);
    expect(state.autoEnterSeconds).toBeNull();
    expect(state.leaveSeconds).toBe(THRESHOLD.fullLeaveSeconds);
  });

  it('gives a returning visitor the short threshold: it fades by itself after 1 s while sound is off', () => {
    const { state } = machine({ ...first, returning: true });
    expect(state.kind).toBe('short');
    expect(state.needsClick).toBe(false);
    expect(state.autoEnterSeconds).toBe(0);
    expect(state.leaveSeconds).toBe(1);
  });

  it('still asks a returning visitor for a click when sound is on (the click unlocks audio)', () => {
    const { state } = machine({ ...first, returning: true, soundOn: true });
    expect(state.kind).toBe('short');
    expect(state.needsClick).toBe(true);
    expect(state.autoEnterSeconds).toBeNull();
  });

  it('treats a deep link (?w=, a QR label) like a return: short threshold', () => {
    expect(machine({ ...first, deepLink: true }).state.kind).toBe('short');
  });
});

describe('ThresholdState — transitions', () => {
  it('goes hidden → shown → leaving → gone, and emits "entered" once with the gesture', () => {
    const { state, entered } = machine();
    expect(state.phase).toBe('hidden');
    expect(state.enter(true)).toBe(false);
    state.show();
    expect(state.phase).toBe('shown');
    expect(state.enter(true)).toBe(true);
    expect(state.phase).toBe('leaving');
    expect(entered).toEqual([{ gesture: true, returning: false }]);
    expect(state.enter(true)).toBe(false);
    state.finish();
    expect(state.phase).toBe('gone');
    expect(entered).toHaveLength(1);
  });

  it('auto-enters a short threshold without a gesture', () => {
    const { state, entered } = machine({ ...first, returning: true });
    state.show();
    expect(state.enter(false)).toBe(true);
    expect(entered).toEqual([{ gesture: false, returning: true }]);
  });

  it('refuses an automatic entry when a click is needed', () => {
    const { state, entered } = machine();
    state.show();
    expect(state.enter(false)).toBe(false);
    expect(state.phase).toBe('shown');
    expect(entered).toEqual([]);
  });

  it('can be entered directly from hidden by "Drift" (a gesture), skipping the screen', () => {
    const { state, entered } = machine();
    state.skip();
    expect(state.phase).toBe('gone');
    expect(entered).toEqual([{ gesture: true, returning: false }]);
    state.skip();
    expect(entered).toHaveLength(1);
  });

  it('show() and finish() are ignored out of order', () => {
    const { state } = machine();
    state.finish();
    expect(state.phase).toBe('hidden');
    state.show();
    state.show();
    expect(state.phase).toBe('shown');
    state.finish();
    expect(state.phase).toBe('shown');
  });

  it('property: "entered" is emitted at most once, whatever the sequence of calls', () => {
    const call = fc.constantFrom('show', 'click', 'auto', 'finish', 'skip');
    fc.assert(
      fc.property(fc.record({ returning: fc.boolean(), deepLink: fc.boolean(), soundOn: fc.boolean() }), fc.array(call, { maxLength: 20 }), (ctx, calls) => {
        const { state, entered } = machine(ctx);
        for (const c of calls) {
          if (c === 'show') state.show();
          else if (c === 'click') state.enter(true);
          else if (c === 'auto') state.enter(false);
          else if (c === 'finish') state.finish();
          else state.skip();
        }
        expect(entered.length).toBeLessThanOrEqual(1);
        if (entered.length === 0) expect(['hidden', 'shown']).toContain(state.phase);
        else expect(['leaving', 'gone']).toContain(state.phase);
      }),
    );
  });
});

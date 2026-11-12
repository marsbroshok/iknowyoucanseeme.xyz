// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ThresholdOverlay } from '../../../src/world/island/ThresholdOverlay.js';
import { THRESHOLD, ThresholdState, type EnteredDetail, type ThresholdContext } from '../../../src/world/core/ThresholdState.js';

const first: ThresholdContext = { returning: false, deepLink: false, soundOn: false };
const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;

function overlay(ctx: ThresholdContext = first) {
  const entered: EnteredDetail[] = [];
  const state = new ThresholdState(ctx, (d) => entered.push(d));
  const o = new ThresholdOverlay($('[data-drift]'), state, window);
  return { o, state, entered };
}

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = `
    <section data-drift tabindex="-1">
      <canvas data-drift-canvas></canvas>
      <div class="drift-top"><button data-drift-wake>Wake up</button></div>
      <ul data-drift-works><li><button>Work</button></li></ul>
      <p data-already inert></p>
      <div data-threshold hidden><p>I know you can see me</p><button data-threshold-enter hidden>Enter</button></div>
    </section>`;
});
afterEach(() => {
  vi.useRealTimers();
});

describe('ThresholdOverlay — first visit (full threshold)', () => {
  it('shows the line and Enter, focuses Enter, and holds the world', () => {
    const { o } = overlay();
    o.show();
    expect($('[data-threshold]').hidden).toBe(false);
    expect($('[data-threshold]').dataset.kind).toBe('full');
    expect($('[data-threshold]').dataset.phase).toBe('shown');
    expect($('[data-threshold-enter]').hidden).toBe(false);
    expect(document.activeElement).toBe($('[data-threshold-enter]'));
    expect(o.holding).toBe(true);
    expect(o.visible).toBe(true);
  });

  it('makes the world behind it inert, but never "Wake up"', () => {
    const { o } = overlay();
    o.show();
    expect($('[data-drift-canvas]').hasAttribute('inert')).toBe(true);
    expect($('[data-drift-works]').hasAttribute('inert')).toBe(true);
    expect($('.drift-top').hasAttribute('inert')).toBe(false);
    expect($('[data-threshold]').hasAttribute('inert')).toBe(false);
  });

  it('never enters by itself', () => {
    const { o, entered } = overlay();
    o.show();
    vi.advanceTimersByTime(60_000);
    expect(entered).toEqual([]);
    expect(o.holding).toBe(true);
  });

  it('Enter (click or keyboard activation) enters with a gesture, fades, then hides; focus goes to the world', () => {
    const { o, entered } = overlay();
    o.show();
    $('[data-threshold-enter]').click();
    $('[data-threshold-enter]').click();
    expect(entered).toEqual([{ gesture: true, returning: false }]);
    expect($('[data-threshold]').dataset.phase).toBe('leaving');
    expect(o.holding).toBe(false);
    expect(o.visible).toBe(true);
    expect(document.activeElement).toBe($('[data-drift]'));
    expect($('[data-drift-canvas]').hasAttribute('inert')).toBe(false);
    expect($('[data-already]').hasAttribute('inert')).toBe(true);
    vi.advanceTimersByTime(THRESHOLD.fullLeaveSeconds * 1000);
    expect($('[data-threshold]').hidden).toBe(true);
    expect($('[data-threshold]').dataset.phase).toBe('gone');
    expect(o.visible).toBe(false);
  });
});

describe('ThresholdOverlay — returning visit (short threshold)', () => {
  it('shows the line without Enter, does not take focus, and fades by itself within 1 s', () => {
    const { o, entered } = overlay({ ...first, returning: true });
    $('[data-drift]').focus();
    o.show();
    expect($('[data-threshold]').dataset.kind).toBe('short');
    expect($('[data-threshold-enter]').hidden).toBe(true);
    expect(document.activeElement).toBe($('[data-drift]'));
    expect($('[data-drift-canvas]').hasAttribute('inert')).toBe(false);
    vi.advanceTimersByTime(0);
    expect(entered).toEqual([{ gesture: false, returning: true }]);
    expect($('[data-threshold]').dataset.phase).toBe('leaving');
    vi.advanceTimersByTime(THRESHOLD.shortLeaveSeconds * 1000);
    expect($('[data-threshold]').hidden).toBe(true);
  });

  it('still needs Enter when sound is on', () => {
    const { o, entered } = overlay({ ...first, returning: true, soundOn: true });
    o.show();
    vi.advanceTimersByTime(10_000);
    expect(entered).toEqual([]);
    expect($('[data-threshold-enter]').hidden).toBe(false);
  });
});

describe('ThresholdOverlay — leaving without entering', () => {
  it('skip() ("Drift" pressed) enters at once without showing anything', () => {
    const { o, entered } = overlay();
    o.skip();
    expect(entered).toEqual([{ gesture: true, returning: false }]);
    expect($('[data-threshold]').hidden).toBe(true);
    expect(o.visible).toBe(false);
  });

  it('dismiss() ("Wake up" on the threshold) hides it, emits nothing, cancels timers and gives the world back its parts', () => {
    const { o, entered } = overlay({ ...first, returning: true });
    o.show();
    o.dismiss();
    expect(o.visible).toBe(false);
    expect(o.holding).toBe(false);
    vi.advanceTimersByTime(5000);
    expect(entered).toEqual([]);
    expect($('[data-threshold]').hidden).toBe(true);
    expect($('[data-drift-canvas]').hasAttribute('inert')).toBe(false);
    expect($('[data-already]').hasAttribute('inert')).toBe(true);
  });

  it('dismiss() during the fade cancels the hide timer and Enter no longer listens', () => {
    const { o, entered } = overlay();
    o.show();
    $('[data-threshold-enter]').click();
    o.dismiss();
    vi.advanceTimersByTime(5000);
    $('[data-threshold-enter]').click();
    expect(entered).toHaveLength(1);
    expect($('[data-threshold]').hidden).toBe(true);
  });

  it('reports a page without its threshold or without Enter', () => {
    document.querySelector('[data-threshold-enter]')?.remove();
    expect(() => overlay()).toThrow('[drift] Missing [data-threshold-enter] in the threshold');
    document.querySelector('[data-threshold]')?.remove();
    expect(() => overlay()).toThrow('[drift] Missing [data-threshold] in the world layer');
  });
});

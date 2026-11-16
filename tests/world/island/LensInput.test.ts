// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LensInput, LONG_PRESS_MS } from '../../../src/world/island/input/LensInput.js';

let layer: HTMLElement;
let canvas: HTMLElement;
let cycles: number;
let input: LensInput;

/** A pointer event (jsdom has no PointerEvent constructor with all fields). */
function pointer(type: string, init: { x?: number; y?: number; id?: number; kind?: string; t?: number }, target: EventTarget = canvas): void {
  const event = new MouseEvent(type, { clientX: init.x ?? 0, clientY: init.y ?? 0, bubbles: true, button: 0 });
  Object.defineProperty(event, 'pointerId', { value: init.id ?? 1 });
  Object.defineProperty(event, 'pointerType', { value: init.kind ?? 'mouse' });
  if (init.t !== undefined) Object.defineProperty(event, 'timeStamp', { value: init.t });
  target.dispatchEvent(event);
}
const key = (type: 'keydown' | 'keyup', k: string, target: EventTarget = layer) => {
  const event = new KeyboardEvent(type, { key: k, bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
};

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = '<div id="layer" tabindex="-1"><canvas id="c"></canvas><dialog id="d"><a href="#">x</a></dialog><input id="i"></div>';
  layer = document.getElementById('layer') as HTMLElement;
  canvas = document.getElementById('c') as HTMLElement;
  canvas.getBoundingClientRect = () => ({ left: 100, top: 50, width: 400, height: 200, right: 500, bottom: 250, x: 100, y: 50, toJSON: () => ({}) });
  cycles = 0;
  input = new LensInput(canvas, layer, () => cycles++);
});
afterEach(() => {
  input.detach();
  vi.useRealTimers();
});

describe('LensInput — pointer', () => {
  it('starts with no pointer and nothing held', () => {
    expect(input.state()).toEqual({ ndc: null, touch: false, unaltered: false, keyboard: false });
  });

  it('follows the hovering mouse in normalised device coordinates, until it leaves', () => {
    pointer('pointermove', { x: 300, y: 150 });
    expect(input.state().ndc).toEqual({ x: 0, y: -0 });
    pointer('pointermove', { x: 500, y: 50 });
    expect(input.state().ndc).toEqual({ x: 1, y: 1 });
    pointer('pointerleave', {});
    expect(input.state().ndc).toBeNull();
  });

  it('follows a finger only while it touches (FR3)', () => {
    pointer('pointermove', { x: 300, y: 150, kind: 'touch' });
    expect(input.state().ndc).toBeNull();
    pointer('pointerdown', { x: 100, y: 250, kind: 'touch' });
    expect(input.state()).toMatchObject({ ndc: { x: -1, y: -1 }, touch: true });
    pointer('pointermove', { x: 300, y: 150, kind: 'touch' });
    expect(input.state().ndc).toEqual({ x: 0, y: -0 });
    pointer('pointerleave', { kind: 'touch' });
    expect(input.state().ndc).not.toBeNull();
    pointer('pointerup', { kind: 'touch' }, window);
    expect(input.state()).toMatchObject({ ndc: null, touch: true });
  });

  it('copes with a canvas that has no size yet', () => {
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0, x: 0, y: 0, toJSON: () => ({}) });
    pointer('pointermove', { x: 0, y: 0 });
    expect(input.state().ndc).toEqual({ x: -1, y: 1 });
  });

  it('ignores the release of a mouse button (no finger to forget)', () => {
    pointer('pointermove', { x: 300, y: 150 });
    pointer('pointerdown', { x: 300, y: 150 });
    pointer('pointerup', {}, window);
    expect(input.state().ndc).not.toBeNull();
    vi.advanceTimersByTime(LONG_PRESS_MS * 2);
    expect(cycles).toBe(0);
  });
});

describe('LensInput — changing the lens (FR2)', () => {
  it('changes the lens with a still long press, and claims that press', () => {
    pointer('pointerdown', { x: 200, y: 100, kind: 'touch' });
    vi.advanceTimersByTime(LONG_PRESS_MS - 1);
    expect(cycles).toBe(0);
    vi.advanceTimersByTime(1);
    expect(cycles).toBe(1);
    pointer('pointerup', { kind: 'touch' }, window);
    expect(input.claimedPress()).toBe(true);
    pointer('pointerdown', { x: 200, y: 100, kind: 'touch' });
    expect(input.claimedPress()).toBe(false);
  });

  it('does not count a moving finger or a short tap as a long press', () => {
    pointer('pointerdown', { x: 200, y: 100, kind: 'touch' });
    pointer('pointermove', { x: 230, y: 100, kind: 'touch' });
    vi.advanceTimersByTime(LONG_PRESS_MS * 2);
    pointer('pointerup', { kind: 'touch' }, window);
    pointer('pointerdown', { x: 200, y: 100, kind: 'touch' });
    pointer('pointermove', { x: 203, y: 102, kind: 'touch' });
    pointer('pointerup', { kind: 'touch' }, window);
    vi.advanceTimersByTime(LONG_PRESS_MS * 2);
    expect(cycles).toBe(0);
    expect(input.claimedPress()).toBe(false);
  });

  it('changes the lens with L and remembers that the keyboard asked', () => {
    const event = key('keydown', 'l');
    expect(event.defaultPrevented).toBe(true);
    key('keydown', 'L');
    expect(cycles).toBe(2);
    expect(input.state().keyboard).toBe(true);
    pointer('pointermove', { x: 300, y: 150 });
    expect(input.state().keyboard).toBe(false);
    key('keydown', 'l');
    pointer('pointerdown', { x: 300, y: 150 });
    expect(input.state().keyboard).toBe(false);

    // Tactile LensToggle button can also request centre-aim on the faced work until pointer returns to canvas.
    input.aimAtFacing();
    expect(input.state().keyboard).toBe(true);
    pointer('pointermove', { x: 300, y: 150 });
    expect(input.state().keyboard).toBe(false);
  });

  it('ignores L typed in a field or inside the open dialog, and other keys', () => {
    key('keydown', 'l', document.getElementById('i') as HTMLElement);
    key('keydown', 'l', document.querySelector('#d a') as HTMLElement);
    expect(key('keydown', 'k').defaultPrevented).toBe(false);
    expect(cycles).toBe(0);
  });
});

describe('LensInput — see unaltered (FR4)', () => {
  it('holds while Shift is held, and forgets Shift when the window loses focus', () => {
    key('keydown', 'Shift');
    expect(input.state().unaltered).toBe(true);
    key('keyup', 'Shift', window);
    expect(input.state().unaltered).toBe(false);
    key('keydown', 'Shift');
    window.dispatchEvent(new Event('blur'));
    expect(input.state().unaltered).toBe(false);
    key('keyup', 'a', window);
    expect(cycles).toBe(0);
  });

  it('toggles with a two-finger tap, which is claimed and never a long press', () => {
    pointer('pointerdown', { x: 200, y: 100, id: 1, kind: 'touch', t: 1000 });
    pointer('pointerdown', { x: 260, y: 100, id: 2, kind: 'touch', t: 1020 });
    vi.advanceTimersByTime(LONG_PRESS_MS * 2);
    pointer('pointerup', { id: 1, kind: 'touch', t: 1150 }, window);
    expect(input.state().unaltered).toBe(false);
    pointer('pointerup', { id: 2, kind: 'touch', t: 1160 }, window);
    expect(input.state().unaltered).toBe(true);
    expect(input.claimedPress()).toBe(true);
    expect(cycles).toBe(0);
    pointer('pointerdown', { x: 200, y: 100, id: 3, kind: 'touch', t: 2000 });
    pointer('pointerdown', { x: 260, y: 100, id: 4, kind: 'touch', t: 2010 });
    pointer('pointerup', { id: 3, kind: 'touch', t: 2100 }, window);
    pointer('pointerup', { id: 4, kind: 'touch', t: 2100 }, window);
    expect(input.state().unaltered).toBe(false);
  });

  it('does not toggle for a slow or moving two-finger gesture (a pinch or a drag)', () => {
    pointer('pointerdown', { x: 200, y: 100, id: 1, kind: 'touch', t: 0 });
    pointer('pointerdown', { x: 260, y: 100, id: 2, kind: 'touch', t: 10 });
    pointer('pointerup', { id: 1, kind: 'touch', t: 900 }, window);
    pointer('pointerup', { id: 2, kind: 'touch', t: 900 }, window);
    pointer('pointerdown', { x: 200, y: 100, id: 3, kind: 'touch', t: 1000 });
    pointer('pointerdown', { x: 260, y: 100, id: 4, kind: 'touch', t: 1010 });
    pointer('pointermove', { x: 300, y: 100, id: 4, kind: 'touch' });
    pointer('pointerup', { id: 3, kind: 'touch', t: 1100 }, window);
    pointer('pointerup', { id: 4, kind: 'touch', t: 1100 }, window);
    expect(input.state().unaltered).toBe(false);
  });

  it('stops listening when detached, cancelling a pending long press', () => {
    pointer('pointerdown', { x: 200, y: 100, kind: 'touch' });
    input.detach();
    vi.advanceTimersByTime(LONG_PRESS_MS * 2);
    key('keydown', 'l');
    key('keydown', 'Shift');
    pointer('pointermove', { x: 300, y: 150 });
    expect(cycles).toBe(0);
    expect(input.state()).toMatchObject({ unaltered: false });
  });
});

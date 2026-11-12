// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { InputAccumulator } from '../../../src/world/core/InputAccumulator.js';
import { InputMapping } from '../../../src/world/core/InputMapping.js';
import { WheelInput } from '../../../src/world/island/input/WheelInput.js';
import { PointerDragInput } from '../../../src/world/island/input/PointerDragInput.js';
import { KeyboardInput } from '../../../src/world/island/input/KeyboardInput.js';
import { TiltInput, type OrientationPermission } from '../../../src/world/island/input/TiltInput.js';

let layer: HTMLElement;
let acc: InputAccumulator;
beforeEach(() => {
  document.body.innerHTML = '<div id="layer" tabindex="-1"><button id="b">work</button><dialog id="d"><a href="#">x</a></dialog><input id="i"></div>';
  layer = document.getElementById('layer') as HTMLElement;
  acc = new InputAccumulator();
});

const pointer = (type: string, x: number, y: number, target: EventTarget = layer) =>
  target.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y, bubbles: true, button: 0 }));

describe('WheelInput', () => {
  it('turns wheel scrolling into forward drift and keeps the page from scrolling', () => {
    const input = new WheelInput(layer, acc);
    const event = new WheelEvent('wheel', { deltaY: 120, deltaMode: 0, cancelable: true, bubbles: true });
    layer.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(acc.drain()).toEqual(InputMapping.wheel(120, 0));
    input.detach();
    layer.dispatchEvent(new WheelEvent('wheel', { deltaY: 120 }));
    expect(acc.drain()).toEqual({ thrust: 0, turn: 0 });
  });
});

describe('PointerDragInput', () => {
  it('turns a drag into drift impulses, move by move', () => {
    new PointerDragInput(layer, acc);
    pointer('pointerdown', 100, 100);
    pointer('pointermove', 110, 90, window);
    pointer('pointermove', 130, 90, window);
    const sum = acc.drain();
    expect(sum.thrust).toBeCloseTo(InputMapping.drag(10, -10).thrust, 12);
    expect(sum.turn).toBeCloseTo(InputMapping.drag(30, -10).turn, 12);
  });

  it('ignores moves without a pressed pointer, and after release', () => {
    const drag = new PointerDragInput(layer, acc);
    pointer('pointermove', 50, 50, window);
    pointer('pointerdown', 0, 0);
    pointer('pointerup', 0, 0, window);
    pointer('pointermove', 80, 80, window);
    expect(acc.drain()).toEqual({ thrust: 0, turn: 0 });
    expect(drag.wasDrag()).toBe(false);
  });

  it('tells a drag from a click (so a drag does not open a work)', () => {
    const drag = new PointerDragInput(layer, acc);
    pointer('pointerdown', 0, 0);
    pointer('pointermove', 3, 2, window);
    pointer('pointerup', 3, 2, window);
    expect(drag.wasDrag()).toBe(false);
    pointer('pointerdown', 0, 0);
    pointer('pointermove', 30, 0, window);
    pointer('pointercancel', 30, 0, window);
    expect(drag.wasDrag()).toBe(true);
  });

  it('only starts on the primary button and stops listening on detach', () => {
    const drag = new PointerDragInput(layer, acc);
    layer.dispatchEvent(new MouseEvent('pointerdown', { clientX: 0, clientY: 0, button: 2, bubbles: true }));
    pointer('pointermove', 40, 0, window);
    expect(acc.drain()).toEqual({ thrust: 0, turn: 0 });
    drag.detach();
    pointer('pointerdown', 0, 0);
    pointer('pointermove', 40, 0, window);
    expect(acc.drain()).toEqual({ thrust: 0, turn: 0 });
  });
});

describe('KeyboardInput', () => {
  const key = (type: 'keydown' | 'keyup', k: string, target: EventTarget = layer) => {
    const event = new KeyboardEvent(type, { key: k, bubbles: true, cancelable: true });
    target.dispatchEvent(event);
    return event;
  };

  it('drifts while arrow keys are held, and stops when released', () => {
    const input = new KeyboardInput(layer);
    expect(key('keydown', 'ArrowUp').defaultPrevented).toBe(true);
    input.poll(acc, 0.5);
    expect(acc.drain()).toEqual(InputMapping.keys(new Set(['ArrowUp']), 0.5));
    key('keyup', 'ArrowUp');
    input.poll(acc, 0.5);
    expect(acc.drain()).toEqual({ thrust: 0, turn: 0 });
  });

  it('leaves other keys alone (Tab, Enter) and ignores typing in fields and the open dialog', () => {
    const input = new KeyboardInput(layer);
    expect(key('keydown', 'Tab').defaultPrevented).toBe(false);
    expect(key('keydown', 'ArrowUp', document.getElementById('i') as HTMLElement).defaultPrevented).toBe(false);
    expect(key('keydown', 'ArrowUp', document.querySelector('#d a') as HTMLElement).defaultPrevented).toBe(false);
    input.poll(acc, 1);
    expect(acc.drain()).toEqual({ thrust: 0, turn: 0 });
  });

  it('forgets held keys when focus leaves (no runaway drift)', () => {
    const input = new KeyboardInput(layer);
    key('keydown', 'ArrowLeft', document.getElementById('b') as HTMLElement);
    window.dispatchEvent(new Event('blur'));
    input.poll(acc, 1);
    expect(acc.drain()).toEqual({ thrust: 0, turn: 0 });
    input.detach();
    key('keydown', 'ArrowLeft');
    input.poll(acc, 1);
    expect(acc.drain()).toEqual({ thrust: 0, turn: 0 });
  });
});

describe('TiltInput', () => {
  const orient = (beta: number | null, gamma: number | null) =>
    window.dispatchEvent(Object.assign(new Event('deviceorientation'), { beta, gamma }));

  it('asks for permission where the browser requires it (iOS), then follows the tilt', async () => {
    let asked = 0;
    const permission: OrientationPermission = async () => {
      asked++;
      return 'granted';
    };
    const tilt = new TiltInput(window, permission);
    expect(await tilt.enable()).toBe('granted');
    expect(asked).toBe(1);
    orient(60, 0);
    orient(40, -30);
    tilt.poll(acc, 1);
    expect(acc.drain()).toEqual(InputMapping.tilt({ beta: 40, gamma: -30 }, 60, 1));
  });

  it('starts right away where no permission is needed (Android)', async () => {
    const tilt = new TiltInput(window, null);
    expect(await tilt.enable()).toBe('granted');
    orient(70, 20);
    tilt.poll(acc, 1);
    expect(acc.drain()).toEqual({ thrust: 0, turn: InputMapping.tilt({ beta: 70, gamma: 20 }, 70, 1).turn });
  });

  it('stays off when the visitor refuses (drag still works)', async () => {
    const tilt = new TiltInput(window, async () => 'denied');
    expect(await tilt.enable()).toBe('denied');
    orient(10, 80);
    tilt.poll(acc, 1);
    expect(acc.drain()).toEqual({ thrust: 0, turn: 0 });
  });

  it('does nothing before the first reading and after detach', async () => {
    const tilt = new TiltInput(window, null);
    await tilt.enable();
    tilt.poll(acc, 1);
    expect(acc.drain()).toEqual({ thrust: 0, turn: 0 });
    orient(null, null);
    tilt.poll(acc, 1);
    expect(acc.drain()).toEqual({ thrust: 0, turn: 0 });
    tilt.detach();
    orient(10, 80);
    tilt.poll(acc, 1);
    expect(acc.drain()).toEqual({ thrust: 0, turn: 0 });
  });
});

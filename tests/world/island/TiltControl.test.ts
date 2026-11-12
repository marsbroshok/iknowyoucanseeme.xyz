// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TiltControl } from '../../../src/world/island/TiltControl.js';
import { InputAccumulator } from '../../../src/world/core/InputAccumulator.js';

const flush = () => new Promise((r) => setTimeout(r, 0));
let button: HTMLButtonElement;
beforeEach(() => {
  document.body.innerHTML = '<button data-drift-tilt hidden>Move with the phone</button>';
  button = document.querySelector('button') as HTMLButtonElement;
});

/** A window with or without the orientation API (and iOS's permission request). */
function host(kind: 'none' | 'android' | 'ios', answer: 'granted' | 'denied' | Error = 'granted') {
  const requestPermission = vi.fn(async () => {
    if (answer instanceof Error) throw answer;
    return answer;
  });
  const api = kind === 'none' ? undefined : kind === 'ios' ? Object.assign(function DeviceOrientationEvent() {}, { requestPermission }) : function DeviceOrientationEvent() {};
  const win = new Proxy(window, {
    get: (target, key) => {
      if (key === 'DeviceOrientationEvent') return api;
      const value = Reflect.get(target, key, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
  return { win, requestPermission };
}

describe('TiltControl', () => {
  it('stays hidden on devices without a fine way to tilt (no API, or a mouse)', () => {
    new TiltControl(button, host('none').win, true);
    expect(button.hidden).toBe(true);
    new TiltControl(button, host('android').win, false);
    expect(button.hidden).toBe(true);
  });

  it('on a phone, offers tilt and asks iOS for permission on tap', async () => {
    const { win, requestPermission } = host('ios');
    const tilt = new TiltControl(button, win, true);
    expect(button.hidden).toBe(false);
    button.click();
    await flush();
    expect(requestPermission).toHaveBeenCalledOnce();
    expect(button.hidden).toBe(true);
    window.dispatchEvent(Object.assign(new Event('deviceorientation'), { beta: 60, gamma: -40 }));
    const acc = new InputAccumulator();
    tilt.poll(acc, 1);
    expect(acc.drain().turn).toBeGreaterThan(0);
    tilt.detach();
  });

  it('starts at once on Android', async () => {
    const tilt = new TiltControl(button, host('android').win, true);
    button.click();
    await flush();
    expect(button.hidden).toBe(true);
    tilt.detach();
  });

  it('hides the offer when refused (drag still works)', async () => {
    new TiltControl(button, host('ios', 'denied').win, true);
    button.click();
    await flush();
    expect(button.hidden).toBe(true);
  });

  it('reports a failed permission request', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    new TiltControl(button, host('ios', new Error('NotAllowedError')).win, true);
    button.click();
    await flush();
    expect(error).toHaveBeenCalledWith('[drift] Tilt control could not start; drag to move instead.', expect.any(Error));
    expect(button.hidden).toBe(true);
    error.mockRestore();
  });
});

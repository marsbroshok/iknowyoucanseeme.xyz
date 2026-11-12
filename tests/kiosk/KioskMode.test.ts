// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { KIOSK } from '../../src/kiosk/KioskState.js';
import { KIOSK_TICK_MS, KioskMode, type KioskHooks } from '../../src/kiosk/KioskMode.js';
import { isKiosk } from '../../src/kiosk/KioskParam.js';

function hooks() {
  const calls: string[] = [];
  const h: KioskHooks = { advance: () => calls.push('advance'), reset: () => calls.push('reset'), gesture: () => calls.push('gesture') };
  return { h, calls };
}

const kiosk = (h: KioskHooks) => new KioskMode(document, window, () => Date.now(), h);
const html = () => document.documentElement;

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = `
    <header><a href="/en/about/">About</a><a href="https://www.instagram.com/x">Instagram</a><a href="/fr/">FR</a></header>
    <main><a href="#main">Skip</a><p>Text</p></main>`;
});
afterEach(() => {
  vi.useRealTimers();
  html().className = '';
});

describe('isKiosk', () => {
  it('turns the exhibition mode on with ?kiosk=1 only', () => {
    expect(isKiosk('?kiosk=1')).toBe(true);
    expect(isKiosk('?w=arrivee&kiosk=1')).toBe(true);
    expect(isKiosk('')).toBe(false);
    expect(isKiosk('?kiosk=0')).toBe(false);
    expect(isKiosk('?kiosk=yes')).toBe(false);
  });
});

describe('KioskMode', () => {
  it('marks the page and takes every link out of it: no external links, no leaving the screen', () => {
    kiosk(hooks().h);
    expect(html().classList.contains('kiosk')).toBe(true);
    expect(document.querySelectorAll('a[href]')).toHaveLength(0);
    expect(document.querySelectorAll('a')).toHaveLength(4);
  });

  it('hides the cursor after 5 s without input and shows it again on a move', () => {
    kiosk(hooks().h);
    vi.advanceTimersByTime(KIOSK.cursorHideMs - KIOSK_TICK_MS);
    expect(html().classList.contains('kiosk-idle')).toBe(false);
    vi.advanceTimersByTime(KIOSK_TICK_MS);
    expect(html().classList.contains('kiosk-idle')).toBe(true);
    document.dispatchEvent(new Event('pointermove'));
    vi.advanceTimersByTime(KIOSK_TICK_MS);
    expect(html().classList.contains('kiosk-idle')).toBe(false);
  });

  it('drifts on by itself while nobody uses it', () => {
    const { h, calls } = hooks();
    kiosk(h);
    vi.advanceTimersByTime(KIOSK.autoDriftAfterMs);
    expect(calls).toEqual(['advance']);
    vi.advanceTimersByTime(KIOSK.autoDriftEveryMs);
    expect(calls).toEqual(['advance', 'advance']);
  });

  it('the first tap or key is the gesture (it may start the sound), once', () => {
    const { h, calls } = hooks();
    kiosk(h);
    document.dispatchEvent(new Event('pointerdown'));
    document.dispatchEvent(new Event('keydown'));
    document.dispatchEvent(new Event('touchstart'));
    expect(calls).toEqual(['gesture']);
  });

  it('a move or a scroll is input but not a gesture', () => {
    const { h, calls } = hooks();
    kiosk(h);
    document.dispatchEvent(new Event('pointermove'));
    document.dispatchEvent(new Event('wheel'));
    expect(calls).toEqual([]);
  });

  it('resets 90 s after the last input, once', () => {
    const { h, calls } = hooks();
    kiosk(h);
    vi.advanceTimersByTime(1_000);
    document.dispatchEvent(new Event('keydown'));
    calls.length = 0;
    vi.advanceTimersByTime(KIOSK.idleResetMs);
    expect(calls.filter((c) => c === 'reset')).toEqual(['reset']);
    vi.advanceTimersByTime(3 * KIOSK.idleResetMs);
    expect(calls.filter((c) => c === 'reset')).toEqual(['reset']);
  });

  it('detach() stops everything and gives the page back its cursor', () => {
    const { h, calls } = hooks();
    const k = kiosk(h);
    vi.advanceTimersByTime(KIOSK.cursorHideMs);
    k.detach();
    expect(html().classList.contains('kiosk-idle')).toBe(false);
    expect(html().classList.contains('kiosk')).toBe(false);
    document.dispatchEvent(new Event('pointerdown'));
    vi.advanceTimersByTime(10 * KIOSK.idleResetMs);
    expect(calls).toEqual([]);
  });
});

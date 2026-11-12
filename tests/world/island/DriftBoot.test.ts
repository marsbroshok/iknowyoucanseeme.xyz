// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { bootDrift, type MountOptions, type WorldModule } from '../../../src/world/island/DriftBoot.js';
import { ModePreference } from '../../../src/world/core/ModePreference.js';
import { VisitMemory } from '../../../src/world/core/VisitMemory.js';
import type { EnteredDetail } from '../../../src/world/core/ThresholdState.js';
import type { DeviceCapabilities } from '../../../src/world/core/DeviceProfile.js';
import { sampleManifest } from '../fixtures.js';
import { SoundPreference } from '../../../src/sound/core/SoundPreference.js';
import type { SoundEngine, SoundEngineModule } from '../../../src/sound/SoundEngine.js';
import { KIOSK } from '../../../src/kiosk/KioskState.js';

const capable: DeviceCapabilities = { webgl2: true, reducedMotion: false, saveData: false, deviceMemory: 8, hardwareConcurrency: 8, coarsePointer: false };
const now = (_host: unknown, cb: () => void) => cb();

/** A world module that records mounts and unmounts. */
function fakeWorld(fail = false) {
  const mounts: MountOptions[] = [];
  const calls: string[] = [];
  let unmounts = 0;
  const module: WorldModule = {
    mountWorld: async (_root, options) => {
      if (fail) throw new Error('shader did not compile');
      mounts.push(options);
      return { unmount: () => unmounts++, advance: () => calls.push('advance'), restart: () => calls.push('restart') };
    },
  };
  return { load: vi.fn(async () => module), mounts, calls, unmounts: () => unmounts };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

/**
 * Node's own experimental global `localStorage` shadows jsdom's in this test
 * environment, so the window gets an in-memory Storage instead.
 */
class MemoryStorage {
  private readonly items = new Map<string, string>();
  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.items.set(key, value);
  }
  removeItem(key: string): void {
    this.items.delete(key);
  }
}
let localStorage: MemoryStorage;
/** `window` with a replaced (or blocked) `localStorage`. */
function windowWith(storage: () => MemoryStorage): Window {
  return new Proxy(window, {
    get: (target, key) => {
      if (key === 'localStorage') return storage();
      const value = Reflect.get(target, key, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}
let win: Window;
const $ = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T;

beforeEach(() => {
  localStorage = new MemoryStorage();
  win = windowWith(() => localStorage);
  document.body.innerHTML = `
    <main><p><button data-drift-start hidden>Drift</button></p></main>
    <section data-drift hidden tabindex="-1">
      <div class="drift-top"><button data-drift-wake>Wake up</button></div>
      <canvas data-drift-canvas></canvas>
      <div data-threshold hidden><p>I know you can see me</p><button data-threshold-enter hidden>Enter</button></div>
    </section>
    <script type="application/json" id="drift-manifest">${JSON.stringify(sampleManifest)}</script>`;
});
afterEach(() => {
  vi.restoreAllMocks();
});

/** Collects `entered` events reaching the document. */
function enteredEvents(): EnteredDetail[] {
  const seen: EnteredDetail[] = [];
  document.addEventListener('entered', (e) => seen.push((e as CustomEvent<EnteredDetail>).detail));
  return seen;
}

describe('bootDrift — the threshold', () => {
  it('opens a first visit on the full threshold: Enter focused, the world mounted behind it and holding still', async () => {
    const world = fakeWorld();
    const seen = enteredEvents();
    const boot = bootDrift(document, win, world.load, () => capable, now);
    await flush();
    expect($('[data-threshold]').hidden).toBe(false);
    expect($('[data-threshold]').dataset.kind).toBe('full');
    expect(document.activeElement).toBe($('[data-threshold-enter]'));
    expect(world.mounts[0].threshold.holding).toBe(true);
    expect(boot?.threshold?.holding).toBe(true);
    expect($('[data-drift-wake]').closest('[inert]')).toBeNull();
    expect(seen).toEqual([]);
  });

  it('Enter emits "entered" (with the gesture, for the sound track) and remembers the visit', async () => {
    const world = fakeWorld();
    const seen = enteredEvents();
    bootDrift(document, win, world.load, () => capable, now);
    await flush();
    $('[data-threshold-enter]').click();
    expect(seen).toEqual([{ gesture: true, returning: false }]);
    expect(world.mounts[0].threshold.holding).toBe(false);
    expect(localStorage.getItem(VisitMemory.KEY)).toBe('1');
  });

  it('gives a returning visitor the short threshold, which enters by itself', async () => {
    vi.useFakeTimers();
    localStorage.setItem(VisitMemory.KEY, '1');
    const seen = enteredEvents();
    bootDrift(document, win, fakeWorld().load, () => capable, now);
    expect($('[data-threshold]').dataset.kind).toBe('short');
    vi.advanceTimersByTime(0);
    expect(seen).toEqual([{ gesture: false, returning: true }]);
    vi.useRealTimers();
  });

  it('gives a deep link the short threshold', () => {
    history.replaceState(null, '', '/fr/?w=arrivee');
    bootDrift(document, win, fakeWorld().load, () => capable, now);
    expect($('[data-threshold]').dataset.kind).toBe('short');
    history.replaceState(null, '', '/');
  });

  it('"Drift" on the awake page enters at once (it is the gesture): no threshold screen', async () => {
    localStorage.setItem(ModePreference.KEY, 'awake');
    const seen = enteredEvents();
    bootDrift(document, win, fakeWorld().load, () => capable, now);
    $('[data-drift-start]').click();
    expect($('[data-threshold]').hidden).toBe(true);
    expect(seen).toEqual([{ gesture: true, returning: false }]);
  });

  it('the handle\'s enter() opens the world on the threshold, and leave() closes both', async () => {
    const world = fakeWorld();
    const boot = bootDrift(document, win, world.load, () => ({ ...capable, saveData: true }), now);
    expect(boot?.threshold).toBeNull();
    boot?.enter();
    await flush();
    expect(world.mounts).toHaveLength(1);
    expect(boot?.threshold?.visible).toBe(true);
    boot?.leave();
    expect(boot?.threshold?.visible).toBe(false);
    expect($('[data-drift]').hidden).toBe(true);
  });

  it('"Wake up" on the threshold leads to the awake page without entering', async () => {
    const seen = enteredEvents();
    bootDrift(document, win, fakeWorld().load, () => capable, now);
    await flush();
    $('[data-drift-wake]').click();
    expect($('[data-threshold]').hidden).toBe(true);
    expect($('[data-drift]').hidden).toBe(true);
    expect(seen).toEqual([]);
    expect(localStorage.getItem(VisitMemory.KEY)).toBeNull();
  });
});

describe('bootDrift', () => {
  it('does nothing on pages without the world', () => {
    document.body.innerHTML = '<main></main>';
    expect(bootDrift(document, win, fakeWorld().load, () => capable, now)).toBeNull();
  });

  it('mounts the world after first paint on a capable device, with the manifest and tier', async () => {
    const world = fakeWorld();
    const boot = bootDrift(document, win, world.load, () => capable, now);
    await flush();
    expect(boot?.decision).toMatchObject({ mode: 'world', tier: 'high' });
    expect(world.mounts).toHaveLength(1);
    expect(world.mounts[0]).toMatchObject({ tier: 'high', manifest: sampleManifest });
    expect($('[data-drift]').hidden).toBe(false);
    expect($('main').hasAttribute('inert')).toBe(true);
    expect($('[data-drift-start]').hidden).toBe(true);
  });

  it('passes the deep-linked work (?w=) to the world, ignoring unknown ones', async () => {
    const world = fakeWorld();
    history.replaceState(null, '', '/fr/?w=cygne-icm-1');
    bootDrift(document, win, world.load, () => capable, now);
    await flush();
    expect(world.mounts[0].startSlug).toBe('cygne-icm-1');
    history.replaceState(null, '', '/fr/?w=nope');
    const other = fakeWorld();
    bootDrift(document, win, other.load, () => capable, now);
    await flush();
    expect(other.mounts[0].startSlug).toBeNull();
    history.replaceState(null, '', '/');
  });

  it('mounts the world for reduced motion too (ADR 0009), threshold included, with "Wake up" at hand', async () => {
    const world = fakeWorld();
    const boot = bootDrift(document, win, world.load, () => ({ ...capable, reducedMotion: true }), now);
    await flush();
    expect(boot?.decision).toMatchObject({ mode: 'world', reasons: [] });
    expect(world.mounts).toHaveLength(1);
    expect($('[data-drift]').hidden).toBe(false);
    expect($('[data-threshold]').hidden).toBe(false);
    $('[data-drift-wake]').click();
    expect($('[data-drift]').hidden).toBe(true);
    expect(localStorage.getItem(ModePreference.KEY)).toBe('awake');
  });

  it('keeps the awake layer on Save-Data, and offers "Drift"', async () => {
    const world = fakeWorld();
    bootDrift(document, win, world.load, () => ({ ...capable, saveData: true }), now);
    await flush();
    expect(world.load).not.toHaveBeenCalled();
    expect($('[data-drift]').hidden).toBe(true);
    expect($('[data-drift-start]').hidden).toBe(false);
    $('[data-drift-start]').click();
    await flush();
    expect(world.mounts[0]).toMatchObject({ tier: 'low' });
    expect(localStorage.getItem(ModePreference.KEY)).toBe('world');
    expect($('[data-drift]').hidden).toBe(false);
  });

  it('"Wake up" unmounts the world, remembers the choice and offers "Drift" again', async () => {
    const world = fakeWorld();
    bootDrift(document, win, world.load, () => capable, now);
    await flush();
    $('[data-drift-wake]').click();
    expect(world.unmounts()).toBe(1);
    expect($('[data-drift]').hidden).toBe(true);
    expect($('main').hasAttribute('inert')).toBe(false);
    expect($('[data-drift-start]').hidden).toBe(false);
    expect(localStorage.getItem(ModePreference.KEY)).toBe('awake');
    expect(document.activeElement).toBe($('[data-drift-start]'));
  });

  it('respects a stored "Wake up" choice on the next visit', async () => {
    localStorage.setItem(ModePreference.KEY, 'awake');
    const world = fakeWorld();
    const boot = bootDrift(document, win, world.load, () => capable, now);
    await flush();
    expect(boot?.decision.reasons).toEqual(['override']);
    expect(world.load).not.toHaveBeenCalled();
  });

  it('never offers "Drift" without WebGL2', async () => {
    bootDrift(document, win, fakeWorld().load, () => ({ ...capable, webgl2: false }), now);
    await flush();
    expect($('[data-drift-start]').hidden).toBe(true);
  });

  it('falls back to the awake layer and reports it when the world fails to start', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    bootDrift(document, win, fakeWorld(true).load, () => capable, now);
    await flush();
    expect(error).toHaveBeenCalledWith('[drift] The world could not start; showing the awake page.', expect.any(Error));
    expect($('[data-drift]').hidden).toBe(true);
    expect($('main').hasAttribute('inert')).toBe(false);
    expect($('[data-drift-start]').hidden).toBe(true);
  });

  it('reports a page without its manifest instead of drawing an empty world', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    document.getElementById('drift-manifest')?.remove();
    const world = fakeWorld();
    bootDrift(document, win, world.load, () => capable, now);
    await flush();
    expect(world.mounts).toHaveLength(0);
    expect(error.mock.calls[0][1]).toEqual(new Error('[manifest] manifest must be an object'));
    expect($('[data-drift]').hidden).toBe(true);
  });

  it('does not mount twice when "Drift" is pressed while loading', async () => {
    const world = fakeWorld();
    bootDrift(document, win, world.load, () => ({ ...capable, saveData: true }), now);
    $('[data-drift-start]').click();
    $('[data-drift-start]').click();
    await flush();
    expect(world.mounts).toHaveLength(1);
  });

  it('unmounts a world that finishes loading after "Wake up"', async () => {
    const world = fakeWorld();
    bootDrift(document, win, world.load, () => capable, now);
    $('[data-drift-wake]').click();
    await flush();
    expect(world.unmounts()).toBe(1);
    expect($('[data-drift]').hidden).toBe(true);
  });

  it('still works when the browser blocks localStorage (choice not remembered, warned once)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const blocked = windowWith(() => {
      throw new DOMException('denied', 'SecurityError');
    });
    const world = fakeWorld();
    bootDrift(document, blocked, world.load, () => capable, now);
    await flush();
    expect(warn).toHaveBeenCalledOnce();
    expect(world.mounts).toHaveLength(1);
    $('[data-drift-wake]').click();
    expect(localStorage.getItem(ModePreference.KEY)).toBeNull();
  });
});

describe('bootDrift — the sound (docs/adr/0011)', () => {
  /** A sound module whose engine logs calls (test double), loaded through a spy. */
  function fakeSound() {
    const calls: string[] = [];
    const engine: SoundEngine = {
      start: async () => void calls.push('start'),
      stop: async () => void calls.push('stop'),
      setMix: () => undefined,
      setCues: () => undefined,
      setMuted: (m) => void calls.push(`muted:${m}`),
      dispose: async () => undefined,
    };
    const wins: unknown[] = [];
    const module: SoundEngineModule = {
      createSoundEngine: async (w) => {
        wins.push(w);
        return engine;
      },
    };
    return { load: vi.fn(async () => module), calls, wins };
  }
  const withToggle = () =>
    document.querySelector('.drift-top')?.insertAdjacentHTML('beforeend', '<button data-sound-toggle data-label-mute="Mute sound" data-label-unmute="Unmute sound">Mute sound</button>');

  it('loads nothing before the gesture; Enter on the threshold (gesture) loads the engine and starts it, fed to the world', async () => {
    withToggle();
    const sound = fakeSound();
    const world = fakeWorld();
    const boot = bootDrift(document, win, world.load, () => capable, now, sound.load);
    await flush();
    expect(sound.load).not.toHaveBeenCalled();
    expect(world.mounts[0].sound).toBe(boot?.sound);
    expect($('[data-sound-toggle]').textContent).toBe('Mute sound');
    $('[data-threshold-enter]').click();
    await flush();
    expect(sound.load).toHaveBeenCalledTimes(1);
    expect(sound.wins).toEqual([win]);
    expect(sound.calls).toEqual(['muted:false', 'start']);
    expect(boot?.sound?.state).toBe('playing');
  });

  it('"Drift" on the awake page (gesture) starts the sound too; "Wake up" stops it', async () => {
    withToggle();
    localStorage.setItem(ModePreference.KEY, 'awake');
    const sound = fakeSound();
    bootDrift(document, win, fakeWorld().load, () => capable, now, sound.load);
    $('[data-drift-start]').click();
    await flush();
    expect(sound.calls).toEqual(['muted:false', 'start']);
    $('[data-drift-wake]').click();
    expect(sound.calls.at(-1)).toBe('stop');
  });

  it('with sound on, a returning visitor\'s short threshold waits for the Enter click (it unlocks audio)', async () => {
    vi.useFakeTimers();
    withToggle();
    localStorage.setItem(VisitMemory.KEY, '1');
    const seen = enteredEvents();
    const sound = fakeSound();
    bootDrift(document, win, fakeWorld().load, () => capable, now, sound.load);
    expect($('[data-threshold]').dataset.kind).toBe('short');
    expect($('[data-threshold-enter]').hidden).toBe(false);
    vi.advanceTimersByTime(5000);
    expect(seen).toEqual([]);
    vi.useRealTimers();
  });

  it('muted, the short threshold enters by itself without a gesture and no audio is loaded; unmuting (a click) loads it', async () => {
    vi.useFakeTimers();
    withToggle();
    localStorage.setItem(VisitMemory.KEY, '1');
    localStorage.setItem(SoundPreference.KEY, 'off');
    const seen = enteredEvents();
    const sound = fakeSound();
    bootDrift(document, win, fakeWorld().load, () => capable, now, sound.load);
    expect($('[data-sound-toggle]').textContent).toBe('Unmute sound');
    vi.advanceTimersByTime(0);
    expect(seen).toEqual([{ gesture: false, returning: true }]);
    vi.useRealTimers();
    await flush();
    expect(sound.load).not.toHaveBeenCalled();
    $('[data-sound-toggle]').click();
    await flush();
    expect(sound.load).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(SoundPreference.KEY)).toBe('on');
  });

  it('muting while a returning visitor\'s short threshold waits lets it enter by itself (no gesture, no audio)', async () => {
    vi.useFakeTimers();
    withToggle();
    localStorage.setItem(VisitMemory.KEY, '1');
    const seen = enteredEvents();
    const sound = fakeSound();
    bootDrift(document, win, fakeWorld().load, () => capable, now, sound.load);
    expect($('[data-threshold-enter]').hidden).toBe(false);
    expect($('canvas[data-drift-canvas]').hasAttribute('inert')).toBe(true);
    $('[data-sound-toggle]').click();
    expect($('[data-threshold-enter]').hidden).toBe(true);
    expect($('canvas[data-drift-canvas]').hasAttribute('inert')).toBe(false);
    vi.advanceTimersByTime(0);
    expect(seen).toEqual([{ gesture: false, returning: true }]);
    vi.useRealTimers();
    await flush();
    expect(sound.load).not.toHaveBeenCalled();
  });

  it('unmuting again before the short threshold entered asks for the click once more', async () => {
    vi.useFakeTimers();
    withToggle();
    localStorage.setItem(VisitMemory.KEY, '1');
    const seen = enteredEvents();
    bootDrift(document, win, fakeWorld().load, () => capable, now, fakeSound().load);
    $('[data-sound-toggle]').click();
    $('[data-sound-toggle]').click();
    expect($('[data-threshold-enter]').hidden).toBe(false);
    vi.advanceTimersByTime(5000);
    expect(seen).toEqual([]);
    vi.useRealTimers();
  });

  it('a mute change after the threshold is gone changes nothing on it', async () => {
    withToggle();
    const seen = enteredEvents();
    bootDrift(document, win, fakeWorld().load, () => capable, now, fakeSound().load);
    $('[data-threshold-enter]').click();
    $('[data-sound-toggle]').click();
    $('[data-sound-toggle]').click();
    expect(seen).toEqual([{ gesture: true, returning: false }]);
  });

  it('reports a world layer without the mute toggle when sound is wired', () => {
    expect(() => bootDrift(document, win, fakeWorld().load, () => capable, now, fakeSound().load)).toThrow('[drift] Missing [data-sound-toggle] in the world layer');
  });

  it('without a sound module the world is silent and the threshold behaves as before', async () => {
    const world = fakeWorld();
    const boot = bootDrift(document, win, world.load, () => capable, now);
    await flush();
    expect(boot?.sound).toBeNull();
    expect(world.mounts[0].sound).toBeNull();
  });
});

describe('bootDrift — exhibition mode (?kiosk=1, FR5)', () => {
  const withToggle = () =>
    document.querySelector('.drift-top')?.insertAdjacentHTML('beforeend', '<button data-sound-toggle data-label-mute="Mute sound" data-label-unmute="Unmute sound">Mute sound</button>');
  function fakeSound() {
    const engine: SoundEngine = { start: async () => undefined, stop: async () => undefined, setMix: () => undefined, setCues: () => undefined, setMuted: () => undefined, dispose: async () => undefined };
    return { load: vi.fn(async (): Promise<SoundEngineModule> => ({ createSoundEngine: async () => engine })) };
  }
  beforeEach(() => {
    history.replaceState(null, '', '/en/?kiosk=1');
    document.querySelector('main')?.insertAdjacentHTML('beforeend', '<a href="https://www.instagram.com/x">Instagram</a><a href="/en/about/">About</a>');
  });
  afterEach(() => {
    vi.useRealTimers();
    history.replaceState(null, '', '/');
    document.documentElement.className = '';
  });

  it('opens straight into the world, without the threshold and without a gesture, even after a stored "Wake up"', async () => {
    localStorage.setItem(ModePreference.KEY, 'awake');
    const seen = enteredEvents();
    const world = fakeWorld();
    const boot = bootDrift(document, win, world.load, () => capable, now);
    await flush();
    expect(boot?.decision.mode).toBe('world');
    expect($('[data-threshold]').hidden).toBe(true);
    expect(seen).toEqual([{ gesture: false, returning: false }]);
    expect(world.mounts[0].kiosk).toBe(true);
    expect(world.mounts[0].threshold.holding).toBe(false);
  });

  it('takes the links out of the page', () => {
    bootDrift(document, win, fakeWorld().load, () => capable, now);
    expect(document.querySelectorAll('main a[href]')).toHaveLength(0);
    expect(document.documentElement.classList.contains('kiosk')).toBe(true);
  });

  it('the first tap starts the sound (it is the gesture)', async () => {
    withToggle();
    const sound = fakeSound();
    const boot = bootDrift(document, win, fakeWorld().load, () => capable, now, sound.load);
    await flush();
    expect(sound.load).not.toHaveBeenCalled();
    document.dispatchEvent(new Event('pointerdown'));
    await flush();
    expect(sound.load).toHaveBeenCalledTimes(1);
    expect(boot?.sound?.state).toBe('playing');
  });

  it('drifts on by itself and resets the world 90 s after the last input', async () => {
    vi.useFakeTimers();
    const world = fakeWorld();
    bootDrift(document, win, world.load, () => capable, now);
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(KIOSK.autoDriftAfterMs);
    expect(world.calls).toEqual(['advance']);
    document.dispatchEvent(new Event('keydown'));
    await vi.advanceTimersByTimeAsync(KIOSK.idleResetMs);
    expect(world.calls).toContain('restart');
  });

  it('"Wake up" shows the awake page without remembering it, and the reset brings the world back', async () => {
    vi.useFakeTimers();
    const world = fakeWorld();
    bootDrift(document, win, world.load, () => capable, now);
    await vi.advanceTimersByTimeAsync(0);
    // A real press: pointerdown, then click.
    $('[data-drift-wake]').dispatchEvent(new Event('pointerdown', { bubbles: true }));
    $('[data-drift-wake]').click();
    expect($('[data-drift]').hidden).toBe(true);
    expect(localStorage.getItem(ModePreference.KEY)).toBeNull();
    await vi.advanceTimersByTimeAsync(KIOSK.idleResetMs);
    expect($('[data-drift]').hidden).toBe(false);
    expect(world.mounts).toHaveLength(2);
  });

  it('ignores ?w= on open and when resetting from "Wake up" back to the start of the path', async () => {
    vi.useFakeTimers();
    history.replaceState(null, '', '/en/?kiosk=1&w=arrivee');
    const world = fakeWorld();
    bootDrift(document, win, world.load, () => capable, now);
    await vi.advanceTimersByTimeAsync(0);
    expect(world.mounts[0].startSlug).toBeNull();
    history.replaceState(null, '', '/en/?kiosk=1&w=cygne-icm-1');
    $('[data-drift-wake]').dispatchEvent(new Event('pointerdown', { bubbles: true }));
    $('[data-drift-wake]').click();
    await vi.advanceTimersByTimeAsync(KIOSK.idleResetMs);
    expect(world.mounts).toHaveLength(2);
    expect(world.mounts[1].startSlug).toBeNull();
  });

  it('ignores the timers while the world is still loading', async () => {
    vi.useFakeTimers();
    let release: (m: WorldModule) => void = () => undefined;
    const pending = new Promise<WorldModule>((r) => (release = r));
    bootDrift(document, win, () => pending, () => capable, now);
    document.dispatchEvent(new Event('keydown'));
    expect(() => vi.advanceTimersByTime(KIOSK.idleResetMs)).not.toThrow();
    release(await fakeWorld().load());
  });
});

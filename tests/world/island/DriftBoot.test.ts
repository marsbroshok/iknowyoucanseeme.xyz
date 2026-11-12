// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { bootDrift, type MountOptions, type WorldModule } from '../../../src/world/island/DriftBoot.js';
import { ModePreference } from '../../../src/world/core/ModePreference.js';
import type { DeviceCapabilities } from '../../../src/world/core/DeviceProfile.js';
import { sampleManifest } from '../fixtures.js';

const capable: DeviceCapabilities = { webgl2: true, reducedMotion: false, saveData: false, deviceMemory: 8, hardwareConcurrency: 8, coarsePointer: false };
const now = (_host: unknown, cb: () => void) => cb();

/** A world module that records mounts and unmounts. */
function fakeWorld(fail = false) {
  const mounts: MountOptions[] = [];
  let unmounts = 0;
  const module: WorldModule = {
    mountWorld: async (_root, options) => {
      if (fail) throw new Error('shader did not compile');
      mounts.push(options);
      return { unmount: () => unmounts++ };
    },
  };
  return { load: vi.fn(async () => module), mounts, unmounts: () => unmounts };
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
    <section data-drift hidden tabindex="-1"><button data-drift-wake>Wake up</button></section>
    <script type="application/json" id="drift-manifest">${JSON.stringify(sampleManifest)}</script>`;
});
afterEach(() => {
  vi.restoreAllMocks();
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

  it('mounts the world for reduced motion too (ADR 0009), with "Wake up" at hand', async () => {
    const world = fakeWorld();
    const boot = bootDrift(document, win, world.load, () => ({ ...capable, reducedMotion: true }), now);
    await flush();
    expect(boot?.decision).toMatchObject({ mode: 'world', reasons: [] });
    expect(world.mounts).toHaveLength(1);
    expect($('[data-drift]').hidden).toBe(false);
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

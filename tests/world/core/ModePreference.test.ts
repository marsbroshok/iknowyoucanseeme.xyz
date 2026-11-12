import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { ModePreference, type PreferenceStorage } from '../../../src/world/core/ModePreference.js';

/** In-memory stand-in for `localStorage`. */
class MemoryStorage implements PreferenceStorage {
  readonly items = new Map<string, string>();
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

describe('ModePreference', () => {
  it('has no override until the visitor chooses', () => {
    expect(new ModePreference(new MemoryStorage()).read()).toBeNull();
  });

  it('remembers "Wake up" and "Drift" across instances (page loads)', () => {
    const storage = new MemoryStorage();
    new ModePreference(storage).write('awake');
    expect(new ModePreference(storage).read()).toBe('awake');
    new ModePreference(storage).write('world');
    expect(new ModePreference(storage).read()).toBe('world');
    expect(storage.items.get(ModePreference.KEY)).toBe('world');
  });

  it('clears the choice', () => {
    const storage = new MemoryStorage();
    const pref = new ModePreference(storage);
    pref.write('awake');
    pref.clear();
    expect(pref.read()).toBeNull();
    expect(storage.items.size).toBe(0);
  });

  it('ignores a stored value it does not know (an old or hand-edited key)', () => {
    fc.assert(
      fc.property(
        fc.string().filter((s) => s !== 'world' && s !== 'awake'),
        (junk) => {
          const storage = new MemoryStorage();
          storage.setItem(ModePreference.KEY, junk);
          expect(new ModePreference(storage).read()).toBeNull();
        },
      ),
    );
  });

  it('works without storage (blocked by the browser): nothing remembered, nothing thrown', () => {
    const pref = new ModePreference(null);
    pref.write('awake');
    pref.clear();
    expect(pref.read()).toBeNull();
  });
});

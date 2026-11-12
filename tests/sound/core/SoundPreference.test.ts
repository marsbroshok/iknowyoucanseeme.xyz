import { describe, it, expect } from 'vitest';
import { SoundPreference } from '../../../src/sound/core/SoundPreference.js';
import { MemoryStorage } from '../../world/memoryStorage.js';

describe('SoundPreference', () => {
  it('sound is on unless the visitor muted it; the choice is stored', () => {
    const storage = new MemoryStorage();
    expect(new SoundPreference(storage).muted).toBe(false);
    new SoundPreference(storage).write(true);
    expect(storage.getItem(SoundPreference.KEY)).toBe('off');
    expect(new SoundPreference(storage).muted).toBe(true);
    new SoundPreference(storage).write(false);
    expect(new SoundPreference(storage).muted).toBe(false);
    storage.setItem(SoundPreference.KEY, 'loud');
    expect(new SoundPreference(storage).muted).toBe(false);
  });

  it('without storage, the choice lasts for the page', () => {
    const p = new SoundPreference(null);
    expect(p.muted).toBe(false);
    p.write(true);
    expect(p.muted).toBe(true);
  });
});

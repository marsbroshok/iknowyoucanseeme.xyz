import { describe, it, expect } from 'vitest';

describe('SoundEngine module', () => {
  it('holds only types at runtime, so the boot can depend on the interface without loading any audio code', async () => {
    const module = await import('../../src/sound/SoundEngine.js');
    expect(Object.keys(module)).toEqual([]);
  });
});

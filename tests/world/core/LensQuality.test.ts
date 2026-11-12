import { describe, it, expect } from 'vitest';
import { LENS_QUALITY, lensDefines } from '../../../src/world/core/LensQuality.js';
import { modesFor } from '../../../src/world/core/LensMode.js';

describe('LensQuality', () => {
  it('gives the low tier cheaper variants: fewer blur samples, fewer ghosts, no fracture', () => {
    expect(LENS_QUALITY.low.samples).toBeLessThan(LENS_QUALITY.high.samples);
    expect(LENS_QUALITY.low.ghosts).toBeLessThan(LENS_QUALITY.high.ghosts);
    expect(LENS_QUALITY.high.fracture).toBe(true);
    expect(LENS_QUALITY.low.fracture).toBe(false);
  });

  it('agrees with the lenses each tier offers', () => {
    for (const tier of ['high', 'low'] as const) expect(LENS_QUALITY[tier].fracture).toBe(modesFor(tier).includes('fracture'));
  });

  it('keeps at least two blur samples and one ghost (the shader divides by them)', () => {
    for (const tier of ['high', 'low'] as const) {
      expect(LENS_QUALITY[tier].samples).toBeGreaterThanOrEqual(2);
      expect(LENS_QUALITY[tier].ghosts).toBeGreaterThanOrEqual(1);
    }
  });

  it('turns a tier into shader defines', () => {
    expect(lensDefines('high')).toEqual({ LENS_SAMPLES: LENS_QUALITY.high.samples, LENS_GHOSTS: LENS_QUALITY.high.ghosts, LENS_FRACTURE: '' });
    expect(lensDefines('low')).toEqual({ LENS_SAMPLES: LENS_QUALITY.low.samples, LENS_GHOSTS: LENS_QUALITY.low.ghosts });
  });
});

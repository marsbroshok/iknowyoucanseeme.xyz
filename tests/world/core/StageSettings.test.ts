import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { pixelRatioFor, STAGE_SETTINGS, FOG_DENSITY, NIGHT_BLUE } from '../../../src/world/core/StageSettings.js';

describe('StageSettings', () => {
  it('caps the pixel ratio by tier', () => {
    expect(pixelRatioFor(3, 'high')).toBe(2);
    expect(pixelRatioFor(3, 'low')).toBe(1.25);
    expect(pixelRatioFor(1.5, 'high')).toBe(1.5);
  });

  it('never renders below 1 (missing or odd devicePixelRatio)', () => {
    expect(pixelRatioFor(0, 'high')).toBe(1);
    expect(pixelRatioFor(Number.NaN, 'low')).toBe(1);
    expect(pixelRatioFor(0.5, 'low')).toBe(1);
  });

  it('turns MSAA off on phones', () => {
    expect(STAGE_SETTINGS.high.antialias).toBe(true);
    expect(STAGE_SETTINGS.low.antialias).toBe(false);
  });

  it('fogs the night blue gently so layered works up to ~30 units remain legible while distant works at 60 units dissolve', () => {
    expect(NIGHT_BLUE).toBe('#0b1030');
    expect(FOG_DENSITY).toBe(0.03);
    const fogged = (d: number) => 1 - Math.exp(-((FOG_DENSITY * d) ** 2));
    expect(fogged(5)).toBeLessThan(0.05);
    expect(fogged(25)).toBeLessThan(0.5);
    expect(fogged(60)).toBeGreaterThan(0.95);
  });

  it('property: the ratio stays within [1, cap]', () => {
    fc.assert(
      fc.property(fc.double({ min: -10, max: 10 }), fc.constantFrom('high' as const, 'low' as const), (dpr, tier) => {
        const r = pixelRatioFor(dpr, tier);
        expect(r).toBeGreaterThanOrEqual(1);
        expect(r).toBeLessThanOrEqual(STAGE_SETTINGS[tier].maxPixelRatio);
      }),
    );
  });
});

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { RECIPES, SoundRecipes } from '../../../src/sound/core/SoundRecipes.js';
import { SOUND_ZONES, SoundZones } from '../../../src/sound/core/SoundZones.js';
import { QUIET_CUES } from '../../../src/sound/core/SoundCues.js';

const unit = fc.double({ min: 0, max: 1, noNaN: true });
const zoneArb = fc.constantFrom(...SOUND_ZONES);
const positive = fc.double({ min: 0.001, max: 10, noNaN: true });
const mixArb = fc.record({ arrival: positive, lens: positive, leak: positive, border: positive }).map((r) => SoundZones.normalize(r));

describe('SoundRecipes', () => {
  it('has a recipe for every zone, each within a safe range', () => {
    expect(Object.keys(RECIPES).sort()).toEqual([...SOUND_ZONES].sort());
    for (const z of SOUND_ZONES) {
      const r = RECIPES[z];
      expect(r.gain).toBeGreaterThan(0);
      expect(r.gain).toBeLessThanOrEqual(1);
      expect(r.cutoff).toBeGreaterThanOrEqual(20);
      expect(r.brightCutoff).toBeGreaterThanOrEqual(r.cutoff);
      expect(r.brightCutoff).toBeLessThanOrEqual(12_000);
    }
  });

  it('characters: the lens is the brightest and the only one with glints, the leak the darkest, the border the only one with a swell', () => {
    const at = (z: (typeof SOUND_ZONES)[number]) => SoundRecipes.voice(z, 1, { approach: 1, eclipse: 1 });
    expect(Math.max(...SOUND_ZONES.map((z) => at(z).cutoff))).toBe(at('lens').cutoff);
    expect(Math.min(...SOUND_ZONES.map((z) => at(z).cutoff))).toBe(at('leak').cutoff);
    expect(SOUND_ZONES.filter((z) => at(z).activity > 0)).toEqual(['lens']);
    expect(SOUND_ZONES.filter((z) => at(z).swell > 0)).toEqual(['border']);
    // Sparse: even with a work right there, fewer than two glints a second.
    expect(at('lens').activity).toBeLessThan(2);
    expect(SoundRecipes.voice('lens', 1, QUIET_CUES).activity).toBeGreaterThan(0);
  });

  it('an equal-power crossfade: levels relative to each recipe gain have squares summing to 1 (property)', () => {
    fc.assert(
      fc.property(mixArb, unit, unit, (weights, approach, eclipse) => {
        const voices = SoundRecipes.mix(weights, { approach, eclipse });
        const power = SOUND_ZONES.reduce((s, z) => s + (voices[z].level / RECIPES[z].gain) ** 2, 0);
        expect(power).toBeCloseTo(1, 9);
      }),
    );
  });

  it('a zone is louder the more it weighs, never above its recipe gain, and silent at weight 0 (property)', () => {
    fc.assert(
      fc.property(zoneArb, unit, unit, unit, (zone, a, b, approach) => {
        const [lo, hi] = a <= b ? [a, b] : [b, a];
        const quiet = SoundRecipes.voice(zone, lo, { approach, eclipse: 0 }).level;
        const loud = SoundRecipes.voice(zone, hi, { approach, eclipse: 0 }).level;
        expect(quiet).toBeLessThanOrEqual(loud);
        expect(loud).toBeLessThanOrEqual(RECIPES[zone].gain);
      }),
    );
    for (const z of SOUND_ZONES) expect(SoundRecipes.voice(z, 0, QUIET_CUES).level).toBe(0);
  });

  it('approaching works brightens the lens and quickens its glints; eclipse works raise the border swell (monotonic, property)', () => {
    fc.assert(
      fc.property(unit, unit, (a, b) => {
        const [lo, hi] = a <= b ? [a, b] : [b, a];
        const far = SoundRecipes.voice('lens', 1, { approach: lo, eclipse: 0 });
        const near = SoundRecipes.voice('lens', 1, { approach: hi, eclipse: 0 });
        expect(far.cutoff).toBeLessThanOrEqual(near.cutoff);
        expect(far.activity).toBeLessThanOrEqual(near.activity);
        expect(SoundRecipes.voice('border', 1, { approach: 0, eclipse: lo }).swell).toBeLessThanOrEqual(SoundRecipes.voice('border', 1, { approach: 0, eclipse: hi }).swell);
      }),
    );
  });

  it('clamps out-of-range inputs and rejects NaN loudly', () => {
    expect(SoundRecipes.voice('lens', 2, { approach: 3, eclipse: -1 })).toEqual(SoundRecipes.voice('lens', 1, { approach: 1, eclipse: 0 }));
    expect(SoundRecipes.voice('arrival', -1, QUIET_CUES).level).toBe(0);
    expect(() => SoundRecipes.voice('lens', Number.NaN, QUIET_CUES)).toThrow('[sound] weight must be a number');
    expect(() => SoundRecipes.voice('lens', 1, { approach: Number.NaN, eclipse: 0 })).toThrow('[sound] approach must be a number');
    expect(() => SoundRecipes.voice('lens', 1, { approach: 0, eclipse: Number.NaN })).toThrow('[sound] eclipse must be a number');
  });
});

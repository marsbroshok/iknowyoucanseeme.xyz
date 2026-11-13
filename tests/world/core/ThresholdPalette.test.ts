import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { BOREAL_THRESHOLD, ThresholdPalette, borealDefines, type PaletteWork } from '../../../src/world/core/ThresholdPalette.js';
import { SKY } from '../../../src/world/core/PaletteSky.js';
import { contrast } from '../../../src/design/AccentColor.js';

const works: PaletteWork[] = [
  { zone: 'lens', palette: ['#ff0000'] },
  { zone: 'arrival', palette: ['#101820', '#4060e0', '#203040'] },
  { zone: 'arrival', palette: ['#0a0a0a', '#e0a040'] },
];

const rgb = (hex: string): [number, number, number] => [
  Number.parseInt(hex.slice(1, 3), 16),
  Number.parseInt(hex.slice(3, 5), 16),
  Number.parseInt(hex.slice(5, 7), 16),
];

describe('ThresholdPalette.pick', () => {
  it('supplies deep night indigo base (#070b22) and boreal green/violet/pink ribbons modulated by a random Arrival work', () => {
    const first = ThresholdPalette.pick(works, () => 0);
    const second = ThresholdPalette.pick(works, () => 0.99);

    expect(first.base).toBe('#070b22');
    expect(second.base).toBe('#070b22');
    expect(first.leak).toBe('#4060e0');
    expect(second.leak).toBe('#e0a040');

    // Different Arrival palettes subtly modulate the boreal stops differently.
    expect(first.green).not.toBe(second.green);
    expect(first.violet).not.toBe(second.violet);
    expect(first.pink).not.toBe(second.pink);
  });

  it('uses any work when there is no Arrival work, and unmodulated boreal anchors when no work has a palette', () => {
    const nonArrival = ThresholdPalette.pick([{ zone: null, palette: ['#334455', '#c0c0c0'] }], () => 0.5);
    expect(nonArrival.leak).toBe('#c0c0c0');
    expect(nonArrival.green).not.toBe(BOREAL_THRESHOLD.green);

    const emptyPalette = ThresholdPalette.pick([{ zone: 'arrival', palette: [] }], () => 0.5);
    expect(emptyPalette).toEqual({
      base: BOREAL_THRESHOLD.base,
      green: BOREAL_THRESHOLD.green,
      violet: BOREAL_THRESHOLD.violet,
      pink: BOREAL_THRESHOLD.pink,
      leak: BOREAL_THRESHOLD.base,
    });
    expect(ThresholdPalette.pick([], () => 0.5)).toEqual(emptyPalette);
  });

  it('property: preserves vivid green, violet, and pink boreal hues and dark base contrast for arbitrary work palettes', () => {
    const hex = fc.integer({ min: 0, max: 0xffffff }).map((n) => `#${n.toString(16).padStart(6, '0')}`);
    const work = fc.record({ zone: fc.constantFrom('arrival' as const, 'lens' as const, null), palette: fc.array(hex, { maxLength: 5 }) });
    fc.assert(
      fc.property(fc.array(work, { maxLength: 6 }), fc.double({ min: 0, max: 0.999999, noNaN: true }), (ws, r) => {
        const picked = ThresholdPalette.pick(ws, () => r);
        expect(picked.base).toBe('#070b22');
        expect(contrast(SKY.dimText, picked.base)).toBeGreaterThanOrEqual(4.6);

        const [gr, gg, gb] = rgb(picked.green);
        expect(gg).toBeGreaterThan(gb);
        expect(gg).toBeGreaterThan(gr);

        const [vr, vg, vb] = rgb(picked.violet);
        expect(vb).toBeGreaterThan(vr);
        expect(vr).toBeGreaterThan(vg);

        const [pr, pg, pb] = rgb(picked.pink);
        expect(pr).toBeGreaterThan(pb);
        expect(pb).toBeGreaterThan(pg);

        const arrival = ws.filter((w) => w.zone === 'arrival');
        const pool = (arrival.length > 0 ? arrival : ws).flatMap((w) => w.palette);
        expect([...pool, BOREAL_THRESHOLD.base]).toContain(picked.leak);
      }),
    );
  });

  it('supplies higher FBM octave count on high tier and lower step count on low tier', () => {
    expect(borealDefines('high')).toEqual({ BOREAL_OCTAVES: 4 });
    expect(borealDefines('low')).toEqual({ BOREAL_OCTAVES: 2 });
  });
});

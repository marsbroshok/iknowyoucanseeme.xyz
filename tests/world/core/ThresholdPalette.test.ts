import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { ThresholdPalette, type PaletteWork } from '../../../src/world/core/ThresholdPalette.js';
import { NIGHT_BLUE } from '../../../src/world/core/StageSettings.js';

const works: PaletteWork[] = [
  { zone: 'lens', palette: ['#ff0000'] },
  { zone: 'arrival', palette: ['#101820', '#4060e0', '#203040'] },
  { zone: 'arrival', palette: ['#0a0a0a', '#e0a040'] },
];

describe('ThresholdPalette.pick', () => {
  it('takes the leak colour from a random Arrival work: its brightest palette colour', () => {
    expect(ThresholdPalette.pick(works, () => 0)).toEqual({ base: NIGHT_BLUE, leak: '#4060e0' });
    expect(ThresholdPalette.pick(works, () => 0.99)).toEqual({ base: NIGHT_BLUE, leak: '#e0a040' });
  });

  it('uses any work when there is no Arrival work, and the base blue when no work has a palette', () => {
    expect(ThresholdPalette.pick([{ zone: null, palette: ['#334455', '#c0c0c0'] }], () => 0.5).leak).toBe('#c0c0c0');
    expect(ThresholdPalette.pick([{ zone: 'arrival', palette: [] }], () => 0.5).leak).toBe(NIGHT_BLUE);
    expect(ThresholdPalette.pick([], () => 0.5).leak).toBe(NIGHT_BLUE);
  });

  it('property: the leak is always a colour of one candidate work (or the base blue)', () => {
    const hex = fc.integer({ min: 0, max: 0xffffff }).map((n) => `#${n.toString(16).padStart(6, '0')}`);
    const work = fc.record({ zone: fc.constantFrom('arrival' as const, 'lens' as const, null), palette: fc.array(hex, { maxLength: 5 }) });
    fc.assert(
      fc.property(fc.array(work, { maxLength: 6 }), fc.double({ min: 0, max: 0.999999, noNaN: true }), (ws, r) => {
        const { leak } = ThresholdPalette.pick(ws, () => r);
        const arrival = ws.filter((w) => w.zone === 'arrival');
        const pool = (arrival.length > 0 ? arrival : ws).flatMap((w) => w.palette);
        expect([...pool, NIGHT_BLUE]).toContain(leak);
      }),
    );
  });
});

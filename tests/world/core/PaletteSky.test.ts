import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { PaletteSky, SKY } from '../../../src/world/core/PaletteSky.js';
import { NIGHT_BLUE } from '../../../src/world/core/StageSettings.js';
import { contrast } from '../../../src/design/AccentColor.js';

const hex = fc.tuple(fc.integer({ min: 0, max: 255 }), fc.integer({ min: 0, max: 255 }), fc.integer({ min: 0, max: 255 })).map(
  ([r, g, b]) => `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`,
);

describe('PaletteSky.targetFor', () => {
  it('is night blue with no work nearby', () => {
    expect(PaletteSky.targetFor(null, 0)).toBe(NIGHT_BLUE);
    expect(PaletteSky.targetFor('#ff0000', SKY.reach + 1)).toBe(NIGHT_BLUE);
  });

  it('leans towards the nearest work\'s dominant colour as the visitor comes close', () => {
    const far = PaletteSky.targetFor('#3050ff', SKY.reach * 0.9);
    const near = PaletteSky.targetFor('#3050ff', 1);
    const blue = (c: string) => parseInt(c.slice(5, 7), 16);
    expect(blue(near)).toBeGreaterThan(blue(far));
    expect(blue(far)).toBeGreaterThanOrEqual(blue(NIGHT_BLUE));
    expect(near).not.toBe(NIGHT_BLUE);
  });

  it('property: stays dark enough for the light UI text over the world (≥ 4.5:1)', () => {
    fc.assert(
      fc.property(hex, fc.double({ min: 0, max: 60, noNaN: true }), (color, d) => {
        const sky = PaletteSky.targetFor(color, d);
        expect(contrast('#f0f0f5', sky)).toBeGreaterThanOrEqual(4.5);
        expect(contrast('#a0a5b5', sky)).toBeGreaterThanOrEqual(4.5);
      }),
    );
  });
});

describe('PaletteSky.update (smooth drift of the colour)', () => {
  it('moves part of the way each frame and gets there in the end', () => {
    const sky = new PaletteSky();
    expect(sky.color).toBe(NIGHT_BLUE);
    const target = PaletteSky.targetFor('#40ff40', 0);
    const first = sky.update('#40ff40', 0, 1 / 60);
    expect(first).not.toBe(NIGHT_BLUE);
    expect(first).not.toBe(target);
    let c = first;
    for (let i = 0; i < 60 * 10; i++) c = sky.update('#40ff40', 0, 1 / 60);
    expect(c).toBe(target);
    expect(sky.color).toBe(target);
  });

  it('property: every channel stays between the start and the target', () => {
    fc.assert(
      fc.property(hex, fc.double({ min: 0, max: 0.5, noNaN: true }), (color, dt) => {
        const sky = new PaletteSky();
        const target = PaletteSky.targetFor(color, 0);
        const next = sky.update(color, 0, dt);
        for (const i of [1, 3, 5]) {
          const [a, b, n] = [NIGHT_BLUE, target, next].map((x) => parseInt(x.slice(i, i + 2), 16));
          expect(n).toBeGreaterThanOrEqual(Math.min(a, b));
          expect(n).toBeLessThanOrEqual(Math.max(a, b));
        }
      }),
    );
  });
});

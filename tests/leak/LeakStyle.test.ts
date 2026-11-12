import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import fs from 'node:fs';
import path from 'node:path';
import { contrast } from '../../src/design/AccentColor.js';
import { LEAK } from '../../src/leak/LeakMeter.js';
import { APPARITION, AWAKE_INK, AWAKE_TEXT, LeakStyle, MIN_CONTRAST } from '../../src/leak/LeakStyle.js';

const hexColor = fc.tuple(fc.integer({ min: 0, max: 255 }), fc.integer({ min: 0, max: 255 }), fc.integer({ min: 0, max: 255 })).map(([r, g, b]) => `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`);
const level = fc.double({ min: 0, max: 1, noNaN: true });

describe('LeakStyle — awake colours', () => {
  it('uses the awake layer\'s own ink and text colours (tokens.css)', () => {
    const tokens = fs.readFileSync(path.resolve(__dirname, '../../src/styles/tokens.css'), 'utf8');
    const token = (name: string) => new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, 'i').exec(tokens)?.[1];
    expect(AWAKE_INK).toBe(token('ink'));
    expect([...AWAKE_TEXT].sort()).toEqual([token('text-primary'), token('text-secondary'), token('accent')].sort());
  });
});

describe('LeakStyle — mix', () => {
  it('blends two colours channel by channel (sRGB), rounded', () => {
    expect(LeakStyle.mixHex('#000000', '#ffffff', 0)).toBe('#000000');
    expect(LeakStyle.mixHex('#000000', '#ffffff', 1)).toBe('#ffffff');
    expect(LeakStyle.mixHex('#0b1030', '#eaca92', 0.5)).toBe('#7b6d61');
  });

  it('lets a dark dream colour tint the background fully, a light one only as far as text stays legible', () => {
    expect(LeakStyle.cap('#13103a')).toBe(LEAK.maxMix);
    const light = LeakStyle.cap('#f0e0d0');
    expect(light).toBeGreaterThan(0);
    expect(light).toBeLessThan(LEAK.maxMix);
  });

  it('caps in hundredths, and the next hundredth would break the guard', () => {
    const cap = LeakStyle.cap('#ffffff');
    expect(Math.round(cap * 100)).toBeCloseTo(cap * 100, 9);
    const worst = (t: number) => Math.min(...AWAKE_TEXT.map((c) => contrast(c, LeakStyle.mixHex(AWAKE_INK, '#ffffff', t))));
    expect(worst(cap)).toBeGreaterThanOrEqual(MIN_CONTRAST);
    expect(worst(cap + 0.01)).toBeLessThan(LeakStyle.GUARD);
  });

  it('leaves the background untouched at level 0 or without a colour', () => {
    expect(LeakStyle.of(0, '#eaca92', 0.3).background).toBe(AWAKE_INK);
    expect(LeakStyle.of(1, null, 0.3)).toEqual({ level: 1, mix: 0, color: AWAKE_INK, background: AWAKE_INK });
  });

  it('grows the mix with the level up to the cap', () => {
    expect(LeakStyle.of(0.5, '#13103a', LEAK.maxMix).mix).toBe(0.15);
    expect(LeakStyle.of(1, '#13103a', 0.12).mix).toBe(0.12);
  });

  it('never trusts a stored cap beyond what the colour allows', () => {
    const style = LeakStyle.of(1, '#ffffff', LEAK.maxMix);
    expect(style.mix).toBeLessThanOrEqual(LeakStyle.cap('#ffffff'));
  });

  it('gives the CSS custom properties of the @layer leak', () => {
    expect(LeakStyle.vars(LeakStyle.of(0.5, '#13103a', LEAK.maxMix))).toEqual({
      '--leak-bg': LeakStyle.mixHex(AWAKE_INK, '#13103a', 0.15),
      '--leak-color': '#13103a',
      '--leak-level': '0.5',
    });
  });

  it('property: at every level and for every colour, awake text keeps a contrast of at least 4.5:1', () => {
    fc.assert(
      fc.property(level, hexColor, (l, color) => {
        const style = LeakStyle.of(l, color, LeakStyle.cap(color));
        for (const text of AWAKE_TEXT) expect(contrast(text, style.background)).toBeGreaterThanOrEqual(MIN_CONTRAST);
      }),
      { numRuns: 500 },
    );
  });

  it('property: the guard holds even with a forged cap', () => {
    fc.assert(
      fc.property(level, hexColor, fc.double({ min: 0, max: LEAK.maxMix, noNaN: true }), (l, color, cap) => {
        const style = LeakStyle.of(l, color, cap);
        for (const text of AWAKE_TEXT) expect(contrast(text, style.background)).toBeGreaterThanOrEqual(MIN_CONTRAST);
      }),
    );
  });

  it('property: the mix never falls when the level grows', () => {
    fc.assert(
      fc.property(level, level, hexColor, (a, b, color) => {
        const cap = LeakStyle.cap(color);
        const [lo, hi] = a <= b ? [a, b] : [b, a];
        expect(LeakStyle.of(hi, color, cap).mix).toBeGreaterThanOrEqual(LeakStyle.of(lo, color, cap).mix);
      }),
    );
  });
});

describe('LeakStyle — stray apparition', () => {
  it('never appears below level 0.4', () => {
    expect(LeakStyle.appears(0.39, 0)).toBe(false);
  });

  it('appears at most with the configured chance, more often at a higher level', () => {
    expect(LeakStyle.appears(0.4, 0)).toBe(true);
    expect(LeakStyle.appears(1, APPARITION.chance - 1e-9)).toBe(true);
    expect(LeakStyle.appears(1, APPARITION.chance)).toBe(false);
    expect(LeakStyle.appears(0.5, APPARITION.chance * 0.5)).toBe(false);
  });
});

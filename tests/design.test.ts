import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { accentFor, contrast } from '../src/design/AccentColor.js';

describe('AccentColor', () => {
  it('accentFor(hex) gives >= 4.5:1 contrast vs --ink', () => {
    // Specifically test cases that hit hue2rgb with t < 2/3 and t > 2/3
    expect(accentFor('#0000ff')).toBeTruthy();
    expect(accentFor('#ff0000')).toBeTruthy();
    expect(accentFor('#00ff00')).toBeTruthy();
    expect(accentFor('#111111')).toBeTruthy();
    
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 }),
        fc.integer({ min: 0, max: 255 }),
        (r, g, b) => {
          const toHex = (n: number) => n.toString(16).padStart(2, '0');
          const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
          const adjusted = accentFor(hex);
          const ratio = contrast(adjusted, '#0b1030');
          expect(ratio).toBeGreaterThanOrEqual(4.5);
        }
      )
    );
  });
});

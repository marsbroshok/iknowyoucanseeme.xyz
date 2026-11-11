import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { extractPalette } from '../src/intake/PaletteExtractor.js';
import sharp from 'sharp';

describe('PaletteExtractor', () => {
  it('returns <=5 hex values', async () => {
    const buf = Buffer.alloc(10 * 10 * 3);
    const img = await sharp(buf, { raw: { width: 10, height: 10, channels: 3 } }).jpeg().toBuffer();
    const palette = await extractPalette(img);
    expect(palette.length).toBeLessThanOrEqual(5);
    expect(palette.length).toBeGreaterThan(0);
    palette.forEach(c => {
      expect(c).toMatch(/^#[0-9a-f]{6}$/);
    });
  });

  it('a single-colour image returns that colour', async () => {
    const buf = Buffer.alloc(10 * 10 * 3, 0); // all black
    const img = await sharp(buf, { raw: { width: 10, height: 10, channels: 3 } }).jpeg().toBuffer();
    const palette = await extractPalette(img);
    expect(palette[0]).toBe('#000000');
  });

  it('property: returns <=5 valid hex values and deterministic', async () => {
    // Generate simple 2x2 RGB buffers
    await fc.assert(
      fc.asyncProperty(
        fc.uint8Array({ minLength: 12, maxLength: 12 }),
        async (pixels) => {
          const img = await sharp(pixels, { raw: { width: 2, height: 2, channels: 3 } }).jpeg().toBuffer();
          const p1 = await extractPalette(img);
          const p2 = await extractPalette(img);
          
          expect(p1).toEqual(p2);
          expect(p1.length).toBeLessThanOrEqual(5);
          expect(p1.length).toBeGreaterThan(0);
          p1.forEach(c => {
            expect(c).toMatch(/^#[0-9a-f]{6}$/);
          });
        }
      ),
      { numRuns: 10 }
    );
  });
});

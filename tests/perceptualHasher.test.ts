import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { dHash, hammingDistance, hashImageBuffer } from '../src/intake/PerceptualHasher.js';
import sharp from 'sharp';

describe('PerceptualHasher', () => {
  it('dHash properties: a, a = 0; symmetry; 0 <= d <= 64', () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 72, maxLength: 72 }),
        fc.uint8Array({ minLength: 72, maxLength: 72 }),
        (buf1, buf2) => {
          const h1 = dHash(buf1);
          const h2 = dHash(buf2);
          const d = hammingDistance(h1, h2);
          expect(hammingDistance(h1, h1)).toBe(0);
          expect(d).toBe(hammingDistance(h2, h1));
          expect(d).toBeGreaterThanOrEqual(0);
          expect(d).toBeLessThanOrEqual(64);
        }
      )
    );
  });
  
  it('sharp adapter', async () => {
    // Left side black, right side white
    const buf = Buffer.alloc(100 * 100 * 3);
    for (let y = 0; y < 100; y++) {
      for (let x = 0; x < 100; x++) {
        const i = (y * 100 + x) * 3;
        const color = x < 50 ? 0 : 255;
        buf[i] = color;
        buf[i+1] = color;
        buf[i+2] = color;
      }
    }
    const img1 = await sharp(buf, { raw: { width: 100, height: 100, channels: 3 } }).jpeg().toBuffer();
    const h1 = await hashImageBuffer(img1);
    
    // resized copy stays within threshold
    const img2 = await sharp(img1).resize(50, 50).jpeg().toBuffer();
    const h2 = await hashImageBuffer(img2);
    expect(hammingDistance(h1, h2)).toBeLessThan(5);
    
    // different pattern: top black, bottom white
    const buf3 = Buffer.alloc(100 * 100 * 3);
    for (let y = 0; y < 100; y++) {
      for (let x = 0; x < 100; x++) {
        const i = (y * 100 + x) * 3;
        const color = y < 50 ? 0 : 255;
        buf3[i] = color;
        buf3[i+1] = color;
        buf3[i+2] = color;
      }
    }
    const img3 = await sharp(buf3, { raw: { width: 100, height: 100, channels: 3 } }).jpeg().toBuffer();
    const h3 = await hashImageBuffer(img3);
    expect(hammingDistance(h1, h3)).toBeGreaterThan(10);
  });
  
  it('throws on wrong buffer size', () => {
    expect(() => dHash(new Uint8Array(70))).toThrow(/72 bytes/);
  });
});

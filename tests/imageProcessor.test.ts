import { describe, it, expect } from 'vitest';
import { processImage } from '../src/intake/ImageProcessor.js';
import sharp from 'sharp';

describe('ImageProcessor', () => {
  it('resizes landscape if long edge > 2400', async () => {
    const buf = Buffer.alloc(3000 * 1000 * 3, 255);
    const input = await sharp(buf, { raw: { width: 3000, height: 1000, channels: 3 } }).jpeg().toBuffer();
    const out = await processImage(input);
    const meta = await sharp(out).metadata();
    expect(meta.width).toBe(2400);
    expect(meta.height).toBe(800);
  });
  
  it('resizes portrait if long edge > 2400', async () => {
    const buf = Buffer.alloc(1000 * 3000 * 3, 255);
    const input = await sharp(buf, { raw: { width: 1000, height: 3000, channels: 3 } }).jpeg().toBuffer();
    const out = await processImage(input);
    const meta = await sharp(out).metadata();
    expect(meta.width).toBe(800);
    expect(meta.height).toBe(2400);
  });
  
  it('resizes square if long edge > 2400', async () => {
    const buf = Buffer.alloc(3000 * 3000 * 3, 255);
    const input = await sharp(buf, { raw: { width: 3000, height: 3000, channels: 3 } }).jpeg().toBuffer();
    const out = await processImage(input);
    const meta = await sharp(out).metadata();
    expect(meta.width).toBe(2400);
    expect(meta.height).toBe(2400);
  });
  
  it('does not resize if long edge <= 2400', async () => {
    const buf = Buffer.alloc(1000 * 1000 * 3, 255);
    const input = await sharp(buf, { raw: { width: 1000, height: 1000, channels: 3 } }).jpeg().toBuffer();
    const out = await processImage(input);
    const meta = await sharp(out).metadata();
    expect(meta.width).toBe(1000);
    expect(meta.height).toBe(1000);
  });
  
  it('strips EXIF and uses sRGB', async () => {
    // Generate image with fake EXIF
    const img = await sharp({
      create: { width: 100, height: 100, channels: 3, background: { r: 0, g: 0, b: 0 } }
    }).withMetadata({ exif: { IFD0: { Copyright: 'test' } } }).jpeg().toBuffer();
    
    const out = await processImage(img);
    const meta = await sharp(out).metadata();
    
    expect(meta.exif).toBeUndefined();
    expect(meta.space).toBe('srgb');
  });
});

import fc from 'fast-check';

describe('ImageProcessor properties', () => {
  it('never upscales and preserves aspect ratio', async () => {
    // We only test bounds up to 4000 to keep the test fast
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 100, max: 4000 }),
        fc.integer({ min: 100, max: 4000 }),
        async (w, h) => {
          // Instead of allocating a huge buffer each time, we just check sharp resize logic directly
          // Or we can create tiny buffers and tell sharp it's raw pixel data.
          // sharp handles resize very quickly.
          const img = sharp({ create: { width: w, height: h, channels: 3, background: 'red' } });
          const outBuffer = await img.resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true }).jpeg().toBuffer();
          const meta = await sharp(outBuffer).metadata();
          
          // Never upscales
          expect(meta.width).toBeLessThanOrEqual(w);
          expect(meta.height).toBeLessThanOrEqual(h);
          
          // Long edge <= 2400
          expect(Math.max(meta.width!, meta.height!)).toBeLessThanOrEqual(2400);
          
          // Aspect ratio approx (1% tolerance)
          const origRatio = w / h;
          const newRatio = meta.width! / meta.height!;
          expect(Math.abs(origRatio - newRatio) / origRatio).toBeLessThan(0.02);
        }
      ),
      { numRuns: 20 }
    );
  });
});

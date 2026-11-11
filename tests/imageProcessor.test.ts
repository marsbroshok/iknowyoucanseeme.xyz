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

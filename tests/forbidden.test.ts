import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Forbidden content guard', () => {
  it('ensures no prices or € symbol in src/content', () => {
    const contentDir = path.resolve(__dirname, '../src/content');
    if (!fs.existsSync(contentDir)) return;

    const files = fs.readdirSync(contentDir, { recursive: true }) as string[];
    
    for (const f of files) {
      if (f.endsWith('.ts') || f.endsWith('.yaml') || f.endsWith('.md')) {
        const p = path.join(contentDir, f);
        try {
          const text = fs.readFileSync(p, 'utf-8');
          expect(text).not.toContain('€');
          expect(text).not.toMatch(/price:/i);
          expect(text).not.toMatch(/prix:/i);
        } catch (err: unknown) {
          if (err instanceof Error && (err as Error & { code?: string }).code !== 'ENOENT') throw err;
        }
      }
    }
  });

  // Note: we don't strictly test EXIF in assets here because sharp strips it during intake. 
  // We tested the stripping logic in imageProcessor.test.ts.
});
import sharp from 'sharp';

describe('Forbidden assets guard', () => {
  it('ensures no upscaled or EXIF assets in src/assets', async () => {
    const assetsDir = path.resolve(__dirname, '../src/assets');
    if (!fs.existsSync(assetsDir)) return;

    const files = fs.readdirSync(assetsDir, { recursive: true }) as string[];
    
    for (const f of files) {
      if (f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.png')) {
        const p = path.join(assetsDir, f);
        if (fs.statSync(p).isFile()) {
          const meta = await sharp(p).metadata();
          const maxDim = Math.max(meta.width || 0, meta.height || 0);
          expect(maxDim).toBeLessThanOrEqual(2400);
          expect(meta.exif).toBeUndefined();
        }
      }
    }
  });
});



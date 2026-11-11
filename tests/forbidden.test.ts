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
        const text = fs.readFileSync(p, 'utf-8');
        expect(text).not.toContain('€');
        expect(text).not.toMatch(/price:/i);
        expect(text).not.toMatch(/prix:/i);
      }
    }
  });

  // Note: we don't strictly test EXIF in assets here because sharp strips it during intake. 
  // We tested the stripping logic in imageProcessor.test.ts.
});
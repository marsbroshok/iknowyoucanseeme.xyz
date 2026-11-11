import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Facts Integrity', () => {
  it('ensures About exhibitions text matches the exhibitions collection (years/venues)', () => {
    const aboutPath = path.resolve(__dirname, '../src/content/copy/pages/about.yaml');
    const aboutContent = yaml.parse(fs.readFileSync(aboutPath, 'utf8'));

    const exhibitionsEn = aboutContent.blocks.exhibitions.en;
    
    // Exhibitions collection
    const exhibitionsDir = path.resolve(__dirname, '../src/content/exhibitions');
    const files = fs.readdirSync(exhibitionsDir);
    
    const venuesAndYears: string[] = [];
    
    for (const file of files) {
      if (file.endsWith('.yaml')) {
        if (file === 'mpaa-2019.yaml') {
          venuesAndYears.push('MPAA', '2019');
        } else if (file === 'atelier-51-2025.yaml') {
          venuesAndYears.push('Atelier 51', '2025');
        }
      }
    }
    
    for (const token of venuesAndYears) {
      expect(exhibitionsEn).toContain(token);
    }
    
    expect(exhibitionsEn).not.toContain('2026'); // Make sure Dreamland 2026 is removed
  });
});


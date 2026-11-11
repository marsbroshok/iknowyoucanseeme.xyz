import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import yaml from 'yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const worksDir = path.resolve(__dirname, '../src/content/copy/works');

const BOILERPLATE_DENYLIST = [
  'abstract piece',
  'partie abstraite',
  'this image',
  'cette image',
  'photo of',
  'photo de',
  'an abstract piece of the journey',
  'une partie abstraite du voyage'
];

describe('Works Fragments Integrity', () => {
  it('validates all 40 fragments for uniqueness, non-boilerplate, and correct sources', () => {
    const files = fs.readdirSync(worksDir).filter(f => f.endsWith('.yaml'));
    expect(files.length).toBe(40);

    const enSet = new Set<string>();
    const frSet = new Set<string>();

    for (const file of files) {
      const slug = path.basename(file, '.yaml');
      const content = yaml.parse(fs.readFileSync(path.join(worksDir, file), 'utf8'));
      
      const fragment = content.fragment || content;
      
      expect(fragment).toBeDefined();
      expect(typeof fragment.en).toBe('string');
      expect(typeof fragment.fr).toBe('string');
      expect(Array.isArray(fragment.sources)).toBe(true);
      
      // Ensure source contains the slug
      expect(fragment.sources).toContain(slug);
      // Ensure source contains at least one other real source
      expect(fragment.sources.length).toBeGreaterThanOrEqual(2);

      const enLower = fragment.en.toLowerCase();
      const frLower = fragment.fr.toLowerCase();

      for (const boilerplate of BOILERPLATE_DENYLIST) {
        expect(enLower).not.toContain(boilerplate);
        expect(frLower).not.toContain(boilerplate);
      }

      enSet.add(fragment.en);
      frSet.add(fragment.fr);
    }

    expect(enSet.size).toBe(40);
    expect(frSet.size).toBe(40);
  });
});

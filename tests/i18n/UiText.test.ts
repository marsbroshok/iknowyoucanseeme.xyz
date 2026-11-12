import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { UiText } from '../../src/i18n/UiText.js';
import { UI_BLOCKS, parseUiBlocks, uiText } from '../../src/i18n/UiCatalog.js';

const block = (en: string, fr: string) => ({ status: 'draft' as const, en, fr, sources: ['spec'] });

describe('UiText', () => {
  it('returns the string in its locale', () => {
    const blocks = { hello: block('Hello', 'Bonjour') };
    expect(new UiText(blocks, 'en').t('hello')).toBe('Hello');
    expect(new UiText(blocks, 'fr').t('hello')).toBe('Bonjour');
  });

  it('throws on a missing key instead of falling back', () => {
    expect(() => new UiText({}, 'fr').t('nope')).toThrow(/Missing UI string "nope"/);
  });
});

describe('UiCatalog', () => {
  it('parses blocks and tolerates a page without blocks', () => {
    expect(parseUiBlocks('slug: ui\n')).toEqual({});
    expect(parseUiBlocks('slug: ui\nblocks:\n  a:\n    status: draft\n    en: A\n    fr: B\n    sources: [x]\n').a.fr).toBe('B');
  });

  it('rejects an invalid document', () => {
    expect(() => parseUiBlocks('slug: nope\n')).toThrow();
  });

  it('loads the real ui.yaml', () => {
    expect(uiText('fr').t('nav_works')).toBe('Œuvres');
    expect(uiText('en').t('nav_works')).toBe('Works');
  });

  it('every key used by a component or page exists in ui.yaml', () => {
    const roots = ['src/components', 'src/pages'].map((d) => path.resolve(__dirname, '../..', d));
    const used = new Set<string>();
    const walk = (dir: string): void => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.(astro|ts)$/.test(entry.name)) {
          for (const m of fs.readFileSync(full, 'utf8').matchAll(/\bt\('([a-z_]+)'\)/g)) used.add(m[1]);
        }
      }
    };
    roots.forEach(walk);
    expect(used.size).toBeGreaterThan(0);
    for (const key of used) {
      expect(UI_BLOCKS, `ui.yaml is missing "${key}"`).toHaveProperty(key);
    }
  });
});

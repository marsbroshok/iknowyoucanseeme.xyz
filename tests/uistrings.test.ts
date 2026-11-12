import { describe, it, expect, vi } from 'vitest';
import { loadUIStrings, getUIString } from '../src/i18n/UIStrings.js';
import fs from 'node:fs';

vi.mock('node:fs', () => ({
  default: {
    readFileSync: vi.fn()
  }
}));

describe('UIStrings', () => {
  it('loads UI strings from yaml', () => {
    const yamlContent = `
slug: ui
blocks:
  welcome:
    status: artist-edited
    en: Welcome
    fr: Bienvenue
    sources: [ "author" ]
`;
    vi.mocked(fs.readFileSync).mockReturnValue(yamlContent);
    const ui = loadUIStrings('dummy/path.yaml');
    expect(ui).toHaveProperty('welcome');
    expect(ui.welcome.en).toBe('Welcome');
    expect(ui.welcome.fr).toBe('Bienvenue');
    expect(getUIString(ui, 'welcome', 'fr')).toBe('Bienvenue');
  });

  it('handles empty blocks gracefully', () => {
    const yamlContent = `
slug: ui
`;
    vi.mocked(fs.readFileSync).mockReturnValue(yamlContent);
    const ui = loadUIStrings('dummy/path.yaml');
    expect(ui).toEqual({});
  });

  it('getUIString falls back to en and warns, or to key if en missing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const ui = {
      only_en: {
        status: 'draft' as const,
        en: 'Only English',
        fr: '',
        sources: []
      },
      no_lang: {
        status: 'draft' as const,
        en: '',
        fr: '',
        sources: []
      }
    };
    
    expect(getUIString(ui, 'only_en', 'fr')).toBe('Only English');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('falling back to en'));
    
    expect(getUIString(ui, 'missing_key', 'en')).toBe('missing_key');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Missing UI string'));

    expect(getUIString(ui, 'no_lang', 'fr')).toBe('no_lang');
    
    warn.mockRestore();
  });
});

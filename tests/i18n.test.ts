import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { RouteMap, type RouteKey, type Locale } from '../src/i18n/RouteMap.js';
import { localizedPath, pathToKey } from '../src/i18n/LocalizedPath.js';
import { alternateLinks } from '../src/i18n/Alternates.js';
import { getPreferredLocale } from '../src/i18n/ChooseLocale.js';

describe('i18n Route Helpers', () => {
  it('every key has en and fr', () => {
    for (const value of Object.values(RouteMap)) {
      expect(value).toHaveProperty('en');
      expect(value).toHaveProperty('fr');
      expect(typeof value.en).toBe('string');
      expect(typeof value.fr).toBe('string');
    }
  });

  it('no collisions between route segments', () => {
    const enSegments = new Set<string>();
    const frSegments = new Set<string>();
    for (const value of Object.values(RouteMap)) {
      expect(enSegments.has(value.en)).toBe(false);
      enSegments.add(value.en);
      expect(frSegments.has(value.fr)).toBe(false);
      frSegments.add(value.fr);
    }
  });

  it('property test: pathToKey(localizedPath(k, l, p)) round-trips', () => {
    const keys = Object.keys(RouteMap) as RouteKey[];
    
    fc.assert(
      fc.property(
        fc.constantFrom(...keys),
        fc.constantFrom('en', 'fr'),
        fc.array(fc.string({ minLength: 1 }).filter(s => !s.includes('/'))),
        (key, lang, params) => {
          const path = localizedPath(key as RouteKey, lang as Locale, params);
          const roundTrippedKey = pathToKey(path);
          expect(roundTrippedKey).toBe(key);
        }
      )
    );
  });

  it('alternateLinks returns expected links', () => {
    const links = alternateLinks('works', 'https://example.com');
    expect(links).toEqual([
      { href: 'https://example.com/en/works', hreflang: 'en' },
      { href: 'https://example.com/fr/oeuvres', hreflang: 'fr' },
      { href: 'https://example.com/en/works', hreflang: 'x-default' },
    ]);
  });
  
  it('alternateLinks works with params', () => {
    const links = alternateLinks('works', 'https://example.com', { en: ['item-1'], fr: ['item-fr'] });
    expect(links).toEqual([
      { href: 'https://example.com/en/works/item-1', hreflang: 'en' },
      { href: 'https://example.com/fr/oeuvres/item-fr', hreflang: 'fr' },
      { href: 'https://example.com/en/works/item-1', hreflang: 'x-default' },
    ]);
  });

  it('getPreferredLocale returns fr for fr-* and en otherwise', () => {
    expect(getPreferredLocale('fr-FR')).toBe('fr');
    expect(getPreferredLocale('fr-CA')).toBe('fr');
    expect(getPreferredLocale('fr')).toBe('fr');
    expect(getPreferredLocale('en-US')).toBe('en');
    expect(getPreferredLocale('es-ES')).toBe('en');
    expect(getPreferredLocale(undefined)).toBe('en');
  });

  it('pathToKey returns undefined for unknown paths or segments', () => {
    expect(pathToKey('/en')).toBeUndefined();
    expect(pathToKey('/de/works')).toBeUndefined();
    expect(pathToKey('/en/unknown-segment')).toBeUndefined();
  });
});

import { describe, it, expect } from 'vitest';
import { buildPersonJsonLd, buildVisualArtworkJsonLd } from '../../src/domain/JsonLd.js';
import type { Work } from '../../src/content/schema/index.js';

describe('JsonLd', () => {
  it('buildPersonJsonLd', () => {
    expect(buildPersonJsonLd('Artist', 'https://ex.com')).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: 'Artist',
      url: 'https://ex.com'
    });
  });

  it('buildVisualArtworkJsonLd with size and en title', () => {
    const work = {
      title: { fr: 'FR', en: 'EN' },
      year: 2020,
      medium: 'photo',
      size: { w: 10, h: 20, unit: 'cm' }
    } as Work;
    const ld = buildVisualArtworkJsonLd(work, 'Artist', 'https://ex.com');
    expect(ld.name).toBe('FR / EN');
    expect(ld.creator.name).toBe('Artist');
    expect(ld.dateCreated).toBe('2020');
    expect(ld.width).toBe('10 cm');
    expect(ld.height).toBe('20 cm');
  });

  it('buildVisualArtworkJsonLd without size and en title', () => {
    const work = {
      title: { fr: 'FR' },
      year: 2021,
      medium: 'ceramic'
    } as Work;
    const ld = buildVisualArtworkJsonLd(work, 'Artist', 'https://ex.com');
    expect(ld.name).toBe('FR');
    expect(ld.width).toBeUndefined();
  });
});

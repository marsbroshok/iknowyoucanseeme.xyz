import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { specimenLabels } from '../../src/domain/SpecimenLabel.js';
import { uiText } from '../../src/i18n/UiCatalog.js';
import type { Work } from '../../src/content/schema/index.js';

const w = (slug: string, over: Partial<Work> = {}): Work => ({
  slug,
  title: { fr: slug },
  territory: 'dreamland',
  zone: 'leak',
  year: 2025,
  medium: 'photo',
  availability: 'unknown',
  images: [],
  ...over,
});

const leak = [
  w('venise-portrait-11'),
  w('esquisse-argile-2', { medium: 'ceramic', year: 2026 }),
  w('venise-portrait-5'),
  w('venise-portrait-9'),
  w('esquisse-argile-1', { medium: 'ceramic', year: 2026 }),
];

describe('specimenLabels', () => {
  it('labels Venice portraits as numbered specimens with place and year, like a museum tag (FR)', () => {
    const labels = specimenLabels(leak, uiText('fr'));
    expect(labels.get('venise-portrait-5')).toBe('spécimen 01 · Venise · 2025');
    expect(labels.get('venise-portrait-9')).toBe('spécimen 02 · Venise · 2025');
    expect(labels.get('venise-portrait-11')).toBe('spécimen 03 · Venise · 2025');
  });

  it('labels clay works as sketches, numbered on their own (EN)', () => {
    const labels = specimenLabels(leak, uiText('en'));
    expect(labels.get('esquisse-argile-1')).toBe('sketch 01 · clay · 2026');
    expect(labels.get('esquisse-argile-2')).toBe('sketch 02 · clay · 2026');
    expect(labels.get('venise-portrait-5')).toBe('specimen 01 · Venice · 2025');
  });

  it('only labels works of the Leak zone', () => {
    const labels = specimenLabels([w('arrivee', { zone: 'arrival' }), w('solitude', { zone: undefined }), ...leak], uiText('en'));
    expect(labels.has('arrivee')).toBe(false);
    expect(labels.has('solitude')).toBe(false);
    expect(labels.size).toBe(leak.length);
  });

  it('leaves out the place of a photograph from a series without a known place', () => {
    expect(specimenLabels([w('nuit-1', { year: 2024 })], uiText('en')).get('nuit-1')).toBe('specimen 01 · 2024');
  });

  it('numbers older works first, then by the number in the name', () => {
    const labels = specimenLabels([w('venise-portrait-2', { year: 2026 }), w('venise-portrait-30', { year: 2024 })], uiText('en'));
    expect(labels.get('venise-portrait-30')).toBe('specimen 01 · Venice · 2024');
    expect(labels.get('venise-portrait-2')).toBe('specimen 02 · Venice · 2026');
  });

  it('breaks ties by slug, and puts a name without a number first', () => {
    const labels = specimenLabels([w('venise-portrait-5'), w('nuit'), w('autre-5')], uiText('en'));
    expect(labels.get('nuit')).toBe('specimen 01 · 2025');
    expect(labels.get('autre-5')).toBe('specimen 02 · 2025');
    expect(labels.get('venise-portrait-5')).toBe('specimen 03 · Venice · 2025');
  });

  it('property: numbers are 1…n per kind without gaps, whatever the input order', () => {
    fc.assert(
      fc.property(fc.shuffledSubarray(leak, { minLength: 0 }), (works) => {
        const labels = [...specimenLabels(works, uiText('en')).values()];
        for (const kind of ['specimen', 'sketch']) {
          const numbers = labels.filter((l) => l.startsWith(`${kind} `)).map((l) => Number(l.split(' ')[1])).sort((a, b) => a - b);
          expect(numbers).toEqual(numbers.map((_, i) => i + 1));
        }
      }),
    );
  });
});

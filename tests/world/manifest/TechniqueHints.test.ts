import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { techniqueHints, TECHNIQUE_KEYS } from '../../../src/world/manifest/TechniqueHints.js';

describe('techniqueHints', () => {
  it('reads the artist\'s own technique words, in English and French', () => {
    expect(techniqueHints(['Cygne (ICM) 7'])).toEqual(['icm']);
    expect(techniqueHints(['#icm #birdlover #blurred'])).toEqual(['icm']);
    expect(techniqueHints(['Intentional camera movement, slow pan'])).toEqual(['icm']);
    expect(techniqueHints(['Éclipse au miroir 10'])).toEqual(['mirror']);
    expect(techniqueHints(['Custom handheld mirror deflections, selective neutral density, and forced internal reflections. Single exposure / in-camera.'])).toEqual([
      'mirror',
      'filter',
    ]);
    expect(techniqueHints(['ND filter, 30 s'])).toEqual(['filter']);
    expect(techniqueHints(['tirage avec filtres colorés'])).toEqual(['filter']);
    expect(techniqueHints(['A double exposure on film'])).toEqual(['multiple-exposure']);
    expect(techniqueHints(['exposition multiple'])).toEqual(['multiple-exposure']);
    expect(techniqueHints(['Les reflets II'])).toEqual(['mirror']);
  });

  it('does not mistake ordinary words for techniques', () => {
    expect(techniqueHints(['Single exposure / in-camera.', 'Mindful walk', 'and', 'filtering water', 'bend'])).toEqual([]);
    expect(techniqueHints([])).toEqual([]);
  });

  it('accepts declared technique keys as they are', () => {
    expect(techniqueHints(['multiple-exposure'])).toEqual(['multiple-exposure']);
  });

  it('returns known keys only, each once, in canonical order (property)', () => {
    fc.assert(
      fc.property(fc.array(fc.string()), (texts) => {
        const keys = techniqueHints(texts);
        expect(new Set(keys).size).toBe(keys.length);
        expect(keys).toEqual(TECHNIQUE_KEYS.filter((k) => keys.includes(k)));
      }),
    );
  });
});

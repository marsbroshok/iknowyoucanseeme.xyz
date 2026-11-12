import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { TERRITORY_ORDER, sortTerritories } from '../../src/domain/TerritoryOrder.js';

describe('TERRITORY_ORDER', () => {
  it('starts with Dreamland, then the border is thin', () => {
    expect(TERRITORY_ORDER).toEqual(['dreamland', 'the-border-is-thin']);
  });
});

describe('sortTerritories', () => {
  it('puts known territories in narrative order whatever the input order', () => {
    const input = [{ slug: 'the-border-is-thin' }, { slug: 'dreamland' }];
    expect(sortTerritories(input).map((t) => t.slug)).toEqual(['dreamland', 'the-border-is-thin']);
  });

  it('puts unknown territories after the known ones, alphabetically, and does not mutate the input', () => {
    const input = [{ slug: 'zeta' }, { slug: 'the-border-is-thin' }, { slug: 'alpha' }, { slug: 'dreamland' }];
    const copy = input.map((t) => ({ ...t }));
    expect(sortTerritories(input).map((t) => t.slug)).toEqual(['dreamland', 'the-border-is-thin', 'alpha', 'zeta']);
    expect(input).toEqual(copy);
  });

  it('is independent of input order (property)', () => {
    const slugs = fc.uniqueArray(fc.oneof(fc.constantFrom(...TERRITORY_ORDER), fc.stringMatching(/^[a-z]{1,8}$/)), { minLength: 1, maxLength: 8 });
    fc.assert(
      fc.property(slugs, fc.integer(), (list, seed) => {
        const items = list.map((slug) => ({ slug }));
        const shuffled = [...items].sort((a, b) => ((a.slug.length * 31 + seed) % 7) - ((b.slug.length * 31 + seed) % 7));
        expect(sortTerritories(shuffled).map((t) => t.slug)).toEqual(sortTerritories(items).map((t) => t.slug));
      }),
    );
  });
});

/**
 * Narrative order of the territories: Dreamland first (the drift starts at
 * its Arrival), then later territories as they were added. Content
 * collections come back in filesystem order, which is not stable across
 * machines, so every list of territories is sorted with this order.
 */
export const TERRITORY_ORDER = ['dreamland', 'the-border-is-thin'] as const;

/**
 * Sorts territories into {@link TERRITORY_ORDER}; territories not in the list
 * follow, alphabetically by slug. Returns a new array; the input is unchanged.
 *
 * @param territories - Anything with a `slug`.
 * @returns The same items in narrative order.
 */
export function sortTerritories<T extends { slug: string }>(territories: readonly T[]): T[] {
  const rank = (slug: string): number => {
    const index = (TERRITORY_ORDER as readonly string[]).indexOf(slug);
    return index === -1 ? TERRITORY_ORDER.length : index;
  };
  return [...territories].sort((a, b) => rank(a.slug) - rank(b.slug) || a.slug.localeCompare(b.slug));
}

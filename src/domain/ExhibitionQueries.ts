/** Minimal shape needed to order exhibitions. */
export interface DatedExhibition {
  slug: string;
  year: number;
}

/**
 * Orders exhibitions for the CV list: newest year first, then slug
 * descending as a stable tie-break. Does not mutate the input.
 *
 * @param exhibitions - Exhibitions to sort.
 * @returns A new, reverse-chronological array.
 */
export function sortExhibitions<T extends DatedExhibition>(exhibitions: readonly T[]): T[] {
  return [...exhibitions].sort((a, b) => b.year - a.year || b.slug.localeCompare(a.slug));
}

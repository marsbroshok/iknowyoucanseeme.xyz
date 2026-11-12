import type { Work } from '../content/schema/index.js';

/**
 * Narrative order of the Dreamland zones: Arrival → Lens → Leak.
 * Works without a zone sort after every zoned work.
 */
export const ZONE_ORDER = ['arrival', 'lens', 'leak'] as const;

/** A zone slug, as declared on a work. */
export type ZoneSlug = (typeof ZONE_ORDER)[number];

/** The works immediately before and after a given work in a list. */
export interface PrevNext {
  /** The previous work, or `null` when the work is first (or not found). */
  prev: Work | null;
  /** The next work, or `null` when the work is last (or not found). */
  next: Work | null;
}

/**
 * Position of a zone in {@link ZONE_ORDER}; works without a zone get the
 * position after the last zone.
 *
 * @param zone - The work's zone, if any.
 * @returns A sortable rank (0-based).
 */
function zoneRank(zone: ZoneSlug | undefined): number {
  return zone === undefined ? ZONE_ORDER.length : ZONE_ORDER.indexOf(zone);
}

/**
 * Comparator inside one territory: zone order, then newest year first,
 * then slug (alphabetical) as a stable tie-break.
 */
function compareWithinTerritory(a: Work, b: Work): number {
  const zoneDiff = zoneRank(a.zone) - zoneRank(b.zone);
  if (zoneDiff !== 0) return zoneDiff;
  if (a.year !== b.year) return b.year - a.year;
  return a.slug.localeCompare(b.slug);
}

/**
 * Sorts works by zone order (Arrival → Lens → Leak → no zone), then year
 * (newest first), then slug. Does not mutate the input.
 *
 * @param works - Works to sort.
 * @returns A new sorted array.
 */
export function sortWorksByZone(works: readonly Work[]): Work[] {
  return [...works].sort(compareWithinTerritory);
}

/**
 * Sorts works for the works index: by territory slug, then like
 * {@link sortWorksByZone}. Does not mutate the input.
 *
 * @param works - Works to sort.
 * @returns A new sorted array.
 */
export function sortWorksForIndex(works: readonly Work[]): Work[] {
  return [...works].sort((a, b) => a.territory.localeCompare(b.territory) || compareWithinTerritory(a, b));
}

/**
 * Works of one territory, in zone order.
 *
 * @param works - All works.
 * @param territory - Territory slug.
 * @returns The territory's works, sorted with {@link sortWorksByZone}.
 */
export function getWorksByTerritory(works: readonly Work[], territory: string): Work[] {
  return sortWorksByZone(works.filter((w) => w.territory === territory));
}

/**
 * Finds the previous and next works around `currentSlug`, inside its
 * territory when `territory` is given, otherwise in index order.
 *
 * @param works - All works.
 * @param currentSlug - Slug of the current work.
 * @param territory - Optional territory slug that bounds the chain.
 * @returns Neighbours; both `null` when the slug is not in the list.
 */
export function getPrevNextWork(works: readonly Work[], currentSlug: string, territory?: string): PrevNext {
  const contextWorks = territory ? getWorksByTerritory(works, territory) : sortWorksForIndex(works);
  const idx = contextWorks.findIndex((w) => w.slug === currentSlug);
  if (idx === -1) return { prev: null, next: null };
  return {
    prev: idx > 0 ? contextWorks[idx - 1] : null,
    next: idx < contextWorks.length - 1 ? contextWorks[idx + 1] : null,
  };
}

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

/** Exhibition data as stored in `src/content/exhibitions/`. */
export interface ExhibitionData extends DatedExhibition {
  title?: Record<string, string>;
  venue: string;
  dates?: Record<string, string>;
}

/** One line of the exhibitions CV in one locale. */
export interface ExhibitionView {
  slug: string;
  title: string;
  venue: string;
  year: number;
  dates?: string;
}

/**
 * Builds the reverse-chronological exhibitions list for one locale. Titles
 * are proper names: the locale title is used when given, else the original
 * (French) title.
 *
 * @param exhibitions - Exhibition data.
 * @param lang - Locale.
 * @returns Display lines, newest first.
 * @throws Error when an exhibition has neither a locale nor a French title.
 */
export function buildExhibitionViews(exhibitions: readonly ExhibitionData[], lang: 'en' | 'fr'): ExhibitionView[] {
  return sortExhibitions(exhibitions).map((e) => {
    const title = e.title?.[lang] ?? e.title?.fr;
    if (!title) throw new Error(`[content] Missing title for exhibition "${e.slug}"`);
    return { slug: e.slug, title, venue: e.venue, year: e.year, dates: e.dates?.[lang] };
  });
}

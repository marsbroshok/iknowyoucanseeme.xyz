import type { Work } from '../content/schema/index.js';

/** schema.org `Person` node. */
export interface PersonJsonLd {
  '@context': 'https://schema.org';
  '@type': 'Person';
  name: string;
  url: string;
}

/** schema.org `VisualArtwork` node (subset used on work pages). */
export interface VisualArtworkJsonLd {
  '@context': 'https://schema.org';
  '@type': 'VisualArtwork';
  name: string;
  url: string;
  creator: { '@type': 'Person'; name: string };
  dateCreated: string;
  artMedium: string;
  /** Physical width, e.g. `"30 cm"`; omitted when the size is unknown. */
  width?: string;
  /** Physical height, e.g. `"40 cm"`; omitted when the size is unknown. */
  height?: string;
}

/**
 * Builds the `Person` JSON-LD for the artist.
 *
 * @param name - Artist name.
 * @param url - Canonical URL describing the person (the About page).
 * @returns A serialisable JSON-LD object.
 */
export function buildPersonJsonLd(name: string, url: string): PersonJsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name,
    url,
  };
}

/**
 * Builds the `VisualArtwork` JSON-LD for a work page. Never includes any
 * price or offer data.
 *
 * @param work - The work.
 * @param creatorName - Artist name.
 * @param url - Canonical URL of the work page.
 * @returns A serialisable JSON-LD object.
 */
export function buildVisualArtworkJsonLd(work: Work, creatorName: string, url: string): VisualArtworkJsonLd {
  const ld: VisualArtworkJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'VisualArtwork',
    name: work.title.en ? `${work.title.fr} / ${work.title.en}` : work.title.fr,
    url,
    creator: {
      '@type': 'Person',
      name: creatorName,
    },
    dateCreated: work.year.toString(),
    artMedium: work.medium,
  };
  if (work.size) {
    ld.width = `${work.size.w} ${work.size.unit}`;
    ld.height = `${work.size.h} ${work.size.unit}`;
  }
  return ld;
}

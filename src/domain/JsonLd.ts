import type { Work } from '../content/schema/index.js';

export function buildPersonJsonLd(name: string, url: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name,
    url
  };
}

export function buildVisualArtworkJsonLd(work: Work, creatorName: string, url: string) {
  const ld: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'VisualArtwork',
    name: work.title.en ? `${work.title.fr} / ${work.title.en}` : work.title.fr,
    url,
    creator: {
      '@type': 'Person',
      name: creatorName
    },
    dateCreated: work.year.toString(),
    artMedium: work.medium
  };
  if (work.size) {
    ld.width = `${work.size.w} ${work.size.unit}`;
    ld.height = `${work.size.h} ${work.size.unit}`;
  }
  return ld;
}

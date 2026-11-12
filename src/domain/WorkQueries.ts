import type { Work } from '../content/schema/index.js';

export const ZONE_ORDER = ['arrival', 'lens', 'leak'] as const;

function getZoneIndex(zone?: string) {
  if (!zone) return 99;
  const idx = ZONE_ORDER.indexOf(zone as any);
  return idx >= 0 ? idx : 99;
}

export function sortWorksByZone(works: Work[]): Work[] {
  return [...works].sort((a, b) => {
    const zoneDiff = getZoneIndex(a.zone) - getZoneIndex(b.zone);
    if (zoneDiff !== 0) return zoneDiff;
    if (a.year !== b.year) return b.year - a.year;
    return a.slug.localeCompare(b.slug);
  });
}

export function sortWorksForIndex(works: Work[]): Work[] {
  return [...works].sort((a, b) => {
    const t = a.territory.localeCompare(b.territory);
    if (t !== 0) return t;
    const zoneDiff = getZoneIndex(a.zone) - getZoneIndex(b.zone);
    if (zoneDiff !== 0) return zoneDiff;
    if (a.year !== b.year) return b.year - a.year;
    return a.slug.localeCompare(b.slug);
  });
}

export function getWorksByTerritory(works: Work[], territory: string): Work[] {
  return sortWorksByZone(works.filter(w => w.territory === territory));
}

export function getPrevNextWork(works: Work[], currentSlug: string, territory?: string): { prev: Work | null, next: Work | null } {
  const contextWorks = territory ? getWorksByTerritory(works, territory) : sortWorksForIndex(works);
  const idx = contextWorks.findIndex(w => w.slug === currentSlug);
  if (idx === -1) return { prev: null, next: null };
  return {
    prev: idx > 0 ? contextWorks[idx - 1] : null,
    next: idx < contextWorks.length - 1 ? contextWorks[idx + 1] : null
  };
}

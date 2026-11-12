import { getEntry, type CollectionEntry } from 'astro:content';

type MergeableCollections = 'works' | 'territories' | 'zones';
type CopyCollections = 'copyWorks' | 'copyTerritories' | 'copyZones';

export async function withCopy<T extends CollectionEntry<MergeableCollections>>(
  entry: T
): Promise<T> {
  let copyCollection: CopyCollections;
  if (entry.collection === 'works') copyCollection = 'copyWorks';
  else if (entry.collection === 'territories') copyCollection = 'copyTerritories';
  else if (entry.collection === 'zones') copyCollection = 'copyZones';
  else return entry;

  const copyEntry = await getEntry(copyCollection, entry.id);

  if (!copyEntry) {
    console.warn(`[content] Missing copy for ${entry.collection}/${entry.id}`);
    
    // Explicitly set undefined for missing copy parts based on collection
    const newData = { ...entry.data } as Record<string, unknown>;
    if (entry.collection === 'works') {
      newData.fragment = undefined;
    } else {
      newData.statement = undefined;
    }

    return {
      ...entry,
      data: newData
    };
  }

  return {
    ...entry,
    data: {
      ...entry.data,
      ...copyEntry.data
    }
  };
}

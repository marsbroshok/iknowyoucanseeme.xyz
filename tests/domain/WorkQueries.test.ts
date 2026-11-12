import { describe, it, expect } from 'vitest';
import {
  sortWorksByZone,
  sortWorksForIndex,
  getWorksByTerritory,
  getPrevNextWork
} from '../../src/domain/WorkQueries.js';
import type { Work } from '../../src/content/schema/index.js';

const mockWork = (slug: string, territory: string, zone?: 'arrival'|'lens'|'leak', year: number = 2020): Work => ({
  slug,
  territory,
  zone,
  year,
  title: { fr: slug },
  medium: 'photo',
  availability: 'available',
  images: [],
});

describe('WorkQueries', () => {
  it('sortWorksByZone orders by zone Arrival -> Lens -> Leak -> undefined, then year, then slug', () => {
    const works = [
      mockWork('z', 'dreamland', undefined, 2021),
      mockWork('b', 'dreamland', 'leak', 2021),
      mockWork('a', 'dreamland', 'arrival', 2021),
      mockWork('c', 'dreamland', 'lens', 2021),
      mockWork('a-old', 'dreamland', 'arrival', 2020),
      mockWork('z2', 'dreamland', undefined, 2021)
    ];
    const sorted = sortWorksByZone(works);
    expect(sorted.map(w => w.slug)).toEqual(['a', 'a-old', 'c', 'b', 'z', 'z2']);
  });

  it('sortWorksForIndex orders by territory, then zone, then year desc, then slug', () => {
    const works = [
      mockWork('b', 't2', 'arrival', 2021),
      mockWork('a', 't1', 'lens', 2021),
      mockWork('a-old', 't1', 'lens', 2020),
      mockWork('c', 't1', 'arrival', 2021)
    ];
    const sorted = sortWorksForIndex(works);
    expect(sorted.map(w => w.slug)).toEqual(['c', 'a', 'a-old', 'b']);
  });

  it('getWorksByTerritory filters and sorts by zone', () => {
    const works = [
      mockWork('b', 't1', 'lens'),
      mockWork('a', 't2', 'arrival'),
      mockWork('c', 't1', 'arrival')
    ];
    const filtered = getWorksByTerritory(works, 't1');
    expect(filtered.map(w => w.slug)).toEqual(['c', 'b']);
  });

  it('getPrevNextWork finds adjacent works in territory context', () => {
    const works = [
      mockWork('b', 't1', 'lens'),
      mockWork('a', 't1', 'arrival'),
      mockWork('c', 't2', 'arrival') // not in t1
    ];
    const { prev, next } = getPrevNextWork(works, 'b', 't1');
    // sorted: a (arrival), b (lens)
    expect(prev?.slug).toBe('a');
    expect(next).toBeNull();
  });

  it('getPrevNextWork returns nulls if work not found', () => {
    const { prev, next } = getPrevNextWork([mockWork('a', 't1')], 'b');
    expect(prev).toBeNull();
    expect(next).toBeNull();
  });

  it('getPrevNextWork without territory sorts for index', () => {
    const works = [
      mockWork('b', 't2', 'arrival'), // t2, arrival
      mockWork('a', 't1', 'lens'),    // t1, lens
      mockWork('c', 't1', 'arrival')  // t1, arrival
    ];
    // index order: c, a, b
    const { prev, next } = getPrevNextWork(works, 'a');
    expect(prev?.slug).toBe('c');
    expect(next?.slug).toBe('b');
  });
});

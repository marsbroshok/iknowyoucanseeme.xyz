import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { FieldLayout, FIELD, type LayoutWork, type Placement } from '../../../src/world/core/FieldLayout.js';

const TERRITORIES = ['dreamland', 'the-border-is-thin'];
const ZONES = ['arrival', 'lens', 'leak'] as const;

const distance = (a: Placement, b: Placement) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const groundDistance = (a: Placement, b: Placement) => Math.hypot(a.x - b.x, a.z - b.z);
const bySlug = (a: Placement, b: Placement) => a.slug.localeCompare(b.slug);

/** Random sets of works with unique slugs over both territories. */
const worksArb = fc
  .uniqueArray(fc.stringMatching(/^[a-z0-9-]{1,16}$/), { minLength: 1, maxLength: 60 })
  .chain((slugs) =>
    fc.tuple(
      ...slugs.map((slug) =>
        fc.record({
          slug: fc.constant(slug),
          territory: fc.constantFrom(...TERRITORIES),
          zone: fc.option(fc.constantFrom(...ZONES), { nil: undefined }),
        }),
      ),
    ),
  )
  .map((works) => works as LayoutWork[]);

describe('FieldLayout.compute', () => {
  const sample: LayoutWork[] = [
    { slug: 'arrivee', territory: 'dreamland', zone: 'arrival' },
    { slug: 'un-etranger', territory: 'dreamland', zone: 'arrival' },
    { slug: 'les-reflets-i', territory: 'dreamland', zone: 'lens' },
    { slug: 'solitude', territory: 'dreamland', zone: 'leak' },
    { slug: 'cygne-icm-1', territory: 'the-border-is-thin' },
  ];

  it('defines compact desktop spatial dimensions that preserve spacing and territory gaps', () => {
    expect(FIELD).toMatchObject({
      spacing: 3.2,
      pitch: 4.6,
      jitter: 0.7,
      lateral: 3.4,
      curveAmplitude: 2.4,
      curveWavelength: 64,
      zoneGap: 10,
      territoryDistance: 48,
      territoryGap: 30,
    });
    expect(FIELD.pitch - 2 * FIELD.jitter).toBeCloseTo(FIELD.spacing, 9);
    expect(FIELD.territoryDistance - 2 * (FIELD.curveAmplitude + FIELD.lateral)).toBeGreaterThanOrEqual(FIELD.territoryGap);
  });

  it('places every work once, with its territory and zone', () => {
    const { placements } = FieldLayout.compute(sample, TERRITORIES);
    expect(placements.map((p) => p.slug).sort()).toEqual(sample.map((w) => w.slug).sort());
    expect(placements.find((p) => p.slug === 'cygne-icm-1')).toMatchObject({ territory: 'the-border-is-thin', zone: null });
    expect(placements.find((p) => p.slug === 'solitude')).toMatchObject({ territory: 'dreamland', zone: 'leak' });
  });

  it('keeps works at eye level', () => {
    for (const p of FieldLayout.compute(sample, TERRITORIES).placements) {
      expect(p.y).toBeGreaterThanOrEqual(FIELD.minY);
      expect(p.y).toBeLessThanOrEqual(FIELD.maxY);
    }
  });

  it('starts the visitor before the first work of the first territory, looking down the path', () => {
    const { start, placements } = FieldLayout.compute(sample, TERRITORIES);
    expect(start.yaw).toBe(0);
    const dreamland = placements.filter((p) => p.territory === 'dreamland');
    expect(Math.max(...dreamland.map((p) => p.z))).toBeLessThan(start.z);
  });

  it('describes one region per territory zone, in path order, for the compass', () => {
    const { regions } = FieldLayout.compute(sample, TERRITORIES);
    expect(regions.map((r) => `${r.territory}/${r.zone ?? '-'}`)).toEqual([
      'dreamland/arrival',
      'dreamland/lens',
      'dreamland/leak',
      'the-border-is-thin/-',
    ]);
    for (const r of regions) expect(r.end.z).toBeLessThan(r.start.z);
  });

  it('fails on a duplicate slug or a territory it does not know', () => {
    expect(() => FieldLayout.compute([sample[0], sample[0]], TERRITORIES)).toThrow(/Duplicate work slug "arrivee"/);
    expect(() => FieldLayout.compute([{ slug: 'x', territory: 'elsewhere' }], TERRITORIES)).toThrow(/Unknown territory "elsewhere"/);
  });

  it('property: deterministic, whatever the input order (stable across builds)', () => {
    fc.assert(
      fc.property(worksArb, fc.integer(), (works, seed) => {
        const shuffled = [...works].sort((a, b) => ((a.slug.length * 31 + seed) % 7) - ((b.slug.length * 31 + seed) % 7));
        const first = FieldLayout.compute(works, TERRITORIES).placements.sort(bySlug);
        const second = FieldLayout.compute(shuffled, TERRITORIES).placements.sort(bySlug);
        expect(second).toEqual(first);
      }),
    );
  });

  it('property: no two works are closer than the minimum spacing (ground and 3D)', () => {
    fc.assert(
      fc.property(worksArb, (works) => {
        const { placements } = FieldLayout.compute(works, TERRITORIES);
        for (let i = 0; i < placements.length; i++) {
          for (let j = i + 1; j < placements.length; j++) {
            expect(groundDistance(placements[i], placements[j])).toBeGreaterThanOrEqual(FIELD.spacing);
            expect(distance(placements[i], placements[j])).toBeGreaterThanOrEqual(FIELD.spacing);
          }
        }
      }),
    );
  });

  it('property: consecutive works in each zone alternate left and right of the path within [0.6, lateral]', () => {
    fc.assert(
      fc.property(worksArb, (works) => {
        const { placements } = FieldLayout.compute(works, TERRITORIES);
        TERRITORIES.forEach((territory, territoryIndex) => {
          const anchorX = territoryIndex * FIELD.territoryDistance;
          for (const zone of [...ZONES, null]) {
            const ordered = placements
              .filter((p) => p.territory === territory && p.zone === zone)
              .sort((a, b) => a.progress - b.progress);
            ordered.forEach((p, i) => {
              const offset = p.x - (anchorX + FieldLayout.pathX(p.z));
              if (i % 2 === 0) {
                expect(offset).toBeLessThanOrEqual(-0.6);
                expect(offset).toBeGreaterThanOrEqual(-FIELD.lateral - 1e-9);
              } else {
                expect(offset).toBeGreaterThanOrEqual(0.6);
                expect(offset).toBeLessThanOrEqual(FIELD.lateral + 1e-9);
              }
            });
          }
        });
      }),
    );
  });

  it('property: zones run along the path Arrival → Lens → Leak, then works without a zone', () => {
    fc.assert(
      fc.property(worksArb, (works) => {
        const { placements } = FieldLayout.compute(works, TERRITORIES);
        for (const territory of TERRITORIES) {
          const progressOf = (zone: Placement['zone']) =>
            placements.filter((p) => p.territory === territory && p.zone === zone).map((p) => p.progress);
          const groups = [...ZONES, null].map(progressOf).filter((g) => g.length > 0);
          for (let g = 1; g < groups.length; g++) {
            expect(Math.max(...groups[g - 1])).toBeLessThan(Math.min(...groups[g]));
          }
        }
      }),
    );
  });

  it('property: progress grows as the path goes forward (towards -z)', () => {
    fc.assert(
      fc.property(worksArb, (works) => {
        const { placements } = FieldLayout.compute(works, TERRITORIES);
        for (const a of placements) {
          for (const b of placements) {
            if (a.territory === b.territory && a.progress < b.progress) expect(a.z).toBeGreaterThan(b.z);
          }
        }
      }),
    );
  });

  it('property: territories are distant regions', () => {
    fc.assert(
      fc.property(worksArb, (works) => {
        const { placements } = FieldLayout.compute(works, TERRITORIES);
        for (const a of placements) {
          for (const b of placements) {
            if (a.territory !== b.territory) {
              expect(groundDistance(a, b)).toBeGreaterThanOrEqual(FIELD.territoryGap);
              expect(distance(a, b)).toBeGreaterThanOrEqual(FIELD.territoryGap);
            }
          }
        }
      }),
    );
  });

  it('property: a territory\'s works do not move when another territory changes', () => {
    fc.assert(
      fc.property(worksArb, (works) => {
        const dreamOnly = works.filter((w) => w.territory === 'dreamland');
        const inFull = FieldLayout.compute(works, TERRITORIES).placements.filter((p) => p.territory === 'dreamland').sort(bySlug);
        expect(FieldLayout.compute(dreamOnly, TERRITORIES).placements.sort(bySlug)).toEqual(inFull);
      }),
    );
  });
});

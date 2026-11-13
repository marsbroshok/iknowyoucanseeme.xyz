import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { GATE, ZoneGates } from '../../../src/world/core/ZoneGates.js';
import { FIELD, FieldLayout, ZONE_ORDER, type LayoutWork } from '../../../src/world/core/FieldLayout.js';
import { ZoneAtmosphere } from '../../../src/world/core/ZoneAtmosphere.js';

describe('ZoneGates', () => {
  it('returns no gates for an empty field or a single-region field', () => {
    expect(ZoneGates.compute({ regions: [], placements: [] })).toEqual([]);
    const single = FieldLayout.compute([{ slug: 'a', territory: 'dreamland', zone: 'arrival' }], ['dreamland']);
    expect(ZoneGates.compute(single)).toEqual([]);
  });

  it('places portals centered in each zoneGap and ahead of secondary territories, tuned to the entered region', () => {
    const works: LayoutWork[] = [
      { slug: 'arr-1', territory: 'dreamland', zone: 'arrival' },
      { slug: 'arr-2', territory: 'dreamland', zone: 'arrival' },
      { slug: 'lens-1', territory: 'dreamland', zone: 'lens' },
      { slug: 'leak-1', territory: 'dreamland', zone: 'leak' },
      { slug: 'bor-1', territory: 'the-border-is-thin' },
    ];
    const layout = FieldLayout.compute(works, ['dreamland', 'the-border-is-thin']);
    const gates = ZoneGates.compute(layout);

    expect(gates).toHaveLength(3);
    expect(gates.map((g) => g.id)).toEqual(['dreamland:lens', 'dreamland:leak', 'the-border-is-thin:entry']);

    const [toLens, toLeak, toBorder] = gates;
    expect(toLens.from?.zone).toBe('arrival');
    expect(toLens.into.zone).toBe('lens');
    expect(toLens.z).toBeCloseTo((layout.regions[0].end.z + layout.regions[1].start.z) / 2, 9);
    expect(toLens.ribbons).toEqual(ZoneAtmosphere.forRegion(toLens.into).ribbons);
    expect(toLens.width).toBe(GATE.width);
    expect(toLens.height).toBe(GATE.height);
    expect(toLens.y).toBe(GATE.centerY);

    expect(toLeak.from?.zone).toBe('lens');
    expect(toLeak.into.zone).toBe('leak');
    expect(toLeak.z).toBeCloseTo((layout.regions[1].end.z + layout.regions[2].start.z) / 2, 9);
    expect(toLeak.ribbons).toEqual(ZoneAtmosphere.forRegion(toLeak.into).ribbons);

    expect(toBorder.from).toBeNull();
    expect(toBorder.into.territory).toBe('the-border-is-thin');
    expect(toBorder.z).toBeCloseTo(layout.regions[3].start.z + GATE.entryLead, 9);
    expect(toBorder.x).toBeCloseTo(FIELD.territoryDistance + FieldLayout.pathX(toBorder.z), 9);
    expect(toBorder.ribbons).toEqual(ZoneAtmosphere.forRegion(toBorder.into).ribbons);
  });

  it('parts smoothly within GATE.partRadius of the curtain and stays closed beyond it', () => {
    const layout = FieldLayout.compute(
      [
        { slug: 'arr-1', territory: 'dreamland', zone: 'arrival' },
        { slug: 'lens-1', territory: 'dreamland', zone: 'lens' },
      ],
      ['dreamland'],
    );
    const [gate] = ZoneGates.compute(layout);
    expect(ZoneGates.distanceToCurtain({ x: gate.x, z: gate.z }, gate)).toBeCloseTo(0, 9);
    expect(ZoneGates.partFactor(0)).toBe(0);
    expect(ZoneGates.partFactor(-1)).toBe(0);
    const mid = ZoneGates.partFactor(GATE.partRadius / 2);
    expect(mid).toBeGreaterThan(0.2);
    expect(mid).toBeLessThan(0.8);
    expect(ZoneGates.partFactor(GATE.partRadius)).toBe(1);
    expect(ZoneGates.partFactor(GATE.partRadius + 5)).toBe(1);
  });

  it('property: every gate maintains >= GATE.minClearance from every artwork placement across arbitrary layouts', () => {
    const territories = ['dreamland', 'the-border-is-thin', 'third-shore'] as const;
    const workSpec = fc.record({
      territory: fc.constantFrom(...territories),
      zone: fc.option(fc.constantFrom(...ZONE_ORDER), { nil: undefined }),
    });

    fc.assert(
      fc.property(fc.array(workSpec, { minLength: 2, maxLength: 30 }), (specs) => {
        const works: LayoutWork[] = specs.map((s, i) => ({ slug: `w-${i}`, territory: s.territory, zone: s.zone }));
        const layout = FieldLayout.compute(works, territories);
        const gates = ZoneGates.compute(layout);

        expect(gates).toHaveLength(Math.max(layout.regions.length - 1, 0));
        for (const gate of gates) {
          for (const p of layout.placements) {
            expect(ZoneGates.distanceToCurtain(p, gate)).toBeGreaterThanOrEqual(GATE.minClearance);
          }
        }
      }),
    );
  });
});

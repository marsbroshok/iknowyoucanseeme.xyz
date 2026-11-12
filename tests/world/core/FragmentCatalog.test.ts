import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { FragmentCatalog, type FragmentWork } from '../../../src/world/core/FragmentCatalog.js';

const works: FragmentWork[] = [
  { slug: 'a', territory: 'dream', fragment: 'Fragment A.' },
  { slug: 'b', territory: 'dream', fragment: null },
  { slug: 'c', territory: 'dream', fragment: 'Fragment C.' },
  { slug: 'd', territory: 'dream', fragment: null },
  { slug: 'x', territory: 'border', fragment: 'Fragment X.' },
];
/** Path order: territory by territory (as DriftSession.stops). */
const stops = works.map((w) => ({ slug: w.slug, territory: w.territory }));
const territories = [
  { slug: 'dream', sentences: ['One.', 'Two.'] },
  { slug: 'border', sentences: ['Uno.', 'Dos.', 'Tres.'] },
  { slug: 'empty', sentences: ['Never surfaces.'] },
];

describe('FragmentCatalog', () => {
  it('has stable, language-independent ids for work fragments and statement sentences', () => {
    expect(FragmentCatalog.workId('arrivee')).toBe('work:arrivee');
    expect(FragmentCatalog.sentenceId('dreamland', 3)).toBe('statement:dreamland:3');
  });

  it('puts each work fragment near its work, first', () => {
    const c = new FragmentCatalog(stops, works, territories);
    expect(c.near('a')[0]).toEqual({ id: 'work:a', text: 'Fragment A.', slug: 'a', territory: 'dream', kind: 'work' });
    expect(c.near('b').some((e) => e.kind === 'work')).toBe(false);
  });

  it('spreads the statement sentences evenly along the territory\'s part of the path', () => {
    const c = new FragmentCatalog(stops, works, territories);
    // 4 works, 2 sentences: positions floor((i + 0.5) * 4 / 2) = 1, 3 → works b and d.
    expect(c.near('b').map((e) => e.id)).toEqual(['statement:dream:0']);
    expect(c.near('d').map((e) => e.id)).toEqual(['statement:dream:1']);
    // 1 work, 3 sentences: all near x, after its own fragment.
    expect(c.near('x').map((e) => e.id)).toEqual(['work:x', 'statement:border:0', 'statement:border:1', 'statement:border:2']);
    expect(c.near('nope')).toEqual([]);
  });

  it('lists every fragment of a territory that can surface (a territory without works has none)', () => {
    const c = new FragmentCatalog(stops, works, territories);
    expect(c.idsOf('dream')).toEqual(['work:a', 'work:c', 'statement:dream:0', 'statement:dream:1']);
    expect(c.idsOf('empty')).toEqual([]);
    expect(c.entries).toHaveLength(4 + 4);
  });

  it('idsOf matches the static count used by the awake territory page (same rule, no world needed)', () => {
    const c = new FragmentCatalog(stops, works, territories);
    for (const t of territories) expect(FragmentCatalog.territoryIds(t.slug, works, t.sentences.length)).toEqual(c.idsOf(t.slug));
  });

  it('property: every fragment is placed exactly once, near a work of its own territory', () => {
    const arb = fc.record({
      counts: fc.array(fc.integer({ min: 0, max: 6 }), { minLength: 1, maxLength: 3 }),
      sentences: fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 3, maxLength: 3 }),
      withFragment: fc.array(fc.boolean(), { minLength: 20, maxLength: 20 }),
    });
    fc.assert(
      fc.property(arb, ({ counts, sentences, withFragment }) => {
        const ws: FragmentWork[] = counts.flatMap((n, t) => Array.from({ length: n }, (_, i) => ({ slug: `t${t}w${i}`, territory: `t${t}`, fragment: withFragment[(t * 6 + i) % 20] ? `F${t}${i}` : null })));
        const ts = sentences.map((n, t) => ({ slug: `t${t}`, sentences: Array.from({ length: n }, (_, i) => `S${i}.`) }));
        const c = new FragmentCatalog(ws.map((w) => ({ slug: w.slug, territory: w.territory })), ws, ts);
        const ids = c.entries.map((e) => e.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const e of c.entries) expect(ws.find((w) => w.slug === e.slug)?.territory).toBe(e.territory);
        for (const t of ts) {
          const hasWorks = ws.some((w) => w.territory === t.slug);
          expect(c.idsOf(t.slug).length).toBe(ws.filter((w) => w.territory === t.slug && w.fragment).length + (hasWorks ? t.sentences.length : 0));
        }
      }),
    );
  });
});

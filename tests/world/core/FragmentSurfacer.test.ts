import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { FRAGMENTS, FragmentSurfacer, type SurfacerInput } from '../../../src/world/core/FragmentSurfacer.js';
import { FragmentCatalog, type FragmentWork } from '../../../src/world/core/FragmentCatalog.js';
import { FragmentProgress } from '../../../src/world/core/FragmentProgress.js';
import { MemoryStorage } from '../memoryStorage.js';

const works: FragmentWork[] = [
  { slug: 'a', territory: 'dream', fragment: 'Fragment A.' },
  { slug: 'b', territory: 'dream', fragment: null },
];
const catalog = () => new FragmentCatalog(works.map((w) => ({ slug: w.slug, territory: w.territory })), works, [{ slug: 'dream', sentences: ['One.', 'Two.', 'Three.'] }]);
const DT = 1 / 60;
const at = (slug: string | null, settled: string | null = null): SurfacerInput => ({ facing: slug, settled });

function setup(storage = new MemoryStorage()) {
  const progress = new FragmentProgress(storage);
  return { s: new FragmentSurfacer(catalog(), progress), progress, storage };
}

describe('FragmentSurfacer', () => {
  it('shows nothing until the visitor settles close to a work', () => {
    const { s } = setup();
    expect(s.frame(at('a'), DT)).toEqual({ started: null, current: null });
  });

  it('fades in the work\'s own fragment when the camera settles near it, and stores it as read', () => {
    const { s, progress } = setup();
    const f = s.frame(at('a', 'a'), DT);
    expect(f.started).toMatchObject({ id: 'work:a', text: 'Fragment A.', slug: 'a' });
    expect(f.current?.opacity).toBeCloseTo(DT / FRAGMENTS.fadeInSeconds, 6);
    expect(progress.has('work:a')).toBe(true);
    const later = s.frame(at('a'), FRAGMENTS.fadeInSeconds);
    expect(later.started).toBeNull();
    expect(later.current).toMatchObject({ id: 'work:a', opacity: 1 });
  });

  it('holds, then fades out and clears', () => {
    const { s } = setup();
    s.frame(at('a', 'a'), 0);
    s.frame(at('a'), FRAGMENTS.fadeInSeconds + FRAGMENTS.holdSeconds);
    expect(s.frame(at('a'), FRAGMENTS.fadeOutSeconds / 2).current?.opacity).toBeCloseTo(0.5, 6);
    expect(s.frame(at('a'), FRAGMENTS.fadeOutSeconds).current).toBeNull();
  });

  it('fades out early when the visitor turns away, from the opacity it had', () => {
    const { s } = setup();
    s.frame(at('a', 'a'), 0);
    s.frame(at('a'), FRAGMENTS.fadeInSeconds / 2);
    const away = s.frame(at(null), FRAGMENTS.fadeOutSeconds / 4);
    expect(away.current?.opacity).toBeCloseTo(0.25, 6);
    expect(s.frame(at('b'), FRAGMENTS.fadeOutSeconds).current).toBeNull();
  });

  it('prefers unread fragments, then goes round the ones near a work on each new settling', () => {
    const storage = new MemoryStorage();
    const { s } = setup(storage);
    const ids: string[] = [];
    for (let i = 0; i < 5; i++) {
      const f = s.frame(at('b', 'b'), DT);
      ids.push(f.started?.id ?? 'none');
      s.frame(at(null), FRAGMENTS.fadeOutSeconds + 1);
    }
    // b holds sentences at floor((i + .5) * 2 / 3) = 0, 1, 1 → b holds "Two." and "Three.".
    expect(ids).toEqual(['statement:dream:1', 'statement:dream:2', 'statement:dream:1', 'statement:dream:2', 'statement:dream:1']);
    const fresh = new FragmentSurfacer(catalog(), new FragmentProgress(storage));
    expect(fresh.frame(at('a', 'a'), DT).started?.id).toBe('work:a');
  });

  it('a new settling on the same work while its fragment shows changes nothing; on another work it replaces it', () => {
    const { s } = setup();
    s.frame(at('a', 'a'), DT);
    expect(s.frame(at('a', 'a'), DT).started).toBeNull();
    const other = s.frame(at('b', 'b'), DT);
    expect(other.started?.slug).toBe('b');
    expect(other.current?.slug).toBe('b');
  });

  it('ignores settling on a work with nothing near it', () => {
    const lone = new FragmentCatalog([{ slug: 'z', territory: 'dream' }], [{ slug: 'z', territory: 'dream', fragment: null }], []);
    const s = new FragmentSurfacer(lone, new FragmentProgress(new MemoryStorage()));
    expect(s.frame(at('z', 'z'), DT)).toEqual({ started: null, current: null });
  });

  it('property: one fragment at a time, opacity in [0, 1], and every surfaced fragment is stored', () => {
    const step = fc.record({ facing: fc.constantFrom(null, 'a', 'b'), settle: fc.boolean(), dt: fc.double({ min: 0, max: 5, noNaN: true }) });
    fc.assert(
      fc.property(fc.array(step, { maxLength: 60 }), (steps) => {
        const { s, progress } = setup();
        for (const st of steps) {
          const f = s.frame({ facing: st.facing, settled: st.settle ? st.facing : null }, st.dt);
          if (f.started) {
            expect(progress.has(f.started.id)).toBe(true);
            expect(f.current?.id).toBe(f.started.id);
          }
          if (f.current) {
            expect(f.current.opacity).toBeGreaterThanOrEqual(0);
            expect(f.current.opacity).toBeLessThanOrEqual(1);
          }
        }
      }),
    );
  });
});

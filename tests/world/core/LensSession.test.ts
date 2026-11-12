import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { LensSession } from '../../../src/world/core/LensSession.js';
import { LensDirector, type LensWork } from '../../../src/world/core/LensDirector.js';
import { LENS_CROSSFADE_SECONDS } from '../../../src/world/core/LensCrossfade.js';
import type { LensInput } from '../../../src/world/core/LensUniforms.js';

const work = (slug: string, extra: Partial<LensWork> = {}): LensWork => ({ slug, territory: 'dreamland', zone: 'lens', techniques: [], palette: ['#808080'], ...extra });
const WORKS = [
  work('eclipse', { techniques: ['mirror'], palette: ['#141312', '#d9b48c'] }),
  work('cygne', { techniques: ['icm'] }),
  work('double', { techniques: ['multiple-exposure'] }),
  work('plain', { palette: ['#1a1a1a', '#e03a20'] }),
];
const director = () => new LensDirector(WORKS, 'high');
const at = (slug: string | null, extra: Partial<LensInput> = {}): LensInput => ({ aim: slug ? { slug, uv: { x: 0.5, y: 0.5 } } : null, touch: false, unaltered: false, ...extra });
const all = () => true;

describe('LensSession', () => {
  it('starts with the lens off, nothing to announce and nothing to cycle', () => {
    const s = new LensSession(director());
    expect(s.slug).toBeNull();
    expect(s.cycle()).toBeNull();
    const f = s.frame(at(null), 1 / 60, all);
    expect(f).toMatchObject({ slug: null, released: null, announce: null, settings: null, mode: null, blend: null });
  });

  it('turns on over a work: announces its default lens and returns the uniforms to apply', () => {
    const d = director();
    const s = new LensSession(d);
    const f = s.frame(at('eclipse'), 1 / 60, all);
    expect(f.slug).toBe('eclipse');
    expect(f.released).toBeNull();
    expect(f.announce).toBe('mirror');
    expect(f.mode).toBe('mirror');
    expect(f.settings).toMatchObject({ modeA: 'mirror', modeB: 'mirror', mix: 0, gel: d.gel('eclipse'), segments: d.segments('eclipse'), seed: d.seed('eclipse') });
    expect(f.settings?.strength).toBeGreaterThan(0);
    expect(f.settings?.center).toEqual({ x: 0.5, y: 0.5 });
    expect(s.slug).toBe('eclipse');
  });

  it('announces only on a change of work, and releases the previous work', () => {
    const s = new LensSession(director());
    s.frame(at('eclipse'), 1 / 60, all);
    expect(s.frame(at('eclipse'), 1 / 60, all).announce).toBeNull();
    const moved = s.frame(at('cygne'), 1 / 60, all);
    expect(moved).toMatchObject({ slug: 'cygne', released: 'eclipse', announce: 'icm' });
  });

  it('clears the announcement once the lens has faded out', () => {
    const s = new LensSession(director());
    s.frame(at('plain'), 1 / 60, all);
    let f = s.frame(at(null), 1 / 60, all);
    for (let i = 0; i < 120 && f.slug !== null; i++) f = s.frame(at(null), 1 / 60, all);
    expect(f).toMatchObject({ slug: null, released: 'plain', announce: 'clear', settings: null });
  });

  it('cycles the lens of the current work with a crossfade', () => {
    const s = new LensSession(director());
    s.frame(at('eclipse'), 1 / 60, all);
    const next = s.cycle();
    expect(next).not.toBeNull();
    expect(next).not.toBe('mirror');
    const mid = s.frame(at('eclipse'), LENS_CROSSFADE_SECONDS / 2, all);
    expect(mid.mode).toBe(next);
    expect(mid.settings?.modeA).toBe('mirror');
    expect(mid.settings?.modeB).toBe(next);
    expect(mid.settings?.mix).toBeGreaterThan(0);
    expect(mid.settings?.mix).toBeLessThan(1);
    const done = s.frame(at('eclipse'), LENS_CROSSFADE_SECONDS, all);
    expect(done.settings).toMatchObject({ modeA: next, modeB: next, mix: 0 });
  });

  it('names a partner work for the multiple exposure only when its image is loaded', () => {
    const d = director();
    const s = new LensSession(d);
    expect(s.frame(at('double'), 1 / 60, () => false).settings?.partner).toBeNull();
    expect(s.frame(at('double'), 1 / 60, (slug) => slug !== 'double').settings?.partner).toBe(d.partnerFor('double', all));
  });

  it('keeps the lens hidden while "see unaltered" is held', () => {
    const s = new LensSession(director());
    s.frame(at('plain'), 1 / 60, all);
    let f = s.frame(at('plain', { unaltered: true }), 1, all);
    f = s.frame(at('plain', { unaltered: true }), 1, all);
    expect(f.settings?.strength ?? 0).toBe(0);
  });

  it('property: settings exist exactly when the lens is on a work, and announcements follow changes of work', () => {
    const step = fc.record({ slug: fc.constantFrom(null, 'eclipse', 'cygne', 'double', 'plain'), dt: fc.double({ min: 0.001, max: 0.2, noNaN: true }), cycle: fc.boolean() });
    fc.assert(
      fc.property(fc.array(step, { maxLength: 60 }), (steps) => {
        const s = new LensSession(director());
        let previous: string | null = null;
        for (const st of steps) {
          if (st.cycle) s.cycle();
          const f = s.frame(at(st.slug), st.dt, all);
          expect(f.settings === null).toBe(f.slug === null);
          expect(f.blend === null).toBe(f.slug === null);
          if (f.slug !== previous) {
            expect(f.released).toBe(previous);
            expect(f.announce).toBe(f.slug === null ? 'clear' : f.mode);
          } else {
            expect(f.announce).toBeNull();
            expect(f.released).toBeNull();
          }
          if (f.settings) expect(f.settings.mix).toBeGreaterThanOrEqual(0);
          previous = f.slug;
        }
      }),
    );
  });
});

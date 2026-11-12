import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { LensDirector, TECHNIQUE_MODES, type LensWork } from '../../../src/world/core/LensDirector.js';
import { LENS_MODES, modeIndex, modesFor } from '../../../src/world/core/LensMode.js';

const work = (slug: string, extra: Partial<LensWork> = {}): LensWork => ({
  slug,
  territory: 'dreamland',
  zone: 'lens',
  techniques: [],
  palette: ['#808080'],
  ...extra,
});

const WORKS: LensWork[] = [
  work('eclipse', { territory: 'border', zone: null, techniques: ['mirror', 'filter'], palette: ['#141312', '#d9b48c'] }),
  work('cygne', { territory: 'border', zone: null, techniques: ['icm'], palette: ['#8c7238'] }),
  work('nd', { techniques: ['filter'] }),
  work('double', { techniques: ['multiple-exposure'] }),
  work('plain-a', { palette: ['#1a1a1a', '#e03a20'] }),
  work('plain-b', { palette: ['#20a0e0'] }),
  work('plain-c', { zone: 'arrival', palette: ['#777777'] }),
];

const slugArb = fc.string({ minLength: 1, maxLength: 24 });
const tierArb = fc.constantFrom('high' as const, 'low' as const);

describe('LensDirector — default mode', () => {
  it('maps the caption techniques to their lens (spec Assumptions)', () => {
    const d = new LensDirector(WORKS, 'high');
    expect(d.defaultMode('eclipse')).toBe('mirror');
    expect(d.defaultMode('cygne')).toBe('icm');
    expect(d.defaultMode('nd')).toBe('gel');
    expect(d.defaultMode('double')).toBe('exposure');
  });

  it('follows the technique priority mirror → filter → ICM → multiple exposure', () => {
    expect(TECHNIQUE_MODES.map(([t]) => t)).toEqual(['mirror', 'filter', 'icm', 'multiple-exposure']);
    const d = new LensDirector([work('x', { techniques: ['multiple-exposure', 'icm', 'filter'] })], 'high');
    expect(d.defaultMode('x')).toBe('gel');
  });

  it('falls back to a seeded choice: deterministic per slug and always a mode of the tier (property)', () => {
    fc.assert(
      fc.property(slugArb, tierArb, (slug, tier) => {
        const a = new LensDirector([work(slug)], tier).defaultMode(slug);
        const b = new LensDirector([work('other'), work(slug)], tier).defaultMode(slug);
        expect(a).toBe(b);
        expect(modesFor(tier)).toContain(a);
      }),
    );
  });

  it('spreads seeded choices over every mode of the tier', () => {
    for (const tier of ['high', 'low'] as const) {
      const slugs = Array.from({ length: 300 }, (_, i) => `work-${i}`);
      const d = new LensDirector(slugs.map((s) => work(s)), tier);
      expect(new Set(slugs.map((s) => d.defaultMode(s)))).toEqual(new Set(modesFor(tier)));
    }
  });

  it('gives unknown works the seeded choice too', () => {
    const d = new LensDirector([], 'high');
    expect(d.defaultMode('nowhere')).toBe(new LensDirector([work('nowhere')], 'high').defaultMode('nowhere'));
  });

  it('numbers the lenses for the shader in cycling order', () => {
    expect(LENS_MODES.map(modeIndex)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('never picks fracture on the low tier', () => {
    expect(modesFor('low')).not.toContain('fracture');
    expect(modesFor('high')).toEqual(LENS_MODES);
  });
});

describe('LensDirector — cycling', () => {
  it('visits every mode of the tier once before coming back (property)', () => {
    fc.assert(
      fc.property(slugArb, tierArb, fc.constantFrom(1 as const, -1 as const), (slug, tier, dir) => {
        const d = new LensDirector([work(slug)], tier);
        const start = d.mode(slug);
        const seen = [start];
        for (let i = 1; i < modesFor(tier).length; i++) seen.push(d.cycle(slug, dir));
        expect(new Set(seen).size).toBe(modesFor(tier).length);
        expect(d.cycle(slug, dir)).toBe(start);
      }),
    );
  });

  it('remembers the cycled mode per work and goes backwards with -1', () => {
    const d = new LensDirector(WORKS, 'high');
    expect(d.mode('cygne')).toBe('icm');
    expect(d.cycle('cygne')).toBe('gel');
    expect(d.mode('cygne')).toBe('gel');
    expect(d.mode('eclipse')).toBe('mirror');
    expect(d.cycle('cygne', -1)).toBe('icm');
    expect(d.cycle('cygne', -1)).toBe('flare');
  });
});

describe('LensDirector — per-work parameters', () => {
  it('gives each work a mirror with 2 to 6 segments, stable per slug (property)', () => {
    fc.assert(
      fc.property(slugArb, (slug) => {
        const n = new LensDirector([work(slug)], 'high').segments(slug);
        expect(Number.isInteger(n)).toBe(true);
        expect(n).toBeGreaterThanOrEqual(2);
        expect(n).toBeLessThanOrEqual(6);
        expect(new LensDirector([], 'low').segments(slug)).toBe(n);
      }),
    );
  });

  it('gives each work a seed in [0, 1)', () => {
    fc.assert(
      fc.property(slugArb, (slug) => {
        const s = new LensDirector([], 'high').seed(slug);
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThan(1);
      }),
    );
  });

  it('takes the gel from another work: its most colourful palette entry', () => {
    const d = new LensDirector([work('a', { palette: ['#101010', '#e03a20', '#a08070'] }), work('b', { palette: ['#20a0e0'] })], 'high');
    expect(d.gel('b')).toBe('#e03a20');
    expect(d.gel('a')).toBe('#20a0e0');
  });

  it('skips grey palettes and uses an amber gel when no other work has a colour', () => {
    const d = new LensDirector([work('a', { palette: ['#e03a20'] }), work('grey', { palette: ['#777777', '#7a7a78'] }), work('empty', { palette: [] })], 'high');
    expect(d.gel('grey')).toBe('#e03a20');
    expect(new LensDirector([work('a', { palette: ['#e03a20'] })], 'high').gel('a')).toBe(LensDirector.DEFAULT_GEL);
    expect(new LensDirector([work('a'), work('b', { palette: ['#555555'] })], 'high').gel('a')).toBe(LensDirector.DEFAULT_GEL);
  });

  it('never takes the gel from the work itself, and is deterministic (property)', () => {
    fc.assert(
      fc.property(fc.uniqueArray(slugArb, { minLength: 2, maxLength: 8 }), fc.nat(), (slugs, pick) => {
        const works = slugs.map((s, i) => work(s, { palette: [`#${((i * 2654435761) >>> 8).toString(16).padStart(6, '0').slice(0, 6)}`] }));
        const slug = slugs[pick % slugs.length];
        const d = new LensDirector(works, 'high');
        const gel = d.gel(slug);
        expect(gel).toBe(new LensDirector([...works].reverse(), 'high').gel(slug));
        const own = works.find((w) => w.slug === slug)?.palette[0];
        if (gel !== LensDirector.DEFAULT_GEL) expect(gel).not.toBe(own);
      }),
    );
  });

  it('pairs a work with others of the same zone (or of the same territory without a zone)', () => {
    const d = new LensDirector(WORKS, 'high');
    expect(new Set(d.partners('nd'))).toEqual(new Set(['double', 'plain-a', 'plain-b']));
    expect(d.partners('eclipse')).toEqual(['cygne']);
    expect(d.partners('plain-c')).toEqual([]);
    expect(d.partners('unknown')).toEqual([]);
  });

  it('answers the same gel and partners every time (computed once), and partner lists cannot be changed from outside', () => {
    const d = new LensDirector(WORKS, 'high');
    expect(d.gel('nd')).toBe(d.gel('nd'));
    const first = d.partners('nd');
    first.length = 0;
    expect(d.partners('nd')).toHaveLength(3);
  });

  it('picks the first partner that already has a texture, or none', () => {
    const d = new LensDirector(WORKS, 'high');
    const order = d.partners('nd');
    expect(d.partnerFor('nd', () => true)).toBe(order[0]);
    expect(d.partnerFor('nd', (s) => s === order[2])).toBe(order[2]);
    expect(d.partnerFor('nd', () => false)).toBeNull();
  });
});

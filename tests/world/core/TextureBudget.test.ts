import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { TextureBudget, TIER_BUDGETS, type BudgetConfig, type Lod, type TextureCandidate } from '../../../src/world/core/TextureBudget.js';

const MB = 1024 * 1024;
const config: BudgetConfig = { radius: 40, fullRadius: 10, budgetBytes: 50 * MB };
const work = (slug: string, distance: number, low = 1 * MB, full = 20 * MB): TextureCandidate => ({ slug, distance, bytes: { low, full } });
const RANK: Record<Lod, number> = { none: 0, low: 1, full: 2 };

describe('TextureBudget.textureBytes', () => {
  it('estimates RGBA8 with a mip chain (× 4/3)', () => {
    expect(TextureBudget.textureBytes(480, 600)).toBe(Math.ceil(480 * 600 * 4 * (4 / 3)));
    expect(TextureBudget.textureBytes(3, 1)).toBe(16);
  });
});

describe('TextureBudget.plan', () => {
  it('loads full textures up close, low ones within the radius, nothing beyond', () => {
    const plan = TextureBudget.plan([work('near', 5), work('mid', 25), work('far', 41)], config);
    expect(plan).toEqual({ near: 'full', mid: 'low', far: 'none' });
  });

  it('downgrades to low when a full texture would break the budget, and never gives a farther work more', () => {
    const plan = TextureBudget.plan([work('a', 1), work('b', 2), work('c', 3), work('d', 4, 1 * MB, 2 * MB)], config);
    // 20 + 20 = 40 MB; c's full (20) would exceed 50 → low; d stays low too.
    expect(plan).toEqual({ a: 'full', b: 'full', c: 'low', d: 'low' });
  });

  it('stops loading when even a low texture does not fit', () => {
    const tight: BudgetConfig = { ...config, budgetBytes: 2.5 * MB };
    // c (1 MB) no longer fits; d would (0.1 MB) but is farther, so it waits too.
    expect(TextureBudget.plan([work('a', 20), work('b', 21), work('c', 22), work('d', 23, 0.1 * MB)], tight)).toEqual({
      a: 'low',
      b: 'low',
      c: 'none',
      d: 'none',
    });
  });

  it('breaks distance ties by slug so the plan is stable', () => {
    const tight: BudgetConfig = { ...config, budgetBytes: 1 * MB };
    expect(TextureBudget.plan([work('b', 20), work('a', 20)], tight)).toEqual({ a: 'low', b: 'none' });
  });

  it('has a budget per tier, smaller on phones', () => {
    expect(TIER_BUDGETS.low.budgetBytes).toBeLessThan(TIER_BUDGETS.high.budgetBytes);
    expect(TIER_BUDGETS.low.radius).toBeLessThanOrEqual(TIER_BUDGETS.high.radius);
    expect(TIER_BUDGETS.low.fullVariant).toBe('mid');
    expect(TIER_BUDGETS.high.fullVariant).toBe('high');
  });

  const candidates = fc
    .uniqueArray(fc.stringMatching(/^[a-z]{1,8}$/), { maxLength: 50 })
    .chain((slugs) =>
      fc.tuple(
        ...slugs.map((slug) =>
          fc.record({
            slug: fc.constant(slug),
            distance: fc.double({ min: 0, max: 100, noNaN: true }),
            bytes: fc.record({ low: fc.integer({ min: 1, max: 4 * MB }), full: fc.integer({ min: 1, max: 64 * MB }) }),
          }),
        ),
      ),
    );
  const configs = fc.record({
    radius: fc.double({ min: 1, max: 80, noNaN: true }),
    fullRadius: fc.double({ min: 0, max: 40, noNaN: true }),
    budgetBytes: fc.integer({ min: 0, max: 512 * MB }),
  });

  it('property: the planned textures never exceed the memory budget', () => {
    fc.assert(
      fc.property(candidates, configs, (cs, cfg) => {
        const plan = TextureBudget.plan(cs, cfg);
        expect(TextureBudget.bytes(plan, cs)).toBeLessThanOrEqual(cfg.budgetBytes);
      }),
    );
  });

  it('property: nothing beyond the radius, nothing full beyond the full radius', () => {
    fc.assert(
      fc.property(candidates, configs, (cs, cfg) => {
        const plan = TextureBudget.plan(cs, cfg);
        for (const c of cs) {
          if (c.distance > cfg.radius) expect(plan[c.slug]).toBe('none');
          if (c.distance > cfg.fullRadius) expect(plan[c.slug]).not.toBe('full');
        }
      }),
    );
  });

  it('property: a nearer work never gets a lower level of detail than a farther one', () => {
    fc.assert(
      fc.property(candidates, configs, (cs, cfg) => {
        const plan = TextureBudget.plan(cs, cfg);
        const inRange = cs.filter((c) => c.distance <= cfg.fullRadius);
        for (const a of inRange) for (const b of inRange) if (a.distance < b.distance) expect(RANK[plan[a.slug]]).toBeGreaterThanOrEqual(RANK[plan[b.slug]]);
        const lowRange = cs.filter((c) => c.distance <= cfg.radius);
        for (const a of lowRange) for (const b of lowRange) if (a.distance < b.distance && plan[b.slug] !== 'none') expect(plan[a.slug]).not.toBe('none');
      }),
    );
  });
});

describe('TextureBudget.diff', () => {
  it('lists what to load (nearest first, as planned) and what to dispose', () => {
    const current: Record<string, Lod> = { a: 'low', b: 'full', c: 'low', d: 'none' };
    const next: Record<string, Lod> = { e: 'low', a: 'full', b: 'low', c: 'low', d: 'none' };
    expect(TextureBudget.diff(current, next)).toEqual({
      load: [
        { slug: 'e', lod: 'low' },
        { slug: 'a', lod: 'full' },
        { slug: 'b', lod: 'low' },
      ],
      dispose: ['a', 'b'],
    });
  });

  it('disposes textures of works that left the plan', () => {
    expect(TextureBudget.diff({ gone: 'full' }, {})).toEqual({ load: [], dispose: ['gone'] });
  });

  it('property: after applying the diff the loaded set equals the plan', () => {
    const lod = fc.constantFrom<Lod>('none', 'low', 'full');
    const state = fc.dictionary(fc.constantFrom('a', 'b', 'c', 'd', 'e'), lod);
    fc.assert(
      fc.property(state, state, (current, next) => {
        const { load, dispose } = TextureBudget.diff(current, next);
        const result: Record<string, Lod> = { ...current };
        for (const slug of dispose) result[slug] = 'none';
        for (const l of load) result[l.slug] = l.lod;
        const loaded = (r: Record<string, Lod>) => Object.fromEntries(Object.entries(r).filter(([, v]) => v !== 'none'));
        expect(loaded(result)).toEqual(loaded(next));
      }),
    );
  });
});

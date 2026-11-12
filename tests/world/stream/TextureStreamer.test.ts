import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { TextureStreamer, type StreamerOptions } from '../../../src/world/stream/TextureStreamer.js';
import type { Lod } from '../../../src/world/core/TextureBudget.js';

/** A fake texture: just the URL it was made from. */
interface FakeTexture {
  url: string;
}

/** Loader whose requests the test resolves or rejects by hand. */
class ManualLoader {
  readonly pending = new Map<string, { resolve: (t: FakeTexture) => void; reject: (e: Error) => void }>();
  readonly requested: string[] = [];
  load = (url: string): Promise<FakeTexture> => {
    this.requested.push(url);
    return new Promise((resolve, reject) => this.pending.set(url, { resolve, reject }));
  };
  async finish(url: string): Promise<void> {
    const p = this.pending.get(url);
    if (!p) throw new Error(`not pending: ${url}`);
    this.pending.delete(url);
    p.resolve({ url });
    await flush();
  }
  async fail(url: string): Promise<void> {
    const p = this.pending.get(url);
    if (!p) throw new Error(`not pending: ${url}`);
    this.pending.delete(url);
    p.reject(new Error('404'));
    await flush();
  }
}

const flush = () => new Promise((r) => setTimeout(r, 0));

function setup(maxConcurrent = 2) {
  const loader = new ManualLoader();
  const released: string[] = [];
  const shown = new Map<string, { url: string | null; lod: Lod }>();
  const errors: string[] = [];
  const options: StreamerOptions<FakeTexture> = {
    load: loader.load,
    release: (t) => released.push(t.url),
    urlFor: (slug, lod) => `/${slug}-${lod}.webp`,
    onChange: (slug, texture, lod) => shown.set(slug, { url: texture?.url ?? null, lod }),
    onError: (slug, url) => errors.push(`${slug} ${url}`),
    maxConcurrent,
  };
  return { streamer: new TextureStreamer(options), loader, released, shown, errors };
}

describe('TextureStreamer', () => {
  it('loads planned textures nearest first, a few at a time', () => {
    const { streamer, loader } = setup(2);
    streamer.update({ a: 'full', b: 'low', c: 'low', d: 'none' });
    expect(loader.requested).toEqual(['/a-full.webp', '/b-low.webp']);
  });

  it('shows a texture once it has loaded, and continues with the queue', async () => {
    const { streamer, loader, shown } = setup(1);
    streamer.update({ a: 'low', b: 'low' });
    await loader.finish('/a-low.webp');
    expect(shown.get('a')).toEqual({ url: '/a-low.webp', lod: 'low' });
    expect(streamer.loaded).toEqual({ a: 'low' });
    expect(loader.requested).toEqual(['/a-low.webp', '/b-low.webp']);
  });

  it('upgrades low to full, swapping only when the full one is ready', async () => {
    const { streamer, loader, shown, released } = setup();
    streamer.update({ a: 'low' });
    await loader.finish('/a-low.webp');
    streamer.update({ a: 'full' });
    expect(shown.get('a')?.lod).toBe('low');
    await loader.finish('/a-full.webp');
    expect(shown.get('a')).toEqual({ url: '/a-full.webp', lod: 'full' });
    expect(released).toEqual(['/a-low.webp']);
  });

  it('disposes textures of works that left the plan', async () => {
    const { streamer, loader, shown, released } = setup();
    streamer.update({ a: 'low' });
    await loader.finish('/a-low.webp');
    streamer.update({ a: 'none' });
    expect(shown.get('a')).toEqual({ url: null, lod: 'none' });
    expect(released).toEqual(['/a-low.webp']);
    expect(streamer.loaded).toEqual({});
  });

  it('drops a texture that arrives after the plan changed its mind', async () => {
    const { streamer, loader, shown, released } = setup();
    streamer.update({ a: 'full' });
    streamer.update({});
    await loader.finish('/a-full.webp');
    expect(shown.has('a')).toBe(false);
    expect(released).toEqual(['/a-full.webp']);
  });

  it('does not request the same texture twice while it is on its way', () => {
    const { streamer, loader } = setup();
    streamer.update({ a: 'low' });
    streamer.update({ a: 'low' });
    expect(loader.requested).toEqual(['/a-low.webp']);
  });

  it('reports a failed texture once and never retries it (the work keeps its colour)', async () => {
    const { streamer, loader, errors } = setup(1);
    streamer.update({ a: 'low', b: 'low' });
    await loader.fail('/a-low.webp');
    expect(errors).toEqual(['a /a-low.webp']);
    expect(loader.requested).toEqual(['/a-low.webp', '/b-low.webp']);
    streamer.update({ a: 'low', b: 'low' });
    expect(loader.requested).toEqual(['/a-low.webp', '/b-low.webp']);
  });

  it('releases everything on dispose, including late arrivals', async () => {
    const { streamer, loader, released } = setup();
    streamer.update({ a: 'low', b: 'low' });
    await loader.finish('/a-low.webp');
    streamer.dispose();
    expect(released).toEqual(['/a-low.webp']);
    await loader.finish('/b-low.webp');
    expect(released).toEqual(['/a-low.webp', '/b-low.webp']);
    streamer.update({ c: 'low' });
    expect(loader.requested).not.toContain('/c-low.webp');
  });

  it('property: once all loads settle, what is shown equals the last plan', async () => {
    const lod = fc.constantFrom<Lod>('none', 'low', 'full');
    const plan = fc.dictionary(fc.constantFrom('a', 'b', 'c', 'd'), lod);
    await fc.assert(
      fc.asyncProperty(fc.array(plan, { minLength: 1, maxLength: 6 }), async (plans) => {
        const { streamer, loader, shown } = setup(2);
        for (const p of plans) {
          streamer.update(p);
          const first = [...loader.pending.keys()][0];
          if (first) await loader.finish(first);
        }
        while (loader.pending.size > 0) await loader.finish([...loader.pending.keys()][0]);
        const last = plans[plans.length - 1];
        const expected = Object.fromEntries(Object.entries(last).filter(([, v]) => v !== 'none'));
        expect(streamer.loaded).toEqual(expected);
        for (const [slug, l] of Object.entries(expected)) expect(shown.get(slug)).toEqual({ url: `/${slug}-${l}.webp`, lod: l });
      }),
      { numRuns: 60 },
    );
  });
});

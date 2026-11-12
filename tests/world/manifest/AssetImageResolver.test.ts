import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { assetImageResolver, scaledSize } from '../../../src/world/manifest/AssetImageResolver.js';
import { fixtureWork } from '../../pages/fixtures.js';

describe('scaledSize', () => {
  it('scales the long edge down to the requested size, keeping the aspect', () => {
    expect(scaledSize({ width: 2400, height: 1600 }, 1200)).toEqual({ width: 1200, height: 800 });
    expect(scaledSize({ width: 1000, height: 2000 }, 480)).toEqual({ width: 240, height: 480 });
  });

  it('never upscales', () => {
    expect(scaledSize({ width: 800, height: 600 }, 2400)).toEqual({ width: 800, height: 600 });
  });

  it('keeps the long edge within the limit and the aspect within rounding (property)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 9000 }), fc.integer({ min: 1, max: 9000 }), fc.integer({ min: 16, max: 4000 }), (w, h, edge) => {
        const out = scaledSize({ width: w, height: h }, edge);
        const scale = Math.min(1, edge / Math.max(w, h));
        expect(Math.max(out.width, out.height)).toBe(Math.min(edge, Math.max(w, h)));
        expect(out.width).toBeGreaterThanOrEqual(1);
        expect(out.height).toBeGreaterThanOrEqual(1);
        expect(Math.abs(out.width - Math.max(1, w * scale))).toBeLessThanOrEqual(0.5);
        expect(Math.abs(out.height - Math.max(1, h * scale))).toBeLessThanOrEqual(0.5);
      }),
    );
  });
});

describe('assetImageResolver', () => {
  const meta = { width: 2400, height: 1200 };
  const work = fixtureWork({ slug: 'arrivee', images: [{ src: '0.jpg', source: 'instagram', width: 2400, height: 1200, palette: [] }] });

  it('renders the work image at the scaled width and reports the scaled size', async () => {
    const calls: unknown[] = [];
    const resolve = assetImageResolver({ '/src/assets/works/arrivee/0.jpg': async () => ({ default: meta }) }, async (src, width) => {
      calls.push([src, width]);
      return { src: `/_astro/arrivee_${width}.webp` };
    });
    expect(await resolve(work, 0, 1200)).toEqual({ url: '/_astro/arrivee_1200.webp', width: 1200, height: 600 });
    expect(calls).toEqual([[meta, 1200]]);
  });

  it('fails loudly when the image file does not exist', async () => {
    const resolve = assetImageResolver({}, async () => ({ src: '/x.webp' }));
    await expect(resolve(work, 0, 480)).rejects.toThrow('[route] Image "/src/assets/works/arrivee/0.jpg" does not exist');
  });

  it('fails loudly when the work has no image at that index', async () => {
    const resolve = assetImageResolver({}, async () => ({ src: '/x.webp' }));
    await expect(resolve(work, 3, 480)).rejects.toThrow('[route] Work "arrivee" has no image 3');
  });
});

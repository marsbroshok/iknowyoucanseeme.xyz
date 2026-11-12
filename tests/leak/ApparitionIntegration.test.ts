import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { APPARITION_CROP, leakApparition, renderApparition } from '../../tools/leak/ApparitionIntegration.js';

const ROOT = path.resolve(__dirname, '../..');
const SOURCE = path.join(ROOT, 'src/assets/works', APPARITION_CROP.slug, APPARITION_CROP.file);

describe('renderApparition', () => {
  it('crops the bird of Les Reflets II from the committed web master (no new picture)', async () => {
    expect(APPARITION_CROP.slug).toBe('les-reflets-ii');
    expect(fs.existsSync(SOURCE)).toBe(true);
    const meta = await sharp(SOURCE).metadata();
    const { left, top, width, height } = APPARITION_CROP.region;
    expect(left + width).toBeLessThanOrEqual(meta.width as number);
    expect(top + height).toBeLessThanOrEqual(meta.height as number);
  });

  it('gives a small square WebP cut-out: soft transparent edges, the bird opaque in the middle', async () => {
    const out = await renderApparition(SOURCE);
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe('webp');
    expect(meta.width).toBe(APPARITION_CROP.size);
    expect(meta.height).toBe(APPARITION_CROP.size);
    expect(meta.hasAlpha).toBe(true);
    const { data, info } = await sharp(out).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const alpha = (x: number, y: number) => data[(y * info.width + x) * info.channels + 3];
    const mid = Math.floor(APPARITION_CROP.size / 2);
    expect(alpha(0, 0)).toBe(0);
    expect(alpha(APPARITION_CROP.size - 1, APPARITION_CROP.size - 1)).toBe(0);
    expect(alpha(mid, mid)).toBeGreaterThan(200);
    expect(out.byteLength).toBeLessThan(20_000);
  });

  it('fails loudly when the source is missing', async () => {
    await expect(renderApparition(path.join(os.tmpdir(), 'missing-leak-source.jpg'))).rejects.toThrow();
  });
});

describe('leakApparition integration', () => {
  it('writes <build dir>/leak/apparition.webp on astro:build:done and logs it', async () => {
    const buildDir = fs.mkdtempSync(path.join(os.tmpdir(), 'leak-apparition-'));
    const integration = leakApparition({ source: SOURCE });
    expect(integration.name).toBe('leak-apparition');
    const info = vi.fn();
    const hook = integration.hooks['astro:build:done'] as unknown as (o: { dir: URL; logger: { info: (m: string) => void } }) => Promise<void>;
    await hook({ dir: pathToFileURL(buildDir + path.sep), logger: { info } });
    expect(fs.existsSync(path.join(buildDir, 'leak', 'apparition.webp'))).toBe(true);
    expect(info).toHaveBeenCalledWith('Leak apparition written to leak/apparition.webp');
  });

  it('defaults to the repository asset', () => {
    expect(leakApparition().name).toBe('leak-apparition');
  });
});

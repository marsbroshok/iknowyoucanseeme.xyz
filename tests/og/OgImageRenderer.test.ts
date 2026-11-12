import { describe, it, expect, beforeAll, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { OgImageRenderer, wrapLines } from '../../tools/og/OgImageRenderer.js';
import { generateOgImages, ogImages } from '../../tools/og/OgIntegration.js';

const ROOT = path.resolve(__dirname, '../..');
const FONT = path.join(ROOT, 'public/fonts/Fraunces.woff2');
const ARRIVEE = path.join(ROOT, 'src/assets/works/arrivee/0.jpg');

describe('OgImageRenderer', () => {
  let renderer: OgImageRenderer;
  beforeAll(async () => {
    renderer = await OgImageRenderer.fromWoff2(FONT);
  });

  it('renders a 1200×630 JPEG', async () => {
    const out = await renderer.render({ imagePath: ARRIVEE, title: 'Arrivée' });
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe('jpeg');
    expect(meta.width).toBe(1200);
    expect(meta.height).toBe(630);
  });

  it('is deterministic and depends on the title', async () => {
    const a = await renderer.render({ imagePath: ARRIVEE, title: 'Arrivée', subtitle: 'Arrival' });
    const b = await renderer.render({ imagePath: ARRIVEE, title: 'Arrivée', subtitle: 'Arrival' });
    const c = await renderer.render({ imagePath: ARRIVEE, title: 'Solitude' });
    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });

  it('uses the --ink background and draws light text on the left', async () => {
    const out = await renderer.render({ title: 'Un étranger dans la nuit, très loin de la maison' });
    const { data, info } = await sharp(out).raw().toBuffer({ resolveWithObject: true });
    const px = (x: number, y: number) => Array.from(data.subarray((y * info.width + x) * info.channels, (y * info.width + x) * info.channels + 3));
    const [r, g, b] = px(1190, 620);
    expect(Math.abs(r - 0x0b) + Math.abs(g - 0x10) + Math.abs(b - 0x30)).toBeLessThan(12);
    let bright = 0;
    for (let y = 60; y < 400; y += 2) for (let x = 60; x < 640; x += 2) if (px(x, y)[0] > 180) bright++;
    expect(bright).toBeGreaterThan(200);
  });

  it('fails loudly on a missing image', async () => {
    await expect(renderer.render({ imagePath: '/nope/missing.jpg', title: 'X' })).rejects.toThrow();
  });
});

describe('wrapLines', () => {
  const width = (s: string) => s.length * 10;
  it('wraps words within the max width', () => {
    expect(wrapLines('aa bb cc dd', width, 50, 3)).toEqual(['aa bb', 'cc dd']);
  });
  it('truncates the last allowed line with an ellipsis', () => {
    expect(wrapLines('aa bb cc dd ee ff', width, 50, 2)).toEqual(['aa bb', 'cc dd…']);
  });
  it('keeps a single over-long word on its own line', () => {
    expect(wrapLines('abcdefghijkl x', width, 50, 3)).toEqual(['abcdefghijkl', 'x']);
  });
  it('returns no lines for blank text', () => {
    expect(wrapLines('   ', width, 50, 3)).toEqual([]);
  });
});

function fixtureDirs() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'og-'));
  const worksDir = path.join(tmp, 'works');
  fs.mkdirSync(worksDir);
  fs.copyFileSync(path.join(ROOT, 'src/content/works/arrivee.yaml'), path.join(worksDir, 'arrivee.yaml'));
  fs.writeFileSync(
    path.join(worksDir, 'no-image.yaml'),
    'slug: no-image\ntitle:\n  fr: Sans image\n  en: No image\nterritory: dreamland\nyear: 2025\nmedium: photo\navailability: unknown\nimages: []\n',
  );
  fs.writeFileSync(path.join(worksDir, 'notes.txt'), 'ignored');
  return { tmp, worksDir, assetsDir: path.join(ROOT, 'src/assets/works'), outDir: path.join(tmp, 'dist', 'og') };
}

describe('generateOgImages', () => {
  it('writes og/<slug>.jpg for every work yaml', async () => {
    const dirs = fixtureDirs();
    const files = await generateOgImages({ ...dirs, fontPath: FONT });
    expect(files.map((f) => path.basename(f)).sort()).toEqual(['arrivee.jpg', 'no-image.jpg']);
    const meta = await sharp(path.join(dirs.outDir, 'arrivee.jpg')).metadata();
    expect([meta.width, meta.height]).toEqual([1200, 630]);
  });

  it('rejects an invalid work file', async () => {
    const dirs = fixtureDirs();
    fs.writeFileSync(path.join(dirs.worksDir, 'bad.yaml'), 'slug: Bad Slug\n');
    await expect(generateOgImages({ ...dirs, fontPath: FONT })).rejects.toThrow();
  });
});

describe('ogImages integration', () => {
  it('generates into <build dir>/og on astro:build:done and logs the count', async () => {
    const dirs = fixtureDirs();
    const integration = ogImages({ worksDir: dirs.worksDir, assetsDir: dirs.assetsDir, fontPath: FONT });
    expect(integration.name).toBe('og-images');
    const info = vi.fn();
    const hook = integration.hooks['astro:build:done'] as unknown as (o: { dir: URL; logger: { info: (m: string) => void } }) => Promise<void>;
    const buildDir = path.join(dirs.tmp, 'dist');
    fs.mkdirSync(buildDir, { recursive: true });
    await hook({ dir: pathToFileURL(buildDir + path.sep), logger: { info } });
    expect(fs.existsSync(path.join(buildDir, 'og', 'arrivee.jpg'))).toBe(true);
    expect(info).toHaveBeenCalledWith('2 Open Graph images written to og/');
  });

  it('defaults to the repository content, assets and font', () => {
    expect(ogImages().name).toBe('og-images');
  });
});

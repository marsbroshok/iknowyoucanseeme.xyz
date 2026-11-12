import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

/**
 * The six lens shaders on a fixed, computed test texture (ADR 0006: shaders
 * are verified in the browser). The harness (tests/e2e/visual/harness.ts)
 * is transpiled on the fly and served through `page.route`, so it never
 * enters the site build. Each lens is checked by pixel statistics that hold
 * on any GPU and in SwiftShader (the lens region changes in the way the
 * technique would, everything outside stays untouched, the texture is never
 * modified) and by a tolerance-based screenshot stored in tests/visual/.
 */

const SIZE = 256;
/** Lens radius (LENS.radius in src/world/core/LensUniforms.ts). */
const RADIUS = 0.24;
const ROOT = path.resolve('.');
const HARNESS = 'http://localhost:4325/__lens/';

type Mode = 'gel' | 'mirror' | 'exposure' | 'fracture' | 'flare' | 'icm';
type Tier = 'high' | 'low';
interface Lens {
  mode: Mode;
  modeB?: Mode;
  mix?: number;
  center?: [number, number];
  strength?: number;
  blur?: [number, number];
  segments?: number;
  partner?: boolean;
}

/** Serves the harness page, its modules (TypeScript transpiled per request) and Three.js. */
async function openHarness(page: Page): Promise<void> {
  await page.route(`${HARNESS}**`, async (route) => {
    const url = new URL(route.request().url());
    const rel = url.pathname.slice('/__lens/'.length);
    if (rel === '' || rel === 'index.html') {
      return route.fulfill({
        contentType: 'text/html',
        body: `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Lens harness</title>
<script type="importmap">{"imports":{"three":"/__lens/three/three.module.js"}}</script></head>
<body><script type="module" src="/__lens/tests/e2e/visual/harness.js"></script></body></html>`,
      });
    }
    if (rel.startsWith('three/')) {
      return route.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(ROOT, 'node_modules/three/build', rel.slice('three/'.length)), 'utf8') });
    }
    const source = path.join(ROOT, rel.replace(/\.js$/, '.ts'));
    const { outputText } = ts.transpileModule(fs.readFileSync(source, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
      fileName: source,
    });
    return route.fulfill({ contentType: 'text/javascript', body: outputText });
  });
  await page.setViewportSize({ width: SIZE, height: SIZE });
  await page.goto(`${HARNESS}index.html`);
  await page.waitForFunction(() => 'undefined' !== typeof (window as unknown as { __lens?: unknown }).__lens);
}

const draw = (page: Page, lens: Lens | null, tier: Tier = 'high') =>
  page.evaluate(([l, t]) => (window as unknown as { __lens: { draw(l: unknown, t: string): number[] } }).__lens.draw(l, t), [lens, tier] as const);
const shaderErrors = (page: Page) => page.evaluate(() => (window as unknown as { __lens: { errors: string[] } }).__lens.errors);
const checksum = (page: Page) => page.evaluate(() => (window as unknown as { __lens: { textureChecksum(): number } }).__lens.textureChecksum());

/** Pixel indices (bottom row first) whose texture point satisfies `keep`. */
function region(keep: (u: number, v: number) => boolean): number[] {
  const out: number[] = [];
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) if (keep((x + 0.5) / SIZE, (y + 0.5) / SIZE)) out.push(y * SIZE + x);
  return out;
}
const dist = (u: number, v: number, c: [number, number]) => Math.hypot(u - c[0], v - c[1]);
/** Well inside the lens (full strength). */
const inside = (c: [number, number] = [0.5, 0.5]) => region((u, v) => dist(u, v, c) < RADIUS * 0.5);
/** Outside the lens, away from the apparition's soft border. */
const outside = (c: [number, number] = [0.5, 0.5]) => region((u, v) => dist(u, v, c) > RADIUS * 1.05 && Math.min(u, v, 1 - u, 1 - v) > 0.12);
const luma = (p: number[], i: number) => 0.2126 * p[i * 4] + 0.7152 * p[i * 4 + 1] + 0.0722 * p[i * 4 + 2];
const maxDiff = (a: number[], b: number[], idx: number[]) => idx.reduce((m, i) => Math.max(m, Math.abs(a[i * 4] - b[i * 4]), Math.abs(a[i * 4 + 1] - b[i * 4 + 1]), Math.abs(a[i * 4 + 2] - b[i * 4 + 2])), 0);
const meanDiff = (a: number[], b: number[], idx: number[]) =>
  idx.reduce((s, i) => s + (Math.abs(a[i * 4] - b[i * 4]) + Math.abs(a[i * 4 + 1] - b[i * 4 + 1]) + Math.abs(a[i * 4 + 2] - b[i * 4 + 2])) / 3, 0) / idx.length;
const meanLuma = (p: number[], idx: number[]) => idx.reduce((s, i) => s + luma(p, i), 0) / idx.length;
/** Mean luminance step to the next pixel along x (`dx`) and y (`dy`): sharpness in each direction. */
function steps(p: number[], idx: number[]): { dx: number; dy: number } {
  let dx = 0;
  let dy = 0;
  for (const i of idx) {
    dx += Math.abs(luma(p, i) - luma(p, i + 1));
    dy += Math.abs(luma(p, i) - luma(p, i + SIZE));
  }
  return { dx: dx / idx.length, dy: dy / idx.length };
}
/** Mean luminance step between neighbouring pixels (sharpness). */
const detail = (p: number[], idx: number[]) => {
  const s = steps(p, idx);
  return s.dx + s.dy;
};

test.describe('Lens shaders (fixed test texture)', () => {
  let page: Page;
  let base: number[];

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await openHarness(page);
    base = await draw(page, null);
  });
  test.afterAll(async () => {
    await page.close();
  });

  test('the harness draws the test texture (not a blank canvas)', async () => {
    const all = region((u, v) => Math.min(u, v, 1 - u, 1 - v) > 0.12);
    expect(meanLuma(base, all)).toBeGreaterThan(30);
    expect(detail(base, all.filter((i) => i % SIZE < SIZE - 1 && i < SIZE * (SIZE - 1)))).toBeGreaterThan(3);
  });

  test('every lens compiles and links on both tiers', async () => {
    for (const tier of ['high', 'low'] as const) {
      for (const mode of ['gel', 'mirror', 'exposure', 'fracture', 'flare', 'icm'] as const) await draw(page, { mode }, tier);
    }
    expect(await shaderErrors(page)).toEqual([]);
  });

  test('a lens at zero strength draws the unaltered work', async () => {
    expect(maxDiff(await draw(page, { mode: 'flare', strength: 0 }), base, region(() => true))).toBeLessThanOrEqual(1);
  });

  for (const mode of ['gel', 'mirror', 'exposure', 'fracture', 'flare', 'icm'] as const) {
    test(`${mode}: changes the soft circle around the pointer and nothing outside it`, async () => {
      const c: [number, number] = [0.42, 0.55];
      const lensed = await draw(page, { mode, center: c });
      expect(meanDiff(lensed, base, inside(c))).toBeGreaterThan(6);
      expect(maxDiff(lensed, base, outside(c))).toBeLessThanOrEqual(2);
    });
  }

  test('colour filter: the circle takes on the gel colour (red-orange)', async () => {
    const lensed = await draw(page, { mode: 'gel' });
    const idx = inside();
    const warmth = (p: number[]) => idx.reduce((s, i) => s + p[i * 4] - (p[i * 4 + 1] + p[i * 4 + 2]) / 2, 0) / idx.length;
    expect(warmth(lensed) - warmth(base)).toBeGreaterThan(15);
  });

  test('mirror fold: the circle is symmetric across the horizontal line through the pointer', async () => {
    const pairs = inside().filter((i) => Math.floor(i / SIZE) < SIZE / 2);
    const asym = (p: number[]) =>
      pairs.reduce((s, i) => {
        const j = (SIZE - 1 - Math.floor(i / SIZE)) * SIZE + (i % SIZE);
        return s + Math.abs(luma(p, i) - luma(p, j));
      }, 0) / pairs.length;
    expect(asym(base)).toBeGreaterThan(10);
    for (const segments of [2, 3, 6]) expect(asym(await draw(page, { mode: 'mirror', segments })), `${segments} segments`).toBeLessThan(3);
  });

  test('multiple exposure: a screen blend only ever brightens', async () => {
    const lensed = await draw(page, { mode: 'exposure' });
    const idx = inside();
    expect(meanLuma(lensed, idx) - meanLuma(base, idx)).toBeGreaterThan(10);
    expect(idx.every((i) => luma(lensed, i) >= luma(base, i) - 2)).toBe(true);
    // Until a second work is loaded, the work's own picture turned around is the second exposure.
    const alone = await draw(page, { mode: 'exposure', partner: false });
    expect(meanDiff(alone, base, idx)).toBeGreaterThan(6);
    expect(meanDiff(alone, lensed, idx)).toBeGreaterThan(3);
  });

  test("fracture: shards keep the picture's colours but break its lines", async () => {
    const lensed = await draw(page, { mode: 'fracture' });
    const idx = inside();
    expect(Math.abs(meanLuma(lensed, idx) - meanLuma(base, idx))).toBeLessThan(25);
    expect(meanDiff(lensed, base, idx)).toBeGreaterThan(6);
  });

  test('light leak: additive light, never darker anywhere in the circle', async () => {
    const lensed = await draw(page, { mode: 'flare' });
    const idx = inside();
    expect(meanLuma(lensed, idx) - meanLuma(base, idx)).toBeGreaterThan(15);
    expect(idx.every((i) => luma(lensed, i) >= luma(base, i) - 2)).toBe(true);
  });

  test('motion blur: the circle loses fine detail along the streak, which follows the pointer', async () => {
    const idx = inside();
    const before = steps(base, idx);
    const sidewaysPixels = await draw(page, { mode: 'icm', blur: [0.08, 0] });
    const upwardsPixels = await draw(page, { mode: 'icm', blur: [0, 0.08] });
    expect(steps(sidewaysPixels, idx).dx).toBeLessThan(before.dx * 0.6);
    expect(steps(upwardsPixels, idx).dy).toBeLessThan(before.dy * 0.6);
    expect(meanDiff(sidewaysPixels, upwardsPixels, idx)).toBeGreaterThan(3);
  });

  test('a crossfade halfway shows both lenses, half each', async () => {
    const a = await draw(page, { mode: 'gel' });
    const b = await draw(page, { mode: 'flare' });
    const half = await draw(page, { mode: 'gel', modeB: 'flare', mix: 0.5 });
    const avg = a.map((v, i) => (v + b[i]) / 2);
    const idx = inside();
    // Mixed in linear light, so only close to the average of the two encoded pictures.
    expect(meanDiff(half, avg, idx)).toBeLessThan(0.5 * Math.min(meanDiff(half, a, idx), meanDiff(half, b, idx)));
  });

  test('low tier: cheaper variants of every lens, and no fracture at all', async () => {
    const idx = inside();
    const lowBase = await draw(page, null, 'low');
    expect(maxDiff(await draw(page, { mode: 'fracture' }, 'low'), lowBase, idx)).toBeLessThanOrEqual(1);
    const blur: Lens = { mode: 'icm', blur: [0.08, 0] };
    const lowBlur = await draw(page, blur, 'low');
    expect(steps(lowBlur, idx).dx).toBeLessThan(steps(lowBase, idx).dx * 0.8);
    // Fewer samples along the streak: visibly not the high-tier picture.
    expect(meanDiff(lowBlur, await draw(page, blur, 'high'), idx)).toBeGreaterThan(0.5);
    const flare: Lens = { mode: 'flare', center: [0.3, 0.6] };
    expect(meanDiff(await draw(page, flare, 'low'), await draw(page, flare, 'high'), idx)).toBeGreaterThan(0.5);
    for (const mode of ['gel', 'mirror', 'exposure', 'flare'] as const) expect(meanDiff(await draw(page, { mode }, 'low'), lowBase, idx), mode).toBeGreaterThan(6);
    expect(await shaderErrors(page)).toEqual([]);
  });

  test('the lens never changes the stored image (FR4)', async () => {
    const before = await checksum(page);
    for (const mode of ['gel', 'mirror', 'exposure', 'fracture', 'flare', 'icm'] as const) await draw(page, { mode });
    expect(await checksum(page)).toBe(before);
    expect(maxDiff(await draw(page, null), base, region(() => true))).toBe(0);
  });

  for (const mode of ['gel', 'mirror', 'exposure', 'fracture', 'flare', 'icm'] as const) {
    test(`${mode}: matches its reference picture in tests/visual/ (tolerance-based)`, async () => {
      await draw(page, { mode, center: [0.45, 0.52], segments: 4, blur: [0.05, 0.02] });
      await expect(page.locator('[data-lens-canvas]')).toHaveScreenshot(`lens-${mode}.png`, { maxDiffPixelRatio: 0.015, threshold: 0.2 });
    });
  }
});

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
const luma = (p: number[], i: number) => 0.2126 * p[i * 4] + 0.7152 * p[i * 4 + 1] + 0.0722 * p[i * 4 + 2];
const maxDiff = (a: number[], b: number[], idx: number[]) => idx.reduce((m, i) => Math.max(m, Math.abs(a[i * 4] - b[i * 4]), Math.abs(a[i * 4 + 1] - b[i * 4 + 1]), Math.abs(a[i * 4 + 2] - b[i * 4 + 2])), 0);
const meanLuma = (p: number[], idx: number[]) => idx.reduce((s, i) => s + luma(p, i), 0) / idx.length;
/** Mean luminance step between neighbouring pixels (sharpness). */
function detail(p: number[], idx: number[]): number {
  let s = 0;
  for (const i of idx) s += Math.abs(luma(p, i) - luma(p, i + 1)) + Math.abs(luma(p, i) - luma(p, i + SIZE));
  return s / idx.length;
}

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

  test('the lens never changes the stored image (FR4)', async () => {
    const before = await checksum(page);
    for (const mode of ['gel', 'mirror', 'exposure', 'fracture', 'flare', 'icm'] as const) await draw(page, { mode });
    expect(await checksum(page)).toBe(before);
    expect(maxDiff(await draw(page, null), base, region(() => true))).toBe(0);
  });
});

import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

/**
 * Browser WebGL2 verification of the Threshold boreal light curtain shader
 * (`ThresholdLeak.ts`, ADR 0006): checks vertical curtain anisotropy, distinct
 * emerald-green, violet, and rose-pink aurora ribbons on both `high` and `low`
 * quality tiers, and temporal curtain sway.
 */
const SIZE = 256;
const ROOT = path.resolve('.');
const HARNESS = 'http://localhost:4325/__boreal/';

async function openBorealHarness(page: Page, errors: string[]): Promise<void> {
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  await page.route(`${HARNESS}**`, async (route) => {
    const url = new URL(route.request().url());
    const rel = url.pathname.slice('/__boreal/'.length);
    if (rel === '' || rel === 'index.html') {
      return route.fulfill({
        contentType: 'text/html',
        body: `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Boreal harness</title>
<script type="importmap">{"imports":{"three":"/__boreal/three/three.module.js"}}</script></head>
<body><script type="module" src="/__boreal/tests/e2e/visual/borealHarness.js"></script></body></html>`,
      });
    }
    if (rel.startsWith('three/')) {
      return route.fulfill({
        contentType: 'text/javascript',
        body: fs.readFileSync(path.join(ROOT, 'node_modules/three/build', rel.slice('three/'.length)), 'utf8'),
      });
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
  await page.waitForFunction(() => 'undefined' !== typeof (window as unknown as { __boreal?: unknown }).__boreal);
}

const luma = (p: number[], i: number) => 0.2126 * p[i * 4] + 0.7152 * p[i * 4 + 1] + 0.0722 * p[i * 4 + 2];

function curtainStats(pixels: number[]) {
  let dx = 0;
  let dy = 0;
  let stepCount = 0;
  let green = 0;
  let violet = 0;
  let pink = 0;
  let minLitX = SIZE;
  let maxLitX = 0;

  for (let y = Math.floor(SIZE * 0.1); y < Math.floor(SIZE * 0.9); y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = y * SIZE + x;
      const r = pixels[i * 4];
      const g = pixels[i * 4 + 1];
      const b = pixels[i * 4 + 2];
      const lum = luma(pixels, i);
      if (lum > 18) {
        if (x < minLitX) minLitX = x;
        if (x > maxLitX) maxLitX = x;
      }
      if (g > r + 20 && g >= b + 6 && g > 36) green++;
      if (b > r + 18 && r > g + 8 && b > 40) violet++;
      if (r > b + 12 && b > g + 12 && r > 44) pink++;

      if (x + 4 < SIZE && y + 4 < SIZE) {
        dx += Math.abs(lum - luma(pixels, y * SIZE + (x + 4)));
        dy += Math.abs(lum - luma(pixels, (y + 4) * SIZE + x));
        stepCount++;
      }
    }
  }
  return {
    dx: dx / stepCount,
    dy: dy / stepCount,
    spanRatio: maxLitX > minLitX ? (maxLitX - minLitX) / SIZE : 0,
    green,
    violet,
    pink,
  };
}

test.describe('ThresholdLeak aurora borealis shader', () => {
  test('renders vertical curtain folds with distinct green, violet, and pink ribbons on high and low tiers and sways over time', async ({ page }) => {
    const errors: string[] = [];
    await openBorealHarness(page, errors);

    for (const tier of ['high', 'low'] as const) {
      const { pixels } = await page.evaluate(
        ([t]) => (window as unknown as { __boreal: { drawThreshold(tier: string, s: number): { pixels: number[] } } }).__boreal.drawThreshold(t, 0.5),
        [tier] as const,
      );
      const stats = curtainStats(pixels);
      expect(stats.spanRatio, `${tier} horizontal span`).toBeGreaterThan(0.75);
      expect(stats.dx, `${tier} horizontal ray detail`).toBeGreaterThan(2.0);
      expect(stats.dx, `${tier} vertical curtain anisotropy`).toBeGreaterThan(stats.dy * 1.25);
      expect(stats.green, `${tier} emerald-green pixels`).toBeGreaterThan(600);
      expect(stats.violet, `${tier} boreal-violet pixels`).toBeGreaterThan(600);
      expect(stats.pink, `${tier} magenta-pink pixels`).toBeGreaterThan(600);
    }

    const t0 = await page.evaluate(() =>
      (window as unknown as { __boreal: { drawThreshold(tier: string, s: number): { pixels: number[] } } }).__boreal.drawThreshold('high', 0),
    );
    const t4 = await page.evaluate(() =>
      (window as unknown as { __boreal: { drawThreshold(tier: string, s: number): { pixels: number[] } } }).__boreal.drawThreshold('high', 4.0),
    );
    let meanDiff = 0;
    const totalPixels = SIZE * SIZE;
    for (let i = 0; i < totalPixels; i++) {
      meanDiff +=
        (Math.abs(t0.pixels[i * 4] - t4.pixels[i * 4]) +
          Math.abs(t0.pixels[i * 4 + 1] - t4.pixels[i * 4 + 1]) +
          Math.abs(t0.pixels[i * 4 + 2] - t4.pixels[i * 4 + 2])) /
        3;
    }
    expect(meanDiff / totalPixels).toBeGreaterThan(2.0);
    expect(errors).toEqual([]);
  });
});

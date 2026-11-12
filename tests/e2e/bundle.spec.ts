import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

/**
 * Bundle budget of the drift world (spec NFR, ADR 0007): the home pages load
 * one small boot module; Three.js arrives only through its dynamic import,
 * and that world chunk (with its static imports) stays within 250 KB gzipped.
 * Tone.js (sound track, ADR 0011) is in neither: it arrives only through
 * the boot's second dynamic import, the sound chunk, loaded after the
 * visitor's gesture. The test-only debug hook must not exist in the
 * production build.
 */
const DIST = path.resolve('dist');
const KEYED = path.resolve('dist-e2e-keyed');
const ASTRO = (root: string) => path.join(root, '_astro');

/** Gzipped size budget of the world chunk and its static imports. */
const WORLD_BUDGET_GZ = 250 * 1024;
/** Tone.js's console banner, present in its bundled code. */
const TONE = /Tone\.js v/;

/** Gzipped size budget of the boot module (and its static imports). */
const BOOT_BUDGET_GZ = 8 * 1024;

const read = (root: string, file: string) => fs.readFileSync(path.join(ASTRO(root), file), 'utf8');
const gz = (root: string, file: string) => zlib.gzipSync(fs.readFileSync(path.join(ASTRO(root), file))).length;

/** Module scripts of a built page, as file names in `_astro/`. */
function moduleScripts(html: string): string[] {
  return [...html.matchAll(/<script\b[^>]*\bsrc="\/_astro\/([^"]+\.js)"/g)].map((m) => m[1]);
}

/** Static imports of a bundled chunk (`import … from "./x.js"`, `import "./x.js"`). */
function staticImports(code: string): string[] {
  return [...code.matchAll(/(?:import|export)\s*(?:[\w${},*\s]*?from\s*)?["']\.\/([^"']+\.js)["']/g)].map((m) => m[1]);
}

/** Dynamic imports of a bundled chunk (`import("./x.js")`). */
function dynamicImports(code: string): string[] {
  return [...code.matchAll(/import\(\s*["']\.\/([^"']+\.js)["']\s*\)/g)].map((m) => m[1]);
}

/** A chunk and everything it imports statically. */
function closure(root: string, entry: string): Set<string> {
  const seen = new Set<string>();
  const queue = [entry];
  while (queue.length > 0) {
    const file = queue.pop() as string;
    if (seen.has(file)) continue;
    seen.add(file);
    queue.push(...staticImports(read(root, file)));
  }
  return seen;
}

const sum = (root: string, files: Iterable<string>) => [...files].reduce((total, f) => total + gz(root, f), 0);

test.describe('Drift world bundle (dist/)', () => {
  for (const home of ['en/index.html', 'fr/index.html']) {
    test(`${home}: a small boot module without Three.js or Tone.js; the world chunk ≤ 250 KB gzipped without Tone.js; Tone.js only in the sound chunk; both loaded only by dynamic import`, () => {
      const scripts = moduleScripts(fs.readFileSync(path.join(DIST, home), 'utf8'));
      expect(scripts).toHaveLength(1);
      const boot = closure(DIST, scripts[0]);
      const bootSize = sum(DIST, boot);
      expect(bootSize).toBeLessThanOrEqual(BOOT_BUDGET_GZ);
      for (const f of boot) {
        expect(read(DIST, f), f).not.toMatch(/THREE\./);
        expect(read(DIST, f), f).not.toMatch(TONE);
      }

      const lazy = [...boot].flatMap((f) => dynamicImports(read(DIST, f)));
      expect(lazy).toHaveLength(2);
      const chunks = lazy.map((entry) => [...closure(DIST, entry)].filter((f) => !boot.has(f)));
      const has = (files: string[], marker: RegExp) => files.some((f) => marker.test(read(DIST, f)));
      const world = chunks.find((files) => has(files, /THREE\./)) as string[];
      const sound = chunks.find((files) => has(files, TONE)) as string[];
      expect(world).toBeDefined();
      expect(sound).toBeDefined();
      expect(has(world, TONE)).toBe(false);
      expect(has(sound, /THREE\./)).toBe(false);
      const worldSize = sum(DIST, world);
      expect(worldSize).toBeLessThanOrEqual(WORLD_BUDGET_GZ);
      const soundSize = sum(DIST, sound);
      console.log(`[bundle] ${home}: boot ${(bootSize / 1024).toFixed(1)} KB gz, world ${(worldSize / 1024).toFixed(1)} KB gz, sound ${(soundSize / 1024).toFixed(1)} KB gz`);
    });
  }

  test('no other page loads a module script (the awake layer ships no JavaScript files)', () => {
    const pages = (fs.readdirSync(DIST, { recursive: true }) as string[])
      .map((f) => f.split(path.sep).join('/'))
      .filter((f) => f.endsWith('.html') && !/^(en|fr)\/index\.html$/.test(f));
    expect(pages.length).toBeGreaterThan(90);
    for (const p of pages) expect(moduleScripts(fs.readFileSync(path.join(DIST, p), 'utf8')), p).toEqual([]);
  });

  test('the debug hook exists only in the keyed test build', () => {
    const has = (root: string) => fs.readdirSync(ASTRO(root)).some((f) => f.endsWith('.js') && read(root, f).includes('__driftDebug'));
    expect(has(DIST)).toBe(false);
    expect(has(KEYED)).toBe(true);
  });
});

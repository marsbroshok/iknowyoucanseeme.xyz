import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * ADR 0011: Tone.js stays behind `SoundEngine`. Only `src/sound/engine/`
 * imports `tone`; the decisions (`src/sound/core/`), the boot and the world
 * never do, so the library can be replaced and never lands in the initial
 * bundle by a stray import. The engine needs no coverage exclusion.
 */
const ROOT = path.resolve(__dirname, '../..');
const sources = (fs.readdirSync(path.join(ROOT, 'src'), { recursive: true }) as string[])
  .map((f) => f.split(path.sep).join('/'))
  .filter((f) => /\.(ts|astro)$/.test(f));
const importsTone = (file: string) => /from\s+['"]tone(\/[^'"]*)?['"]|import\(\s*['"]tone/.test(fs.readFileSync(path.join(ROOT, 'src', file), 'utf8'));

describe('Sound boundary (ADR 0011)', () => {
  it('only files in src/sound/engine/ import tone', () => {
    expect(sources.filter((f) => !f.startsWith('sound/engine/') && importsTone(f))).toEqual([]);
  });

  it('src/sound/engine/ really holds the Tone.js code', () => {
    expect(sources.filter((f) => f.startsWith('sound/engine/') && importsTone(f)).length).toBeGreaterThan(0);
  });

  it('the sound code is not excluded from coverage', () => {
    const config = fs.readFileSync(path.join(ROOT, 'vitest.config.ts'), 'utf8');
    const exclude = /coverage:\s*{[\s\S]*?exclude:\s*\[([^\]]*)\]/.exec(config)?.[1] ?? '';
    expect(exclude).not.toMatch(/sound/);
  });
});

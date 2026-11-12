import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * ADR 0006: only `src/world/gl/` may need a GPU context, so only it is
 * excluded from the unit-coverage gate, and only it may import `three`.
 */
const ROOT = path.resolve(__dirname, '../..');
const sources = (fs.readdirSync(path.join(ROOT, 'src'), { recursive: true }) as string[])
  .map((f) => f.split(path.sep).join('/'))
  .filter((f) => /\.(ts|astro)$/.test(f));
const importsThree = (file: string) => /from\s+['"]three(\/[^'"]*)?['"]|import\(\s*['"]three/.test(fs.readFileSync(path.join(ROOT, 'src', file), 'utf8'));

describe('WebGL boundary (ADR 0006)', () => {
  it('only files in src/world/gl/ import three', () => {
    const offenders = sources.filter((f) => !f.startsWith('world/gl/') && importsThree(f));
    expect(offenders).toEqual([]);
  });

  it('src/world/gl/ really holds the Three.js code', () => {
    expect(sources.filter((f) => f.startsWith('world/gl/') && importsThree(f)).length).toBeGreaterThan(0);
  });

  it('excludes exactly src/world/gl/ (and nothing else new) from coverage', () => {
    const config = fs.readFileSync(path.join(ROOT, 'vitest.config.ts'), 'utf8');
    const exclude = /coverage:\s*{[\s\S]*?exclude:\s*\[([^\]]*)\]/.exec(config)?.[1] ?? '';
    const entries = [...exclude.matchAll(/'([^']+)'/g)].map((m) => m[1]);
    expect(entries).toEqual(['src/**/*.astro', 'src/world/gl/**', 'tests/e2e/**', '**/*.d.ts']);
  });
});

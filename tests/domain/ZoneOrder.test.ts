import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { ZONE_ORDER } from '../../src/domain/ZoneOrder.js';
import { ZONE_ORDER as QUERY_ORDER } from '../../src/domain/WorkQueries.js';
import { ZONE_ORDER as LAYOUT_ORDER } from '../../src/world/core/FieldLayout.js';
import { WorkSchema } from '../../src/content/schema/index.js';

const ROOT = path.resolve(__dirname, '../..');
const sources = (dir: string) =>
  (fs.readdirSync(path.join(ROOT, dir), { recursive: true }) as string[]).filter((f) => /\.(ts|astro)$/.test(f)).map((f) => path.join(dir, f));

describe('ZONE_ORDER (single source of truth)', () => {
  it('is the narrative order Arrival → Lens → Leak', () => {
    expect(ZONE_ORDER).toEqual(['arrival', 'lens', 'leak']);
  });

  it('is the very same list in the domain queries and the world layout', () => {
    expect(QUERY_ORDER).toBe(ZONE_ORDER);
    expect(LAYOUT_ORDER).toBe(ZONE_ORDER);
  });

  it('is what the work schema accepts as a zone', () => {
    expect(WorkSchema.innerType().shape.zone.unwrap().options).toEqual([...ZONE_ORDER]);
  });

  it('is spelled out in one file only', () => {
    const literal = /\[\s*['"]arrival['"]\s*,\s*['"]lens['"]\s*,\s*['"]leak['"]\s*\]/;
    const holders = [...sources('src'), ...sources('tools')].filter((f) => literal.test(fs.readFileSync(path.join(ROOT, f), 'utf8')));
    expect(holders).toEqual([path.join('src', 'domain', 'ZoneOrder.ts')]);
  });
});

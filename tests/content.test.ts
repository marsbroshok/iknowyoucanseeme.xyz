import { describe, it, expect, vi } from 'vitest';

vi.mock('astro:content', () => ({
  defineCollection: (cfg: any) => cfg,
  z: require('zod')
}));
vi.mock('astro/loaders', () => ({
  glob: () => ({}),
  file: () => ({})
}));

import { collections } from '../src/content.config.js';
import * as schemas from '../src/content/schema/index.js';

describe('Content collections', () => {
  it('reuse the exact schema objects', () => {
    // We check that the schema function or object on collections matches the exported ones
    expect(collections.works.schema).toBe(schemas.WorkSchema);
    expect(collections.territories.schema).toBe(schemas.TerritorySchema);
    expect(collections.zones.schema).toBe(schemas.ZoneSchema);
    expect(collections.exhibitions.schema).toBe(schemas.ExhibitionSchema);
    expect(collections.pages.schema).toBe(schemas.PageSchema);
  });
});

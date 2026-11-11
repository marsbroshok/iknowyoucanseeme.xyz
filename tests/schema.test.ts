import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import * as yaml from 'yaml';
import { WorkSchema, TerritorySchema, ZoneSchema, ExhibitionSchema } from '../src/content/schema/index.js';
import { AnyZodObject, ZodEffects } from 'zod';

describe('Zod Content Schemas', () => {
  it('validates a correct Work fixture', () => {
    const fixture = {
      slug: 'test-work',
      title: { fr: 'Test' },
      territory: 'test-territory',
      year: 2025,
      medium: 'photo',
      techniques: ['digital'],
      availability: 'unknown',
      images: [
        {
          src: 'test.jpg',
          source: 'instagram',
          width: 800,
          height: 600,
          palette: ['#000000']
        }
      ]
    };
    expect(WorkSchema.parse(fixture)).toEqual(fixture);
  });

  it('rejects missing FR title, bad slug', () => {
    const bad = {
      slug: 'Bad Slug',
      title: { en: 'No FR' },
      territory: 't',
      year: 2025,
      medium: 'photo',
      techniques: [],
      availability: 'unknown',
      images: []
    };
    expect(() => WorkSchema.parse(bad)).toThrow();
  });

  it('rejects people without consent', () => {
    const fixture = {
      slug: 'test-work',
      title: { fr: 'Test' },
      territory: 'test',
      year: 2025,
      medium: 'photo',
      techniques: [],
      availability: 'unknown',
      people: { consent: 'pending' },
      images: []
    };
    expect(() => WorkSchema.parse(fixture)).toThrow();
  });

  it('rejects Leak zone outside Dreamland territory', () => {
    const fixture = {
      slug: 'test-work',
      title: { fr: 'Test' },
      territory: 'some-other',
      zone: 'leak',
      year: 2025,
      medium: 'photo',
      techniques: [],
      availability: 'unknown',
      images: []
    };
    expect(() => WorkSchema.parse(fixture)).toThrow();
  });

  it('ensures no schema has a price-like key', () => {
    const checkNoPrice = (schema: AnyZodObject | ZodEffects<AnyZodObject>) => {
      // Use innerType for ZodEffects
      const actualSchema = 'innerType' in schema ? schema.innerType() : schema;
      const keys = Object.keys(actualSchema.shape || {});
      keys.forEach(k => {
        expect(k.toLowerCase()).not.toMatch(/price|prix|cost|eur/);
      });
    };
    checkNoPrice(WorkSchema);
    checkNoPrice(TerritorySchema);
    checkNoPrice(ZoneSchema);
    checkNoPrice(ExhibitionSchema);
  });

  it('round-trips through YAML stringify/parse unchanged', () => {
    fc.assert(
      fc.property(
        fc.record({
          slug: fc.stringMatching(/^[a-z0-9-]+$/),
          title: fc.record({ fr: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0), en: fc.string() }),
          territory: fc.string(),
          year: fc.integer({ min: 1900, max: 2100 }),
          medium: fc.constantFrom('photo', 'ceramic'),
          techniques: fc.array(fc.string()),
          availability: fc.constantFrom('available', 'sold', 'not-for-sale', 'unknown'),
          images: fc.array(fc.record({
            src: fc.string(),
            source: fc.constantFrom('instagram', 'original'),
            width: fc.integer({ min: 1 }),
            height: fc.integer({ min: 1 }),
            palette: fc.array(fc.stringMatching(/^#[0-9a-f]{6}$/))
          }))
        }),
        (validWork) => {
          const parsed = WorkSchema.parse(validWork);
          const yamlStr = yaml.stringify(parsed);
          const parsedBack = yaml.parse(yamlStr);
          expect(parsedBack).toEqual(parsed);
        }
      )
    );
  });
});

import { describe, it, expect } from 'vitest';
import { TextBlockSchema } from '../src/content/schema/index.js';

describe('TextBlockSchema', () => {
  it('requires valid status enum', () => {
    expect(() => TextBlockSchema.parse({ status: 'invalid', fr: 'fr', en: 'en', sources: ['x'] })).toThrow();
    expect(TextBlockSchema.parse({ status: 'draft', fr: 'fr', en: 'en', sources: ['x'] }).status).toBe('draft');
  });

  it('requires both languages', () => {
    expect(() => TextBlockSchema.parse({ status: 'draft', fr: 'fr', sources: ['x'] })).toThrow();
    expect(() => TextBlockSchema.parse({ status: 'draft', en: 'en', sources: ['x'] })).toThrow();
  });

  it('requires non-empty sources', () => {
    expect(() => TextBlockSchema.parse({ status: 'draft', fr: 'fr', en: 'en', sources: [] })).toThrow();
  });
});

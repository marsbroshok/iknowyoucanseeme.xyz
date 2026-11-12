import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { pathToKey } from '../src/i18n/LocalizedPath.js';

interface Assertion {
  0: 'error' | 'warn';
  1: { minScore: number };
}

const config = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../lighthouserc.json'), 'utf8')) as {
  ci: {
    collect: { staticDistDir: string; url: string[] };
    assert: { assertions: Record<string, Assertion> };
  };
};

describe('lighthouserc.json', () => {
  it('audits the built site on a home, a territory and a work page', () => {
    expect(config.ci.collect.staticDistDir).toBe('./dist');
    const keys = config.ci.collect.url.map((u) => pathToKey(new URL(u).pathname));
    expect(keys).toEqual(['home', 'territories', 'works']);
    for (const u of config.ci.collect.url) {
      expect(u.endsWith('/'), u).toBe(true);
    }
  });

  it('enforces the spec budgets: performance ≥ 0.95, accessibility 1, SEO 1 (as errors)', () => {
    const a = config.ci.assert.assertions;
    expect(a['categories:performance']).toEqual(['error', { minScore: 0.95 }]);
    expect(a['categories:accessibility']).toEqual(['error', { minScore: 1 }]);
    expect(a['categories:seo']).toEqual(['error', { minScore: 1 }]);
  });
});

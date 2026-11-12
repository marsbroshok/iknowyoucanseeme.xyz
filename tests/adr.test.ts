import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Every ADR records its context, the decision and the alternatives that were
 * considered and rejected (and why), per the project's ADR rule.
 */
describe('Architecture Decision Records', () => {
  const dir = path.resolve(__dirname, '../docs/adr');
  const files = fs.readdirSync(dir).filter((f) => /^\d{4}-.*\.md$/.test(f));

  it('exist', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)('%s has Context, Decision and Considered & Rejected Alternatives sections', (file) => {
    const text = fs.readFileSync(path.join(dir, file), 'utf8');
    for (const heading of ['## Context', '## Decision', '## Considered & Rejected Alternatives']) {
      expect(text, `${file}: ${heading}`).toMatch(new RegExp(`^${heading}\\s*$`, 'm'));
    }
  });
});

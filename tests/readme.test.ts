import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * The README is the artist's entry point: it must document every npm script
 * and the license split (code MIT, works all rights reserved).
 */
const ROOT = path.resolve(__dirname, '..');
const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
const scripts = Object.keys(
  (JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as { scripts: Record<string, string> }).scripts,
);

describe('README', () => {
  it.each(scripts)('documents `npm run %s`', (name) => {
    const usage = name === 'test' ? 'npm test' : `npm run ${name}`;
    expect(readme).toContain(usage);
  });

  it('describes the project, not the old template', () => {
    expect(readme).toMatch(/^# iknowyoucanseeme\.xyz/m);
    expect(readme).toContain('legacy-hugo');
    expect(readme).toContain('docs/deploy.md');
  });
});

describe('LICENSE', () => {
  const license = fs.readFileSync(path.join(ROOT, 'LICENSE.md'), 'utf8');

  it('names the artist as holder with a current year', () => {
    expect(license).toMatch(/Copyright \(c\) 20\d\d Alexander Usoltsev/);
    expect(license).not.toContain('George Cushen');
  });

  it('reserves all rights on works, images and texts', () => {
    expect(license).toMatch(/all rights reserved/i);
    expect(license).toContain('src/assets/');
  });
});

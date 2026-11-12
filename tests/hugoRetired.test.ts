import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

/**
 * The Hugo (HugoBlox) site was retired at launch and preserved under the
 * annotated tag `legacy-hugo`. Nothing of it may come back on the branch:
 * no Hugo directory, config, workflow or template boilerplate.
 */
const ROOT = path.resolve(__dirname, '..');

/** Paths that only the Hugo site used. */
const HUGO_PATHS = [
  'config',
  'content',
  'layouts',
  'assets',
  'hugo-blox',
  'static',
  '_archived',
  'notebooks',
  'go.mod',
  'go.sum',
  'hugoblox.yaml',
  'netlify.toml',
  '.github/workflows/publish.yaml',
  '.github/workflows/import-notebooks.yml',
  '.github/FUNDING.yml',
];

/** Tracked files of the repository, relative to its root. */
function trackedFiles(): string[] {
  return execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean);
}

describe('Hugo site retired', () => {
  it.each(HUGO_PATHS)('%s is not tracked', (hugoPath) => {
    const hits = trackedFiles().filter((f) => f === hugoPath || f.startsWith(`${hugoPath}/`));
    expect(hits).toEqual([]);
  });

  it('no tracked file mentions the Hugo template outside the conductor history and docs', () => {
    const offenders = trackedFiles()
      .filter((f) => !f.startsWith('conductor/') && !f.startsWith('docs/') && f !== 'tests/hugoRetired.test.ts')
      .filter((f) => /\.(ts|js|mjs|json|ya?ml|toml|md|astro|css)$/.test(f) && f !== 'package-lock.json')
      .filter((f) => /hugo ?blox|hugoblox|peaceiris\/actions-hugo/i.test(fs.readFileSync(path.join(ROOT, f), 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('the ESLint config no longer lists Hugo directories', () => {
    const config = fs.readFileSync(path.join(ROOT, 'eslint.config.js'), 'utf8');
    for (const dir of ['static/', 'layouts/', 'hugo-blox/', 'notebooks/', 'config/', 'content/', '_archived/']) {
      expect(config).not.toContain(`"${dir}"`);
    }
  });
});

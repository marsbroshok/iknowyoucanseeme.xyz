import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';

/**
 * docs/deploy.md is the artist's cutover runbook: it must cover every step
 * the spec lists and stay in sync with the workflow it describes.
 */
const ROOT = path.resolve(__dirname, '..');
const doc = fs.readFileSync(path.join(ROOT, 'docs/deploy.md'), 'utf8');
const workflow = yaml.parse(fs.readFileSync(path.join(ROOT, '.github/workflows/deploy.yml'), 'utf8')) as {
  name: string;
  jobs: { build: { env: Record<string, string> } };
};

describe('docs/deploy.md', () => {
  it('sets the Pages source to GitHub Actions and the custom domain with HTTPS', () => {
    expect(doc).toContain('Source:\nGitHub Actions');
    expect(doc).toContain('`www.iknowyoucanseeme.xyz`');
    expect(doc).toContain('Enforce HTTPS');
  });

  it('names every build variable of the workflow as a repository variable', () => {
    for (const name of Object.keys(workflow.jobs.build.env)) expect(doc).toContain(`\`${name}\``);
    expect(doc).toContain('Variables tab');
  });

  it('pushes main and the legacy-hugo tag, and refers to the workflow by its name', () => {
    expect(doc).toContain('git push origin main');
    expect(doc).toContain('git push origin legacy-hugo');
    expect(doc).toContain(`"${workflow.name}"`);
  });

  it('includes DNS/HTTPS checks and the first-run lockfile verification', () => {
    expect(doc).toMatch(/dig \+short www\.iknowyoucanseeme\.xyz/);
    expect(doc).toMatch(/curl -sI https:\/\/www\.iknowyoucanseeme\.xyz/);
    expect(doc).toContain('public npm registry');
  });

  it('documents a rollback to legacy-hugo without force-pushing', () => {
    expect(doc).toContain('git checkout legacy-hugo -- .');
    expect(doc).toContain('Never force-push');
    expect(doc).not.toMatch(/push\s+(-f|--force)/);
  });

  it('contains no absolute local paths', () => {
    expect(doc).not.toMatch(/\/Users\/|\/home\/|\.gemini/);
  });
});

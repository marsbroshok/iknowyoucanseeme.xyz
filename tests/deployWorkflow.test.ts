import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';

/**
 * Structural check of the GitHub Pages workflow (actionlint also runs on it
 * in CI, see the "Lint workflows" step): triggers, Pages permissions, the
 * install → check → build → upload → deploy chain, pinned action majors and
 * build variables read from repository variables, never inlined.
 */
const ROOT = path.resolve(__dirname, '..');
const WORKFLOW = path.join(ROOT, '.github/workflows/deploy.yml');

interface Step {
  name?: string;
  uses?: string;
  run?: string;
  id?: string;
  with?: Record<string, unknown>;
}
interface Job {
  'runs-on': string;
  needs?: string | string[];
  env?: Record<string, string>;
  environment?: { name: string; url: string };
  steps: Step[];
}
interface Workflow {
  name: string;
  on: { push: { branches: string[] }; workflow_dispatch: unknown };
  permissions: Record<string, string>;
  concurrency: { group: string; 'cancel-in-progress': boolean };
  jobs: Record<string, Job>;
}

const text = fs.readFileSync(WORKFLOW, 'utf8');
const workflow = yaml.parse(text) as Workflow;
const build = workflow.jobs.build;
const deploy = workflow.jobs.deploy;

/** Index of the first step matching `predicate` (fails the test when absent). */
function stepIndex(steps: Step[], label: string, predicate: (s: Step) => boolean): number {
  const index = steps.findIndex(predicate);
  expect(index, `step "${label}"`).toBeGreaterThanOrEqual(0);
  return index;
}

describe('deploy.yml', () => {
  it('is the only workflow', () => {
    expect(fs.readdirSync(path.dirname(WORKFLOW))).toEqual(['deploy.yml']);
  });

  it('runs on push to main and manually', () => {
    expect(workflow.on.push.branches).toEqual(['main']);
    expect('workflow_dispatch' in workflow.on).toBe(true);
  });

  it('has exactly the GitHub Pages permissions and one deployment at a time', () => {
    expect(workflow.permissions).toEqual({ contents: 'read', pages: 'write', 'id-token': 'write' });
    expect(workflow.concurrency).toEqual({ group: 'pages', 'cancel-in-progress': false });
  });

  it('builds in order: checkout, actionlint, node, npm ci, npm run check, astro build, upload dist/', () => {
    const s = build.steps;
    const order = [
      stepIndex(s, 'checkout', (x) => x.uses === 'actions/checkout@v4'),
      stepIndex(s, 'actionlint', (x) => /actionlint/.test(x.run ?? '')),
      stepIndex(s, 'setup-node', (x) => x.uses === 'actions/setup-node@v4'),
      stepIndex(s, 'npm ci', (x) => x.run === 'npm ci'),
      stepIndex(s, 'check', (x) => x.run === 'npm run check'),
      stepIndex(s, 'configure-pages', (x) => x.uses === 'actions/configure-pages@v5'),
      stepIndex(s, 'astro build', (x) => x.run === 'npx astro build'),
      stepIndex(s, 'upload', (x) => x.uses === 'actions/upload-pages-artifact@v3'),
    ];
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(s[order[7]].with).toEqual({ path: 'dist' });
    expect(s[order[2]].with).toMatchObject({ cache: 'npm' });
  });

  it('pins actionlint to a release and runs it on the workflows', () => {
    const lint = build.steps.find((x) => /actionlint/.test(x.run ?? ''));
    expect(lint?.run).toMatch(/rhysd\/actionlint\/v\d+\.\d+\.\d+\/scripts\/download-actionlint\.bash/);
    expect(lint?.run).toMatch(/\.\/actionlint\b/);
  });

  it('reads the public build variables from repository variables only', () => {
    expect(build.env).toEqual({
      PUBLIC_WEB3FORMS_KEY: '${{ vars.PUBLIC_WEB3FORMS_KEY }}',
      PUBLIC_GOATCOUNTER_CODE: '${{ vars.PUBLIC_GOATCOUNTER_CODE }}',
    });
    expect(text).not.toMatch(/secrets\./);
  });

  it('deploys the uploaded artifact to the github-pages environment after the build', () => {
    expect(deploy.needs).toBe('build');
    expect(deploy.environment).toEqual({ name: 'github-pages', url: '${{ steps.deployment.outputs.page_url }}' });
    expect(deploy.steps).toEqual([{ name: 'Deploy to GitHub Pages', id: 'deployment', uses: 'actions/deploy-pages@v4' }]);
  });

  it('runs on hosted Ubuntu runners', () => {
    expect(build['runs-on']).toBe('ubuntu-latest');
    expect(deploy['runs-on']).toBe('ubuntu-latest');
  });
});

describe('public/CNAME', () => {
  it('names the canonical custom domain', () => {
    expect(fs.readFileSync(path.join(ROOT, 'public/CNAME'), 'utf8')).toBe('www.iknowyoucanseeme.xyz\n');
  });
});

import { describe, it, expect } from 'vitest';
import { CleanCloneBuild, type Command } from '../../tools/release/CleanCloneBuild.js';

const opts = { repoDir: '/repo', workDir: '/tmp/cc', ref: 'abc123' };

describe('CleanCloneBuild', () => {
  it('clones the commit, installs from the public registry with an empty cache, checks and builds with the deploy variables', () => {
    const commands = new CleanCloneBuild(opts).commands();
    expect(commands.map((c) => [c.cmd, ...c.args].join(' '))).toEqual([
      'git clone --quiet --no-checkout /repo /tmp/cc/repo',
      'git checkout --quiet --detach abc123',
      'npm ci --registry=https://registry.npmjs.org/ --replace-registry-host=never --cache=/tmp/cc/npm-cache --no-audit --no-fund',
      'npm run check',
      'npx astro build',
    ]);
    expect(commands[0].cwd).toBe('/tmp/cc');
    expect(commands.slice(1).every((c) => c.cwd === '/tmp/cc/repo')).toBe(true);
    for (const c of commands.slice(3)) {
      expect(c.env).toEqual({ CI: 'true', PUBLIC_WEB3FORMS_KEY: 'clean-clone-check', PUBLIC_GOATCOUNTER_CODE: 'clean-clone-check' });
    }
    expect(commands[2].env).toBeUndefined();
  });

  it('runs the commands in order and returns the clone directory; stops at the first failure', () => {
    const ran: Command[] = [];
    expect(new CleanCloneBuild(opts).run((c) => ran.push(c))).toBe('/tmp/cc/repo');
    expect(ran).toHaveLength(5);

    const seen: string[] = [];
    const failing = (c: Command) => {
      seen.push(c.cmd);
      if (c.cmd === 'npm') throw new Error('npm ci failed');
    };
    expect(() => new CleanCloneBuild(opts).run(failing)).toThrow('npm ci failed');
    expect(seen).toEqual(['git', 'git', 'npm']);
  });

  it('accepts another registry', () => {
    const c = new CleanCloneBuild({ ...opts, registry: 'https://registry.example.org/' }).commands()[2];
    expect(c.args[1]).toBe('--registry=https://registry.example.org/');
  });
});

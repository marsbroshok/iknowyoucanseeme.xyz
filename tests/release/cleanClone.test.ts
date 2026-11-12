import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execRunner, main } from '../../tools/release/clean-clone.js';
import type { Command } from '../../tools/release/CleanCloneBuild.js';

afterEach(() => {
  vi.restoreAllMocks();
  process.exitCode = undefined;
});

describe('execRunner', () => {
  it('runs a command in its directory with extra env, and throws on failure', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'runner-'));
    const out = path.join(dir, 'out.txt');
    execRunner({ cmd: process.execPath, args: ['-e', `require('fs').writeFileSync('out.txt', process.env.X)`], cwd: dir, env: { X: 'ok' } });
    expect(fs.readFileSync(out, 'utf8')).toBe('ok');
    expect(() => execRunner({ cmd: process.execPath, args: ['-e', 'process.exit(3)'], cwd: dir })).toThrow();
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe('main', () => {
  const script = '/x/clean-clone.ts';
  const url = pathToFileURL(script).href;

  it('builds the current commit of the repository in a fresh temp folder', () => {
    const ran: Command[] = [];
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    main([], script, url, (c) => ran.push(c), () => 'deadbeef');
    expect(ran[0].args.slice(0, 3)).toEqual(['clone', '--quiet', '--no-checkout']);
    expect(ran[0].args[3]).toBe(process.cwd());
    expect(ran[0].cwd.startsWith(fs.realpathSync(os.tmpdir())) || ran[0].cwd.startsWith(os.tmpdir())).toBe(true);
    expect(ran[1].args).toContain('deadbeef');
    expect(log).toHaveBeenCalledWith(expect.stringContaining('[clean-clone] OK: deadbeef built in'));
    fs.rmSync(ran[0].cwd, { recursive: true, force: true });
  });

  it('reports a failure with a non-zero exit code', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    main([], script, url, () => {
      throw new Error('boom');
    }, () => 'deadbeef');
    expect(err).toHaveBeenCalledWith('[clean-clone] FAILED: boom');
    expect(process.exitCode).toBe(1);
  });

  it('reads HEAD with git by default and does nothing when imported', () => {
    const ran: Command[] = [];
    vi.spyOn(console, 'log').mockImplementation(() => {});
    main([], script, url, (c) => ran.push(c));
    expect(ran[1].args.at(-1)).toMatch(/^[0-9a-f]{40}$/);
    fs.rmSync(ran[0].cwd, { recursive: true, force: true });
    const before = ran.length;
    main([], '/x/other.ts', url, (c) => ran.push(c));
    expect(ran.length).toBe(before);
  });
});

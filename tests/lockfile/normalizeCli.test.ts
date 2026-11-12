import { describe, it, expect, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { main, normalizeLockfileFile } from '../../tools/lockfile/normalize.js';

const dirs: string[] = [];
function tempLockfile(content: object): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lockfile-'));
  dirs.push(dir);
  const file = path.join(dir, 'package-lock.json');
  fs.writeFileSync(file, `${JSON.stringify(content, null, 2)}\n`);
  return file;
}
afterEach(() => {
  for (const d of dirs.splice(0)) fs.rmSync(d, { recursive: true, force: true });
  process.exitCode = undefined;
  vi.restoreAllMocks();
});

const MIRRORED = {
  lockfileVersion: 3,
  packages: { 'node_modules/zod': { version: '3.25.67', resolved: 'http://mirror.test/npm/zod/-/zod-3.25.67.tgz', integrity: 'sha512-x' } },
};

describe('normalizeLockfileFile', () => {
  it('rewrites the file in npm format (2-space JSON, trailing newline) and reports the count', () => {
    const file = tempLockfile(MIRRORED);
    expect(normalizeLockfileFile(file)).toBe(1);
    const text = fs.readFileSync(file, 'utf8');
    expect(text.endsWith('}\n')).toBe(true);
    expect(JSON.parse(text).packages['node_modules/zod'].resolved).toBe('https://registry.npmjs.org/zod/-/zod-3.25.67.tgz');
    expect(text).toContain('\n  "packages": {');
  });

  it('leaves an already clean file byte-identical', () => {
    const file = tempLockfile(MIRRORED);
    normalizeLockfileFile(file);
    const before = fs.readFileSync(file, 'utf8');
    expect(normalizeLockfileFile(file)).toBe(0);
    expect(fs.readFileSync(file, 'utf8')).toBe(before);
  });
});

describe('main', () => {
  it('normalizes the given file (default package-lock.json) when run directly', () => {
    const file = tempLockfile(MIRRORED);
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const script = '/x/normalize.ts';
    main([file], script, pathToFileURL(script).href);
    expect(log).toHaveBeenCalledWith(`[lockfile] ${file}: 1 resolved URL(s) rewritten to the public registry`);
    expect(process.exitCode).toBeUndefined();
  });

  it('defaults to ./package-lock.json', () => {
    const file = tempLockfile(MIRRORED);
    const cwd = vi.spyOn(process, 'cwd').mockReturnValue(path.dirname(file));
    vi.spyOn(console, 'log').mockImplementation(() => {});
    main([], '/x/normalize.ts', pathToFileURL('/x/normalize.ts').href);
    expect(cwd).toHaveBeenCalled();
    expect(JSON.parse(fs.readFileSync(file, 'utf8')).packages['node_modules/zod'].resolved).toMatch(/^https:\/\/registry\.npmjs\.org\//);
  });

  it('reports errors with a non-zero exit code', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    main([path.join(os.tmpdir(), 'does-not-exist', 'package-lock.json')], '/x/n.ts', pathToFileURL('/x/n.ts').href);
    expect(err).toHaveBeenCalledWith(expect.stringContaining('ENOENT'));
    expect(process.exitCode).toBe(1);
  });

  it('does nothing when imported', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    main(['whatever'], '/x/other.ts', pathToFileURL('/x/normalize.ts').href);
    expect(log).not.toHaveBeenCalled();
  });
});

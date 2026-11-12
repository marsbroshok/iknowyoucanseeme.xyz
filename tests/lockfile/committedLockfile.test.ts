import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { LockfileNormalizer, type Lockfile } from '../../tools/lockfile/LockfileNormalizer.js';

/**
 * Guard for the committed lockfile: GitHub Actions installs from the public
 * npm registry, so no `resolved` URL may point at a private mirror (see
 * docs/adr/0004-public-registry-lockfile.md). Fix with `npm run lockfile:normalize`.
 */
const ROOT = path.resolve(__dirname, '../..');
const text = fs.readFileSync(path.join(ROOT, 'package-lock.json'), 'utf8');
const lockfile = JSON.parse(text) as Lockfile;

describe('Committed package-lock.json', () => {
  it('resolves every package from the public npm registry', () => {
    expect(new LockfileNormalizer().privateResolutions(lockfile)).toEqual([]);
  });

  it('mentions no private host anywhere', () => {
    expect(text).not.toMatch(/airlock|uplink\.goog|artifact-foundry|:\/\/(localhost|127\.0\.0\.1|10\.|192\.168\.)/);
    const hosts = new Set([...text.matchAll(/"resolved": "([a-z+]+:\/\/[^/"]+)/g)].map((m) => m[1]));
    expect([...hosts]).toEqual(['https://registry.npmjs.org']);
  });

  it('keeps an integrity hash on every registry package', () => {
    const missing = Object.entries(lockfile.packages ?? {})
      .filter(([, e]) => e.resolved?.startsWith('https://') && !e.integrity)
      .map(([k]) => k);
    expect(missing).toEqual([]);
  });

  it('has a version on every installed entry (no half-written stubs npm cannot install from)', () => {
    // A mirror missing one platform package once left `{ dev, optional }`
    // without a version; the public-registry install then crashed.
    const stubs = Object.entries(lockfile.packages ?? {})
      .filter(([key, e]) => key !== '' && !e.link && !e.version)
      .map(([k]) => k);
    expect(stubs).toEqual([]);
  });

  it('is normalized (normalizing again changes nothing)', () => {
    expect(new LockfileNormalizer().normalize(lockfile).rewritten).toBe(0);
  });
});

describe('Project .npmrc', () => {
  const npmrc = fs.readFileSync(path.join(ROOT, '.npmrc'), 'utf8');
  const settings = npmrc.split('\n').filter((l) => l.trim() !== '' && !l.trim().startsWith('#'));

  it('maps the public registry host to whatever registry the machine uses, and nothing else', () => {
    expect(settings).toEqual(['replace-registry-host=npmjs']);
  });

  it('holds no registry override or credentials', () => {
    expect(npmrc).not.toMatch(/^\s*registry\s*=|_authToken|_auth\s*=|password/m);
  });
});

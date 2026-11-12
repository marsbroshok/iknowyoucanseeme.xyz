import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { LockfileNormalizer, PUBLIC_REGISTRY, type Lockfile } from '../../tools/lockfile/LockfileNormalizer.js';

const MIRROR = 'http://mirror.example.internal:999/npm/some-repo/npm-3p/';

/** A lockfile with the three URL shapes seen on a private mirror. */
function sampleLockfile(): Lockfile {
  return {
    name: 'site',
    lockfileVersion: 3,
    packages: {
      '': { name: 'site', version: '1.0.0' },
      'node_modules/zod': {
        version: '3.25.67',
        resolved: `${MIRROR}zod/-/zod-3.25.67.tgz`,
        integrity: 'sha512-zod',
      },
      'node_modules/@img/sharp-linux-x64': {
        version: '0.34.2',
        resolved: `${MIRROR}@img/sharp-linux-x64/-/@img/sharp-linux-x64-0.34.2.tgz`,
        integrity: 'sha512-sharp',
        optional: true,
      },
      'node_modules/astro/node_modules/@astrojs/astro2tsx': {
        version: '0.1.3',
        resolved: `${MIRROR}@astrojs/astro2tsx/-/astro2tsx-0.1.3.tgz`,
        integrity: 'sha512-a2t',
      },
      'node_modules/string-width-cjs': {
        name: 'string-width',
        version: '4.2.3',
        resolved: `${MIRROR}string-width/-/string-width-4.2.3.tgz`,
        integrity: 'sha512-sw',
      },
      'node_modules/already-public': {
        version: '1.0.0',
        resolved: 'https://registry.npmjs.org/already-public/-/already-public-1.0.0.tgz',
        integrity: 'sha512-pub',
      },
      'node_modules/local-link': { resolved: 'packages/local', link: true },
    },
  };
}

describe('LockfileNormalizer', () => {
  const normalizer = new LockfileNormalizer();

  it('rewrites mirror URLs (plain, scoped and scoped-basename forms) to the public registry', () => {
    const { lockfile, rewritten } = normalizer.normalize(sampleLockfile());
    const p = lockfile.packages!;
    expect(rewritten).toBe(4);
    expect(p['node_modules/zod'].resolved).toBe('https://registry.npmjs.org/zod/-/zod-3.25.67.tgz');
    expect(p['node_modules/@img/sharp-linux-x64'].resolved).toBe(
      'https://registry.npmjs.org/@img/sharp-linux-x64/-/sharp-linux-x64-0.34.2.tgz',
    );
    expect(p['node_modules/astro/node_modules/@astrojs/astro2tsx'].resolved).toBe(
      'https://registry.npmjs.org/@astrojs/astro2tsx/-/astro2tsx-0.1.3.tgz',
    );
    expect(p['node_modules/string-width-cjs'].resolved).toBe('https://registry.npmjs.org/string-width/-/string-width-4.2.3.tgz');
  });

  it('keeps integrity, other fields, public and linked entries untouched', () => {
    const input = sampleLockfile();
    const { lockfile } = normalizer.normalize(input);
    const p = lockfile.packages!;
    expect(p['node_modules/zod'].integrity).toBe('sha512-zod');
    expect(p['node_modules/@img/sharp-linux-x64'].optional).toBe(true);
    expect(p['node_modules/already-public']).toBe(input.packages!['node_modules/already-public']);
    expect(p['node_modules/local-link']).toEqual({ resolved: 'packages/local', link: true });
    expect(p['']).toEqual({ name: 'site', version: '1.0.0' });
    expect(lockfile.name).toBe('site');
    expect(normalizer.privateResolutions(lockfile)).toEqual([]);
    // The input is not mutated.
    expect(input.packages!['node_modules/zod'].resolved).toContain(MIRROR);
  });

  it('lists every private resolution, including http on the public host', () => {
    const lock: Lockfile = {
      packages: {
        'node_modules/a': { version: '1.0.0', resolved: 'http://registry.npmjs.org/a/-/a-1.0.0.tgz' },
        'node_modules/b': { version: '1.0.0', resolved: `${MIRROR}b/-/b-1.0.0.tgz` },
        'node_modules/c': { version: '1.0.0', resolved: 'https://registry.npmjs.org/c/-/c-1.0.0.tgz' },
        'node_modules/d': { version: '1.0.0' },
      },
    };
    expect(normalizer.privateResolutions(lock).map((p) => p.key)).toEqual(['node_modules/a', 'node_modules/b']);
  });

  it('handles a lockfile without packages', () => {
    expect(normalizer.normalize({ lockfileVersion: 1 })).toEqual({ lockfile: { lockfileVersion: 1, packages: {} }, rewritten: 0 });
    expect(normalizer.privateResolutions({})).toEqual([]);
  });

  it('refuses entries that are not registry tarballs of their name and version', () => {
    const bad = (entry: object) => () =>
      normalizer.normalize({ packages: { 'node_modules/x': { version: '1.0.0', ...entry } } });
    expect(bad({ resolved: 'git+ssh://git@github.com/o/x.git#abc' })).toThrow(/not a registry tarball/);
    expect(bad({ resolved: `${MIRROR}x/-/x-2.0.0.tgz` })).toThrow(/not a registry tarball of x@1.0.0/);
    expect(bad({ resolved: `${MIRROR}y/-/x-1.0.0.tgz` })).toThrow(/not a registry tarball/);
    expect(() =>
      normalizer.normalize({ packages: { 'node_modules/x': { resolved: `${MIRROR}x/-/x-1.0.0.tgz` } } }),
    ).toThrow(/missing resolved or version/);
    expect(() => normalizer.publicUrl('node_modules/x', { version: '1.0.0' })).toThrow(/missing resolved or version/);
  });

  it('only accepts an https registry with a trailing slash', () => {
    expect(() => new LockfileNormalizer('http://registry.npmjs.org/')).toThrow(/https/);
    expect(() => new LockfileNormalizer('https://registry.npmjs.org')).toThrow(/ending with/);
    expect(new LockfileNormalizer('https://registry.example.org/npm/').publicUrl('node_modules/a', {
      version: '1.0.0',
      resolved: `${MIRROR}a/-/a-1.0.0.tgz`,
    })).toBe('https://registry.example.org/npm/a/-/a-1.0.0.tgz');
    expect(PUBLIC_REGISTRY).toBe('https://registry.npmjs.org/');
  });

  it('property: any mirror prefix and any (scoped) name maps to the canonical public URL', () => {
    const segment = fc.stringMatching(/^[a-z][a-z0-9-]{0,12}$/);
    const version = fc.tuple(fc.nat(30), fc.nat(30), fc.nat(30)).map((v) => v.join('.'));
    fc.assert(
      fc.property(fc.option(segment, { nil: undefined }), segment, version, fc.array(segment, { maxLength: 3 }), fc.boolean(),
        (scope, base, ver, prefix, scopedBasename) => {
          const name = scope ? `@${scope}/${base}` : base;
          const file = scopedBasename && scope ? `${name}-${ver}.tgz` : `${base}-${ver}.tgz`;
          const resolved = `http://mirror.test:8080/${prefix.map((p) => `${p}/`).join('')}${name}/-/${file}`;
          const { lockfile } = normalizer.normalize({ packages: { [`node_modules/${name}`]: { version: ver, resolved } } });
          expect(lockfile.packages![`node_modules/${name}`].resolved).toBe(`https://registry.npmjs.org/${name}/-/${base}-${ver}.tgz`);
        }),
    );
  });
});

/** Canonical public npm registry (with trailing slash). */
export const PUBLIC_REGISTRY = 'https://registry.npmjs.org/';

/** The parts of a `package-lock.json` (v2/v3) entry the normalizer reads. */
export interface LockfileEntry {
  name?: string;
  version?: string;
  resolved?: string;
  integrity?: string;
  link?: boolean;
  [key: string]: unknown;
}

/** The parts of a `package-lock.json` (v2/v3) document the normalizer reads. */
export interface Lockfile {
  packages?: Record<string, LockfileEntry>;
  [key: string]: unknown;
}

/** An entry whose `resolved` URL is not on the public registry. */
export interface PrivateResolution {
  /** Key in `packages` (e.g. `node_modules/@img/sharp-linux-x64`). */
  key: string;
  resolved: string;
}

/**
 * Rewrites the `resolved` URLs of a lockfile to the public npm registry, so
 * that a machine whose npm registry is a private mirror can commit a
 * lockfile that GitHub Actions (public registry) can install from.
 *
 * Only the URL changes; `integrity` is kept, so npm still verifies that the
 * public tarball is byte-identical to the one installed locally. npm's
 * `replace-registry-host=npmjs` setting maps the public host back to the
 * local mirror on install.
 */
export class LockfileNormalizer {
  private readonly registry: URL;

  /**
   * @param publicRegistry - Registry the URLs should point at.
   * @throws Error when `publicRegistry` is not an https URL ending in `/`.
   */
  constructor(publicRegistry: string = PUBLIC_REGISTRY) {
    const url = new URL(publicRegistry);
    if (url.protocol !== 'https:' || !publicRegistry.endsWith('/')) {
      throw new Error(`[lockfile] Public registry must be an https URL ending with "/": ${publicRegistry}`);
    }
    this.registry = url;
  }

  /**
   * Package name of a lockfile entry: its `name` field (npm sets it for
   * aliases) or the last `node_modules/` segment of its key.
   *
   * @param key - Key in `packages`.
   * @param entry - The entry.
   * @returns The registry package name (e.g. `@img/sharp-linux-x64`).
   */
  static packageName(key: string, entry: LockfileEntry): string {
    if (entry.name) return entry.name;
    const marker = 'node_modules/';
    return key.slice(key.lastIndexOf(marker) + marker.length);
  }

  /**
   * Public tarball URL of a registry entry:
   * `<registry><name>/-/<unscoped name>-<version>.tgz`.
   *
   * @param key - Key in `packages`.
   * @param entry - The entry; must have `resolved` and `version`.
   * @returns The public URL.
   * @throws Error when the entry is not a registry tarball of that name and
   *   version (git/file dependencies or an unexpected URL shape), so no
   *   wrong URL is ever written.
   */
  publicUrl(key: string, entry: LockfileEntry): string {
    const { resolved, version } = entry;
    if (!resolved || !version) throw new Error(`[lockfile] ${key}: missing resolved or version`);
    const name = LockfileNormalizer.packageName(key, entry);
    const unscoped = name.slice(name.lastIndexOf('/') + 1);
    const file = `${unscoped}-${version}.tgz`;
    const pathname = new URL(resolved).pathname;
    const nameAt = pathname.lastIndexOf(`/${name}/-/`);
    if (nameAt < 0 || !pathname.endsWith(`/${file}`)) {
      throw new Error(`[lockfile] ${key}: "${resolved}" is not a registry tarball of ${name}@${version}`);
    }
    return new URL(`${name}/-/${file}`, this.registry).toString();
  }

  /**
   * Entries resolved from anywhere but the public registry.
   *
   * @param lockfile - Parsed lockfile.
   * @returns Offending entries (empty when the lockfile is clean).
   */
  privateResolutions(lockfile: Lockfile): PrivateResolution[] {
    return Object.entries(lockfile.packages ?? {})
      .filter(([, entry]) => entry.resolved !== undefined && !entry.link)
      .filter(([, entry]) => !this.isPublic(entry.resolved as string))
      .map(([key, entry]) => ({ key, resolved: entry.resolved as string }));
  }

  /**
   * Returns a copy of the lockfile with every private `resolved` URL
   * rewritten to the public registry; everything else is untouched.
   *
   * @param lockfile - Parsed lockfile.
   * @returns The normalized lockfile and the number of rewritten entries.
   * @throws Error when a private entry is not a registry tarball.
   */
  normalize(lockfile: Lockfile): { lockfile: Lockfile; rewritten: number } {
    const packages: Record<string, LockfileEntry> = {};
    let rewritten = 0;
    const privateKeys = new Set(this.privateResolutions(lockfile).map((p) => p.key));
    for (const [key, entry] of Object.entries(lockfile.packages ?? {})) {
      if (privateKeys.has(key)) {
        packages[key] = { ...entry, resolved: this.publicUrl(key, entry) };
        rewritten += 1;
      } else {
        packages[key] = entry;
      }
    }
    return { lockfile: { ...lockfile, packages }, rewritten };
  }

  /**
   * Whether a URL points at the public registry over https.
   *
   * @param resolved - A `resolved` value.
   * @returns `true` for public registry URLs.
   */
  private isPublic(resolved: string): boolean {
    const url = new URL(resolved);
    return url.protocol === 'https:' && url.host === this.registry.host && url.pathname.startsWith(this.registry.pathname);
  }
}

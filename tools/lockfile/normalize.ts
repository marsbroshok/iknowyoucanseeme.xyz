import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { LockfileNormalizer, type Lockfile } from './LockfileNormalizer.js';

/**
 * Rewrites a `package-lock.json` in place so every `resolved` URL points at
 * the public npm registry (see {@link LockfileNormalizer}). Writes npm's own
 * format (2-space JSON, trailing newline); a clean file is not rewritten.
 *
 * @param file - Path of the lockfile.
 * @returns Number of rewritten entries.
 * @throws Error when the file cannot be read/parsed or holds a non-registry
 *   private entry.
 */
export function normalizeLockfileFile(file: string): number {
  const lockfile = JSON.parse(fs.readFileSync(file, 'utf8')) as Lockfile;
  const { lockfile: normalized, rewritten } = new LockfileNormalizer().normalize(lockfile);
  if (rewritten > 0) fs.writeFileSync(file, `${JSON.stringify(normalized, null, 2)}\n`);
  return rewritten;
}

/**
 * CLI entry (`npm run lockfile:normalize [file]`); runs only when this module
 * is the executed script. Errors are printed and set a non-zero exit code.
 *
 * @param argv - Arguments after the script; first one is the lockfile path
 *   (default `package-lock.json` in the working directory).
 * @param scriptPath - Path of the executed script (`process.argv[1]`).
 * @param currentUrl - `import.meta.url` of this module.
 */
export function main(argv: string[], scriptPath: string, currentUrl: string): void {
  if (scriptPath !== fileURLToPath(currentUrl)) return;
  const file = argv[0] ?? path.join(process.cwd(), 'package-lock.json');
  try {
    const rewritten = normalizeLockfileFile(file);
    console.log(`[lockfile] ${file}: ${rewritten} resolved URL(s) rewritten to the public registry`);
  } catch (err: unknown) {
    console.error((err as Error).message);
    process.exitCode = 1;
  }
}

main(process.argv.slice(2), process.argv[1] as string, import.meta.url);

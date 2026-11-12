import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { CleanCloneBuild, type Command, type CommandRunner } from './CleanCloneBuild.js';

/**
 * Runs a command with inherited output; throws when it exits non-zero.
 *
 * @param command - The command.
 * @throws Error from `execFileSync` on failure.
 */
export const execRunner: CommandRunner = (command: Command) => {
  execFileSync(command.cmd, command.args, { cwd: command.cwd, stdio: 'inherit', env: { ...process.env, ...command.env } });
};

/**
 * Commit currently checked out in the working directory.
 *
 * @returns Full commit hash.
 */
function gitHead(): string {
  return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
}

/**
 * CLI entry (`npm run verify:clean-clone`): builds the current commit in a
 * fresh temp folder from the public registry (see {@link CleanCloneBuild}).
 * Runs only when this module is the executed script; failures are printed
 * and set a non-zero exit code. The temp folder is kept for inspection.
 *
 * @param _argv - Unused (no options).
 * @param scriptPath - Path of the executed script (`process.argv[1]`).
 * @param currentUrl - `import.meta.url` of this module.
 * @param run - Command runner.
 * @param head - Returns the commit to build.
 */
export function main(_argv: string[], scriptPath: string, currentUrl: string, run: CommandRunner = execRunner, head: () => string = gitHead): void {
  if (scriptPath !== fileURLToPath(currentUrl)) return;
  const ref = head();
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clean-clone-'));
  try {
    const clone = new CleanCloneBuild({ repoDir: process.cwd(), workDir, ref }).run(run);
    console.log(`[clean-clone] OK: ${ref} built in ${clone}`);
  } catch (err: unknown) {
    console.error(`[clean-clone] FAILED: ${(err as Error).message}`);
    process.exitCode = 1;
  }
}

main(process.argv.slice(2), process.argv[1] as string, import.meta.url);

import path from 'node:path';
import { PUBLIC_REGISTRY } from '../lockfile/LockfileNormalizer.js';

/** One external command. */
export interface Command {
  cmd: string;
  args: string[];
  /** Working directory. */
  cwd: string;
  /** Extra environment variables (merged over the current environment). */
  env?: Record<string, string>;
}

/** Runs one command; throws when it fails. */
export type CommandRunner = (command: Command) => void;

/** Options of a clean-clone build. */
export interface CleanCloneOptions {
  /** Repository to clone (a local path). */
  repoDir: string;
  /** Empty scratch directory (clone + npm cache go inside). */
  workDir: string;
  /** Commit to build. */
  ref: string;
  /** npm registry to install from (default: the public registry). */
  registry?: string;
}

/** Placeholder build variables: makes the build take the same paths as the deploy job. */
const DEPLOY_LIKE_ENV = {
  CI: 'true',
  PUBLIC_WEB3FORMS_KEY: 'clean-clone-check',
  PUBLIC_GOATCOUNTER_CODE: 'clean-clone-check',
} as const;

/**
 * Rehearses the GitHub Actions deploy job on this machine: clones one
 * commit into an empty folder (no untracked or ignored files, no
 * node_modules), installs from the public registry with an empty npm cache
 * (so the committed lockfile is checked against the real tarballs), then
 * runs `npm run check` and `astro build` with deploy-like variables.
 */
export class CleanCloneBuild {
  /**
   * @param options - What to build and where.
   */
  constructor(private readonly options: CleanCloneOptions) {}

  /**
   * The commands, in order.
   *
   * @returns Commands to run.
   */
  commands(): Command[] {
    const { repoDir, workDir, ref, registry = PUBLIC_REGISTRY } = this.options;
    const clone = path.join(workDir, 'repo');
    return [
      { cmd: 'git', args: ['clone', '--quiet', '--no-checkout', repoDir, clone], cwd: workDir },
      { cmd: 'git', args: ['checkout', '--quiet', '--detach', ref], cwd: clone },
      {
        cmd: 'npm',
        args: ['ci', `--registry=${registry}`, '--replace-registry-host=never', `--cache=${path.join(workDir, 'npm-cache')}`, '--no-audit', '--no-fund'],
        cwd: clone,
      },
      { cmd: 'npm', args: ['run', 'check'], cwd: clone, env: { ...DEPLOY_LIKE_ENV } },
      { cmd: 'npx', args: ['astro', 'build'], cwd: clone, env: { ...DEPLOY_LIKE_ENV } },
    ];
  }

  /**
   * Runs every command; the first failure stops the run.
   *
   * @param run - Command runner.
   * @returns The clone directory (contains `dist/` on success).
   * @throws Whatever the runner throws for a failed command.
   */
  run(run: CommandRunner): string {
    for (const command of this.commands()) run(command);
    return path.join(this.options.workDir, 'repo');
  }
}

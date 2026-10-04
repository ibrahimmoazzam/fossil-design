import { execFileSync } from 'node:child_process';

// The pnpm running this script, which may be a JavaScript entry point rather than a binary.
const pnpmPath = process.env.npm_execpath ?? 'pnpm';
const viaNode = /\.[cm]?js$/.test(pnpmPath);

/** Runs a command and returns its output; stderr goes straight through. */
export function run(
  command: string,
  args: readonly string[],
  cwd: URL | string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  return execFileSync(command, args, {
    cwd,
    env,
    stdio: ['ignore', 'pipe', 'inherit'],
    encoding: 'utf8',
  });
}

/** Runs the pnpm that is running this script. */
export function pnpm(args: readonly string[], cwd: URL | string): string {
  return viaNode
    ? run(process.execPath, [pnpmPath, ...args], cwd)
    : run(pnpmPath, args, cwd);
}

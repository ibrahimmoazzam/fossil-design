// Packs every published package as npm would receive it, then checks the tarball with
// publint and attw, so "a consumer can resolve these types" is a check rather than a hope.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const root = new URL('../', import.meta.url);
const packagesDir = new URL('packages/', root);
const destination = mkdtempSync(join(tmpdir(), 'fossil-pack-'));

const published = readdirSync(packagesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => new URL(`${entry.name}/`, packagesDir))
  .filter((dir) => {
    const manifest = JSON.parse(
      readFileSync(new URL('package.json', dir), 'utf8'),
    ) as {
      private?: boolean;
    };
    return manifest.private !== true;
  });

// The pnpm running this script, which may be a JavaScript entry point rather than a binary.
const pnpm = process.env.npm_execpath ?? 'pnpm';
const viaNode = /\.[cm]?js$/.test(pnpm);

const run = (args: string[], cwd: URL) =>
  execFileSync(
    viaNode ? process.execPath : pnpm,
    viaNode ? [pnpm, ...args] : args,
    {
      cwd,
      stdio: ['ignore', 'pipe', 'inherit'],
      encoding: 'utf8',
    },
  );

let failed = false;
try {
  for (const dir of published) {
    // pnpm pack rewrites workspace: ranges to real versions, as the release does.
    const tarball = run(['pack', '--pack-destination', destination], dir)
      .trim()
      .split('\n')
      .at(-1);
    if (!tarball)
      throw new Error(`pnpm pack printed no tarball for ${dir.pathname}`);

    for (const [command, args] of [
      ['publint', [tarball, '--strict']],
      ['attw', [tarball, '--profile', 'esm-only', '--format', 'ascii']],
    ] as const) {
      try {
        process.stdout.write(run(['exec', command, ...args], root));
      } catch (error) {
        failed = true;
        const { stdout } = error as { stdout?: string };
        process.stdout.write(stdout ?? '');
      }
    }
  }
} finally {
  rmSync(destination, { recursive: true, force: true });
}

if (failed) process.exit(1);

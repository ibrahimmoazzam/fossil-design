#!/usr/bin/env node
/**
 * The package's bin. It puts the AGENTS.md block the build wrote into the AGENTS.md of the
 * folder it runs in, and imports AGENTS.md from CLAUDE.md when there is one. Run again, it
 * replaces the block and nothing else. With --check it writes nothing, and fails if either file
 * is out of date, so an app's CI catches an upgrade that skipped it.
 *
 * The build compiles it into dist/bin/, so the package root is two folders up.
 */
import { existsSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const CLAUDE_IMPORT = '@AGENTS.md';

/** The block's first and last lines, which find it again in AGENTS.md. */
export function markersOf(block: string): { start: string; end: string } {
  const lines = block.trim().split('\n');
  return { start: lines[0] ?? '', end: lines.at(-1) ?? '' };
}

/** AGENTS.md with the block in place: between its markers if they're there, or else at the end. */
export function withBlock(document: string, block: string): string {
  const { start, end } = markersOf(block);
  const from = document.indexOf(start);
  const to = from === -1 ? -1 : document.indexOf(end, from);
  if (from !== -1 && to === -1)
    throw new Error(
      `AGENTS.md has ${start} but no ${end} after it. Restore the end marker, or delete the block, and run this again.`,
    );
  if (from !== -1)
    return (
      document.slice(0, from) +
      block.trimEnd() +
      document.slice(to + end.length)
    );
  if (document.trim() === '') return block;
  return `${document.trimEnd()}\n\n${block}`;
}

/** Whether CLAUDE.md already imports AGENTS.md. */
export const importsAgents = (claude: string): boolean =>
  /(?:^|\s)@(?:\.\/)?AGENTS\.md(?=\s|$)/.test(claude);

/** CLAUDE.md with the import added at the end. */
export const withImport = (claude: string): string =>
  claude.trim() === ''
    ? `${CLAUDE_IMPORT}\n`
    : `${claude.trimEnd()}\n\n${CLAUDE_IMPORT}\n`;

export interface Result {
  /** False when --check finds a file out of date. */
  ok: boolean;
  messages: string[];
}

const read = (path: string) =>
  existsSync(path) ? readFileSync(path, 'utf8') : undefined;

/**
 * Brings AGENTS.md and CLAUDE.md in `dir` up to date with `block`, or with `check`, reports what
 * would change. Line endings are compared as LF and written back as the file had them.
 */
export function sync(
  dir: string,
  block: string,
  source: string,
  check: boolean,
): Result {
  const messages: string[] = [];
  let ok = true;
  const update = (
    name: string,
    current: string | undefined,
    next: string,
    done: string,
    stale: string,
  ) => {
    const lf = current?.replaceAll('\r\n', '\n');
    if (lf === next) return;
    if (check) {
      ok = false;
      messages.push(stale);
      return;
    }
    const crlf = current?.includes('\r\n') === true;
    writeFileSync(join(dir, name), crlf ? next.replaceAll('\n', '\r\n') : next);
    messages.push(done);
  };

  const agents = read(join(dir, 'AGENTS.md'));
  const lf = agents?.replaceAll('\r\n', '\n') ?? '';
  const had = lf.includes(markersOf(block).start);
  update(
    'AGENTS.md',
    agents,
    withBlock(lf, block),
    agents === undefined
      ? `Created AGENTS.md with ${source}'s block.`
      : `${had ? 'Updated' : 'Added'} ${source}'s block in AGENTS.md.`,
    had
      ? `AGENTS.md's block doesn't match ${source}.`
      : `AGENTS.md doesn't have ${source}'s block.`,
  );

  const claude = read(join(dir, 'CLAUDE.md'));
  if (claude !== undefined && !importsAgents(claude))
    update(
      'CLAUDE.md',
      claude,
      withImport(claude.replaceAll('\r\n', '\n')),
      `Added ${CLAUDE_IMPORT} to CLAUDE.md, so Claude Code reads AGENTS.md too.`,
      `CLAUDE.md doesn't import AGENTS.md, so Claude Code won't read the block.`,
    );

  if (messages.length === 0)
    messages.push(`AGENTS.md has ${source}'s block, up to date.`);
  return { ok, messages };
}

const USAGE = `Usage: fossil-agents-md [--check]

Writes the design system's rules and the paths to its installed docs into AGENTS.md, in the
current folder, between managed markers. Run it again after upgrading; it replaces only the
block. If CLAUDE.md exists, it adds ${CLAUDE_IMPORT} to it.

  --check  Change nothing, and exit 1 if either file is out of date.`;

function main(args: readonly string[]): number {
  if (args.includes('--help') || args.includes('-h')) {
    console.log(USAGE);
    return 0;
  }
  const unknown = args.filter((arg) => arg !== '--check');
  if (unknown.length > 0) {
    console.error(`Unknown option: ${unknown.join(' ')}\n\n${USAGE}`);
    return 2;
  }
  const root = new URL('../../', import.meta.url);
  const pkg = JSON.parse(
    readFileSync(new URL('package.json', root), 'utf8'),
  ) as { name: string; version: string; bin: Record<string, string> };
  const block = readFileSync(new URL('docs/agents-block.md', root), 'utf8');
  const check = args.includes('--check');
  const { ok, messages } = sync(
    process.cwd(),
    block,
    `${pkg.name} ${pkg.version}`,
    check,
  );
  for (const message of messages) (ok ? console.log : console.error)(message);
  if (!ok)
    console.error(
      `Run \`npx ${Object.keys(pkg.bin)[0] ?? ''}\` to update ${messages.length === 1 ? 'it' : 'them'}.`,
    );
  return ok ? 0 : 1;
}

// A bin runs through a symlink in node_modules/.bin, so compare real paths.
if (
  process.argv[1] !== undefined &&
  realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { keep } from '../scripts/rename.ts';

const root = new URL('../', import.meta.url);

/** Step 1.4 of the guide, which lists what still describes Fossil once a fork has renamed itself. */
function step(heading: string, next: string): string {
  const guide = readFileSync(new URL('docs/adopting.md', root), 'utf8');
  const start = guide.indexOf(`### ${heading}`);
  const end = guide.indexOf(`### ${next}`, start);
  if (start === -1 || end === -1)
    throw new Error(`docs/adopting.md has no step ${heading} before ${next}`);
  return guide.slice(start, end);
}

const checklist = step('1.4 ', '1.5 ');

/**
 * The name step 1.4 is written about. Fossil's, until a fork rewrites this file with the rest of
 * 1.4's prose, after which it is the fork's own and the check still holds: every file that names
 * the system is in the checklist. A fork that rewrites the prose and not this line greps for a
 * name its files no longer carry, and the assertion below is what says so.
 */
const system = 'Fossil';

/**
 * Every file whose prose still says Fossil after a rename. `pnpm rename` rewrites the names
 * things are addressed by, never the word itself, so this is what step 1.4 has to account for.
 * `keep` holds the paths that record Fossil's own history, which the same rename skips.
 */
const described = execFileSync(
  'git',
  ['grep', '-l', system, '--', '.', ...keep],
  {
    cwd: root,
    encoding: 'utf8',
  },
)
  .trim()
  .split('\n');

/** Every path the checklist writes as code, which is how it names a file or a folder. Fenced
 * blocks go first, so their own backticks don't pair with the prose's. */
const spans = [
  ...checklist.replace(/```[\s\S]*?```/g, '').matchAll(/`([^`]+)`/g),
].map(([, span]) => span ?? '');

/** The checklist names a file by its path, by a folder it writes with a trailing slash, or by a
 * name it shares with others, such as `package.json`. */
function names(path: string): boolean {
  return spans.some(
    (span) =>
      span === path ||
      span === path.split('/').at(-1) ||
      (span.endsWith('/') && path.startsWith(span)),
  );
}

describe('the adoption guide', () => {
  it('has files to account for, so the grep behind this test still works', () => {
    expect(
      described.length,
      `No file says ${system}, so this test is checking nothing. In a fork, ${system} is the name 1.4 is written about: rewrite it here with the rest of the step's prose.`,
    ).toBeGreaterThan(20);
  });

  it.each(described)('names %s in step 1.4', (path) => {
    expect(names(path)).toBe(true);
  });
});

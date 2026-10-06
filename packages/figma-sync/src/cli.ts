import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { TokensFile } from '../../tokens/src/metadata.ts';
import {
  readTokenFiles,
  validate,
  type TokenFile,
} from '../../tokens/scripts/validate.ts';
import { diff, summary } from './diff.ts';
import {
  LibraryError,
  libraryCheck,
  libraryReport,
  librarySpec,
} from './library/cli.ts';
import { figmaTokens } from './model.ts';
import { script } from './scripts.ts';
import { readSnapshot, SnapshotError } from './snapshot.ts';
import { applySpecs, variableSpecs } from './spec.ts';
import { applyEdits } from './write.ts';

const REPO = fileURLToPath(new URL('../../../', import.meta.url));
const SOURCE = 'packages/tokens/src';
const TOKENS_JSON = join(REPO, 'packages/tokens/dist/tokens.json');
/** Generated scripts and saved read results. Ignored by git. */
const WORK = fileURLToPath(new URL('../.figma/', import.meta.url));
/** Variables per script. Keeps each apply script and read result well under use_figma's limits. */
const PART_SIZE = 40;

class UsageError extends Error {}

const git = (...args: string[]) =>
  execFileSync('git', args, { cwd: REPO, encoding: 'utf8' }).trim();

const shown = (file: string) => relative(process.cwd(), file);

const checked = (files: TokenFile[], where: string) => {
  const { tokens, problems } = validate(files);
  if (problems.length > 0)
    throw new UsageError(
      `The token source ${where} doesn't validate:\n${problems
        .map((p) => `  ${p.token ?? p.file}: ${p.message}`)
        .join('\n')}`,
    );
  const model = figmaTokens(tokens);
  if (model.problems.length > 0)
    throw new UsageError(model.problems.join('\n'));
  return { tokens, model: model.tokens };
};

/** The token files as they were at a commit. */
const filesAt = (commit: string): TokenFile[] =>
  git('ls-tree', '-r', '--name-only', commit, '--', SOURCE)
    .split('\n')
    .filter((file) => file.endsWith('.json'))
    .map((file) => ({
      path: file.slice(SOURCE.length + 1),
      content: git('show', `${commit}:${file}`),
    }));

function apply(): void {
  if (git('status', '--porcelain', '--', SOURCE) !== '')
    throw new UsageError(
      'The token source has uncommitted changes. Commit them first: apply stamps the commit on Figma, as the base for the next diff.',
    );
  if (!existsSync(TOKENS_JSON))
    throw new UsageError('There is no tokens.json. Run pnpm build first.');
  const commit = git('rev-parse', 'HEAD');
  const { model } = checked(readTokenFiles(join(REPO, SOURCE)), 'now');
  const file = JSON.parse(readFileSync(TOKENS_JSON, 'utf8')) as TokensFile;
  const specs = applySpecs(variableSpecs(model, file), commit, PART_SIZE);

  mkdirSync(WORK, { recursive: true });
  for (const old of readdirSync(WORK).filter((f) => f.startsWith('apply-')))
    rmSync(join(WORK, old));
  const lines = specs.map((spec, i) => {
    const name = `apply-${String(i + 1)}.js`;
    const text = script(
      spec,
      spec.kind === 'apply'
        ? `apply part ${String(spec.part)} of ${String(spec.parts)}, from commit ${commit.slice(0, 7)}`
        : `finish the apply of commit ${commit.slice(0, 7)}`,
    );
    writeFileSync(join(WORK, name), text);
    return `  ${shown(join(WORK, name))}  ${String(Math.ceil(text.length / 1024))} KB`;
  });
  console.log(
    [
      `Wrote ${String(specs.length)} scripts to apply commit ${commit.slice(0, 7)} (${git('rev-parse', '--abbrev-ref', 'HEAD')}):`,
      ...lines,
      '',
      'Pass each one to use_figma, in order and exactly as it is. A script that fails can be run again: each one only changes what differs.',
    ].join('\n'),
  );
}

function read(arg: string | undefined): void {
  const page = Number(arg ?? '1');
  if (!Number.isInteger(page) || page < 1)
    throw new UsageError(`"${String(arg)}" isn't a page number.`);
  mkdirSync(WORK, { recursive: true });
  if (page === 1)
    for (const old of readdirSync(WORK).filter((f) =>
      f.startsWith('snapshot-'),
    ))
      rmSync(join(WORK, old));
  const name = join(WORK, `read-${String(page)}.js`);
  writeFileSync(
    name,
    script(
      { kind: 'read', page, pageSize: PART_SIZE },
      `read page ${String(page)}`,
    ),
  );
  console.log(
    [
      `Wrote ${shown(name)}.`,
      `Pass it to use_figma exactly as it is, and save the result, exactly as it comes back, to ${shown(join(WORK, `snapshot-${String(page)}.json`))}.`,
      page === 1
        ? 'The result says how many pages there are; read each one.'
        : '',
    ]
      .filter(Boolean)
      .join('\n'),
  );
}

async function compare(dryRun: boolean): Promise<void> {
  const files = existsSync(WORK)
    ? readdirSync(WORK).filter((f) => /^snapshot-\d+\.json$/.test(f))
    : [];
  const snapshot = readSnapshot(
    files.map((name) => ({
      name,
      text: readFileSync(join(WORK, name), 'utf8'),
    })),
  );
  if (snapshot.commit === '')
    throw new UsageError(
      'Figma has no finished apply to compare against. Run pnpm figma:apply, and every script it writes, first.',
    );
  try {
    git('cat-file', '-e', `${snapshot.commit}^{commit}`);
  } catch {
    throw new UsageError(
      `Figma was last applied from commit ${snapshot.commit}, which this clone doesn't have. Run git fetch, then try again.`,
    );
  }
  const base = checked(
    filesAt(snapshot.commit),
    `at ${snapshot.commit.slice(0, 7)}`,
  );
  const sourceFiles = readTokenFiles(join(REPO, SOURCE));
  const current = checked(sourceFiles, 'now');
  const report = diff(base.model, current.model, snapshot);
  const text = summary(report, snapshot.commit);
  writeFileSync(join(WORK, 'report.md'), text);
  console.log(text);
  if (report.edits.length === 0 || dryRun) return;
  const changed = await applyEdits(
    sourceFiles,
    current.tokens,
    report.edits,
    join(REPO, SOURCE, 'semantic/color.tokens.json'),
  );
  for (const file of changed)
    writeFileSync(join(REPO, SOURCE, file.path), file.content);
  console.log(
    `Wrote ${String(report.edits.length)} changes to ${changed.map((f) => join(SOURCE, f.path)).join(', ')}. The report is in ${shown(join(WORK, 'report.md'))}.`,
  );
}

const [command, ...args] = process.argv.slice(2);
const [arg] = args;
try {
  if (command === 'apply') apply();
  else if (command === 'read') read(arg);
  else if (command === 'diff') await compare(arg === '--dry-run');
  else if (command === 'library-spec') librarySpec();
  else if (command === 'library-check' && arg === 'report') {
    if (!libraryReport()) process.exitCode = 1;
  } else if (command === 'library-check') libraryCheck(args);
  else
    throw new UsageError(
      'Usage: cli.ts apply | read [page] | diff [--dry-run] | library-spec | library-check [component...] | library-check report',
    );
} catch (error) {
  if (!(
    error instanceof UsageError ||
    error instanceof SnapshotError ||
    error instanceof LibraryError
  ))
    throw error;
  console.error(
    error instanceof SnapshotError ? error.problems.join('\n') : error.message,
  );
  process.exit(1);
}

// Renames a fork: the system name, CSS prefix, npm scope and GitHub repository. Changing
// fossil.config.json alone isn't enough, because package names, imports, stylesheets and
// repository URLs spell the old values out. Fossil's history (docs/ and changelogs) stays as written.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { pnpm } from './run.ts';

export interface Identity {
  name: string;
  cssPrefix: string;
  npmScope: string;
  /** The GitHub repository, as `owner/name`. */
  repo: string;
}

export const patterns = {
  cssPrefix: /^[a-z][a-z0-9-]*$/,
  npmScope: /^@[a-z0-9][a-z0-9._~-]*$/,
  repo: /^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/,
};

/** Files that record Fossil's own history and reasoning, which a rename shouldn't rewrite. */
export const keep = [
  ':!docs/**',
  ':!**/CHANGELOG.md',
  ':!pnpm-lock.yaml',
  ':!fossil.config.json',
];

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export interface Rewrite {
  /** The old text, which finds the files to rewrite. */
  find: string;
  /** The old text where it stands alone, so `@acme` doesn't match inside `@acme-design`. */
  pattern: RegExp;
  replacement: string;
}

function rewrite(
  find: string,
  replacement: string,
  before: string,
  after: string,
): Rewrite {
  return {
    find,
    pattern: new RegExp(`${before}${escape(find)}${after}`, 'g'),
    replacement,
  };
}

/** Each rewrite from one identity to another, in the order they apply. */
export function rewrites(from: Identity, to: Identity): Rewrite[] {
  const list: Rewrite[] = [];
  if (from.repo !== to.repo)
    list.push(rewrite(from.repo, to.repo, '(?<![\\w.-])', '(?![\\w-])'));
  if (from.npmScope !== to.npmScope) {
    list.push(rewrite(from.npmScope, to.npmScope, '', '(?![\\w.~-])'));
    // The AGENTS.md block's markers are named after the scope, without its @.
    list.push(
      rewrite(
        `${from.npmScope.slice(1)}-agent-rules`,
        `${to.npmScope.slice(1)}-agent-rules`,
        '(?<![\\w@.~-])',
        '(?![\\w-])',
      ),
    );
  }
  if (from.cssPrefix !== to.cssPrefix) {
    list.push(
      rewrite(`--${from.cssPrefix}-`, `--${to.cssPrefix}-`, '(?<![\\w-])', ''),
    );
    list.push(
      rewrite(
        `${from.cssPrefix}-agents-md`,
        `${to.cssPrefix}-agents-md`,
        '(?<![\\w-])',
        '(?![\\w-])',
      ),
    );
  }
  return list;
}

/** `text` with every rewrite applied. */
export function rename(text: string, list: readonly Rewrite[]): string {
  return list.reduce(
    (result, { pattern, replacement }) => result.replace(pattern, replacement),
    text,
  );
}

/** The `owner/name` of a GitHub repository URL, as package.json records it. */
export function repoOf(url: string): string {
  const match = /github\.com[/:]([^/]+\/[^/.]+?)(?:\.git)?\/?$/.exec(url);
  if (!match?.[1])
    throw new Error(`package.json's repository isn't a GitHub URL: ${url}`);
  return match[1];
}

function main() {
  const root = new URL('../', import.meta.url);
  const git = (args: string[]) =>
    execFileSync('git', args, { cwd: root, encoding: 'utf8' });

  const { values } = parseArgs({
    options: {
      name: { type: 'string' },
      prefix: { type: 'string' },
      scope: { type: 'string' },
      repo: { type: 'string' },
    },
  });

  const configFile = new URL('fossil.config.json', root);
  const config = JSON.parse(readFileSync(configFile, 'utf8')) as Omit<
    Identity,
    'repo'
  >;
  const manifest = JSON.parse(
    readFileSync(new URL('package.json', root), 'utf8'),
  ) as {
    repository: { url: string };
  };
  const from: Identity = { ...config, repo: repoOf(manifest.repository.url) };
  const to: Identity = {
    name: values.name ?? from.name,
    cssPrefix: values.prefix ?? from.cssPrefix,
    npmScope: values.scope ?? from.npmScope,
    repo: values.repo ?? from.repo,
  };

  const problems = [
    ...(to.name.trim() === '' ? ['--name is empty'] : []),
    ...(['cssPrefix', 'npmScope', 'repo'] as const)
      .filter((key) => !patterns[key].test(to[key]))
      .map(
        (key) =>
          `${to[key]} isn't a valid ${key}: it must match ${patterns[key].source}`,
      ),
  ];
  if (problems.length > 0) {
    console.error(problems.join('\n'));
    console.error(
      'Usage: pnpm rename --name "Acme Design" --prefix acme --scope @acme-design --repo acme/acme-design',
    );
    process.exit(1);
  }

  // One clean commit before, so the rename is one reviewable diff after.
  if (git(['status', '--porcelain']).trim() !== '') {
    console.error(
      'Commit or stash your changes first, so the rename is a diff of its own.',
    );
    process.exit(1);
  }

  const list = rewrites(from, to);
  const files =
    list.length === 0
      ? []
      : git([
          'grep',
          '-l',
          '-I',
          '-F',
          ...list.flatMap(({ find }) => ['-e', find]),
          '--',
          '.',
          ...keep,
        ])
          .split('\n')
          .filter(Boolean);

  const changed = files.filter((file) => {
    const path = new URL(file, root);
    const before = readFileSync(path, 'utf8');
    const after = rename(before, list);
    if (after !== before) writeFileSync(path, after);
    return after !== before;
  });

  const nextConfig = {
    name: to.name,
    cssPrefix: to.cssPrefix,
    npmScope: to.npmScope,
  };
  writeFileSync(configFile, `${JSON.stringify(nextConfig, null, 2)}\n`);

  console.log(
    `fossil.config.json: ${to.name}, --${to.cssPrefix}-*, ${to.npmScope}`,
  );
  for (const [key, label] of [
    ['npmScope', 'npm scope'],
    ['cssPrefix', 'CSS prefix'],
    ['repo', 'repository'],
  ] as const)
    if (from[key] !== to[key])
      console.log(`${label}: ${from[key]} → ${to[key]}`);
  console.log(`Rewrote ${String(changed.length)} files.`);

  // The lockfile records package names, and shorter or longer names move Prettier's line breaks.
  pnpm(['install'], root);
  pnpm(
    [
      'exec',
      'prettier',
      '--write',
      '--ignore-unknown',
      '--log-level',
      'warn',
      'fossil.config.json',
      ...changed,
    ],
    root,
  );
  console.log('Updated pnpm-lock.yaml and formatted the changed files.');
  console.log(
    'Next: pnpm build && pnpm lint && pnpm typecheck && pnpm test, then commit.',
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();

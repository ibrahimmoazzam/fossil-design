// Installs Fossil's packed tarballs into apps outside the workspace, with npm, as a consumer
// would, then type-checks each app, lints it with the shared configs, builds it and checks what
// it renders. A workspace symlink would hide broken exports, declarations and directives.
// Then it runs the AGENTS.md bin, as an app would, and checks every installed path the block
// and the Make guidelines name. Last, it adds a deliberately off-system component and checks that
// lint rejects it.
import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  globSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import config from '../fossil.config.json' with { type: 'json' };
import { pnpm, run } from './run.ts';

const root = new URL('../', import.meta.url);
const packages = ['tokens', 'react', 'stylelint-config', 'eslint-config'];
const apps =
  process.argv.slice(2).length > 0 ? process.argv.slice(2) : ['next', 'vite'];
const work = mkdtempSync(join(tmpdir(), 'fossil-smoke-'));
const env = { ...process.env, NEXT_TELEMETRY_DISABLED: '1' };
// Class names carry the CSS prefix, as vite.config.ts names them.
const boxClass = `${config.cssPrefix}-box-`;
const buttonClass = `${config.cssPrefix}-button-`;

function expectIncludes(where: string, text: string, ...needles: string[]) {
  for (const needle of needles) {
    if (!text.includes(needle))
      throw new Error(`${where} doesn't contain ${needle}`);
  }
}

const anyFile = (pattern: string, cwd: string) =>
  globSync(pattern, { cwd }).map((file) =>
    readFileSync(join(cwd, file), 'utf8'),
  );

async function check(app: string, dir: string) {
  if (app === 'next') {
    const html = readFileSync(join(dir, '.next/server/app/index.html'), 'utf8');
    expectIncludes(
      'The prerendered page',
      html,
      'Fossil smoke test',
      boxClass,
      '<dialog',
    );
    const css = anyFile('.next/static/**/*.css', dir).join('\n');
    expectIncludes(
      "The page's CSS",
      css,
      '--fossil-color-background-page',
      buttonClass,
    );
  } else {
    const errors: unknown[] = [];
    const { error, warn } = console;
    console.error = (...args: unknown[]) => errors.push(args);
    console.warn = (...args: unknown[]) => errors.push(args);
    try {
      const entry = (await import(
        pathToFileURL(join(dir, 'dist-server/entry-server.js')).href
      )) as { render: () => string };
      const html = entry.render();
      expectIncludes(
        'The server render',
        html,
        'Fossil smoke test',
        boxClass,
        '<dialog',
      );
    } finally {
      console.error = error;
      console.warn = warn;
    }
    if (errors.length > 0) {
      throw new Error(
        `React logged during the server render:\n${JSON.stringify(errors, null, 2)}`,
      );
    }
    const css = anyFile('dist/assets/*.css', dir).join('\n');
    expectIncludes(
      "The app's CSS",
      css,
      '--fossil-color-background-page',
      buttonClass,
    );
  }
}

/**
 * Runs the bin from the installed package, then checks that the block landed, that CLAUDE.md
 * imports it, that a second run with --check passes, and that every file the block and the Make
 * guidelines point an agent at was installed.
 */
function checkAgentsMd(dir: string) {
  writeFileSync(join(dir, 'CLAUDE.md'), '# Smoke app\n');
  const bin = ['--loglevel=error', '--no-install', 'fossil-agents-md'];
  run('npx', bin, dir, env);
  run('npx', [...bin, '--check'], dir, env);
  const agents = readFileSync(join(dir, 'AGENTS.md'), 'utf8');
  expectIncludes(
    'AGENTS.md',
    agents,
    '<!-- BEGIN:fossil-design-agent-rules -->',
    '### Components',
    '<!-- END:fossil-design-agent-rules -->',
  );
  expectIncludes(
    'CLAUDE.md',
    readFileSync(join(dir, 'CLAUDE.md'), 'utf8'),
    '@AGENTS.md',
  );

  const installed = join(dir, 'node_modules/@fossil-design/react');
  const guidelines = readFileSync(
    join(installed, 'guidelines/Guidelines.md'),
    'utf8',
  );
  const paths = [agents, guidelines].flatMap((text) => [
    ...[...text.matchAll(/node_modules\/@fossil-design\/react\/[\w./-]*/g)].map(
      ([path]) => join(dir, path),
    ),
    ...[...text.matchAll(/`(\w+\.md)`/g)]
      .map(([, file = '']) => file)
      .filter((file) => file !== 'AGENTS.md')
      .map((file) =>
        join(installed, file === 'setup.md' ? 'guidelines' : 'docs', file),
      ),
  ]);
  const components =
    /### Components\n[\s\S]*?\n\n([\s\S]*?)\n\n/.exec(agents)?.[1] ?? '';
  for (const line of components.split('\n'))
    if (!line.startsWith('- Icons'))
      for (const [, name = ''] of line.matchAll(/`([A-Z]\w+)`/g))
        paths.push(join(installed, 'docs/components', `${name}.md`));
  const missing = paths.filter((path) => !existsSync(path));
  if (missing.length > 0)
    throw new Error(
      `The agent docs point at files that weren't installed:\n${missing.join('\n')}`,
    );
}

/** An ESLint result has `messages`; a Stylelint one has `warnings`. */
interface LintResult {
  messages?: { ruleId: string | null }[];
  warnings?: { rule: string }[];
}

/** Lints `file` and returns the rules it broke; throws if lint passes. */
function failingRules(
  tool: 'eslint' | 'stylelint',
  file: string,
  dir: string,
): string[] {
  const report = join(dir, `${tool}-report.json`);
  const format = tool === 'eslint' ? '--format' : '--formatter';
  const { status, stderr } = spawnSync(
    'npx',
    ['--no-install', tool, format, 'json', '--output-file', report, file],
    { cwd: dir, env, encoding: 'utf8' },
  );
  if (status === 0)
    throw new Error(`${tool} passed ${file}, which is off-system`);
  if (!existsSync(report)) throw new Error(`${tool} crashed:\n${stderr}`);
  const results = JSON.parse(readFileSync(report, 'utf8')) as LintResult[];
  return results.flatMap(({ messages = [], warnings = [] }) => [
    ...messages.map(({ ruleId }) => ruleId ?? 'a parse error'),
    ...warnings.map(({ rule }) => rule),
  ]);
}

function expectRules(where: string, actual: string[], expected: string[]) {
  const sorted = (rules: string[]) => JSON.stringify([...rules].sort());
  if (sorted(actual) !== sorted(expected)) {
    throw new Error(
      `${where} broke ${sorted(actual)}, expected ${sorted(expected)}`,
    );
  }
}

/** The fixture breaks four rules; each must fail lint in a consumer, as it does in Fossil. */
function checkOffSystem(app: string, dir: string) {
  const source = join(dir, app === 'next' ? 'app' : 'src');
  cpSync(new URL('smoke/off-system/', root), source, { recursive: true });
  expectRules(
    'The off-system component',
    failingRules('eslint', join(source, 'OffSystem.tsx'), dir),
    ['no-restricted-syntax'],
  );
  expectRules(
    'The off-system stylesheet',
    failingRules('stylelint', join(source, 'off-system.module.css'), dir),
    [
      'declaration-property-value-allowed-list',
      'declaration-property-value-disallowed-list',
      'declaration-property-value-disallowed-list',
      'scale-unlimited/declaration-strict-value',
    ],
  );
}

try {
  const tarballs = join(work, 'tarballs');
  mkdirSync(tarballs);
  for (const name of packages) {
    pnpm(
      ['pack', '--pack-destination', tarballs],
      new URL(`packages/${name}/`, root),
    );
  }
  const files = globSync('*.tgz', { cwd: tarballs }).map((file) =>
    join(tarballs, file),
  );

  for (const app of apps) {
    const dir = join(work, app);
    cpSync(new URL(`smoke/${app}/`, root), dir, { recursive: true });
    process.stdout.write(`\n${app}: installing the tarballs\n`);
    run(
      'npm',
      ['install', '--no-audit', '--no-fund', '--loglevel=error', ...files],
      dir,
      env,
    );
    for (const script of ['typecheck', 'lint:js', 'lint:css', 'build']) {
      process.stdout.write(`${app}: ${script}\n`);
      run('npm', ['run', '--silent', script], dir, env);
    }
    await check(app, dir);
    process.stdout.write(`${app}: renders from the packed tarballs\n`);
    checkAgentsMd(dir);
    process.stdout.write(
      `${app}: the bin writes the AGENTS.md block, and every file it names is installed\n`,
    );
    checkOffSystem(app, dir);
    process.stdout.write(`${app}: lint rejects an off-system component\n`);
  }
} finally {
  if (!process.env.FOSSIL_KEEP_SMOKE)
    rmSync(work, { recursive: true, force: true });
}

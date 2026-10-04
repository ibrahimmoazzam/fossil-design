// Installs Fossil's packed tarballs into apps outside the workspace, with npm, as a consumer
// would, then type-checks each app, lints its CSS with the shared config, builds it and checks
// what it renders. A workspace symlink would hide broken exports, declarations and directives.
import {
  cpSync,
  globSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { pnpm, run } from './run.ts';

const root = new URL('../', import.meta.url);
const packages = ['tokens', 'react', 'stylelint-config'];
const apps =
  process.argv.slice(2).length > 0 ? process.argv.slice(2) : ['next', 'vite'];
const work = mkdtempSync(join(tmpdir(), 'fossil-smoke-'));
const env = { ...process.env, NEXT_TELEMETRY_DISABLED: '1' };

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
      'fossil-box-',
      '<dialog',
    );
    const css = anyFile('.next/static/**/*.css', dir).join('\n');
    expectIncludes(
      "The page's CSS",
      css,
      '--fossil-color-background-page',
      'fossil-button-',
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
        'fossil-box-',
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
      'fossil-button-',
    );
  }
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
    for (const script of ['typecheck', 'lint:css', 'build']) {
      process.stdout.write(`${app}: ${script}\n`);
      run('npm', ['run', '--silent', script], dir, env);
    }
    await check(app, dir);
    process.stdout.write(`${app}: renders from the packed tarballs\n`);
  }
} finally {
  if (!process.env.FOSSIL_KEEP_SMOKE)
    rmSync(work, { recursive: true, force: true });
}

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
import type { TokensFile } from '../../../tokens/src/metadata.ts';
import { hash, script } from '../scripts.ts';
import type { CheckResult, CheckSpec, ComponentSpec } from './runtime.ts';
import { buildSheet } from './sheet.ts';
import { buildLibrary, type Library } from './spec.ts';
import { readIcons, stylesSpec } from './styles.ts';

const REPO = fileURLToPath(new URL('../../../../', import.meta.url));
const WORK = fileURLToPath(new URL('../../.figma/', import.meta.url));
const REACT = join(REPO, 'packages/react');
const TOKENS_JSON = join(REPO, 'packages/tokens/dist/tokens.json');
const BOX_CSS = join(REACT, 'src/generated/box.module.css');
/** Spec characters per check script. use_figma takes up to 50,000 characters, runtime included. */
const CHECK_BUDGET = 28_000;

export class LibraryError extends Error {}

const shown = (file: string) => relative(process.cwd(), file);

const git = (...args: string[]) =>
  execFileSync('git', args, { cwd: REPO, encoding: 'utf8' }).trim();

/** The commit the spec was read from, marked when the working tree differs from it. */
const source = () => {
  const changed =
    git(
      'status',
      '--porcelain',
      '--',
      'packages/react/src',
      'packages/tokens/src',
    ) !== '';
  return `${git('rev-parse', '--short', 'HEAD')}${changed ? ' with uncommitted changes' : ''}`;
};

function load(): { library: Library; tokens: TokensFile } {
  if (!existsSync(TOKENS_JSON) || !existsSync(BOX_CSS))
    throw new LibraryError(
      "The spec reads tokens.json and Box's generated CSS. Run pnpm build first.",
    );
  const tokens = JSON.parse(readFileSync(TOKENS_JSON, 'utf8')) as TokensFile;
  const library = buildLibrary(join(REACT, 'src/components'), BOX_CSS, tokens);
  if (library.problems.length > 0)
    throw new LibraryError(
      `The library spec can't be built:\n${library.problems.map((p) => `  ${p}`).join('\n')}`,
    );
  return { library, tokens };
}

const clear = (prefix: string) => {
  mkdirSync(WORK, { recursive: true });
  for (const old of readdirSync(WORK).filter((f) => f.startsWith(prefix)))
    rmSync(join(WORK, old));
};

export function librarySpec(): void {
  const { library, tokens } = load();
  const styles = stylesSpec(tokens, readIcons(join(REACT, 'package.json')));
  if (styles.problems.length > 0)
    throw new LibraryError(styles.problems.join('\n'));
  clear('library');
  clear('styles');
  writeFileSync(
    join(WORK, 'library-spec.json'),
    `${JSON.stringify({ source: source(), components: library.components.map((c) => c.spec) }, null, 2)}\n`,
  );
  writeFileSync(join(WORK, 'library.md'), buildSheet(library, styles.spec));
  const text = script(
    styles.spec,
    'create or update the text styles, effect styles and icons',
  );
  writeFileSync(join(WORK, 'styles.js'), text);
  console.log(
    [
      `Read ${String(library.components.length)} components from ${source()}: ${library.components.map((c) => c.spec.name).join(', ')}.`,
      `Left out: ${Object.keys(library.leftOut).join(', ')}.`,
      `Wrote ${shown(join(WORK, 'library.md'))}, the build sheet, and ${shown(join(WORK, 'library-spec.json'))}.`,
      `Wrote ${shown(join(WORK, 'styles.js'))} (${String(Math.ceil(text.length / 1024))} KB): ${String(styles.spec.textStyles.length)} text styles, ${String(styles.spec.effectStyles.length)} effect styles and ${String(styles.spec.icons.length)} icons. Pass it to use_figma exactly as it is.`,
    ].join('\n'),
  );
}

/** The check's spec in parts, each small enough for one use_figma call. */
export function checkParts(
  components: readonly ComponentSpec[],
  base: Omit<CheckSpec, 'components' | 'part' | 'parts'>,
  budget = CHECK_BUDGET,
): CheckSpec[] {
  const groups: ComponentSpec[][] = [];
  let size = 0;
  for (const c of components) {
    const length = JSON.stringify(c).length;
    const last = groups.at(-1);
    if (last && size + length <= budget) {
      last.push(c);
      size += length;
    } else {
      groups.push([c]);
      size = length;
    }
  }
  if (groups.length === 0) groups.push([]);
  return groups.map((group, i) => ({
    ...base,
    kind: 'check',
    part: i + 1,
    parts: groups.length,
    components: group,
  }));
}

export function libraryCheck(names: readonly string[]): void {
  const { library, tokens } = load();
  const styles = stylesSpec(tokens, readIcons(join(REACT, 'package.json')));
  const all = library.components.map((c) => c.spec);
  const unknown = names.filter((n) => !all.some((c) => c.name === n));
  if (unknown.length > 0)
    throw new LibraryError(
      `${unknown.join(', ')} ${unknown.length === 1 ? "isn't a component" : "aren't components"} in the library. It has ${all.map((c) => c.name).join(', ')}.`,
    );
  const chosen =
    names.length > 0 ? all.filter((c) => names.includes(c.name)) : all;
  const parts = checkParts(chosen, {
    kind: 'check',
    commit: source(),
    library: all.map((c) => c.name),
    textStyles: styles.spec.textStyles.map((t) => t.path),
    effectStyles: styles.spec.effectStyles.map((e) => e.path),
    icons: styles.spec.icons.map((i) => i.name),
  });
  clear('check-');
  const lines = parts.map((spec) => {
    const name = `check-${String(spec.part)}.js`;
    const text = script(
      spec,
      `check part ${String(spec.part)} of ${String(spec.parts)}: ${spec.components.map((c) => c.name).join(', ')}`,
    );
    writeFileSync(join(WORK, name), text);
    return `  ${shown(join(WORK, name))}  ${String(Math.ceil(text.length / 1024))} KB  ${spec.components.map((c) => c.name).join(', ')}`;
  });
  console.log(
    [
      `Wrote ${String(parts.length)} check ${parts.length === 1 ? 'script' : 'scripts'}:`,
      ...lines,
      '',
      `Pass each one to use_figma exactly as it is, save each result exactly as it comes back to ${shown(join(WORK, 'check-<n>.json'))}, then run pnpm figma:library-check report.`,
    ].join('\n'),
  );
}

/** Checks saved check results against their hashes, and that they're every part of one check. */
export function readResults(
  files: readonly { name: string; text: string }[],
): CheckResult[] {
  if (files.length === 0)
    throw new LibraryError(
      'There are no saved check results. Run pnpm figma:library-check, and save each result to .figma/check-<n>.json.',
    );
  const results = files.map(({ name, text }) => {
    let result: CheckResult;
    try {
      result = JSON.parse(text) as CheckResult;
    } catch {
      throw new LibraryError(
        `${name} isn't the JSON use_figma returned. Run its check script again and save the result exactly as it comes back.`,
      );
    }
    const { part, parts, commit, components, foundations } = result;
    if (
      (result as { fossil?: unknown }).fossil !== 'check' ||
      hash(JSON.stringify({ part, parts, commit, components, foundations })) !==
        result.hash
    )
      throw new LibraryError(
        `${name} doesn't match its hash: it was cut off or changed. Run its check script again and save the result exactly as it comes back.`,
      );
    return result;
  });
  results.sort((a, b) => a.part - b.part);
  const parts = results[0]?.parts ?? 0;
  if (
    results.length !== parts ||
    results.some(
      (r, i) =>
        r.part !== i + 1 ||
        r.parts !== parts ||
        r.commit !== results[0]?.commit,
    )
  )
    throw new LibraryError(
      'The saved results come from different checks, or some parts are missing. Run pnpm figma:library-check and every script it writes again.',
    );
  return results;
}

/** What the results found, and whether the library matches the spec. */
export function reportLines(results: readonly CheckResult[]): {
  lines: string[];
  passed: boolean;
} {
  const lines: string[] = [];
  let failed = 0;
  const foundations = [...new Set(results.flatMap((r) => r.foundations))];
  if (foundations.length > 0) {
    failed += foundations.length;
    lines.push('Foundations:', ...foundations.map((p) => `  ${p}`));
  }
  for (const c of results.flatMap((r) => r.components)) {
    if (c.problems.length === 0) {
      lines.push(`${c.name}: matches the spec.`);
      continue;
    }
    failed += c.problems.length;
    lines.push(
      `${c.name}: ${String(c.problems.length)} ${c.problems.length === 1 ? 'problem' : 'problems'}`,
      ...c.problems.map((p) => `  ${p}`),
    );
  }
  lines.push(
    '',
    failed === 0
      ? `The library matches the spec from ${String(results[0]?.commit)}.`
      : `${String(failed)} ${failed === 1 ? 'difference' : 'differences'} from the spec from ${String(results[0]?.commit)}.`,
  );
  return { lines, passed: failed === 0 };
}

/** Verifies the saved check results and prints what they found. Fails if anything differs. */
export function libraryReport(): boolean {
  const files = existsSync(WORK)
    ? readdirSync(WORK).filter((f) => /^check-\d+\.json$/.test(f))
    : [];
  const { lines, passed } = reportLines(
    readResults(
      files.map((name) => ({
        name,
        text: readFileSync(join(WORK, name), 'utf8'),
      })),
    ),
  );
  console.log(lines.join('\n'));
  return passed;
}

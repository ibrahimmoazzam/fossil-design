import { COLLECTIONS, nameOf, type FigmaToken } from './model.ts';
import type { CollectionKey, SyncValue } from './runtime.ts';
import type { Snapshot } from './snapshot.ts';

/** A value a designer changed in Figma, to write back to the token source. */
export interface Edit {
  path: string;
  /** The Figma mode: Value for a primitive, Light or Dark for a semantic token. */
  mode: string;
  /** The value in code. */
  from: SyncValue | undefined;
  value: SyncValue;
}

export interface Report {
  /** Changed in Figma only. These become the pull request. */
  edits: Edit[];
  /** Changed in code since the last apply. The next apply sends them. */
  pending: string[];
  /** Changed in Figma and in code, to different values. */
  conflicts: string[];
  /** Changes only code can make, each with the change it needs. */
  refused: string[];
}

const isAlias = (
  v: SyncValue | undefined,
): v is { alias: string; target?: string } =>
  typeof v === 'object' && 'alias' in v;

/** Compares values as Figma holds them: colours to the 8-bit channel, sizes to a hundredth of a px, curves to a thousandth. */
export function equal(
  a: SyncValue | undefined,
  b: SyncValue | undefined,
): boolean {
  if (a === undefined || b === undefined) return a === b;
  if (isAlias(a) || isAlias(b))
    return isAlias(a) && isAlias(b) && a.alias === b.alias;
  if (typeof a === 'object' && typeof b === 'object') {
    if ('hex' in a && 'hex' in b)
      return (
        a.hex.toLowerCase() === b.hex.toLowerCase() &&
        Math.abs(a.alpha - b.alpha) <= 0.005
      );
    if ('bezier' in a && 'bezier' in b)
      return a.bezier.every(
        (n, i) => Math.abs(n - (b.bezier[i] ?? NaN)) <= 0.001,
      );
    return 'preset' in a && 'preset' in b && a.preset === b.preset;
  }
  if (typeof a === 'number' && typeof b === 'number')
    return Math.abs(a - b) <= 0.01;
  return a === b;
}

export const describe = (v: SyncValue | undefined): string => {
  if (v === undefined) return 'nothing';
  if (isAlias(v)) return v.alias === '' ? String(v.target) : `{${v.alias}}`;
  if (typeof v === 'object' && 'bezier' in v)
    return `cubic-bezier(${v.bezier.join(', ')})`;
  if (typeof v === 'object' && 'preset' in v)
    return `Figma's ${v.preset} easing`;
  if (typeof v === 'object')
    return v.alpha < 1
      ? `${v.hex} at ${String(Math.round(v.alpha * 100))}%`
      : v.hex;
  return typeof v === 'string' ? `"${v}"` : String(v);
};

/**
 * The three-way diff. The base is the token source at the commit the last apply stamped on
 * Figma, so a value that differs from it in Figma was changed in Figma, and one that differs
 * from it in code was changed in code. Only values cross from Figma to code.
 */
export function diff(
  base: readonly FigmaToken[],
  current: readonly FigmaToken[],
  snapshot: Snapshot,
): Report {
  const live = (tokens: readonly FigmaToken[]) =>
    new Map(tokens.filter((t) => !t.deprecated).map((t) => [t.path, t]));
  const was = live(base);
  const now = live(current);
  const renamedTo = new Map(
    current
      .filter((t) => t.deprecated && t.replacedBy !== undefined)
      .map((t) => [t.path, t.replacedBy ?? '']),
  );
  const report: Report = { edits: [], pending: [], conflicts: [], refused: [] };

  for (const c of snapshot.collections) {
    const modes =
      c.key in COLLECTIONS ? COLLECTIONS[c.key as CollectionKey].modes : [];
    for (const mode of c.modes)
      if (!modes.includes(mode))
        report.refused.push(
          `The ${c.name} collection has a mode called ${mode}, which code doesn't have. Modes are added in code, in the token build.`,
        );
  }

  const stamps = new Map<string, number>();
  for (const v of snapshot.variables)
    if (v.path !== '') stamps.set(v.path, (stamps.get(v.path) ?? 0) + 1);
  const seen = new Set<string>();

  for (const v of snapshot.variables) {
    if (v.path === '') {
      report.refused.push(
        `${v.name} was added in Figma. Tokens are added in code: add ${v.name.replaceAll('/', '.')} to a token file in a pull request, and the next apply creates the variable.`,
      );
      continue;
    }
    if (seen.has(v.path)) continue;
    seen.add(v.path);
    if ((stamps.get(v.path) ?? 0) > 1) {
      report.refused.push(
        `More than one variable is stamped ${v.path}. Delete the copies in Figma, then read again.`,
      );
      continue;
    }
    const token = now.get(v.path);
    if (token === undefined) {
      if (renamedTo.has(v.path) || was.has(v.path)) continue;
      report.refused.push(
        `${v.name} is stamped ${v.path}, which neither code nor the last apply has. Delete the variable in Figma.`,
      );
      continue;
    }
    if (v.name !== nameOf(v.path)) {
      report.refused.push(
        `${v.path} was renamed to ${v.name} in Figma. Renames happen in code: add the new token, deprecate ${v.path} with replacedBy pointing at it, and the next apply renames the variable in place. Until then, apply restores the name.`,
      );
      continue;
    }
    if (v.collection !== token.collection || v.type !== token.type) {
      report.refused.push(
        `${v.path} is a ${v.type} variable in Figma's ${v.collection} collection, but a ${token.type} ${token.collection} token in code. Delete the variable in Figma, and the next apply recreates it.`,
      );
      continue;
    }

    const before = was.get(v.path);
    for (const mode of COLLECTIONS[token.collection].modes) {
      const figma = v.values[mode];
      const code = token.values[mode];
      const old = before?.values[mode];
      if (figma === undefined) continue;
      const where = `${v.path} (${mode})`;
      if (token.collection === 'semantic' && !isAlias(figma)) {
        report.refused.push(
          `${where} was detached from its alias and set to ${describe(figma)}. A semantic token only aliases other tokens: pick a variable for it in Figma, or change the primitive it aliases.`,
        );
        continue;
      }
      if (token.collection === 'primitive' && isAlias(figma)) {
        report.refused.push(
          `${where} became an alias of ${describe(figma)} in Figma. A primitive holds a raw value: set one in Figma.`,
        );
        continue;
      }
      if (typeof figma === 'object' && 'preset' in figma) {
        report.refused.push(
          `${where} uses ${describe(figma)}. Fossil's easing tokens are cubic Béziers, and Figma doesn't document the curve behind a preset: set a custom curve in Figma instead.`,
        );
        continue;
      }
      if (isAlias(figma) && figma.alias === '') {
        report.refused.push(
          `${where} aliases ${describe(figma)}, which isn't one of Fossil's variables. Pick a Fossil variable for it in Figma.`,
        );
        continue;
      }
      if (equal(figma, old)) {
        if (!equal(code, old))
          report.pending.push(`${where}: ${describe(old)} → ${describe(code)}`);
        continue;
      }
      if (equal(figma, code)) continue;
      if (old === undefined || !equal(code, old)) {
        report.conflicts.push(
          `${where} changed in both places: ${describe(old)} became ${describe(figma)} in Figma and ${describe(code)} in code. Settle it in code, then apply.`,
        );
        continue;
      }
      report.edits.push({ path: v.path, mode, from: code, value: figma });
    }
  }

  for (const token of now.values()) {
    if (seen.has(token.path)) continue;
    const old = [...renamedTo].find(
      ([from, to]) => to === token.path && seen.has(from),
    );
    if (old !== undefined)
      report.pending.push(`${old[0]} → ${token.path}: renamed`);
    else if (was.has(token.path))
      report.refused.push(
        `${token.path} was deleted in Figma. Tokens are deleted in code, in a pull request; until then, apply restores the variable.`,
      );
    else report.pending.push(`${token.path}: new`);
  }
  return report;
}

/** The report as Markdown: the terminal summary, and the body of the pull request. */
export function summary(report: Report, commit: string): string {
  const section = (title: string, lines: readonly string[]) =>
    lines.length === 0
      ? []
      : [
          `### ${title} (${String(lines.length)})`,
          '',
          ...lines.map((l) => `- ${l}`),
          '',
        ];
  return [
    `Compared Figma with the token source at ${commit.slice(0, 7)}, the last apply, and with the current source.`,
    '',
    ...section(
      'Changed in Figma, written to the token source',
      report.edits.map(
        (e) =>
          `\`${e.path}\` (${e.mode}): ${describe(e.from)} → ${describe(e.value)}`,
      ),
    ),
    ...section('Changed in both, not written', report.conflicts),
    ...section('Refused: only code can make these changes', report.refused),
    ...section(
      'Changed in code since the last apply, which the next apply sends',
      report.pending,
    ),
    ...(report.edits.length +
      report.conflicts.length +
      report.refused.length ===
    0
      ? ['Figma has no changes to bring back.', '']
      : []),
  ].join('\n');
}

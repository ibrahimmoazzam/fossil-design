import type { TransformedToken } from 'style-dictionary/types';
import type {
  Alias,
  LintLists,
  TokenMetadata,
  TokensFile,
} from '../src/metadata.ts';
import { contrastRatio } from './contrast.ts';
import {
  isRecord,
  PRIMITIVE_GROUP,
  referenceOf,
  referencesIn,
  type Token,
} from './validate.ts';

/** A build that can't write valid output. Each problem names its token. */
export class BuildError extends Error {
  readonly problems: readonly string[];

  constructor(problems: readonly string[]) {
    super(problems.join('\n'));
    this.name = 'BuildError';
    this.problems = problems;
  }
}

/** One custom property in tokens.css. */
export interface Property {
  /** The composite part it holds, when the build splits a typography token. */
  part: string | undefined;
  /** Style Dictionary's name for it, such as `--fossil-color-text-muted`. */
  name: string;
  /** Style Dictionary's CSS value, with every reference resolved. */
  literal: string;
  /** The declared value: `var()` of each token the source references, or the literal. */
  light: string;
  dark: string | undefined;
}

/** A validated source token and its custom properties. */
export interface Entry {
  token: Token;
  type: string;
  properties: Property[];
}

const BAD_VALUE = /\[object Object\]|\bundefined\b|\bNaN\b/;

const list = (items: readonly string[]): string =>
  items.length < 2
    ? items.join('')
    : `${items.slice(0, -1).join(', ')} and ${String(items.at(-1))}`;

const isDeprecated = (token: Token): boolean =>
  token.deprecated === true || typeof token.deprecated === 'string';

const darkOf = (token: Token): unknown => {
  const modes = token.extension?.modes;
  return isRecord(modes) ? modes.dark : undefined;
};

/** One part of a composite value. A reference to a whole composite becomes a reference to the same part of it. */
const partOf = (value: unknown, part: string): unknown => {
  const ref = referenceOf(value);
  if (ref !== undefined) return `{${ref}.${part}}`;
  return isRecord(value) ? value[part] : undefined;
};

/**
 * Joins each validated token with the custom properties Style Dictionary made for it,
 * and writes their CSS values. References come from the source rather than from
 * Style Dictionary's output, which resolves them in split typography and in dark values.
 */
export function join(
  tokens: readonly Token[],
  built: readonly TransformedToken[],
): Entry[] {
  const byPath = new Map(built.map((t) => [t.path.join('.'), t]));
  const made = new Map<string, TransformedToken[]>(
    tokens.map((t) => [t.path, []]),
  );
  for (const sd of built) {
    const path = sd.path.join('.');
    (made.get(path) ?? made.get(sd.path.slice(0, -1).join('.')))?.push(sd);
  }

  const variable = (path: string): string => {
    const sd = byPath.get(path);
    if (sd === undefined) throw new Error(`{${path}} has no custom property`);
    return `var(--${sd.name})`;
  };

  /** CSS for a source value: `var()` of each token it references, or Style Dictionary's literal if it references none. */
  const css = (value: unknown, type: string, literal: unknown): string => {
    const ref = referenceOf(value);
    if (ref !== undefined) return variable(ref);
    if (referencesIn(value).length === 0) return String(literal);
    // A composite of references: one var() per part, in shorthand order.
    const part = (v: unknown) => css(v, '', undefined);
    if (type === 'border' && isRecord(value))
      return [value.width, value.style, value.color].map(part).join(' ');
    if (type === 'shadow')
      return (Array.isArray(value) ? value : [value])
        .map((s: unknown) =>
          isRecord(s)
            ? [
                ...(s.inset === true ? ['inset'] : []),
                ...[s.offsetX, s.offsetY, s.blur, s.spread, s.color].map(part),
              ].join(' ')
            : part(s),
        )
        .join(', ');
    throw new Error(`can't write references inside a ${type} value as CSS`);
  };

  const problems: string[] = [];
  const entries: Entry[] = [];
  for (const token of tokens) {
    const outputs = made.get(token.path) ?? [];
    const type = token.type ?? '';
    if (outputs.length === 0) {
      problems.push(`${token.path}: Style Dictionary made no custom property`);
      continue;
    }
    const dark = darkOf(token);
    try {
      const properties = outputs.map((sd): Property => {
        const part =
          sd.path.length > token.path.split('.').length
            ? sd.path.at(-1)
            : undefined;
        const at = (value: unknown) =>
          part === undefined ? value : partOf(value, part);
        const literal: unknown = sd.$value;
        return {
          part,
          name: `--${sd.name}`,
          literal: String(literal),
          light: css(at(token.value), type, literal),
          dark: dark === undefined ? undefined : css(at(dark), type, undefined),
        };
      });
      entries.push({ token, type, properties });
    } catch (error) {
      problems.push(`${token.path}: ${(error as Error).message}`);
    }
  }

  const owners = new Map<string, string[]>();
  for (const { token, type, properties } of entries)
    for (const p of properties) {
      owners.set(p.name, [...(owners.get(p.name) ?? []), token.path]);
      for (const value of [p.light, p.dark])
        if (value !== undefined && (value === '' || BAD_VALUE.test(value)))
          problems.push(
            `${token.path}: ${p.name} would be "${value}". No transform turns this ${type} value into CSS.`,
          );
    }
  for (const [name, paths] of owners)
    if (paths.length > 1)
      problems.push(
        `${list(paths)} ${paths.length === 2 ? 'both' : 'all'} become ${name}. Rename one of them.`,
      );

  if (problems.length > 0) throw new BuildError(problems);
  return entries;
}

/** tokens.css: every token under :root, and the dark values in two identical blocks. */
export function css(entries: readonly Entry[], header: string): string {
  const comment = (text: string) => `/* ${text.replaceAll('*/', '* /')} */`;
  const lines = [comment(header), '', ':root {'];
  let tier: string | undefined;
  for (const { token, properties } of entries) {
    if (tier !== undefined && token.tier !== tier) lines.push('');
    tier = token.tier;
    const notes = [
      typeof token.description === 'string' ? token.description : '',
      isDeprecated(token)
        ? `Deprecated${typeof token.deprecated === 'string' ? `: ${token.deprecated}` : '.'}`
        : '',
    ].filter((n) => n !== '');
    if (notes.length > 0) lines.push(`  ${comment(notes.join(' '))}`);
    for (const p of properties) lines.push(`  ${p.name}: ${p.light};`);
  }
  lines.push('}');

  const dark = entries.flatMap(({ properties }) =>
    properties.flatMap((p) =>
      p.dark === undefined ? [] : [`${p.name}: ${p.dark};`],
    ),
  );
  if (dark.length > 0) {
    const block = (selector: string, indent: string) => [
      `${indent}${selector} {`,
      `${indent}  color-scheme: dark;`,
      ...dark.map((d) => `${indent}  ${d}`),
      `${indent}}`,
    ];
    lines.push(
      '',
      comment(
        'Dark mode follows the system unless the page sets data-theme="light", and data-theme="dark" forces it.',
      ),
      '@media (prefers-color-scheme: dark) {',
      ...block(':root:not([data-theme="light"])', '  '),
      '}',
      '',
      ...block(':root[data-theme="dark"]', ''),
    );
  }
  return `${lines.join('\n')}\n`;
}

/** What a value references: a token path, or the path each part of a composite references. */
function aliasOf(value: unknown): Alias | undefined {
  const ref = referenceOf(value);
  if (ref !== undefined) return ref;
  if (Array.isArray(value)) {
    const parts = value.map(aliasOf);
    const aliases = parts.filter((p): p is Alias => p !== undefined);
    return aliases.length > 0 && aliases.length === parts.length
      ? aliases
      : undefined;
  }
  if (isRecord(value)) {
    const parts = Object.entries(value).flatMap(([key, part]) => {
      const alias = aliasOf(part);
      return alias === undefined ? [] : [[key, alias] as const];
    });
    return parts.length > 0 ? Object.fromEntries(parts) : undefined;
  }
  return undefined;
}

/** tokens.json: each token's custom property, resolved value, alias, dark value and lifecycle. */
export function tokensFile(entries: readonly Entry[]): TokensFile {
  const source = new Map(entries.map(({ token }) => [token.path, token]));
  // In dark mode every alias takes its target's dark value, as the custom properties do, so a
  // token without a dark value of its own still changes when the token it aliases does.
  const resolve = (value: unknown, dark = false): unknown => {
    const ref = referenceOf(value);
    if (ref !== undefined) {
      const target = source.get(ref);
      const next =
        dark && target ? (darkOf(target) ?? target.value) : target?.value;
      return resolve(next, dark);
    }
    if (Array.isArray(value)) return value.map((v) => resolve(v, dark));
    if (isRecord(value))
      return Object.fromEntries(
        Object.entries(value).map(([key, part]) => [key, resolve(part, dark)]),
      );
    return value;
  };

  const tokens: Record<string, TokenMetadata> = {};
  for (const { token, type, properties } of entries) {
    const alias = aliasOf(token.value);
    const declared = darkOf(token);
    const dark = declared ?? token.value;
    const darkValue = resolve(dark, true);
    const darkAlias =
      declared !== undefined ||
      JSON.stringify(darkValue) !== JSON.stringify(resolve(token.value))
        ? aliasOf(dark)
        : undefined;
    const replacedBy = referenceOf(token.extension?.replacedBy);
    const since = token.extension?.since;
    const contrast = token.extension?.contrast;
    const [first] = properties;
    tokens[token.path] = {
      tier: token.tier,
      type,
      cssVar:
        first !== undefined && first.part === undefined
          ? first.name
          : Object.fromEntries(
              properties.map((p) => [p.part ?? '', p.name] as const),
            ),
      value: resolve(token.value),
      ...(alias !== undefined && { aliasOf: alias }),
      ...(darkAlias !== undefined && {
        dark: { value: darkValue, aliasOf: darkAlias },
      }),
      ...(typeof token.description === 'string' && {
        description: token.description,
      }),
      ...(isDeprecated(token) && {
        deprecated: token.deprecated as true | string,
      }),
      ...(replacedBy !== undefined && { replacedBy }),
      ...(typeof since === 'string' && { since }),
      ...(isRecord(contrast) &&
        Array.isArray(contrast.against) &&
        typeof contrast.minimum === 'number' && {
          contrast: {
            against: contrast.against.map((a) => referenceOf(a) ?? ''),
            minimum: contrast.minimum,
          },
        }),
    };
  }
  return { tokens };
}

/** lint.json: the custom properties the Stylelint config rejects. */
export function lintLists(entries: readonly Entry[]): LintLists {
  const byPath = new Map(entries.map((e) => [e.token.path, e]));
  const deprecated: Record<string, { replacedBy?: string; reason?: string }> =
    {};
  for (const { token, properties } of entries) {
    if (!isDeprecated(token)) continue;
    const replacement = byPath.get(
      referenceOf(token.extension?.replacedBy) ?? '',
    );
    for (const { part, name } of properties) {
      const replacedBy = replacement?.properties.find(
        (p) => p.part === part,
      )?.name;
      deprecated[name] = {
        ...(replacedBy !== undefined && { replacedBy }),
        ...(typeof token.deprecated === 'string' && {
          reason: token.deprecated,
        }),
      };
    }
  }
  return {
    primitive: entries
      .filter((e) => e.token.tier === 'primitive')
      .flatMap((e) => e.properties.map((p) => p.name)),
    deprecated,
  };
}

/** tokens.ts: the keys of each semantic token group, for typed props. */
export function tokenKeys(entries: readonly Entry[], header: string): string {
  const groups = new Map<string, string[]>();
  for (const { token } of entries) {
    if (token.tier !== 'semantic' || isDeprecated(token)) continue;
    const segments = token.path.split('.');
    const key = segments.pop() ?? '';
    const group = segments.join('.');
    groups.set(group, [...(groups.get(group) ?? []), key]);
  }
  const rows = [...groups].map(
    ([group, keys]) =>
      `  ${JSON.stringify(group)}: [${keys.map((k) => JSON.stringify(k)).join(', ')}],`,
  );
  return `// ${header}

/**
 * The keys in each semantic token group, without deprecated tokens.
 * Component props take these: a \`padding\` prop is a \`TokenKey<'space'>\`.
 */
export const tokenKeys = {
${rows.join('\n')}
} as const;

/** A semantic token group, such as \`'space'\` or \`'color.text'\`. */
export type TokenGroup = keyof typeof tokenKeys;

/** A key in a semantic token group, such as \`'m'\` in \`'space'\`. */
export type TokenKey<Group extends TokenGroup> =
  (typeof tokenKeys)[Group][number];
`;
}

/** breakpoints.ts: each breakpoint's width and media query, since custom properties can't be used in media conditions. */
export function breakpoints(entries: readonly Entry[], header: string): string {
  const group = `${PRIMITIVE_GROUP}.breakpoint.`;
  const points = entries.flatMap(({ token, properties }) =>
    token.path.startsWith(group) && properties[0] !== undefined
      ? [[token.path.slice(group.length), properties[0].literal]]
      : [],
  );
  const rows = (value: (width: string) => string) =>
    points
      .map(
        ([name, width]) =>
          `  ${JSON.stringify(name)}: ${JSON.stringify(value(String(width)))},`,
      )
      .join('\n');
  return `// ${header}

/** The minimum width of each breakpoint. Mobile is the default and has none. */
export const breakpoints = {
${rows((width) => width)}
} as const;

/** A \`min-width\` media query for each breakpoint, for \`matchMedia\` and CSS-in-JS. */
export const mediaQueries = {
${rows((width) => `(min-width: ${width})`)}
} as const;

export type Breakpoint = keyof typeof breakpoints;
`;
}

/**
 * A declaration for an export that isn't TypeScript. TypeScript 6 checks side-effect imports, so
 * tokens.css needs one. The JSON files get real types; a JSON module is CommonJS to TypeScript,
 * so theirs is a .d.cts with `export =`.
 */
export const declaration = (type?: string): string =>
  type === undefined
    ? 'export {};\n'
    : `import type { ${type} } from './metadata.js';\n\ndeclare const file: ${type};\nexport = file;\n`;

export const BLOCK_START = '<!-- fossil:foundations:start -->';
export const BLOCK_END = '<!-- fossil:foundations:end -->';

/** A DTCG dimension in px, at a 16px root. */
const px = (value: unknown): string => {
  if (!isRecord(value) || typeof value.value !== 'number') return String(value);
  const size = value.unit === 'rem' ? value.value * 16 : value.value;
  return size === 0 ? '0' : `${String(Number(size.toFixed(2)))}px`;
};

const cell = (text: string) => text.replaceAll('|', '\\|');
const code = (s: string) => `\`${s}\``;

const cssVars = (t: TokenMetadata) =>
  typeof t.cssVar === 'string' ? [t.cssVar] : Object.values(t.cssVar);

const inUse = (tokens: TokensFile['tokens']) =>
  Object.entries(tokens).filter(
    ([, t]) => t.tier === 'semantic' && t.deprecated === undefined,
  );

const lead = (prefix: string) =>
  `Style with these semantic tokens, as \`var(--${prefix}-…)\`. Each one switches between light and dark by itself. Sizes are at a 16px root; the tokens are in rem.`;

/** The semantic tokens the foundations show, by kind, and the breakpoint widths. */
function foundationTokens({ tokens }: TokensFile) {
  const semantic = inUse(tokens);
  const spacing = semantic.filter(
    ([path, t]) => path.startsWith('space.') && t.type === 'dimension',
  );
  const text = semantic.filter(([, t]) => t.type === 'typography');
  const colours = semantic.filter(([, t]) => t.type === 'color');
  const shown = new Set([...spacing, ...text, ...colours]);
  const others = new Map<string, string[]>();
  for (const entry of semantic) {
    if (shown.has(entry)) continue;
    const group = entry[0].split('.').slice(0, -1).join('.');
    others.set(group, [...(others.get(group) ?? []), ...cssVars(entry[1])]);
  }
  const widths = Object.entries(tokens).filter(([path]) =>
    path.startsWith(`${PRIMITIVE_GROUP}.breakpoint.`),
  );
  return { spacing, text, colours, others, widths };
}

/** A text style's font role, such as `heading`, and its value's parts. */
function textStyle(t: TokenMetadata) {
  const v = isRecord(t.value) ? t.value : {};
  const family =
    isRecord(t.aliasOf) && typeof t.aliasOf.fontFamily === 'string'
      ? (t.aliasOf.fontFamily.split('.').at(-1) ?? '')
      : String(Array.isArray(v.fontFamily) ? v.fontFamily[0] : v.fontFamily);
  return { family, value: v };
}

const lastSegment = (path: string) => path.split('.').at(-1) ?? path;

/**
 * The spacing scale, the type scale and the semantic colours, plus the names of every other
 * semantic token, under headings at `level`.
 */
function foundationTables(file: TokensFile, level: number): string[] {
  const { tokens } = file;
  const { spacing, text, colours, others, widths } = foundationTokens(file);
  // WCAG doesn't round: 4.499:1 fails 4.5:1, so the table shows ratios rounded down.
  const ratio = (n: number | undefined) =>
    n === undefined ? '?' : `${(Math.floor(n * 100) / 100).toFixed(2)}:1`;
  const contrastNote = (t: TokenMetadata): string => {
    if (t.contrast === undefined) return '';
    const on = t.contrast.against.map((path) => {
      const back = tokens[path];
      const light = contrastRatio(t.value, back?.value);
      const dark = contrastRatio(
        t.dark?.value ?? t.value,
        back?.dark?.value ?? back?.value,
      );
      return `${ratio(light)} / ${ratio(dark)} on ${code(path)}`;
    });
    return ` Contrast in light / dark: ${on.join(', ')}. Needs ${String(t.contrast.minimum)}:1.`;
  };

  const typeRows = text.map(([path, t]) => {
    const { family, value: v } = textStyle(t);
    return `| ${code(path)} | ${family} | ${px(v.fontSize)} | ${String(v.fontWeight)} | ${String(v.lineHeight)} | ${px(v.letterSpacing)} | ${cell(t.description ?? '')} |`;
  });
  const example = text[0] === undefined ? [] : cssVars(text[0][1]);
  const heading = (title: string) => `${'#'.repeat(level)} ${title}`;

  return [
    heading('Spacing'),
    '',
    'For padding and `gap`. Never margin.',
    '',
    '| Token | Custom property | Size |',
    '| --- | --- | --- |',
    ...spacing.map(
      ([path, t]) =>
        `| ${code(path)} | ${cssVars(t).map(code).join(', ')} | ${px(t.value)} |`,
    ),
    '',
    heading('Breakpoints'),
    '',
    "Mobile first: style for the smallest screen, then add `@media (min-width: …)` rules for wider ones. A custom property can't go in a media condition, so write the width itself. In JavaScript, the tokens package exports each query as `mediaQueries`.",
    '',
    '| Breakpoint | From |',
    '| --- | --- |',
    ...widths.map(
      ([path, t]) => `| ${code(lastSegment(path))} | ${px(t.value)} |`,
    ),
    '',
    heading('Type'),
    '',
    `Each text style is five custom properties. Set all five, and never the \`font\` shorthand, which drops letter-spacing: ${list(example.map(code))}.`,
    '',
    '| Style | Font | Size | Weight | Line height | Letter spacing | Use |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...typeRows,
    '',
    heading('Colour'),
    '',
    '| Custom property | Use |',
    '| --- | --- |',
    ...colours.map(
      ([, t]) =>
        `| ${cssVars(t).map(code).join(', ')} | ${cell((t.description ?? '') + contrastNote(t))} |`,
    ),
    '',
    heading('Other semantic tokens'),
    '',
    ...[...others].map(
      ([group, vars]) => `- ${code(group)}: ${vars.map(code).join(', ')}`,
    ),
  ];
}

/**
 * The foundations block of AGENTS.md: the spacing scale, the type scale and the semantic
 * colours, always in an agent's context, plus the names of every other semantic token.
 */
export function foundations(file: TokensFile, prefix: string): string {
  return [
    BLOCK_START,
    '<!-- Generated by the token build from packages/tokens/src. Change the tokens, not this block. -->',
    '<!-- prettier-ignore-start -->',
    '',
    '## Foundations',
    '',
    `${lead(prefix)} \`packages/tokens/dist/tokens.json\` describes every token.`,
    '',
    ...foundationTables(file, 3),
    '',
    '<!-- prettier-ignore-end -->',
    BLOCK_END,
  ].join('\n');
}

/** foundations.md: the same tables as the AGENTS.md block, for docs that bundle them. */
export function foundationsMarkdown(
  file: TokensFile,
  prefix: string,
  header: string,
): string {
  return `${[`<!-- ${header} -->`, '', lead(prefix), '', ...foundationTables(file, 2)].join('\n')}\n`;
}

/** What a set of custom properties share, up to a hyphen: `--fossil-radius-`. */
function stemOf(vars: readonly string[]): string {
  const shared = vars.reduce((a, b) => {
    let i = 0;
    while (i < a.length && a[i] === b[i]) i++;
    return a.slice(0, i);
  });
  return shared.slice(0, shared.lastIndexOf('-') + 1);
}

/** Custom properties that share a stem, as `--fossil-radius-{control,surface}`. */
function braces(vars: readonly string[]): string {
  if (vars.length < 2) return vars.map(code).join('');
  const stem = stemOf(vars);
  return code(`${stem}{${vars.map((v) => v.slice(stem.length)).join(',')}}`);
}

/**
 * foundations-brief.md: the same foundations in about half the space, for an app's
 * AGENTS.md block, which is always in an agent's context. Each scale is a line, each text style
 * and colour keeps its use, and the other tokens are listed by name.
 */
export function foundationsBrief(file: TokensFile, header: string): string {
  const { spacing, text, colours, others, widths } = foundationTokens(file);
  const first = text[0];
  const parts = first === undefined ? [] : cssVars(first[1]);
  const textStem = parts.length < 2 ? '' : stemOf(parts);
  const space = spacing.flatMap(([, t]) => cssVars(t));
  const spaceStem = space.length < 2 ? '' : stemOf(space);
  const colour = colours.flatMap(([, t]) => cssVars(t));
  const colourStem = colour.length < 2 ? '' : stemOf(colour);
  return `${[
    `<!-- ${header} -->`,
    '',
    'Sizes are at a 16px root.',
    '',
    `- **Spacing**, ${code(`${spaceStem}…`)}, for padding and \`gap\`: ${spacing.map(([, t]) => `${code(cssVars(t).join('').slice(spaceStem.length))} ${px(t.value)}`).join(', ')}.`,
    `- **Breakpoints**, for \`min-width\` queries: ${widths.map(([path, t]) => `${code(lastSegment(path))} ${px(t.value)}`).join(', ')}.`,
    `- **Text styles**, each five custom properties${first === undefined ? '' : `: ${code(first[0])} is ${list(parts.map((v, i) => code(i === 0 ? v : v.slice(textStem.length - 1))))}`}. By name:`,
    ...text.map(([path, t]) => {
      const { family, value } = textStyle(t);
      return `  - ${code(path.slice(path.indexOf('.') + 1))} (${family}, ${px(value.fontSize)}, ${String(value.fontWeight)}): ${t.description ?? ''}`;
    }),
    `- **Colour**, ${code(`${colourStem}…`)}:`,
    ...colours.map(
      ([, t]) =>
        `  - ${code(cssVars(t).join('').slice(colourStem.length))}: ${t.description ?? ''}`,
    ),
    `- **Other:** ${[...others.values()].map(braces).join(', ')}.`,
  ].join('\n')}\n`;
}

const percent = (n: number) => `${String(Number((n * 100).toFixed(1)))}%`;

/** A resolved DTCG value as a person writes it, such as `#4a5159`, `1rem (16px)` or `150ms`. */
function show(type: string, value: unknown): string {
  if (type === 'color' && isRecord(value)) {
    const alpha = typeof value.alpha === 'number' ? value.alpha : 1;
    if (alpha === 0) return 'transparent';
    return alpha < 1
      ? `${String(value.hex)} at ${percent(alpha)}`
      : String(value.hex);
  }
  if (type === 'dimension' && isRecord(value))
    return value.unit === 'rem' && value.value !== 0
      ? `${String(value.value)}rem (${px(value)})`
      : px(value);
  if (type === 'duration' && isRecord(value))
    return `${String(value.value)}${String(value.unit)}`;
  if (type === 'cubicBezier' && Array.isArray(value))
    return `cubic-bezier(${value.join(', ')})`;
  if (type === 'fontFamily' && Array.isArray(value)) return value.join(', ');
  if (type === 'typography' && isRecord(value)) {
    const family = Array.isArray(value.fontFamily)
      ? String(value.fontFamily[0])
      : String(value.fontFamily);
    const spacing = px(value.letterSpacing);
    return `${family} ${px(value.fontSize)}, weight ${String(value.fontWeight)}, line height ${String(value.lineHeight)}${spacing === '0' ? '' : `, letter spacing ${spacing}`}`;
  }
  if (type === 'border' && isRecord(value))
    return `${px(value.width)} ${String(value.style)} ${show('color', value.color)}`;
  if (type === 'shadow')
    return (Array.isArray(value) ? value : [value])
      .map((s: unknown) =>
        isRecord(s)
          ? [
              ...(s.inset === true ? ['inset'] : []),
              ...[s.offsetX, s.offsetY, s.blur, s.spread].map(px),
              show('color', s.color),
            ].join(' ')
          : String(s),
      )
      .join(', ');
  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : JSON.stringify(value);
}

/**
 * tokens.md: every semantic token in use, grouped, with its custom properties, its value in
 * each mode and what it's for; then each deprecated token and what replaces it.
 */
export function tokenReference({ tokens }: TokensFile, header: string): string {
  // The groups an agent reaches for most come first.
  const groups = new Map<string, [string, TokenMetadata][]>(
    ['color', 'space', 'text'].map((group) => [group, []]),
  );
  for (const entry of inUse(tokens)) {
    const group = entry[0].split('.')[0] ?? entry[0];
    groups.set(group, [...(groups.get(group) ?? []), entry]);
  }
  const deprecated = Object.entries(tokens).filter(
    ([, t]) => t.deprecated !== undefined,
  );
  const lines = [
    `<!-- ${header} -->`,
    '',
    '# Semantic Tokens',
    '',
    'Every semantic token, by group. Use them as `var(--…)` in CSS, or by key in a component prop that takes tokens. Values are at a 16px root. A dark value is listed only where it differs, and a group with none has no Dark column.',
  ];
  for (const [group, entries] of groups) {
    if (entries.length === 0) continue;
    // Only a group with a mode-dependent token needs the Dark column.
    const hasDark = entries.some(([, t]) => t.dark !== undefined);
    lines.push(
      '',
      `## ${group}`,
      '',
      hasDark
        ? '| Token | Custom property | Value | Dark | Use |'
        : '| Token | Custom property | Value | Use |',
      hasDark ? '| --- | --- | --- | --- | --- |' : '| --- | --- | --- | --- |',
      ...entries.map(([path, t]) => {
        const dark = hasDark
          ? ` ${t.dark === undefined ? '' : cell(show(t.type, t.dark.value))} |`
          : '';
        return `| ${code(path)} | ${cssVars(t).map(code).join(', ')} | ${cell(show(t.type, t.value))} |${dark} ${cell(t.description ?? '')} |`;
      }),
    );
  }
  if (deprecated.length > 0)
    lines.push(
      '',
      '## Deprecated',
      '',
      'Still in the stylesheet, so existing code keeps working, but lint flags them. Move to the replacement.',
      '',
      '| Token | Custom property | Use instead | Why |',
      '| --- | --- | --- | --- |',
      ...deprecated.map(([path, t]) => {
        const next =
          t.replacedBy === undefined ? undefined : tokens[t.replacedBy];
        return `| ${code(path)} | ${cssVars(t).map(code).join(', ')} | ${next === undefined ? '' : cssVars(next).map(code).join(', ')} | ${cell(typeof t.deprecated === 'string' ? t.deprecated : '')} |`;
      }),
    );
  return `${lines.join('\n')}\n`;
}

/** Replaces the foundations block in a Markdown document. */
export function replaceBlock(document: string, block: string): string {
  const start = document.indexOf(BLOCK_START);
  const end = document.indexOf(BLOCK_END);
  if (start === -1 || end < start)
    throw new BuildError([
      `AGENTS.md has no foundations block. Add ${BLOCK_START} and ${BLOCK_END} where it belongs.`,
    ]);
  return (
    document.slice(0, start) + block + document.slice(end + BLOCK_END.length)
  );
}

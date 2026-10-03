import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Fossil's key under `$extensions`. Forks keep it: it names Fossil's extension format, not a brand. */
export const VENDOR = 'com.ibrahimmoazzam.fossil';
export const MODES = ['dark'] as const;

export type Tier = 'primitive' | 'semantic';

export interface TokenFile {
  /** Path relative to the token source folder, with forward slashes. */
  path: string;
  content: string;
}

export interface Problem {
  file: string;
  token?: string;
  message: string;
}

export interface Token {
  path: string;
  file: string;
  tier: Tier;
  type: string | undefined;
  value: unknown;
  description: unknown;
  deprecated: unknown;
  extension: Record<string, unknown> | undefined;
}

export interface Result {
  tokens: Token[];
  problems: Problem[];
}

const TOKEN_KEYS = new Set([
  '$value',
  '$type',
  '$description',
  '$deprecated',
  '$extensions',
]);
const GROUP_KEYS = new Set([
  '$type',
  '$description',
  '$deprecated',
  '$extensions',
]);
const EXTENSION_KEYS = new Set(['modes', 'replacedBy', 'since']);
const COLOR_SPACES = new Set([
  'srgb',
  'srgb-linear',
  'hsl',
  'hwb',
  'lab',
  'lch',
  'oklab',
  'oklch',
  'display-p3',
  'a98-rgb',
  'prophoto-rgb',
  'rec2020',
  'xyz-d65',
  'xyz-d50',
]);
/** DTCG's font weight names, and the number each one means. */
export const FONT_WEIGHTS: Readonly<Record<string, number>> = {
  thin: 100,
  hairline: 100,
  'extra-light': 200,
  'ultra-light': 200,
  light: 300,
  normal: 400,
  regular: 400,
  book: 400,
  medium: 500,
  'semi-bold': 600,
  'demi-bold': 600,
  bold: 700,
  'extra-bold': 800,
  'ultra-bold': 800,
  black: 900,
  heavy: 900,
  'extra-black': 950,
  'ultra-black': 950,
};
const STROKE_STYLES = new Set([
  'solid',
  'dashed',
  'dotted',
  'double',
  'groove',
  'ridge',
  'outset',
  'inset',
]);
/** The parts of each composite type, and the type each part must have. */
const COMPOSITES: Record<string, Record<string, string>> = {
  typography: {
    fontFamily: 'fontFamily',
    fontSize: 'dimension',
    fontWeight: 'fontWeight',
    letterSpacing: 'dimension',
    lineHeight: 'number',
  },
  shadow: {
    color: 'color',
    offsetX: 'dimension',
    offsetY: 'dimension',
    blur: 'dimension',
    spread: 'dimension',
  },
  border: { color: 'color', width: 'dimension', style: 'strokeStyle' },
};

const REFERENCE = /^\{([^{}]+)\}$/;

export const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** The path a value references, such as `color.gray.600` for `"{color.gray.600}"`. */
export const referenceOf = (v: unknown): string | undefined =>
  typeof v === 'string' ? REFERENCE.exec(v)?.[1] : undefined;

const isNumber = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v);

const inUnit = (v: unknown): boolean => isNumber(v) && v >= 0 && v <= 1;

/** Returns a problem message when a literal isn't a valid value of its DTCG type. */
function checkLiteral(type: string, v: unknown): string | undefined {
  switch (type) {
    case 'color': {
      if (!isRecord(v))
        return 'A color value is an object: { colorSpace, components, alpha?, hex? }';
      if (typeof v.colorSpace !== 'string' || !COLOR_SPACES.has(v.colorSpace))
        return `Unknown colorSpace ${JSON.stringify(v.colorSpace)}`;
      if (
        !Array.isArray(v.components) ||
        v.components.length !== 3 ||
        !v.components.every((c) => isNumber(c) || c === 'none')
      )
        return 'components must be three numbers (or "none")';
      if (
        v.colorSpace === 'srgb' &&
        !v.components.every(
          (c) => c === 'none' || (isNumber(c) && c >= 0 && c <= 1),
        )
      )
        return 'sRGB components run from 0 to 1';
      if (
        v.alpha !== undefined &&
        !(isNumber(v.alpha) && v.alpha >= 0 && v.alpha <= 1)
      )
        return 'alpha runs from 0 to 1';
      if (
        v.hex !== undefined &&
        !(typeof v.hex === 'string' && /^#[0-9a-f]{6}$/i.test(v.hex))
      )
        return 'hex is a 6-digit fallback, such as #0f0f10; transparency goes in alpha';
      return undefined;
    }
    case 'dimension':
      return isRecord(v) &&
        isNumber(v.value) &&
        (v.unit === 'px' || v.unit === 'rem')
        ? undefined
        : 'A dimension is { value, unit }, with unit "px" or "rem"';
    case 'duration':
      return isRecord(v) &&
        isNumber(v.value) &&
        v.value >= 0 &&
        (v.unit === 'ms' || v.unit === 's')
        ? undefined
        : 'A duration is { value, unit }, with unit "ms" or "s"';
    case 'fontFamily':
      return (typeof v === 'string' && v !== '') ||
        (Array.isArray(v) &&
          v.length > 0 &&
          v.every((f) => typeof f === 'string' && f !== ''))
        ? undefined
        : 'A font family is a name or an array of names';
    case 'fontWeight':
      return (isNumber(v) && v >= 1 && v <= 1000) ||
        (typeof v === 'string' && Object.hasOwn(FONT_WEIGHTS, v))
        ? undefined
        : 'A font weight is a number from 1 to 1000 or a DTCG weight name';
    case 'number':
      return isNumber(v) ? undefined : 'A number value is a JSON number';
    case 'cubicBezier':
      return Array.isArray(v) &&
        v.length === 4 &&
        v.every(isNumber) &&
        inUnit(v[0]) &&
        inUnit(v[2])
        ? undefined
        : 'A cubic Bézier is [x1, y1, x2, y2], with both x values from 0 to 1';
    case 'strokeStyle':
      return (typeof v === 'string' && STROKE_STYLES.has(v)) ||
        (isRecord(v) &&
          Array.isArray(v.dashArray) &&
          ['round', 'butt', 'square'].includes(String(v.lineCap)))
        ? undefined
        : 'A stroke style is a CSS line style, such as "solid", or { dashArray, lineCap }';
    default:
      return `Unknown $type "${type}"`;
  }
}

/** Every reference inside a value, at any depth. */
export function referencesIn(v: unknown): string[] {
  const own = referenceOf(v);
  if (own !== undefined) return [own];
  if (Array.isArray(v)) return v.flatMap(referencesIn);
  if (isRecord(v)) return Object.values(v).flatMap(referencesIn);
  return [];
}

/** True when a value is a reference, or a composite whose every part is one. */
function isAlias(type: string | undefined, v: unknown): boolean {
  if (referenceOf(v) !== undefined) return true;
  const parts = type === undefined ? undefined : COMPOSITES[type];
  if (parts === undefined) return false;
  const shadows = type === 'shadow' && Array.isArray(v) ? v : [v];
  return shadows.every(
    (s) =>
      isRecord(s) &&
      Object.entries(s).every(
        ([k, part]) => k === 'inset' || referenceOf(part) !== undefined,
      ),
  );
}

/** A token as read from its file, before its type is resolved through references. */
type RawToken = Omit<Token, 'type'> & { declaredType: string | undefined };

function collect(file: TokenFile, problems: Problem[]): RawToken[] {
  const segments = file.path.split('/');
  const tier = segments[0];
  if (segments.length < 2 || (tier !== 'primitive' && tier !== 'semantic')) {
    problems.push({
      file: file.path,
      message: 'Token files live in primitive/ or semantic/',
    });
    return [];
  }
  if (!file.path.endsWith('.tokens.json')) {
    problems.push({
      file: file.path,
      message: 'Token files use the .tokens.json extension',
    });
    return [];
  }
  let root: unknown;
  try {
    root = JSON.parse(file.content);
  } catch (error) {
    problems.push({
      file: file.path,
      message: `Invalid JSON: ${(error as Error).message}`,
    });
    return [];
  }
  const found: RawToken[] = [];
  const walk = (
    node: unknown,
    path: string[],
    inherited: string | undefined,
  ): void => {
    if (!isRecord(node)) {
      problems.push({
        file: file.path,
        token: path.join('.'),
        message: 'Expected a group or a token object',
      });
      return;
    }
    const isToken = '$value' in node;
    const allowed = isToken ? TOKEN_KEYS : GROUP_KEYS;
    for (const key of Object.keys(node).filter(
      (k) => k.startsWith('$') && !allowed.has(k),
    ))
      problems.push({
        file: file.path,
        token: path.join('.'),
        message: `Unknown property ${key}`,
      });
    const type = typeof node.$type === 'string' ? node.$type : inherited;
    if (isToken) {
      const ext = isRecord(node.$extensions)
        ? node.$extensions[VENDOR]
        : undefined;
      found.push({
        path: path.join('.'),
        file: file.path,
        tier,
        declaredType: type,
        value: node.$value,
        description: node.$description,
        deprecated: node.$deprecated,
        extension: isRecord(ext) ? ext : undefined,
      });
      return;
    }
    for (const [name, child] of Object.entries(node)) {
      if (name.startsWith('$')) continue;
      if (/[{}.]/.test(name)) {
        problems.push({
          file: file.path,
          token: [...path, name].join('.'),
          message: 'Names may not contain {, } or .',
        });
        continue;
      }
      walk(child, [...path, name], type);
    }
  };
  walk(root, [], undefined);
  return found;
}

/** Validates a set of token files. Problems come back in file order; an empty list means the source is valid. */
export function validate(files: TokenFile[]): Result {
  const problems: Problem[] = [];
  const raw = files.flatMap((f) => collect(f, problems));

  const byPath = new Map<string, RawToken>();
  for (const t of raw) {
    const other = byPath.get(t.path);
    if (other) {
      problems.push({
        file: t.file,
        token: t.path,
        message: `Also defined in ${other.file}; a path exists once, in one tier`,
      });
      continue;
    }
    byPath.set(t.path, t);
  }
  for (const path of byPath.keys()) {
    const parts = path.split('.');
    for (let i = 1; i < parts.length; i++) {
      const prefix = parts.slice(0, i).join('.');
      const clash = byPath.get(prefix);
      if (clash)
        problems.push({
          file: clash.file,
          token: prefix,
          message: `Is both a token and the group of ${path}`,
        });
    }
  }

  // A token without $type takes the type of the token it references.
  const typeCache = new Map<string, string | undefined>();
  const typeOf = (
    path: string,
    seen = new Set<string>(),
  ): string | undefined => {
    if (typeCache.has(path)) return typeCache.get(path);
    const t = byPath.get(path);
    if (!t || seen.has(path)) return undefined;
    seen.add(path);
    const target = referenceOf(t.value);
    const type =
      t.declaredType ??
      (target === undefined ? undefined : typeOf(target, seen));
    typeCache.set(path, type);
    return type;
  };

  const tokens: Token[] = [];
  for (const t of byPath.values()) {
    const report = (message: string) =>
      problems.push({ file: t.file, token: t.path, message });
    const type = typeOf(t.path);
    tokens.push({
      path: t.path,
      file: t.file,
      tier: t.tier,
      type,
      value: t.value,
      description: t.description,
      deprecated: t.deprecated,
      extension: t.extension,
    });
    if (type === undefined) {
      report('No $type: set one on the token or a parent group');
      continue;
    }

    // References must resolve, without cycles, to tokens of the right type.
    const target = referenceOf(t.value);
    if (target !== undefined) {
      const seen = new Set([t.path]);
      let next: string | undefined = target;
      while (next !== undefined) {
        if (seen.has(next)) {
          report(`Circular reference through {${next}}`);
          break;
        }
        seen.add(next);
        next = referenceOf(byPath.get(next)?.value);
      }
    }
    const checkPart = (ref: string, expected: string, where: string) => {
      if (!byPath.has(ref))
        report(`${where} references {${ref}}, which doesn't exist`);
      else if (typeOf(ref) !== expected)
        report(
          `${where} references {${ref}}, a ${String(typeOf(ref))}, where a ${expected} belongs`,
        );
    };
    const checkValue = (v: unknown, where: string) => {
      const ref = referenceOf(v);
      if (ref !== undefined) {
        checkPart(ref, type, where);
        return;
      }
      const parts = COMPOSITES[type];
      if (parts === undefined) {
        const message = checkLiteral(type, v);
        if (message) report(`${where}: ${message}`);
        return;
      }
      const shadows = type === 'shadow' && Array.isArray(v) ? v : [v];
      for (const s of shadows) {
        if (!isRecord(s)) {
          report(`${where}: a ${type} value is an object of its parts`);
          continue;
        }
        for (const [part, partType] of Object.entries(parts)) {
          if (!(part in s)) {
            report(`${where}: ${type} needs ${part}`);
            continue;
          }
          const partRef = referenceOf(s[part]);
          if (partRef !== undefined)
            checkPart(partRef, partType, `${where}.${part}`);
          else {
            const message = checkLiteral(partType, s[part]);
            if (message) report(`${where}.${part}: ${message}`);
          }
        }
        for (const extra of Object.keys(s).filter(
          (k) => !(k in parts) && !(type === 'shadow' && k === 'inset'),
        ))
          report(`${where}: ${type} has no part called ${extra}`);
        if (type === 'shadow' && 'inset' in s && typeof s.inset !== 'boolean')
          report(`${where}.inset is true or false`);
      }
    };
    checkValue(t.value, '$value');

    // The tier rules.
    const modes = t.extension?.modes;
    if (t.tier === 'primitive') {
      if (referencesIn(t.value).length > 0)
        report('A primitive holds a raw value, not a reference');
      if (modes !== undefined) report('Only semantic tokens vary by mode');
    } else {
      if (!isAlias(type, t.value))
        report(
          COMPOSITES[type]
            ? `A semantic ${type} token's parts are all references to other tokens`
            : 'A semantic token is a reference to another token, not a literal value',
        );
      if (typeof t.description !== 'string' || t.description.trim() === '')
        report('A semantic token needs a $description');
    }
    if (modes !== undefined && t.tier === 'semantic') {
      if (!isRecord(modes))
        report('modes is an object, such as { "dark": "{color.gray.950}" }');
      else
        for (const [mode, v] of Object.entries(modes)) {
          if (!(MODES as readonly string[]).includes(mode))
            report(
              `Unknown mode "${mode}"; Fossil's modes are ${MODES.join(', ')}`,
            );
          else if (!isAlias(type, v))
            report(
              `The ${mode} value is a reference to another token, not a literal value`,
            );
          else checkValue(v, `modes.${mode}`);
        }
    }

    // Lifecycle metadata.
    const ext = t.extension;
    for (const key of Object.keys(ext ?? {}).filter(
      (k) => !EXTENSION_KEYS.has(k),
    ))
      report(`Unknown ${VENDOR} property ${key}`);
    if (
      t.deprecated !== undefined &&
      typeof t.deprecated !== 'boolean' &&
      !(typeof t.deprecated === 'string' && t.deprecated.trim() !== '')
    )
      report('$deprecated is true, false or an explanation');
    const isDeprecated =
      t.deprecated === true || typeof t.deprecated === 'string';
    if (ext?.replacedBy !== undefined) {
      const replacement = referenceOf(ext.replacedBy);
      if (!isDeprecated)
        report('replacedBy only belongs on a deprecated token');
      if (replacement === undefined)
        report('replacedBy is a reference, such as "{color.text.muted}"');
      else if (!byPath.has(replacement))
        report(`replacedBy points to {${replacement}}, which doesn't exist`);
      else if (typeOf(replacement) !== type)
        report(
          `replacedBy points to a ${String(typeOf(replacement))}, not a ${type}`,
        );
      else {
        const d = byPath.get(replacement)?.deprecated;
        if (d === true || typeof d === 'string')
          report(
            `replacedBy points to {${replacement}}, which is deprecated too`,
          );
      }
    }
    if (ext?.since !== undefined) {
      if (!isDeprecated) report('since only belongs on a deprecated token');
      if (typeof ext.since !== 'string' || !/^\d+\.\d+\.\d+$/.test(ext.since))
        report(
          'since is the version that deprecated the token, such as "0.3.0"',
        );
    }
  }

  const order = new Map(files.map((f, i) => [f.path, i]));
  problems.sort((a, b) => (order.get(a.file) ?? 0) - (order.get(b.file) ?? 0));
  return { tokens, problems };
}

/** Reads every .json file under a folder, as token files. */
export function readTokenFiles(dir: string): TokenFile[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => join(entry.parentPath, entry.name))
    .sort()
    .map((file) => ({
      path: relative(dir, file).split(sep).join('/'),
      content: readFileSync(file, 'utf8'),
    }));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir =
    process.argv[2] ?? fileURLToPath(new URL('../src', import.meta.url));
  const { tokens, problems } = validate(readTokenFiles(dir));
  if (problems.length > 0) {
    for (const p of problems)
      console.error(
        `✗ ${p.file}${p.token ? ` › ${p.token}` : ''}: ${p.message}`,
      );
    console.error(
      `\n${String(problems.length)} problem${problems.length === 1 ? '' : 's'} in the token source. Nothing was built.`,
    );
    process.exit(1);
  }
  const count = (tier: Tier) => tokens.filter((t) => t.tier === tier).length;
  console.log(
    `Validated ${String(tokens.length)} tokens: ${String(count('primitive'))} primitive, ${String(count('semantic'))} semantic.`,
  );
}

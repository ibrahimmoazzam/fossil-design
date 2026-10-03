import { format, resolveConfig } from 'prettier';
import {
  isRecord,
  referenceOf,
  validate,
  VENDOR,
  type Token,
  type TokenFile,
} from '../../tokens/scripts/validate.ts';
import type { Edit } from './diff.ts';
import { REM, round, toFigma } from './model.ts';
import type { SyncValue } from './runtime.ts';

/** Figma's value as DTCG, in the shape the token already has: its unit, its fallback fonts. */
export function toDtcg(
  type: string,
  value: SyncValue,
  existing: unknown,
): unknown {
  if (typeof value === 'object' && 'hex' in value) {
    const same =
      isRecord(existing) &&
      (toFigma(type, existing) as { hex: string }).hex === value.hex;
    const components =
      same && Array.isArray(existing.components)
        ? existing.components
        : [1, 3, 5].map((i) =>
            round(parseInt(value.hex.slice(i, i + 2), 16) / 255),
          );
    return {
      colorSpace: 'srgb',
      components,
      ...(value.alpha < 1 && { alpha: value.alpha }),
      hex: value.hex,
    };
  }
  if (type === 'dimension' && typeof value === 'number')
    return isRecord(existing) && existing.unit === 'rem'
      ? { value: round(value / REM), unit: 'rem' }
      : { value, unit: 'px' };
  if (type === 'fontFamily' && Array.isArray(existing))
    return [value, ...(existing.slice(1) as unknown[])];
  if (type === 'duration' && typeof value === 'number')
    return isRecord(existing) && existing.unit === 's'
      ? { value, unit: 's' }
      : { value: round(value * 1000), unit: 'ms' };
  if (typeof value === 'object' && 'bezier' in value) return [...value.bezier];
  return value;
}

/** The group or token at a path inside a token file. */
const nodeAt = (root: unknown, path: string): Record<string, unknown> => {
  let node = root;
  for (const segment of path.split('.'))
    node = isRecord(node) ? node[segment] : undefined;
  if (!isRecord(node)) throw new Error(`${path} isn't in its token file`);
  return node;
};

/**
 * Writes Figma's values into the token files, formatted as the repository formats them. Returns
 * the files that changed, and writes nothing if the result wouldn't pass the token build.
 */
export async function applyEdits(
  files: readonly TokenFile[],
  tokens: readonly Token[],
  edits: readonly Edit[],
  formatFrom: string,
): Promise<TokenFile[]> {
  const byPath = new Map(tokens.map((t) => [t.path, t]));
  const documents = new Map<string, unknown>();
  const documentOf = (file: string): unknown => {
    if (!documents.has(file))
      documents.set(
        file,
        JSON.parse(files.find((f) => f.path === file)?.content ?? 'null'),
      );
    return documents.get(file);
  };

  const byToken = new Map<string, Edit[]>();
  for (const edit of edits)
    byToken.set(edit.path, [...(byToken.get(edit.path) ?? []), edit]);
  for (const [path, changes] of byToken) {
    const token = byPath.get(path);
    if (token === undefined)
      throw new Error(`${path} isn't in the token source`);
    const node = nodeAt(documentOf(token.file), path);
    if (token.tier === 'primitive') {
      for (const { value } of changes)
        node.$value = toDtcg(token.type ?? '', value, node.$value);
      continue;
    }
    const extensions = isRecord(node.$extensions) ? node.$extensions : {};
    const vendor = isRecord(extensions[VENDOR]) ? extensions[VENDOR] : {};
    const modes = isRecord(vendor.modes) ? vendor.modes : {};
    let light = referenceOf(node.$value) ?? '';
    let dark = referenceOf(modes.dark) ?? light;
    for (const { mode, value } of changes) {
      const alias =
        typeof value === 'object' && 'alias' in value ? value.alias : '';
      if (mode === 'Light') light = alias;
      if (mode === 'Dark') dark = alias;
    }
    node.$value = `{${light}}`;
    if (dark === light) delete modes.dark;
    else modes.dark = `{${dark}}`;
    if (Object.keys(modes).length > 0) vendor.modes = modes;
    else delete vendor.modes;
    if (Object.keys(vendor).length > 0) extensions[VENDOR] = vendor;
    else Reflect.deleteProperty(extensions, VENDOR);
    if (Object.keys(extensions).length > 0) node.$extensions = extensions;
    else delete node.$extensions;
  }

  // Prettier keeps an object expanded only if its input was, and the token files expand every one.
  const options = { ...(await resolveConfig(formatFrom)), parser: 'json' };
  const changed: TokenFile[] = [];
  for (const [path, document] of documents)
    changed.push({
      path,
      content: await format(JSON.stringify(document, null, 2), options),
    });
  const next = files.map((f) => changed.find((c) => c.path === f.path) ?? f);
  const { problems } = validate(next);
  if (problems.length > 0)
    throw new Error(
      `Figma's changes would break the token source, so nothing was written:\n${problems
        .map((p) => `  ${p.token ?? p.file}: ${p.message}`)
        .join('\n')}`,
    );
  return changed.filter(
    (c) => c.content !== files.find((f) => f.path === c.path)?.content,
  );
}

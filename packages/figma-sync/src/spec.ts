import type { TokensFile } from '../../tokens/src/metadata.ts';
import { COLLECTIONS, nameOf, type FigmaToken } from './model.ts';
import type { Spec, VariableSpec } from './runtime.ts';

/**
 * Where each semantic variable appears in Figma's pickers, by token path prefix. The first match
 * wins. Primitives get none, so designers pick semantic variables, and aliases still resolve.
 */
const SCOPES: readonly (readonly [string, readonly string[]])[] = [
  ['color.text', ['TEXT_FILL']],
  ['color.background', ['FRAME_FILL', 'SHAPE_FILL']],
  ['color.selection', ['FRAME_FILL', 'SHAPE_FILL']],
  ['color.border', ['STROKE_COLOR']],
  ['color.focus', ['STROKE_COLOR', 'EFFECT_COLOR']],
  ['color.shadow', ['EFFECT_COLOR']],
  ['color', ['ALL_FILLS', 'STROKE_COLOR']],
  ['space', ['GAP']],
  ['radius', ['CORNER_RADIUS']],
  ['border.width', ['STROKE_FLOAT']],
  ['focus.ring.offset', ['EFFECT_FLOAT']],
  ['focus.ring', ['STROKE_FLOAT', 'EFFECT_FLOAT']],
  ['layout', ['WIDTH_HEIGHT']],
  ['icon.size', ['WIDTH_HEIGHT']],
  ['font.family', ['FONT_FAMILY']],
  ['font.weight', ['FONT_WEIGHT']],
];

export const scopesOf = (token: FigmaToken): string[] | undefined => {
  // Figma refuses scopes on timing and easing variables.
  if (token.type === 'TIMING' || token.type === 'EASING') return undefined;
  if (token.collection === 'primitive') return [];
  const match = SCOPES.find(
    ([prefix]) => token.path === prefix || token.path.startsWith(`${prefix}.`),
  );
  return match ? [...match[1]] : [];
};

/** Every variable Figma should hold, primitives first and each alias after its target. */
export function variableSpecs(
  tokens: readonly FigmaToken[],
  file: TokensFile,
): VariableSpec[] {
  const renamedFrom = new Map<string, string[]>();
  for (const t of tokens)
    if (t.deprecated && t.replacedBy !== undefined)
      renamedFrom.set(t.replacedBy, [
        ...(renamedFrom.get(t.replacedBy) ?? []),
        t.path,
      ]);

  const specs = tokens
    .filter((t) => !t.deprecated)
    .map((t): VariableSpec => {
      const cssVar = file.tokens[t.path]?.cssVar;
      if (typeof cssVar !== 'string')
        throw new Error(
          `tokens.json has no custom property for ${t.path}. Run pnpm build, then try again.`,
        );
      return {
        path: t.path,
        name: nameOf(t.path),
        collection: t.collection,
        type: t.type,
        values: t.values,
        scopes: scopesOf(t),
        code: `var(${cssVar})`,
        description: t.description,
        renamedFrom: renamedFrom.get(t.path) ?? [],
      };
    });

  const byPath = new Map(specs.map((s) => [s.path, s]));
  const ordered: VariableSpec[] = [];
  const placed = new Set<string>();
  const place = (spec: VariableSpec) => {
    if (placed.has(spec.path)) return;
    placed.add(spec.path);
    for (const value of Object.values(spec.values))
      if (typeof value === 'object' && 'alias' in value) {
        const target = byPath.get(value.alias);
        if (target) place(target);
      }
    ordered.push(spec);
  };
  for (const s of specs) if (s.collection === 'primitive') place(s);
  for (const s of specs) place(s);
  return ordered;
}

/** The apply scripts' specs: the variables in parts of `size`, then a finish step that stamps the commit. */
export function applySpecs(
  variables: readonly VariableSpec[],
  commit: string,
  size: number,
): Spec[] {
  const collections = Object.values(COLLECTIONS);
  const parts = Math.max(1, Math.ceil(variables.length / size));
  const specs: Spec[] = [];
  for (let part = 1; part <= parts; part++)
    specs.push({
      kind: 'apply',
      part,
      parts,
      collections,
      variables: variables.slice((part - 1) * size, part * size),
    });
  specs.push({
    kind: 'finish',
    commit,
    collections,
    paths: variables.map((v) => v.path),
  });
  return specs;
}

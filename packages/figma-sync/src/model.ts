import {
  FONT_WEIGHTS,
  isRecord,
  referenceOf,
  type Token,
} from '../../tokens/scripts/validate.ts';
import type {
  CollectionKey,
  CollectionSpec,
  SyncValue,
  VariableSpec,
} from './runtime.ts';

/** Figma works in px, so rem dimensions convert at this root size. */
export const REM = 16;

export const COLLECTIONS: Readonly<Record<CollectionKey, CollectionSpec>> = {
  primitive: { key: 'primitive', name: 'Primitives', modes: ['Value'] },
  semantic: { key: 'semantic', name: 'Semantic', modes: ['Light', 'Dark'] },
};

/** The DTCG types Figma variables hold. Composites and stroke styles stay in code. */
const TYPES: Readonly<Partial<Record<string, VariableSpec['type']>>> = {
  color: 'COLOR',
  dimension: 'FLOAT',
  number: 'FLOAT',
  fontWeight: 'FLOAT',
  fontFamily: 'STRING',
  duration: 'TIMING',
  cubicBezier: 'EASING',
};

/** A token as Figma holds it. */
export interface FigmaToken {
  path: string;
  collection: CollectionKey;
  type: VariableSpec['type'];
  /** Values by Figma mode name. */
  values: Record<string, SyncValue>;
  description: string;
  deprecated: boolean;
  /** The path of the token that replaces a deprecated one. */
  replacedBy: string | undefined;
}

export const round = (n: number): number => Math.round(n * 10000) / 10000;

const hexOf = (components: readonly unknown[]): string =>
  `#${components
    .map((c) =>
      Math.round((typeof c === 'number' ? c : 0) * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;

/** A primitive's DTCG value as Figma holds it. */
export function toFigma(type: string, value: unknown): SyncValue {
  if (type === 'color') {
    if (!isRecord(value) || value.colorSpace !== 'srgb')
      throw new Error(
        'is not an sRGB colour. Figma variables hold sRGB, so the sync handles sRGB colours only',
      );
    return {
      hex: hexOf(Array.isArray(value.components) ? value.components : []),
      alpha: round(typeof value.alpha === 'number' ? value.alpha : 1),
    };
  }
  if (
    type === 'dimension' &&
    isRecord(value) &&
    typeof value.value === 'number'
  )
    return round(value.unit === 'rem' ? value.value * REM : value.value);
  if (type === 'fontWeight' && typeof value === 'string') {
    const weight = FONT_WEIGHTS[value];
    if (weight !== undefined) return weight;
  }
  if (type === 'fontFamily' && Array.isArray(value)) return String(value[0]);
  if (type === 'duration' && isRecord(value) && typeof value.value === 'number')
    return round(value.unit === 'ms' ? value.value / 1000 : value.value);
  if (type === 'cubicBezier' && Array.isArray(value) && value.length === 4) {
    const [x1, y1, x2, y2] = value.map((n) => round(Number(n)));
    return { bezier: [x1 ?? 0, y1 ?? 0, x2 ?? 1, y2 ?? 1] };
  }
  if (typeof value === 'number' || typeof value === 'string') return value;
  throw new Error(`has a ${type} value the sync can't convert`);
}

/**
 * The tokens Figma holds, in source order. Primitives hold values; semantic tokens hold aliases,
 * in light and dark. Problems name tokens that can't reach Figma as they are.
 */
export function figmaTokens(tokens: readonly Token[]): {
  tokens: FigmaToken[];
  problems: string[];
} {
  const problems: string[] = [];
  const result: FigmaToken[] = [];
  for (const token of tokens) {
    const type = TYPES[token.type ?? ''];
    if (type === undefined) continue;
    const deprecated =
      token.deprecated === true || typeof token.deprecated === 'string';
    const replacedBy = referenceOf(token.extension?.replacedBy);
    let values: Record<string, SyncValue>;
    if (token.tier === 'primitive') {
      try {
        values = { Value: toFigma(token.type ?? '', token.value) };
      } catch (error) {
        problems.push(`${token.path} ${(error as Error).message}.`);
        continue;
      }
    } else {
      const modes = token.extension?.modes;
      const light = referenceOf(token.value) ?? '';
      const dark =
        (isRecord(modes) ? referenceOf(modes.dark) : undefined) ?? light;
      values = { Light: { alias: light }, Dark: { alias: dark } };
    }
    result.push({
      path: token.path,
      collection: token.tier,
      type,
      values,
      description:
        typeof token.description === 'string' ? token.description : '',
      deprecated,
      replacedBy,
    });
  }

  const inFigma = new Set(
    result.filter((t) => !t.deprecated).map((t) => t.path),
  );
  for (const token of result) {
    if (token.deprecated) continue;
    for (const value of Object.values(token.values))
      if (
        typeof value === 'object' &&
        'alias' in value &&
        !inFigma.has(value.alias)
      )
        problems.push(
          `${token.path} aliases ${value.alias}, which Figma doesn't get because it's deprecated. Point it at the replacement.`,
        );
  }
  return { tokens: result, problems: [...new Set(problems)] };
}

/** The Figma variable name for a token path. */
export const nameOf = (path: string): string => path.replaceAll('.', '/');

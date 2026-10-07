import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import type { TokensFile } from '../../../tokens/src/metadata.ts';
import { nameOf, REM } from '../model.ts';
import type {
  EffectStyleSpec,
  IconSpec,
  StylesSpec,
  TextStyleSpec,
} from './runtime.ts';

/** The foundations file's page for the icon glyphs. */
export const ICONS_PAGE = 'Icons';
/** The components file's page, with a section per component. */
export const COMPONENTS_PAGE = 'Components';
/** An icon's colour in its main component. Instances take their parent's text colour. */
export const ICON_COLOR = 'color.text.default';

const px = (value: unknown): number | undefined => {
  if (typeof value !== 'object' || value === null) return undefined;
  const { value: n, unit } = value as { value?: unknown; unit?: unknown };
  if (typeof n !== 'number') return undefined;
  return Math.round((unit === 'rem' ? n * REM : n) * 10000) / 10000;
};

const parts = (alias: unknown): Record<string, string> => {
  if (typeof alias !== 'object' || alias === null || Array.isArray(alias))
    return {};
  return Object.fromEntries(
    Object.entries(alias as Record<string, unknown>).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  );
};

/** The text styles, effect styles and icon glyphs the library builds on, from the token build and the icons. */
export function stylesSpec(
  tokens: TokensFile,
  icons: readonly IconSpec[],
): { spec: StylesSpec; problems: string[] } {
  const problems: string[] = [];
  const textStyles: TextStyleSpec[] = [];
  const effectStyles: EffectStyleSpec[] = [];
  for (const [path, token] of Object.entries(tokens.tokens)) {
    if (token.deprecated !== undefined) continue;
    const alias = parts(token.aliasOf);
    const value = (token.value ?? {}) as Record<string, unknown>;
    const description = token.description ?? '';
    if (token.type === 'typography') {
      const family = Array.isArray(value.fontFamily)
        ? String(value.fontFamily[0])
        : undefined;
      const size = px(value.fontSize);
      const tracking = px(value.letterSpacing);
      const { fontFamily, fontSize, fontWeight, letterSpacing } = alias;
      if (
        family === undefined ||
        size === undefined ||
        tracking === undefined ||
        typeof value.fontWeight !== 'number' ||
        typeof value.lineHeight !== 'number' ||
        !fontFamily ||
        !fontSize ||
        !fontWeight ||
        !letterSpacing
      ) {
        problems.push(
          `${path}: every part of a text style must reference a token, so Figma can bind it.`,
        );
        continue;
      }
      textStyles.push({
        path,
        name: nameOf(path),
        description,
        fontFamily,
        family,
        fontSize,
        size,
        fontWeight,
        weight: value.fontWeight,
        letterSpacing,
        tracking,
        lineHeight: Math.round(value.lineHeight * 10000) / 100,
      });
    } else if (token.type === 'shadow') {
      const color = value.color as
        { components?: unknown[]; alpha?: unknown } | undefined;
      const [r, g, b] = (color?.components ?? []).map(Number);
      const offsetX = px(value.offsetX);
      const offsetY = px(value.offsetY);
      const radius = px(value.blur);
      const spread = px(value.spread);
      if (
        r === undefined ||
        g === undefined ||
        b === undefined ||
        offsetX === undefined ||
        offsetY === undefined ||
        radius === undefined ||
        spread === undefined ||
        !alias.color ||
        !alias.offsetX ||
        !alias.offsetY ||
        !alias.blur ||
        !alias.spread
      ) {
        problems.push(
          `${path}: an effect style needs one shadow whose every part references a token.`,
        );
        continue;
      }
      effectStyles.push({
        path,
        name: nameOf(path),
        description,
        color: alias.color,
        rgba: {
          r,
          g,
          b,
          a: typeof color?.alpha === 'number' ? color.alpha : 1,
        },
        offsetX: alias.offsetX,
        offsetY: alias.offsetY,
        radius: alias.blur,
        spread: alias.spread,
        px: { offsetX, offsetY, radius, spread },
      });
    }
  }
  return {
    spec: {
      kind: 'styles',
      page: ICONS_PAGE,
      iconColor: ICON_COLOR,
      textStyles,
      effectStyles,
      icons: [...icons],
    },
    problems,
  };
}

const pascal = (name: string) =>
  name.replace(/(?:^|[_-])([a-z0-9])/g, (_, c: string) => c.toUpperCase());

/** The Material Symbols the react package ships, read the way its generator reads them. */
export function readIcons(reactPackageJson: string): IconSpec[] {
  const require = createRequire(reactPackageJson);
  const names = JSON.parse(
    readFileSync(new URL('icons.json', `file://${reactPackageJson}`), 'utf8'),
  ) as string[];
  return names.map((key) => {
    const svg = readFileSync(
      require.resolve(`@material-symbols/svg-400/rounded/${key}.svg`),
      'utf8',
    );
    const viewBox = /viewBox="([^"]+)"/.exec(svg)?.[1];
    const paths = [...svg.matchAll(/<path d="([^"]+)"/g)].map(([, d]) =>
      String(d),
    );
    if (viewBox === undefined || paths.length === 0)
      throw new Error(`Can't read the Material Symbol ${key}.`);
    return { name: `${pascal(key)}Icon`, key, viewBox, paths };
  });
}

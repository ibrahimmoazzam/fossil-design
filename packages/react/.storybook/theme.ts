import tokensFile from '@fossil-design/tokens/tokens.json';
import { create, type ThemeVars } from 'storybook/theming';
import { repo } from '../docs-site/repo.ts';

export type Mode = 'light' | 'dark';
interface ColorValue {
  components: number[];
  alpha?: number;
  hex: string;
}
interface DimensionValue {
  value: number;
  unit: 'px' | 'rem';
}

const { tokens } = tokensFile;

function token(name: string) {
  const entry = tokens[name];
  if (entry === undefined)
    throw new Error(`The Storybook theme names ${name}, which isn't a token`);
  return entry;
}

function color(name: string, mode: Mode): string {
  const entry = token(name);
  const { components, alpha, hex } = (
    mode === 'dark' && entry.dark ? entry.dark.value : entry.value
  ) as ColorValue;
  if (alpha === undefined) return hex;
  const rgb = components.map((c) => Math.round(c * 255)).join(', ');
  return `rgba(${rgb}, ${String(alpha)})`;
}

function px(name: string): number {
  const { value, unit } = token(name).value as DimensionValue;
  return unit === 'rem' ? value * 16 : value;
}

function fontStack(name: string): string {
  return (token(name).value as string[])
    .map((f) => (f.includes(' ') ? `'${f}'` : f))
    .join(', ');
}

function fontSize(name: string): string {
  const { fontSize } = token(name).value as { fontSize: DimensionValue };
  const size = fontSize.unit === 'rem' ? fontSize.value * 16 : fontSize.value;
  return `${String(size)}px`;
}

// The GitHub mark, from Primer Octicons (MIT).
const githubMark =
  'M6.766 11.328c-2.063-.25-3.516-1.734-3.516-3.656 0-.781.281-1.625.75-2.188-.203-.515-.172-1.609.063-2.062.625-.078 1.468.25 1.968.703.594-.187 1.219-.281 1.985-.281.765 0 1.39.094 1.953.265.484-.437 1.344-.765 1.969-.687.218.422.25 1.515.046 2.047.5.593.766 1.39.766 2.203 0 1.922-1.453 3.375-3.547 3.64.531.344.89 1.094.89 1.954v1.625c0 .468.391.734.86.547C13.781 14.359 16 11.53 16 8.03 16 3.61 12.406 0 7.984 0 3.563 0 0 3.61 0 8.031a7.88 7.88 0 0 0 5.172 7.422c.422.156.828-.125.828-.547v-1.25c-.219.094-.5.156-.75.156-1.031 0-1.64-.562-2.078-1.609-.172-.422-.36-.672-.719-.719-.187-.015-.25-.093-.25-.187 0-.188.313-.328.625-.328.453 0 .844.281 1.25.86.313.452.64.655 1.031.655s.641-.14 1-.5c.266-.265.47-.5.657-.656';

/**
 * The site name, linking home, with the repository under it. Storybook renders a theme's
 * title as HTML when the theme has neither a logo image nor a URL of its own.
 */
function brand(mode: Mode): string {
  const repoName = repo.slice(repo.lastIndexOf('/') + 1);
  const icon = String(px('icon.size.s'));
  const name = `font-family: ${fontStack('font.family.heading')}; font-size: ${fontSize('text.heading.s')}; font-weight: 700; color: inherit; text-decoration: none`;
  // manager-head.html lays out the chip from these values; inline styles couldn't take a hover.
  const sizes: [string, number][] = [
    ['--chip-gap', px('space.2xs')],
    ['--chip-padding-block', px('space.2xs')],
    ['--chip-padding-start', px('space.xs')],
    ['--chip-padding-end', px('space.s')],
    ['--chip-border-width', px('border.width.default')],
    ['--chip-radius', px('radius.pill')],
    ['--chip-focus-width', px('focus.ring.width')],
    ['--chip-focus-offset', px('focus.ring.offset')],
  ];
  const chip = [
    ...sizes.map(([name, value]) => `${name}: ${String(value)}px`),
    `--chip-border: ${color('color.border.default', mode)}`,
    `--chip-border-hover: ${color('color.border.hover', mode)}`,
    `--chip-background: ${color('color.background.surface', mode)}`,
    `--chip-text: ${color('color.text.muted', mode)}`,
    `--chip-focus: ${color('color.focus.ring', mode)}`,
    `--chip-font-family: ${fontStack('font.family.mono')}`,
    `--chip-font-size: ${fontSize('text.fine')}`,
  ].join('; ');
  return `<span style="display: flex; flex-direction: column; align-items: start; gap: ${String(px('space.xs'))}px"><a href="./" style="${name}">Fossil Design</a><a class="fossil-repo-chip" href="${repo}" aria-label="${repoName} on GitHub" style="${chip}"><svg aria-hidden="true" width="${icon}" height="${icon}" viewBox="0 0 16 16" fill="currentColor"><path d="${githubMark}"/></svg>${repoName}</a></span>`;
}

const systemDark = window.matchMedia('(prefers-color-scheme: dark)');

/** The colour scheme for the toolbar's theme setting: light, dark, or the system's for anything else. */
export function resolveMode(setting: unknown): Mode {
  if (setting === 'light' || setting === 'dark') return setting;
  return systemDark.matches ? 'dark' : 'light';
}

/** Calls `onChange` when the system's colour scheme changes. */
export function onSystemModeChange(onChange: () => void): () => void {
  systemDark.addEventListener('change', onChange);
  return () => {
    systemDark.removeEventListener('change', onChange);
  };
}

const themes = new Map<Mode, ThemeVars>();

/** Storybook's own frame and docs pages, in Fossil's semantic tokens for one colour scheme. */
export function fossilTheme(mode: Mode): ThemeVars {
  const cached = themes.get(mode);
  if (cached) return cached;
  const c = (name: string) => color(name, mode);
  const theme = create({
    base: mode,
    brandTitle: brand(mode),
    brandUrl: '',

    colorPrimary: c('color.highlight.default'),
    colorSecondary: c('color.accent.default'),

    appBg: c('color.background.page'),
    appContentBg: c('color.background.surface'),
    appPreviewBg: c('color.background.page'),
    appHoverBg: c('color.background.hover'),
    appBorderColor: c('color.border.default'),
    appBorderRadius: px('radius.surface'),

    fontBase: fontStack('font.family.body'),
    fontCode: fontStack('font.family.mono'),

    textColor: c('color.text.default'),
    textInverseColor: c('color.text.on-accent'),
    textMutedColor: c('color.text.muted'),

    barTextColor: c('color.text.muted'),
    barHoverColor: c('color.accent.default'),
    barSelectedColor: c('color.accent.default'),
    barBg: c('color.background.surface'),

    buttonBg: c('color.background.surface'),
    buttonBorder: c('color.border.strong'),
    booleanBg: c('color.background.sunken'),
    booleanSelectedBg: c('color.background.raised'),
    inputBg: c('color.background.surface'),
    inputBorder: c('color.border.strong'),
    inputTextColor: c('color.text.default'),
    inputBorderRadius: px('radius.control'),
  });
  themes.set(mode, theme);
  return theme;
}

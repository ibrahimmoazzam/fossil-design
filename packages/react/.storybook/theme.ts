import tokensFile from '@fossil-design/tokens/tokens.json';
import { create, type ThemeVars } from 'storybook/theming';

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

/** Storybook renders a theme's title as HTML when it has no logo image. */
function brandTitle(): string {
  const { fontSize } = token('text.heading.s').value as {
    fontSize: DimensionValue;
  };
  const size = fontSize.unit === 'rem' ? fontSize.value * 16 : fontSize.value;
  return `<span style="font-family: ${fontStack('font.family.heading')}; font-size: ${String(size)}px; font-weight: 700">Fossil Design</span>`;
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
    brandTitle: brandTitle(),
    brandUrl: './',
    brandTarget: '_self',

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

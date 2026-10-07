import tokensFile from '@fossil-design/tokens/tokens.json';
import { create, type ThemeVars } from 'storybook/theming';

type Mode = 'light' | 'dark';
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

export function systemMode(): Mode {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

/** Storybook's own frame and docs pages, in Fossil's semantic tokens for one colour scheme. */
export function fossilTheme(mode: Mode): ThemeVars {
  const c = (name: string) => color(name, mode);
  return create({
    base: mode,
    brandTitle: 'Fossil Design',
    brandUrl: 'https://github.com/ibrahimmoazzam/fossil-design',
    brandTarget: '_blank',

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
}

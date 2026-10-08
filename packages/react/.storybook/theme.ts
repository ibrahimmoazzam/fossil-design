import tokensFile from '@fossil-design/tokens/tokens.json';
import fossilConfig from '../../../fossil.config.json' with { type: 'json' };
import { create, type ThemeVars } from 'storybook/theming';
import { githubMark, repo, version } from '../docs-site/repo.ts';

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

/**
 * The site name, linking home, with the repository under it. Storybook renders a theme's
 * title as HTML when the theme has neither a logo image nor a URL of its own.
 */
function brand(mode: Mode): string {
  // owner/name, as GitHub shows it, so the chip says whose repository it is.
  const repoName = new URL(repo).pathname.slice(1);
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
    // The body face, not mono: owner/name set in mono pushes the settings button out of the sidebar.
    `--chip-font-family: ${fontStack('font.family.body')}`,
    `--chip-font-size: ${fontSize('text.fine')}`,
  ].join('; ');
  const versionStyle = `font-family: ${fontStack('font.family.mono')}; font-size: ${fontSize('text.fine')}; color: ${color('color.text.muted', mode)}`;
  const gap = `${String(px('space.xs'))}px`;
  return `<span style="display: flex; flex-direction: column; align-items: start; gap: ${gap}"><span style="display: flex; align-items: baseline; gap: ${gap}"><a href="./" style="${name}">${fossilConfig.name}</a><span style="${versionStyle}">v${version}</span></span><a class="fossil-repo-chip" href="${repo}" target="_blank" rel="noopener noreferrer" aria-label="${repoName} on GitHub (opens in a new tab)" style="${chip}"><svg aria-hidden="true" width="${icon}" height="${icon}" viewBox="0 0 16 16" fill="currentColor"><path d="${githubMark}"/></svg>${repoName}</a></span>`;
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

/**
 * Token values for manager-head.html's styles, which reach parts of Storybook's frame a theme
 * can't. Set on the frame's root element.
 */
export function frameProperties(mode: Mode): Record<string, string> {
  const label = token('text.label').value as {
    fontFamily: string[];
    fontWeight: number;
    letterSpacing: DimensionValue;
  };
  const tracking =
    label.letterSpacing.unit === 'rem'
      ? label.letterSpacing.value * 16
      : label.letterSpacing.value;
  return {
    '--fossil-color-highlight-default': color('color.highlight.default', mode),
    '--fossil-color-text-on-highlight': color('color.text.on-highlight', mode),
    '--fossil-color-border-strong': color('color.border.strong', mode),
    '--fossil-text-label-font-family': label.fontFamily
      .map((f) => (f.includes(' ') ? `'${f}'` : f))
      .join(', '),
    '--fossil-text-label-font-size': fontSize('text.label'),
    '--fossil-text-label-font-weight': String(label.fontWeight),
    '--fossil-text-label-letter-spacing': `${String(tracking)}px`,
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

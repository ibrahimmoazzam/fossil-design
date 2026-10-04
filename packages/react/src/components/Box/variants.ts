// No imports: scripts/generate.ts reads this file directly to write Box's CSS.

/** The elements `Box` can render. Text, links, buttons and media have their own components. */
export const boxElements = [
  'div',
  'span',
  'section',
  'article',
  'aside',
  'header',
  'footer',
  'main',
  'nav',
  'ul',
  'ol',
  'li',
  'dl',
  'dt',
  'dd',
  'form',
  'fieldset',
  'figure',
] as const;

/** The keyword values of `Box`'s layout props, and its surfaces. Space and radius props take token keys. */
export const boxVariants = {
  display: [
    'block',
    'inline',
    'inline-block',
    'flex',
    'inline-flex',
    'grid',
    'inline-grid',
    'contents',
    'none',
  ],
  flexDirection: ['row', 'column', 'row-reverse', 'column-reverse'],
  alignItems: ['start', 'center', 'end', 'stretch', 'baseline'],
  justifyContent: [
    'start',
    'center',
    'end',
    'space-between',
    'space-around',
    'space-evenly',
  ],
  surface: ['page', 'surface', 'accent', 'highlight'],
} as const;

/**
 * Each surface's fill, and the text colour the token build checks for contrast against it.
 * The generator fails if a pairing isn't one of those checks.
 */
export const surfaceTokens = {
  page: { background: 'color.background.page', text: 'color.text.default' },
  surface: {
    background: 'color.background.surface',
    text: 'color.text.default',
  },
  accent: { background: 'color.accent.default', text: 'color.text.on-accent' },
  highlight: {
    background: 'color.highlight.default',
    text: 'color.text.on-highlight',
  },
} as const satisfies Record<
  (typeof boxVariants.surface)[number],
  { background: string; text: string }
>;

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { TokensFile } from '../../../tokens/src/metadata.ts';
import { COLLECTIONS } from '../model.ts';
import { sha256 } from '../runtime.ts';
import { CHANGED, script } from '../scripts.ts';
import { checkParts, LibraryError, readResults, reportLines } from './cli.ts';
import { readComponent, readStylesheet } from './code.ts';
import {
  COMPONENTS,
  HIDDEN_ELEMENTS,
  LEFT_OUT,
  type LibraryComponent,
} from './components.ts';
import { FakeCanvas, type FakeNode } from './fake-canvas.ts';
import type {
  CheckResult,
  ComponentSpec,
  IconSpec,
  LayerSpec,
  StylesSpec,
} from './runtime.ts';
import { buildSheet } from './sheet.ts';
import { buildLibrary, type Library } from './spec.ts';
import { readIcons, stylesSpec } from './styles.ts';

// A small library, written to a temporary folder, that exercises every rule the spec follows.
const FIXTURE = mkdtempSync(join(tmpdir(), 'fossil-library-'));
const write = (path: string, text: string) => {
  mkdirSync(dirname(join(FIXTURE, path)), { recursive: true });
  writeFileSync(join(FIXTURE, path), text);
};

write(
  'box.module.css',
  `.box { box-sizing: border-box; margin: 0; padding: 0; }
.padding-block-m { padding-block: var(--fx-space-m); }
.padding-inline-m { padding-inline: var(--fx-space-m); }
.gap-s { gap: var(--fx-space-s); }
.display-flex { display: flex; }
`,
);
write(
  'components/shared.module.css',
  `.base {
  border: var(--fx-border-default);
  box-shadow: var(--fx-shadow-raised);
}
`,
);
write(
  'components/Chip/Chip.tsx',
  `import { forwardRef, type ReactNode } from 'react';
import { cx } from '../../cx.js';
import styles from './Chip.module.css';

export const chipVariants = {
  tone: ['neutral', 'accent'],
  size: ['s', 'm'],
} as const;

export interface ChipProps {
  tone?: (typeof chipVariants.tone)[number];
  size?: (typeof chipVariants.size)[number];
  icon?: unknown;
  label?: string;
  children?: ReactNode;
  onSelect?: (event: { className: string }) => void;
}

export const Chip = forwardRef<HTMLButtonElement, ChipProps>(function Chip(
  { tone = 'neutral', size = 'm', icon, label, children },
  ref,
) {
  const classes = cx(
    styles.chip,
    styles[\`tone-\${tone}\`],
    styles[\`size-\${size}\`],
    children === undefined && styles.iconOnly,
  );
  return (
    <button ref={ref} className={classes}>
      {icon && <Glyph icon={icon} size={size} />}
      <Box className={styles.inner} padding="m" gap="s" display="flex">
        <Text variant="body" tone="accent">
          {label}
        </Text>
        {children}
      </Box>
      <VisuallyHidden>Hidden from sight</VisuallyHidden>
    </button>
  );
});
`,
);
write(
  'components/Chip/Chip.module.css',
  `.chip {
  composes: base from '../shared.module.css';
  gap: var(--fx-space-s);
  border-radius: var(--fx-radius-pill);
  font-family: var(--fx-text-body-font-family);
  font-size: var(--fx-text-body-font-size);
  font-weight: var(--fx-text-body-font-weight);
  letter-spacing: var(--fx-text-body-letter-spacing);
  line-height: var(--fx-text-body-line-height);
  transition-duration: var(--fx-motion-duration-fast);
}

.chip:hover {
  color: var(--fx-color-highlight-default);
}

.chip[aria-pressed="true"] {
  color: var(--fx-color-highlight-default);
  font-weight: var(--fx-font-weight-strong);
}

.chip::before {
  background-color: var(--fx-color-accent-default);
  border-radius: var(--fx-radius-pill);
}

.tone-neutral {
  background-color: var(--fx-color-background-surface);
  color: var(--fx-color-text-default);
}

.tone-accent {
  border-color: transparent;
  background-color: var(--fx-color-accent-default);
  color: var(--fx-color-text-on-accent);
}

.size-s {
  min-block-size: 2rem;
  padding-block: var(--fx-space-s);
  padding-inline: var(--chip-inset, var(--fx-space-m));
}

.size-m {
  padding: var(--fx-space-m);
}

.iconOnly {
  padding: 0;
}

.inner {
  background-color: transparent;
}

@media (prefers-reduced-motion: reduce) {
  .chip {
    transition: none;
  }
}
`,
);
write(
  'components/Glyph/Glyph.tsx',
  `import { cx } from '../../cx.js';
import styles from './Glyph.module.css';

export const glyphVariants = { size: ['s', 'm'] } as const;

export interface GlyphProps {
  icon: unknown;
  size?: (typeof glyphVariants.size)[number];
}

export function Glyph({ icon: Svg, size }: GlyphProps) {
  return <Svg className={cx(styles.glyph, size && styles[\`size-\${size}\`])} />;
}
`,
);
write(
  'components/Glyph/Glyph.module.css',
  `.glyph { inline-size: 1em; block-size: 1em; }
.size-s { inline-size: var(--fx-icon-size-s); block-size: var(--fx-icon-size-s); }
.size-m { inline-size: var(--fx-icon-size-m); block-size: var(--fx-icon-size-m); }
`,
);
write(
  'components/Text/Text.tsx',
  `import { createElement, forwardRef } from 'react';
import { cx } from '../../cx.js';
import styles from './Text.module.css';

export const textVariants = { variant: ['body'], tone: ['default', 'accent'] } as const;

interface TextOwnProps {
  tone?: (typeof textVariants.tone)[number];
  className?: string;
}

function TextRender({ as = 'p', variant = 'body', tone, className, ...rest }, ref) {
  return createElement(as, {
    ...rest,
    ref,
    className: cx(styles.text, styles[variant], tone && styles[\`tone-\${tone}\`], className),
  });
}

export const Text = forwardRef(TextRender);
`,
);
write(
  'components/Text/Text.module.css',
  `.text { margin: 0; }
.body {
  font-family: var(--fx-text-body-font-family);
  font-size: var(--fx-text-body-font-size);
  font-weight: var(--fx-text-body-font-weight);
  letter-spacing: var(--fx-text-body-letter-spacing);
  line-height: var(--fx-text-body-line-height);
}
.tone-default { color: var(--fx-color-text-default); }
.tone-accent { color: var(--fx-color-accent-default); }
`,
);

const dimension = (cssVar: string, value: number, unit = 'rem') => ({
  tier: 'semantic' as const,
  type: 'dimension',
  cssVar,
  value: { value, unit },
});
const color = (cssVar: string, components: number[], alpha = 1) => ({
  tier: 'semantic' as const,
  type: 'color',
  cssVar,
  value: { colorSpace: 'srgb', components, alpha },
});
const TOKENS: TokensFile = {
  tokens: {
    'space.s': dimension('--fx-space-s', 0.75),
    'space.m': dimension('--fx-space-m', 1),
    'radius.pill': dimension('--fx-radius-pill', 9999, 'px'),
    'icon.size.s': dimension('--fx-icon-size-s', 1.125),
    'icon.size.m': dimension('--fx-icon-size-m', 1.25),
    'border.width.default': dimension('--fx-border-width-default', 1, 'px'),
    'border.default': {
      tier: 'semantic',
      type: 'border',
      cssVar: '--fx-border-default',
      value: {},
      aliasOf: {
        color: 'color.border.default',
        width: 'border.width.default',
        style: 'base.border.style.solid',
      },
    },
    'color.background.surface': color(
      '--fx-color-background-surface',
      [1, 1, 1],
    ),
    'color.background.transparent': color(
      '--fx-color-background-transparent',
      [0, 0, 0],
      0,
    ),
    'color.accent.default': color('--fx-color-accent-default', [0, 0, 1]),
    'color.text.default': color('--fx-color-text-default', [0, 0, 0]),
    'color.text.on-accent': color('--fx-color-text-on-accent', [1, 1, 1]),
    'color.border.default': color('--fx-color-border-default', [0.9, 0.9, 0.9]),
    'color.highlight.default': color(
      '--fx-color-highlight-default',
      [0, 0.4, 0.8],
    ),
    'font.weight.strong': {
      tier: 'semantic',
      type: 'fontWeight',
      cssVar: '--fx-font-weight-strong',
      value: 600,
    },
    'text.body': {
      tier: 'semantic',
      type: 'typography',
      cssVar: {
        fontFamily: '--fx-text-body-font-family',
        fontSize: '--fx-text-body-font-size',
        fontWeight: '--fx-text-body-font-weight',
        letterSpacing: '--fx-text-body-letter-spacing',
        lineHeight: '--fx-text-body-line-height',
      },
      value: {
        fontFamily: ['Figtree', 'sans-serif'],
        fontSize: { value: 1, unit: 'rem' },
        fontWeight: 400,
        letterSpacing: { value: 0, unit: 'px' },
        lineHeight: 1.5,
      },
      aliasOf: {
        fontFamily: 'font.family.body',
        fontSize: 'base.font.size.5',
        fontWeight: 'base.font.weight.400',
        letterSpacing: 'base.letter-spacing.none',
        lineHeight: 'base.line-height.base',
      },
      description: 'Default running text.',
    },
    'shadow.raised': {
      tier: 'semantic',
      type: 'shadow',
      cssVar: '--fx-shadow-raised',
      value: {
        color: { colorSpace: 'srgb', components: [0, 0, 0.1], alpha: 0.2 },
        offsetX: { value: 0, unit: 'px' },
        offsetY: { value: 0.125, unit: 'rem' },
        blur: { value: 0.5, unit: 'rem' },
        spread: { value: 0, unit: 'px' },
      },
      aliasOf: {
        color: 'color.shadow.default',
        offsetX: 'base.space.0',
        offsetY: 'base.space.025',
        blur: 'base.space.100',
        spread: 'base.space.0',
      },
      description: "A small lift: tiles & media, at a card's edge.",
    },
    'motion.duration.fast': {
      tier: 'semantic',
      type: 'duration',
      cssVar: '--fx-motion-duration-fast',
      value: { value: 150, unit: 'ms' },
    },
    'space.old': { ...dimension('--fx-space-old', 2), deprecated: true },
  },
};

const TABLE: Record<string, LibraryComponent> = {
  Chip: {
    layers: ['inner', 'label', "chip[aria-pressed='true']", 'chip::before'],
    derived: {
      iconOnly: {
        class: 'iconOnly',
        of: (e) => e.renders.length === 0 && e.children.length === 0,
        means: 'iconOnly=true is a Chip without children.',
      },
    },
    properties: { label: 'TEXT', icon: 'BOOLEAN' },
    description: "A chip's look, for one choice of several.",
  },
  Glyph: {
    defaults: { size: 's' },
    properties: { icon: 'INSTANCE_SWAP' },
    description: 'A glyph.',
  },
  Text: {
    defaults: { tone: 'default' },
    properties: { children: 'TEXT' },
    description: 'Text.',
  },
};
const LIBRARY = {
  components: TABLE,
  leftOut: { Box: 'Auto layout covers it.' },
  hidden: ['VisuallyHidden'],
};

const build = (
  table: Record<string, LibraryComponent> = TABLE,
  tokens: TokensFile = TOKENS,
): Library =>
  buildLibrary(
    join(FIXTURE, 'components'),
    join(FIXTURE, 'box.module.css'),
    tokens,
    { ...LIBRARY, components: table },
  );

const specOf = (library: Library, name: string): ComponentSpec => {
  const found = library.components.find((c) => c.spec.name === name);
  if (!found) throw new Error(`No ${name}`);
  return found.spec;
};

const variantOf = (spec: ComponentSpec, name: string) => {
  const found = spec.variants.find((v) => v.name === name);
  if (!found) throw new Error(`No variant ${name}`);
  return found;
};

const layerOf = (
  spec: ComponentSpec,
  variant: string,
  layer: string,
): LayerSpec => {
  const found = variantOf(spec, variant).layers.find((l) => l.name === layer);
  if (!found) throw new Error(`No layer ${layer} in ${variant}`);
  return found;
};

/** Runs a script as use_figma does: as the body of an async function, with `figma` in scope. */
const run = (text: string, figma: FakeCanvas): Promise<unknown> => {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval -- running the generated script is what these tests are for
  const body = new Function('figma', `return (async () => {\n${text}\n})();`);
  return (body as (f: FakeCanvas) => Promise<unknown>)(figma);
};

describe('reading a component', () => {
  const chip = readComponent(join(FIXTURE, 'components/Chip'), 'Chip');

  it('reads its variant map, defaults and declared props', () => {
    expect(chip.variants).toEqual({
      tone: ['neutral', 'accent'],
      size: ['s', 'm'],
    });
    expect(chip.defaults).toEqual({ tone: 'neutral', size: 'm' });
    expect(chip.props).toEqual([
      'tone',
      'size',
      'icon',
      'label',
      'children',
      'onSelect',
    ]);
  });

  it('groups the classes on one element, through a local constant', () => {
    const [root] = chip.renders.at(-1) ?? [];
    expect(root?.tag).toBe('button');
    expect(root?.classes).toEqual([
      { name: 'chip', conditional: false },
      { name: 'iconOnly', conditional: true },
    ]);
    expect(root?.modifiers).toEqual([
      { prefix: 'tone-', prop: 'tone' },
      { prefix: 'size-', prop: 'size' },
    ]);
  });

  it('reads the elements inside, their attributes and what they render', () => {
    const [root] = chip.renders.at(-1) ?? [];
    const [glyph, box, hidden] = root?.children ?? [];
    expect(glyph?.tag).toBe('Glyph');
    expect(glyph?.attributes.size).toEqual({ ref: 'size' });
    expect(box?.attributes).toMatchObject({
      padding: { value: 'm' },
      gap: { value: 's' },
    });
    expect(box?.children[0]?.renders).toEqual(['label']);
    expect(box?.renders).toEqual(['children']);
    expect(hidden?.tag).toBe('VisuallyHidden');
  });

  it('reads an element made with createElement, and classes indexed by a prop', () => {
    const text = readComponent(join(FIXTURE, 'components/Text'), 'Text');
    const [root] = text.renders.at(-1) ?? [];
    expect(root?.tag).toBe('as');
    expect(root?.modifiers).toEqual([
      { prefix: '', prop: 'variant' },
      { prefix: 'tone-', prop: 'tone' },
    ]);
    expect(text.defaults).toEqual({ as: 'p', variant: 'body' });
  });

  it("follows composes, keeps states and pseudo-elements, and skips what a layer can't show", () => {
    const sheet = readStylesheet(
      join(FIXTURE, 'components/Chip/Chip.module.css'),
    );
    const chipRule = sheet.rules.find((r) => r.selector === '.chip');
    expect(chipRule?.declarations.slice(0, 2)).toEqual([
      { property: 'border', value: 'var(--fx-border-default)' },
      { property: 'box-shadow', value: 'var(--fx-shadow-raised)' },
    ]);
    expect(sheet.rules.map((r) => r.selector)).toContain(
      ".chip[aria-pressed='true']",
    );
    expect(
      sheet.rules.find((r) => r.selector === '.chip::before')?.pseudoElement,
    ).toBe('::before');
    expect(sheet.skipped).toEqual(['.chip:hover', '.chip in @media']);
  });
});

describe('the library spec', () => {
  const library = build();
  const chip = specOf(library, 'Chip');

  it('builds without problems, and lists what it leaves out', () => {
    expect(library.problems).toEqual([]);
    expect(library.components.map((c) => c.spec.name)).toEqual([
      'Chip',
      'Glyph',
      'Text',
    ]);
    expect(library.leftOut).toEqual({ Box: 'Auto layout covers it.' });
  });

  it('takes axes and defaults from the variant map, and adds derived axes', () => {
    expect(chip.axes).toEqual([
      { name: 'tone', values: ['neutral', 'accent'], default: 'neutral' },
      { name: 'size', values: ['s', 'm'], default: 'm' },
      { name: 'iconOnly', values: ['false', 'true'], default: 'false' },
    ]);
    expect(chip.variants.map((v) => v.name)).toHaveLength(8);
    expect(chip.description).toBe(
      "A chip's look, for one choice of several. iconOnly=true is a Chip without children.",
    );
    expect(specOf(library, 'Glyph').axes[0]?.default).toBe('s');
  });

  it('binds the root to the tokens its classes, composes and modifiers name, with the cascade', () => {
    expect(layerOf(chip, 'tone=accent, size=s, iconOnly=false', '')).toEqual({
      name: '',
      bound: {
        paddingTop: 'space.s',
        paddingRight: 'space.m',
        paddingBottom: 'space.s',
        paddingLeft: 'space.m',
        itemSpacing: 'space.s',
        topLeftRadius: 'radius.pill',
        topRightRadius: 'radius.pill',
        bottomRightRadius: 'radius.pill',
        bottomLeftRadius: 'radius.pill',
        strokeWeight: 'border.width.default',
      },
      stroke: 'color.background.transparent',
      fill: 'color.accent.default',
      effect: 'shadow.raised',
      color: 'color.text.on-accent',
      typography: { style: 'text.body', lineHeight: 150 },
    });
    const neutral = layerOf(chip, 'tone=neutral, size=m, iconOnly=false', '');
    expect(neutral.stroke).toBe('color.border.default');
    expect(neutral.bound.paddingLeft).toBe('space.m');
  });

  it('drops padding a derived class zeroes', () => {
    const iconOnly = layerOf(chip, 'tone=accent, size=s, iconOnly=true', '');
    expect(
      Object.keys(iconOnly.bound).filter((f) => f.startsWith('padding')),
    ).toEqual([]);
  });

  it("names a state of the root by its class, and binds parts a text style can't hold on their own", () => {
    expect(
      layerOf(
        chip,
        'tone=neutral, size=m, iconOnly=false',
        "chip[aria-pressed='true']",
      ),
    ).toMatchObject({
      color: 'color.highlight.default',
      typography: {
        fontFamily: 'font.family.body',
        fontSize: 'base.font.size.5',
        fontWeight: 'font.weight.strong',
        letterSpacing: 'base.letter-spacing.none',
        lineHeight: 150,
      },
    });
    expect(
      layerOf(chip, 'tone=neutral, size=m, iconOnly=false', 'chip::before'),
    ).toEqual({
      name: 'chip::before',
      bound: {
        topLeftRadius: 'radius.pill',
        topRightRadius: 'radius.pill',
        bottomRightRadius: 'radius.pill',
        bottomLeftRadius: 'radius.pill',
      },
      fill: 'color.accent.default',
    });
  });

  it("binds Box props through Box's classes, and turns Text into a text layer", () => {
    expect(
      layerOf(chip, 'tone=neutral, size=m, iconOnly=false', 'inner'),
    ).toEqual({
      name: 'inner',
      bound: {
        paddingTop: 'space.m',
        paddingRight: 'space.m',
        paddingBottom: 'space.m',
        paddingLeft: 'space.m',
        itemSpacing: 'space.s',
      },
      fill: '',
    });
    expect(
      layerOf(chip, 'tone=neutral, size=m, iconOnly=false', 'label'),
    ).toEqual({
      name: 'label',
      bound: {},
      color: 'color.accent.default',
      typography: { style: 'text.body', lineHeight: 150 },
    });
  });

  it('expects nested library components with the variants they get, and leaves hidden elements out', () => {
    expect(
      variantOf(chip, 'tone=neutral, size=s, iconOnly=false').instances,
    ).toEqual([{ component: 'Glyph', variants: { size: 's' } }]);
    const names = chip.variants.flatMap((v) => v.layers.map((l) => l.name));
    expect(names.some((n) => n.includes('Hidden'))).toBe(false);
  });

  it('keeps raw layout and code-only declarations for the agent', () => {
    const facts = library.components
      .find((c) => c.spec.name === 'Chip')
      ?.variants.find((v) => v.name === 'tone=accent, size=s, iconOnly=false');
    const root = facts?.layers.find((l) => l.spec.name === '');
    expect(root?.raw).toEqual({ 'min-block-size': '2rem (32px)' });
    expect(root?.codeOnly).toEqual([
      'transition-duration: var(--fx-motion-duration-fast)',
    ]);
  });

  it('writes a build sheet in Figma names', () => {
    const sheet = buildSheet(library, stylesSpec(TOKENS, []).spec);
    expect(sheet).toContain('## Chip');
    expect(sheet).toContain(
      'padding top `space/s`, right `space/m`, bottom `space/s`, left `space/m`; gap `space/s`; radius `radius/pill`',
    );
    expect(sheet).toContain('- An instance of `Glyph` with size=s.');
  });

  it('reports a table that has fallen behind the code', () => {
    const problems = build({
      Chip: {
        ...TABLE.Chip,
        layers: ['inner', 'chip::before', 'gone'],
        properties: { label: 'TEXT', colour: 'TEXT' },
        description: 'A chip.',
      },
      Text: { ...TABLE.Text, defaults: { tone: 'loud' }, description: 'Text.' },
      Ghost: { description: 'Not a component.' },
    }).problems;
    expect(problems).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Glyph is a component with no entry'),
        "The library table lists Ghost, which isn't a component.",
        "Chip: the Figma property colour isn't one of Chip's props.",
        "Text: the default tone, loud, isn't one of its variants.",
        "Chip: the layer chip[aria-pressed='true'] has token bindings but isn't in the library table's layers or skip.",
        "Chip: the library table names the layer gone, which Chip doesn't have.",
      ]),
    );
  });

  it('reads the live components without problems', () => {
    const react = fileURLToPath(new URL('../../../react/', import.meta.url));
    const tokens = fileURLToPath(
      new URL('../../../tokens/dist/tokens.json', import.meta.url),
    );
    if (
      !existsSync(tokens) ||
      !existsSync(join(react, 'src/generated/box.module.css'))
    )
      throw new Error(
        'Run pnpm build before the tests: the spec reads the build outputs.',
      );
    const live = buildLibrary(
      join(react, 'src/components'),
      join(react, 'src/generated/box.module.css'),
      JSON.parse(readFileSync(tokens, 'utf8')) as TokensFile,
      { components: COMPONENTS, leftOut: LEFT_OUT, hidden: HIDDEN_ELEMENTS },
    );
    expect(live.problems).toEqual([]);
    expect(live.components.length).toBe(Object.keys(COMPONENTS).length);
    const styles = stylesSpec(
      JSON.parse(readFileSync(tokens, 'utf8')) as TokensFile,
      readIcons(join(react, 'package.json')),
    );
    expect(styles.problems).toEqual([]);
  });
});

describe('the styles script', () => {
  const icons: IconSpec[] = [
    {
      name: 'CloseIcon',
      key: 'close',
      viewBox: '0 -960 960 960',
      paths: ['M0 0Z'],
    },
  ];
  const spec: StylesSpec = stylesSpec(TOKENS, icons).spec;
  const VARIABLES = [
    'font.family.body',
    'base.font.size.5',
    'base.font.weight.400',
    'base.letter-spacing.none',
    'color.shadow.default',
    'base.space.0',
    'base.space.025',
    'base.space.100',
    'color.text.default',
  ];
  const canvasWith = (
    paths: readonly string[],
    fonts = [{ family: 'Figtree', style: 'Regular' }],
  ) => {
    const canvas = new FakeCanvas();
    const collection = canvas.variables.createVariableCollection('Fossil');
    for (const path of paths) {
      const type = path.startsWith('color')
        ? 'COLOR'
        : path.startsWith('font.family')
          ? 'STRING'
          : 'FLOAT';
      canvas.variables
        .createVariable(path.replaceAll('.', '/'), collection, type)
        .setSharedPluginData('fossil', 'path', path);
    }
    canvas.fonts = fonts;
    return canvas;
  };

  it('takes each style from its token, with every part a variable', () => {
    expect(spec.textStyles).toEqual([
      {
        path: 'text.body',
        name: 'text/body',
        description: 'Default running text.',
        fontFamily: 'font.family.body',
        family: 'Figtree',
        fontSize: 'base.font.size.5',
        size: 16,
        fontWeight: 'base.font.weight.400',
        weight: 400,
        letterSpacing: 'base.letter-spacing.none',
        tracking: 0,
        lineHeight: 150,
      },
    ]);
    expect(spec.effectStyles[0]).toMatchObject({
      name: 'shadow/raised',
      radius: 'base.space.100',
      px: { offsetX: 0, offsetY: 2, radius: 8, spread: 0 },
    });
    const broken = stylesSpec(
      {
        tokens: {
          'text.x': {
            ...TOKENS.tokens['text.body'],
            aliasOf: {},
          } as TokensFile['tokens'][string],
        },
      },
      [],
    );
    expect(broken.problems).toEqual([
      'text.x: every part of a text style must reference a token, so Figma can bind it.',
    ]);
  });

  it('creates the styles, the page and the icons, and changes nothing the second time', async () => {
    const canvas = canvasWith(VARIABLES);
    const text = script(spec, 'styles');
    const first = (await run(text, canvas)) as {
      created: string[];
      updated: string[];
    };
    expect(first.created).toEqual([
      'text/body',
      'shadow/raised',
      'the Components page',
      'CloseIcon',
    ]);
    const style = canvas.textStyles[0];
    const variable = (path: string) => canvas.variable(path).id;
    expect(style?.boundVariables.fontFamily?.id).toBe(
      variable('font.family.body'),
    );
    expect(style?.boundVariables.letterSpacing?.id).toBe(
      variable('base.letter-spacing.none'),
    );
    expect(style?.lineHeight).toEqual({
      unit: 'PERCENT',
      value: Math.fround(150),
    });
    expect(canvas.effectStyles[0]?.effects[0]?.boundVariables?.radius?.id).toBe(
      variable('base.space.100'),
    );
    const page = canvas.root.children[1];
    const glyph = page?.children[0]?.children?.[0];
    if (!glyph) throw new Error('No glyph');
    expect(glyph.name).toBe('CloseIcon');
    expect(glyph.width).toBe(24);
    const fills = glyph.children?.[0]?.fills;
    expect(
      typeof fills === 'object'
        ? fills[0]?.boundVariables?.color?.id
        : undefined,
    ).toBe(variable('color.text.default'));
    const second = (await run(text, canvas)) as {
      created: string[];
      updated: string[];
    };
    expect(second).toMatchObject({ created: [], updated: [] });
  });

  it('refuses before writing when a font or a variable is missing', async () => {
    const noFont = canvasWith(VARIABLES, []);
    await expect(run(script(spec, 'styles'), noFont)).rejects.toThrow(
      "text/body needs Figtree at weight 400, which this Figma file doesn't have.",
    );
    expect(noFont.textStyles).toEqual([]);
    const noVariable = canvasWith(
      VARIABLES.filter((p) => p !== 'base.space.100'),
    );
    await expect(run(script(spec, 'styles'), noVariable)).rejects.toThrow(
      "shadow/raised binds to base.space.100, which isn't in Figma.",
    );
    expect(noVariable.effectStyles).toEqual([]);
  });

  it('never carries an svg tag, which makes use_figma rewrite a script', () => {
    expect(script(spec, 'styles')).not.toMatch(/<\/?(svg|path)\b/);
    expect(() => script({ ...spec, page: '<svg>' }, 'styles')).toThrow(
      'must not contain an svg tag',
    );
  });
});

describe('the library check', () => {
  const library = build();
  const specs = library.components.map((c) => c.spec);

  /** A library built exactly as the spec says, as the agent should build it. */
  const built = () => {
    const canvas = new FakeCanvas();
    const collection = canvas.variables.createVariableCollection('Fossil');
    const variables = new Map<
      string,
      ReturnType<FakeCanvas['variables']['createVariable']>
    >();
    const variable = (path: string) => {
      let v = variables.get(path);
      if (!v) {
        v = canvas.variables.createVariable(
          path.replaceAll('.', '/'),
          collection,
          path.startsWith('color') ? 'COLOR' : 'FLOAT',
        );
        v.setSharedPluginData('fossil', 'path', path);
        variables.set(path, v);
      }
      return v;
    };
    const bound = (path: string) => ({
      type: 'SOLID',
      color: { r: 0, g: 0, b: 0 },
      boundVariables: { color: { id: variable(path).id } },
    });
    const textStyle = canvas.createTextStyle();
    textStyle.setSharedPluginData('fossil', 'path', 'text.body');
    const effectStyle = canvas.createEffectStyle();
    effectStyle.setSharedPluginData('fossil', 'path', 'shadow.raised');
    const page = canvas.createPage();
    page.setSharedPluginData('fossil', 'page', 'components');
    canvas.currentPage = page;
    const icons = canvas.node('SECTION', 'Icons');
    canvas.node('COMPONENT', 'CloseIcon', icons);

    const paint = (node: FakeNode, layer: LayerSpec) => {
      for (const [field, path] of Object.entries(layer.bound))
        node.setBoundVariable(field, variable(path));
      node.fills = layer.fill ? [bound(layer.fill)] : [];
      node.strokes = layer.stroke ? [bound(layer.stroke)] : [];
      if (layer.effect) node.effectStyleId = effectStyle.id;
    };
    const sets = new Map<string, FakeNode>();
    // Nested components first, so an instance has its main component to point at.
    const ordered = [...specs]
      .sort(
        (a, b) =>
          Number(
            specs.some((s) =>
              s.variants.some((v) =>
                v.instances.some((i) => i.component === a.name),
              ),
            ),
          ) -
          Number(
            specs.some((s) =>
              s.variants.some((v) =>
                v.instances.some((i) => i.component === b.name),
              ),
            ),
          ),
      )
      .reverse();
    for (const spec of ordered) {
      const section = canvas.node('SECTION', spec.name);
      const top = canvas.node(
        spec.axes.length > 0 ? 'COMPONENT_SET' : 'COMPONENT',
        spec.name,
        section,
      );
      top.description = spec.description;
      const definitions: Record<
        string,
        { type: string; variantOptions?: string[] }
      > = {};
      for (const a of spec.axes)
        definitions[a.name] = {
          type: 'VARIANT',
          variantOptions: [...a.values],
        };
      spec.properties.forEach((p, i) => {
        definitions[`${p.name}#1:${String(i)}`] = { type: p.type };
      });
      top.componentPropertyDefinitions = definitions;
      const defaults = spec.axes
        .map((a) => `${a.name}=${a.default}`)
        .join(', ');
      const variants = [...spec.variants].sort(
        (a, b) => Number(b.name === defaults) - Number(a.name === defaults),
      );
      for (const v of variants) {
        const node =
          spec.axes.length > 0 ? canvas.node('COMPONENT', v.name, top) : top;
        node.variantProperties = Object.fromEntries(
          v.name
            .split(', ')
            .filter(Boolean)
            .map((p) => p.split('=') as [string, string]),
        );
        for (const layer of v.layers) {
          const target =
            layer.name === '' ? node : canvas.node('FRAME', layer.name, node);
          paint(target, layer);
          if (layer.color !== undefined || layer.typography !== undefined) {
            const root = v.layers.find((l) => l.name === '');
            const text = canvas.node('TEXT', 'text', target);
            const c = layer.color ?? root?.color;
            const t = layer.typography ?? root?.typography;
            text.fills = c ? [bound(c)] : [];
            if (t?.style) text.textStyleId = textStyle.id;
            else if (t) {
              for (const field of [
                'fontFamily',
                'fontSize',
                'fontWeight',
                'letterSpacing',
              ] as const)
                if (t[field])
                  text.boundVariables[field] = [
                    {
                      type: 'VARIABLE_ALIAS',
                      id: variable(t[field]).id,
                    },
                  ];
              text.lineHeight = {
                unit: 'PERCENT',
                value: Math.fround(t.lineHeight ?? 0),
              };
            }
          }
        }
        for (const i of v.instances) {
          const instance = canvas.node('INSTANCE', i.component, node);
          const set = sets.get(i.component);
          instance.main = set?.children?.find((c) =>
            Object.entries(i.variants).every(
              ([k, val]) => c.variantProperties?.[k] === val,
            ),
          );
        }
      }
      sets.set(spec.name, top);
    }
    return { canvas, sets, variable, bound, textStyle };
  };

  const check = async (
    canvas: FakeCanvas,
    names = specs.map((s) => s.name),
  ) => {
    const parts = checkParts(
      specs.filter((s) => names.includes(s.name)),
      {
        kind: 'check',
        commit: 'abc1234',
        library: specs.map((s) => s.name),
        textStyles: ['text.body'],
        effectStyles: ['shadow.raised'],
        icons: ['CloseIcon'],
      },
    );
    const results: CheckResult[] = [];
    for (const part of parts)
      results.push((await run(script(part, 'check'), canvas)) as CheckResult);
    return results;
  };
  const problems = (results: readonly CheckResult[], name?: string) =>
    results.flatMap((r) => [
      ...(name ? [] : r.foundations),
      ...r.components
        .filter((c) => !name || c.name === name)
        .flatMap((c) => c.problems),
    ]);
  const variantNode = (
    sets: Map<string, FakeNode>,
    component: string,
    name: string,
  ) => {
    const node = sets.get(component)?.children?.find((c) => c.name === name);
    if (!node) throw new Error(`No ${name}`);
    return node;
  };

  it('passes a library built as the spec says, with a hash the report verifies', async () => {
    const { canvas } = built();
    const results = await check(canvas);
    expect(problems(results)).toEqual([]);
    expect(
      reportLines(
        readResults(
          results.map((r, i) => ({
            name: `check-${String(i + 1)}.json`,
            text: JSON.stringify(r),
          })),
        ),
      ).passed,
    ).toBe(true);
  });

  it('splits into parts that fit use_figma, and a result is checked against its hash', async () => {
    const { canvas } = built();
    const parts = checkParts(
      specs,
      {
        kind: 'check',
        commit: 'x',
        library: [],
        textStyles: [],
        effectStyles: [],
        icons: [],
      },
      2000,
    );
    expect(parts.length).toBeGreaterThan(1);
    const [result] = await check(canvas, ['Glyph']);
    const tampered = JSON.stringify({ ...result, components: [] });
    expect(() =>
      readResults([{ name: 'check-1.json', text: tampered }]),
    ).toThrow(LibraryError);
    expect(() =>
      readResults([
        { name: 'check-1.json', text: JSON.stringify({ ...result, parts: 2 }) },
      ]),
    ).toThrow(LibraryError);
  });

  it('reports a binding that is missing or names the wrong variable', async () => {
    const { canvas, sets, variable, bound } = built();
    const node = variantNode(
      sets,
      'Chip',
      'tone=accent, size=s, iconOnly=false',
    );
    delete node.boundVariables.paddingTop;
    node.fills = [bound('color.text.default')];
    node.setBoundVariable('itemSpacing', variable('space.m'));
    expect(problems(await check(canvas, ['Chip']), 'Chip')).toEqual([
      "tone=accent, size=s, iconOnly=false: the component's paddingTop is unbound, not space.s.",
      "tone=accent, size=s, iconOnly=false: the component's itemSpacing is bound to space.m, not space.s.",
      'tone=accent, size=s, iconOnly=false: the component has its fill bound to color.text.default, not color.accent.default.',
    ]);
  });

  it('reports variants, defaults, properties and descriptions that differ', async () => {
    const { canvas, sets } = built();
    const set = sets.get('Glyph');
    const [first, second] = set?.children ?? [];
    second?.remove();
    if (set && first) {
      set.appendChild(first);
      set.componentPropertyDefinitions = {
        size: { type: 'VARIANT', variantOptions: ['s'] },
        glyph: { type: 'INSTANCE_SWAP' },
      };
      set.description = 'Something else.';
    }
    expect(problems(await check(canvas, ['Glyph']), 'Glyph')).toEqual([
      `Its description isn't the spec's: "A glyph."`,
      'Its size values are s, not s, m.',
      'The variant size=m is missing.',
      'It has no INSTANCE_SWAP property icon.',
      "Its property glyph isn't one of the spec's.",
    ]);
  });

  it("reports a default variant that isn't at the top left", async () => {
    const { canvas, sets } = built();
    const set = sets.get('Text');
    const first = set?.children?.[0];
    if (set && first) set.appendChild(first);
    expect(problems(await check(canvas, ['Text']), 'Text')).toEqual([
      'Its default variant has tone=accent, not default. Move the default variant to the top left.',
    ]);
  });

  it("reports instances the code does and doesn't render, but not those in a slot", async () => {
    const { canvas, sets } = built();
    const node = variantNode(
      sets,
      'Chip',
      'tone=neutral, size=s, iconOnly=false',
    );
    const instance = node.children?.find((c) => c.type === 'INSTANCE');
    if (instance) instance.main = variantNode(sets, 'Glyph', 'size=m');
    const slot = canvas.node('SLOT', 'children', node);
    canvas.node('INSTANCE', 'Text', slot).main =
      sets.get('Text')?.children?.[0];
    expect(problems(await check(canvas, ['Chip']), 'Chip')).toEqual([
      "tone=neutral, size=s, iconOnly=false: it has a Glyph (size=m) that the code doesn't render.",
      'tone=neutral, size=s, iconOnly=false: it needs a Glyph instance with size=s.',
    ]);
  });

  it('reports text in the wrong style or colour, and raw values anywhere', async () => {
    const { canvas, sets, variable } = built();
    const node = variantNode(
      sets,
      'Chip',
      'tone=neutral, size=m, iconOnly=false',
    );
    const label = node.children?.find((c) => c.name === 'label')?.children?.[0];
    if (label) {
      label.textStyleId = 'nothing';
      label.fills = [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }];
    }
    const extra = canvas.node('FRAME', 'extra', node);
    extra.fills = [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }];
    extra.paddingLeft = 6;
    extra.setBoundVariable('paddingRight', variable('space.s'));
    expect(problems(await check(canvas, ['Chip']), 'Chip')).toEqual([
      'tone=neutral, size=m, iconOnly=false: text has an unbound fill, not color.accent.default.',
      'tone=neutral, size=m, iconOnly=false: the text text has no Fossil text style, not text.body.',
      'tone=neutral, size=m, iconOnly=false: extra has an unbound fill.',
      "tone=neutral, size=m, iconOnly=false: extra's paddingLeft is 6, not a variable.",
    ]);
  });

  it('checks inside a hidden instance, which use_figma would skip', async () => {
    const { canvas, sets } = built();
    const node = variantNode(
      sets,
      'Chip',
      'tone=neutral, size=m, iconOnly=false',
    );
    const instance = node.children?.find((c) => c.type === 'INSTANCE');
    if (instance) {
      instance.visible = false;
      canvas.skipInvisibleInstanceChildren = false;
      const vector = canvas.node('VECTOR', 'Vector', instance);
      vector.fills = [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }];
      canvas.skipInvisibleInstanceChildren = true;
    }
    expect(problems(await check(canvas, ['Chip']), 'Chip')).toEqual([
      'tone=neutral, size=m, iconOnly=false: Vector has an unbound fill, not color.text.default.',
    ]);
  });

  it('reports a missing page, style or icon', async () => {
    const canvas = new FakeCanvas();
    const [result] = await check(canvas, ['Glyph']);
    expect(result?.foundations).toEqual([
      'There is no Components page. Run the styles script from pnpm figma:library-spec first.',
    ]);
    const { canvas: partial } = built();
    partial.textStyles.splice(0);
    expect(problems(await check(partial, ['Glyph']))).toContain(
      'The text style for text.body is missing.',
    );
  });

  it('names the library components that still bind a token deleted in code, when the apply finishes', async () => {
    const { canvas, variable } = built();
    const fossil = (
      await canvas.variables.getLocalVariableCollectionsAsync()
    )[0];
    fossil?.setSharedPluginData('fossil', 'collection', 'semantic');
    const paths = (await canvas.variables.getLocalVariablesAsync())
      .map((v) => v.getSharedPluginData('fossil', 'path'))
      .filter((p) => p !== 'space.s' && p !== 'radius.pill');
    variable('space.s');
    const result = await run(
      script(
        {
          kind: 'finish',
          commit: 'c0ffee',
          collections: Object.values(COLLECTIONS),
          paths,
        },
        'finish',
      ),
      canvas,
    );
    expect(result).toMatchObject({
      orphans: ['space.s', 'radius.pill'],
      boundBy: { 'space.s': ['Chip'], 'radius.pill': ['Chip'] },
    });
  });

  it('refuses to run after a change, like every Fossil script', async () => {
    const { canvas } = built();
    const [part] = checkParts(specs, {
      kind: 'check',
      commit: 'x',
      library: [],
      textStyles: [],
      effectStyles: [],
      icons: [],
    });
    if (!part) throw new Error('No part');
    const text = script(part, 'check').replace('"commit":"x"', '"commit":"y"');
    await expect(run(text, canvas)).rejects.toThrow(CHANGED);
    expect(sha256('')).toHaveLength(64);
  });
});

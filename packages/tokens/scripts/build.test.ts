import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { LintLists, TokensFile } from '../src/metadata.ts';
import {
  build,
  BuildError,
  DURATION,
  TRANSFORMS,
  type BuildOptions,
} from './build.ts';
import { contrastRatio } from './contrast.ts';
import { report } from './deprecations.ts';
import { BLOCK_END, BLOCK_START } from './formats.ts';
import {
  readTokenFiles,
  referenceOf,
  validate,
  VENDOR,
  type Token,
} from './validate.ts';

const source = fileURLToPath(new URL('../src', import.meta.url));

const temporary: string[] = [];
afterAll(() => {
  for (const dir of temporary) rmSync(dir, { recursive: true, force: true });
});
const tempDir = () => {
  const dir = mkdtempSync(join(tmpdir(), 'fossil-build-'));
  temporary.push(dir);
  return dir;
};

/** Writes token files into a new source folder. */
const fixture = (files: Record<string, unknown>): string => {
  const dir = tempDir();
  for (const [path, body] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), JSON.stringify(body));
  }
  return dir;
};

/** Builds a source folder into a new package folder. */
const buildInto = async (from: string, options: Partial<BuildOptions> = {}) => {
  const root = tempDir();
  await build({
    source: from,
    root,
    name: 'Fossil Design',
    prefix: 'fossil',
    ...options,
  });
  return (path: string) => readFileSync(join(root, path), 'utf8');
};

/** The problems a build reports, and whether it wrote anything. */
const failure = async (from: string, options: Partial<BuildOptions> = {}) => {
  const root = tempDir();
  try {
    await build({
      source: from,
      root,
      name: 'Fossil Design',
      prefix: 'fossil',
      ...options,
    });
  } catch (error) {
    if (!(error instanceof BuildError)) throw error;
    return { problems: error.problems, wrote: existsSync(join(root, 'dist')) };
  }
  throw new Error('The build passed');
};

const srgb = (components: number[], extra: Record<string, unknown> = {}) => ({
  $value: { colorSpace: 'srgb', components, ...extra },
});
const dimension = (value: number, unit = 'rem') => ({
  $value: { value, unit },
});

const primitives = {
  base: {
    color: {
      $type: 'color',
      gray: { 300: srgb([0.8, 0.82, 0.85]), 600: srgb([0.29, 0.32, 0.35]) },
      ink: srgb([0, 0, 0], { alpha: 0.2 }),
    },
    space: {
      $type: 'dimension',
      0: dimension(0, 'px'),
      '050': dimension(0.25),
      100: dimension(0.5),
      1000: dimension(5),
    },
  },
};

/** The token a semantic token aliases in dark mode, if it has a dark value. */
const darkOf = (token: Token | undefined): string | undefined =>
  referenceOf(
    (token?.extension?.modes as Record<string, unknown> | undefined)?.dark,
  );

const declaration = (css: string, name: string) =>
  new RegExp(`^\\s*${name}: (.*);$`, 'm').exec(css)?.[1];

describe('building the token source', () => {
  let read: (path: string) => string;
  let css: string;
  let json: TokensFile;
  let agents: string;

  /** A token's custom property, read from tokens.json. */
  const name = (path: string) => {
    const cssVar = json.tokens[path]?.cssVar;
    return typeof cssVar === 'string' ? cssVar : path;
  };

  beforeAll(async () => {
    const agentsFile = join(tempDir(), 'AGENTS.md');
    writeFileSync(agentsFile, `# Agents\n\n${BLOCK_START}\n${BLOCK_END}\n`);
    read = await buildInto(source, { agents: agentsFile });
    css = read('dist/tokens.css');
    json = JSON.parse(read('dist/tokens.json')) as TokensFile;
    agents = readFileSync(agentsFile, 'utf8');
  });

  it('declares exactly the custom properties tokens.json names', () => {
    const root = css.slice(0, css.indexOf('}'));
    const declared = [...root.matchAll(/^\s*(--[\w-]+):/gm)].map((m) => m[1]);
    const named = Object.values(json.tokens).flatMap((t) =>
      typeof t.cssVar === 'string' ? [t.cssVar] : Object.values(t.cssVar),
    );
    expect(declared).toEqual(named);
    expect(new Set(declared).size).toBe(declared.length);
  });

  it('writes semantic tokens as var() of the token they alias', () => {
    const tokens = validate(readTokenFiles(source)).tokens;
    for (const token of tokens.filter((t) => t.tier === 'semantic')) {
      const alias = referenceOf(token.value);
      if (alias !== undefined)
        expect(declaration(css, name(token.path)), token.path).toBe(
          `var(${name(alias)})`,
        );
    }
    const border = tokens.find((t) => t.path === 'border.default')?.value as
      Record<string, unknown> | undefined;
    expect(declaration(css, '--fossil-border-default')).toBe(
      ['width', 'style', 'color']
        .map((part) => `var(${name(referenceOf(border?.[part]) ?? part)})`)
        .join(' '),
    );
  });

  it('splits each text style into five aliased properties, with no font shorthand', () => {
    expect(declaration(css, '--fossil-text-heading-xs-font-family')).toBe(
      'var(--fossil-font-family-heading)',
    );
    expect(declaration(css, '--fossil-text-label-letter-spacing')).toBe(
      'var(--fossil-base-letter-spacing-wide)',
    );
    expect(json.tokens['text.body']?.cssVar).toEqual({
      fontFamily: '--fossil-text-body-font-family',
      fontSize: '--fossil-text-body-font-size',
      fontWeight: '--fossil-text-body-font-weight',
      letterSpacing: '--fossil-text-body-letter-spacing',
      lineHeight: '--fossil-text-body-line-height',
    });
    expect(css).not.toMatch(/--fossil-text-body:/);
  });

  it('writes the dark values as aliases, in two identical blocks', () => {
    const media = /:root:not\(\[data-theme="light"\]\) \{\n([^}]*)\}/.exec(
      css,
    )?.[1];
    const forced = /^:root\[data-theme="dark"\] \{\n([^}]*)\}/m.exec(css)?.[1];
    expect(media).toContain('color-scheme: dark;');
    for (const token of validate(readTokenFiles(source)).tokens) {
      const dark = darkOf(token);
      if (dark !== undefined)
        expect(media, token.path).toContain(
          `${name(token.path)}: var(${name(dark)});`,
        );
    }
    const lines = (block = '') =>
      block
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
    expect(lines(media)).toEqual(lines(forced));
  });

  it('meets every contrast minimum the tokens declare, in light and dark', () => {
    const checked = Object.entries(json.tokens).filter(
      ([, t]) => t.contrast !== undefined,
    );
    expect(checked.length).toBeGreaterThan(0);
    for (const [path, t] of checked)
      for (const against of t.contrast?.against ?? []) {
        const ground = json.tokens[against];
        const modes = [
          ['light', t.value, ground?.value],
          [
            'dark',
            t.dark?.value ?? t.value,
            ground?.dark?.value ?? ground?.value,
          ],
        ] as const;
        for (const [mode, fore, back] of modes)
          expect(
            contrastRatio(fore, back) ?? 0,
            `${path} on ${against} in ${mode}`,
          ).toBeGreaterThanOrEqual(t.contrast?.minimum ?? 21);
      }
    expect(agents).toContain('Contrast in light / dark:');
  });

  it('gives a token that aliases a semantic token the dark value of its target', () => {
    let checked = 0;
    for (const [path, t] of Object.entries(json.tokens)) {
      const target =
        typeof t.aliasOf === 'string' ? json.tokens[t.aliasOf] : undefined;
      if (t.tier !== 'semantic' || target?.tier !== 'semantic') continue;
      if (t.dark !== undefined && t.dark.aliasOf !== t.aliasOf) continue;
      expect(t.dark?.value ?? t.value, path).toEqual(
        target.dark?.value ?? target.value,
      );
      checked += 1;
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('writes durations in CSS units and nothing unconverted', () => {
    expect(declaration(css, '--fossil-base-duration-150')).toBe('150ms');
    expect(css).not.toMatch(/\[object Object\]|\bundefined\b|\bNaN\b/);
  });

  it('records each token in tokens.json', () => {
    // Read from the source, so a value changed in Figma or by a fork doesn't break the test.
    const byPath = new Map(
      validate(readTokenFiles(source)).tokens.map((t) => [t.path, t]),
    );
    const muted = byPath.get('color.text.muted');
    const light = referenceOf(muted?.value) ?? '';
    const dark = darkOf(muted);
    const contrast = muted?.extension?.contrast as
      { against: string[]; minimum: number } | undefined;
    expect(json.tokens['color.text.muted']).toEqual({
      tier: 'semantic',
      type: 'color',
      cssVar: '--fossil-color-text-muted',
      value: byPath.get(light)?.value,
      aliasOf: light,
      ...(dark !== undefined && {
        dark: { value: byPath.get(dark)?.value, aliasOf: dark },
      }),
      description: muted?.description,
      ...(contrast !== undefined && {
        contrast: {
          against: contrast.against.map((a) => referenceOf(a) ?? a),
          minimum: contrast.minimum,
        },
      }),
    });
  });

  it('lists every primitive custom property for the lint config', () => {
    const lint = JSON.parse(read('dist/lint.json')) as LintLists;
    expect(lint.primitive).toContain('--fossil-base-color-gray-600');
    expect(lint.primitive).not.toContain('--fossil-color-text-muted');
    expect(lint.primitive).toHaveLength(
      Object.values(json.tokens).filter((t) => t.tier === 'primitive').length,
    );
  });

  it('writes key unions and breakpoints for TypeScript', () => {
    expect(read('src/generated/tokens.ts')).toContain(
      '"space": ["2xs", "xs", "s", "m", "l", "xl", "2xl", "3xl"],',
    );
    const breakpoints = read('src/generated/breakpoints.ts');
    expect(breakpoints).toContain('"tablet": "768px",');
    expect(breakpoints).toContain('"tablet": "(min-width: 768px)",');
  });

  it('types the stylesheet and JSON exports', () => {
    expect(read('dist/tokens.css.d.ts')).toBe('export {};\n');
    expect(read('dist/tokens.json.d.cts')).toBe(
      "import type { TokensFile } from './metadata.js';\n\ndeclare const file: TokensFile;\nexport = file;\n",
    );
    expect(read('dist/lint.json.d.cts')).toContain(
      'declare const file: LintLists;',
    );
  });

  it('writes the foundations into AGENTS.md', () => {
    expect(agents).toMatch(/^# Agents\n\n<!-- fossil:foundations:start -->/);
    expect(agents).toContain('For padding and `gap`. Never margin.');
    expect(agents).toContain('| `space.m` | `--fossil-space-m` | 16px |');
    expect(agents).toContain(
      '| `text.heading.s` | heading | 22px | 600 | 1.4 | 0 | Card and modal titles. |',
    );
    expect(agents).toContain('| `--fossil-color-text-muted` | Secondary text.');
  });
});

describe('a broken token fails the build with a clear message, before anything is written', () => {
  it('a semantic token holding a literal', async () => {
    const { problems, wrote } = await failure(
      fixture({
        'primitive/base.tokens.json': primitives,
        'semantic/color.tokens.json': {
          color: {
            $type: 'color',
            text: {
              muted: { ...srgb([0, 0, 0]), $description: 'Secondary text.' },
            },
          },
        },
      }),
    );
    expect(problems).toContain(
      'semantic/color.tokens.json › color.text.muted: A semantic token is a reference to another token, not a literal value',
    );
    expect(wrote).toBe(false);
  });

  it('two tokens with the same custom property name', async () => {
    const { problems, wrote } = await failure(
      fixture({
        'primitive/base.tokens.json': primitives,
        'semantic/color.tokens.json': {
          color: {
            $type: 'color',
            text: {
              muted: {
                $value: '{base.color.gray.600}',
                $description: 'Muted.',
              },
            },
            'text-muted': {
              $value: '{base.color.gray.600}',
              $description: 'Muted again.',
            },
          },
        },
      }),
    );
    expect(problems).toEqual([
      'color.text.muted and color.text-muted both become --fossil-color-text-muted. Rename one of them.',
    ]);
    expect(wrote).toBe(false);
  });

  it('a duration, when the duration transform is removed', async () => {
    const { problems, wrote } = await failure(
      fixture({
        'primitive/motion.tokens.json': {
          base: {
            duration: {
              $type: 'duration',
              150: { $value: { value: 150, unit: 'ms' } },
            },
          },
        },
      }),
      { transforms: TRANSFORMS.filter((t) => t !== DURATION) },
    );
    expect(problems).toEqual([
      'base.duration.150: --fossil-base-duration-150 would be "[object Object]". No transform turns this duration value into CSS.',
    ]);
    expect(wrote).toBe(false);
  });

  it('the same path in both tiers', async () => {
    const { problems, wrote } = await failure(
      fixture({
        'primitive/base.tokens.json': primitives,
        'semantic/space.tokens.json': {
          base: {
            space: {
              $type: 'dimension',
              100: { $value: '{base.space.050}', $description: 'Twin.' },
            },
          },
        },
      }),
    );
    expect(problems).toContain(
      'semantic/space.tokens.json › base.space.100: Also defined in primitive/base.tokens.json; a path exists once, in one tier',
    );
    expect(wrote).toBe(false);
  });
});

describe('references', () => {
  it('writes each part of a shadow as var() of its reference, whatever the key order', async () => {
    // Style Dictionary's own outputReferences replaces 5rem inside 0.25rem here.
    const read = await buildInto(
      fixture({
        'primitive/base.tokens.json': primitives,
        'semantic/shadow.tokens.json': {
          shadow: {
            $type: 'shadow',
            deep: {
              $value: [
                {
                  blur: '{base.space.1000}',
                  offsetY: '{base.space.050}',
                  offsetX: '{base.space.0}',
                  spread: '{base.space.0}',
                  color: '{base.color.ink}',
                },
                {
                  color: '{base.color.ink}',
                  offsetX: '{base.space.0}',
                  offsetY: '{base.space.0}',
                  blur: '{base.space.100}',
                  spread: '{base.space.0}',
                  inset: true,
                },
              ],
              $description: 'Two shadows.',
            },
          },
        },
      }),
    );
    expect(declaration(read('dist/tokens.css'), '--fossil-shadow-deep')).toBe(
      'var(--fossil-base-space-0) var(--fossil-base-space-050) var(--fossil-base-space-1000) var(--fossil-base-space-0) var(--fossil-base-color-ink), ' +
        'inset var(--fossil-base-space-0) var(--fossil-base-space-0) var(--fossil-base-space-100) var(--fossil-base-space-0) var(--fossil-base-color-ink)',
    );
  });

  it('points each part of a text style alias at the same part of the style', async () => {
    const read = await buildInto(
      fixture({
        'primitive/type.tokens.json': {
          base: {
            font: {
              family: { $type: 'fontFamily', sans: { $value: ['Figtree'] } },
              size: { $type: 'dimension', 5: dimension(1) },
              weight: { $type: 'fontWeight', 400: { $value: 400 } },
            },
            tracking: { $type: 'dimension', none: dimension(0, 'px') },
            leading: { $type: 'number', base: { $value: 1.6 } },
          },
        },
        'semantic/text.tokens.json': {
          text: {
            $type: 'typography',
            body: {
              $value: {
                fontFamily: '{base.font.family.sans}',
                fontSize: '{base.font.size.5}',
                fontWeight: '{base.font.weight.400}',
                letterSpacing: '{base.tracking.none}',
                lineHeight: '{base.leading.base}',
              },
              $description: 'Body.',
            },
            default: { $value: '{text.body}', $description: 'An alias.' },
          },
        },
      }),
    );
    const css = read('dist/tokens.css');
    expect(declaration(css, '--fossil-text-body-font-size')).toBe(
      'var(--fossil-base-font-size-5)',
    );
    expect(declaration(css, '--fossil-text-default-font-size')).toBe(
      'var(--fossil-text-body-font-size)',
    );
  });

  it('writes DTCG font weight names as numbers', async () => {
    const read = await buildInto(
      fixture({
        'primitive/type.tokens.json': {
          base: {
            weight: { $type: 'fontWeight', semi: { $value: 'semi-bold' } },
          },
        },
      }),
    );
    expect(
      declaration(read('dist/tokens.css'), '--fossil-base-weight-semi'),
    ).toBe('600');
  });
});

describe('deprecated tokens', () => {
  const deprecated = fixture({
    'primitive/base.tokens.json': primitives,
    'semantic/color.tokens.json': {
      color: {
        $type: 'color',
        text: {
          default: {
            $value: '{base.color.gray.600}',
            $description: 'Body text.',
          },
          old: {
            $value: '{base.color.gray.600}',
            $description: 'The old body text.',
            $deprecated: 'Renamed to color.text.default.',
            $extensions: {
              [VENDOR]: { replacedBy: '{color.text.default}', since: '0.3.0' },
            },
          },
        },
      },
    },
  });

  it('keeps them in tokens.css and lists them for the lint config, but not as prop keys', async () => {
    const read = await buildInto(deprecated);
    expect(read('dist/tokens.css')).toContain(
      '  /* The old body text. Deprecated: Renamed to color.text.default. */\n  --fossil-color-text-old: var(--fossil-base-color-gray-600);',
    );
    expect(
      (JSON.parse(read('dist/lint.json')) as LintLists).deprecated,
    ).toEqual({
      '--fossil-color-text-old': {
        replacedBy: '--fossil-color-text-default',
        reason: 'Renamed to color.text.default.',
      },
    });
    expect(read('src/generated/tokens.ts')).toContain(
      '"color.text": ["default"],',
    );
  });

  it('reports them with their replacements', async () => {
    const read = await buildInto(deprecated);
    expect(report(JSON.parse(read('dist/tokens.json')) as TokensFile)).toBe(
      '1 deprecated token:\n  color.text.old (use color.text.default, since 0.3.0). Renamed to color.text.default.',
    );
    expect(report({ tokens: {} })).toBe('No deprecated tokens.');
  });
});

describe('the AGENTS.md block', () => {
  it('replaces only the block', async () => {
    const file = join(tempDir(), 'AGENTS.md');
    writeFileSync(
      file,
      `# Agents\n\n${BLOCK_START}\nStale.\n${BLOCK_END}\n\n## Boundaries\n`,
    );
    await buildInto(fixture({ 'primitive/base.tokens.json': primitives }), {
      agents: file,
    });
    const agents = readFileSync(file, 'utf8');
    expect(agents).toMatch(/^# Agents\n\n<!-- fossil:foundations:start -->/);
    expect(agents).toMatch(
      /<!-- fossil:foundations:end -->\n\n## Boundaries\n$/,
    );
    expect(agents).not.toContain('Stale.');
  });

  it('fails without its markers, before anything is written', async () => {
    const file = join(tempDir(), 'AGENTS.md');
    writeFileSync(file, '# Agents\n');
    const { problems, wrote } = await failure(
      fixture({ 'primitive/base.tokens.json': primitives }),
      { agents: file },
    );
    expect(problems).toEqual([
      `AGENTS.md has no foundations block. Add ${BLOCK_START} and ${BLOCK_END} where it belongs.`,
    ]);
    expect(wrote).toBe(false);
  });
});

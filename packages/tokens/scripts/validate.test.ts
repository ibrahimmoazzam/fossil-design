import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  keyOrder,
  readTokenFiles,
  validate,
  VENDOR,
  type TokenFile,
} from './validate.ts';

const source = fileURLToPath(new URL('../src', import.meta.url));
const script = fileURLToPath(new URL('validate.ts', import.meta.url));

const file = (path: string, body: unknown): TokenFile => ({
  path,
  content: JSON.stringify(body),
});

const palette = file('primitive/color.tokens.json', {
  color: {
    $type: 'color',
    gray: {
      600: {
        $value: {
          colorSpace: 'srgb',
          components: [0.29, 0.318, 0.349],
          hex: '#4a5159',
        },
      },
      300: {
        $value: {
          colorSpace: 'srgb',
          components: [0.804, 0.824, 0.847],
          hex: '#cdd2d8',
        },
      },
    },
  },
  space: { $type: 'dimension', 200: { $value: { value: 1, unit: 'rem' } } },
});

const muted = (token: Record<string, unknown>) =>
  file('semantic/color.tokens.json', {
    color: {
      $type: 'color',
      text: {
        muted: {
          $value: '{color.gray.600}',
          $description: 'Secondary text.',
          ...token,
        },
      },
    },
  });

const messages = (files: TokenFile[]) =>
  validate(files).problems.map((p) => p.message);

describe('the token source', () => {
  it('validates with no problems', () => {
    const { tokens, problems } = validate(readTokenFiles(source));
    expect(problems).toEqual([]);
    expect(tokens.filter((t) => t.tier === 'primitive').length).toBeGreaterThan(
      0,
    );
    expect(tokens.filter((t) => t.tier === 'semantic').length).toBeGreaterThan(
      0,
    );
  });

  it('gives every semantic token a description and a resolved type', () => {
    const { tokens } = validate(readTokenFiles(source));
    for (const t of tokens.filter((t) => t.tier === 'semantic')) {
      expect(t.description, t.path).toBeTypeOf('string');
      expect(t.type, t.path).toBeDefined();
    }
  });
});

describe('order', () => {
  it('keeps tokens in the order their file lists them, numbered names included', () => {
    const content =
      '{"space":{"$type":"dimension","0":{"$value":{"value":0,"unit":"px"}},"025":{"$value":{"value":2,"unit":"px"}},"100":{"$value":{"value":8,"unit":"px"}}}}';
    const { tokens, problems } = validate([
      { path: 'primitive/space.tokens.json', content },
    ]);
    expect(problems).toEqual([]);
    expect(tokens.map((t) => t.path)).toEqual([
      'space.0',
      'space.025',
      'space.100',
    ]);
  });

  it('reads key order through arrays and escaped quotes', () => {
    const order = keyOrder(
      '{"a":[{"x":1},{"y":"say \\"hi\\": ok"}],"9":2,"b":3}',
    );
    expect([...order.keys()]).toEqual(['a', 'a.0.x', 'a.1.y', '9', 'b']);
  });
});

describe('the build', () => {
  it('fails on a semantic token holding a literal, before writing anything', () => {
    const dir = mkdtempSync(join(tmpdir(), 'fossil-tokens-'));
    try {
      mkdirSync(join(dir, 'primitive'));
      mkdirSync(join(dir, 'semantic'));
      writeFileSync(join(dir, palette.path), palette.content);
      writeFileSync(
        join(dir, 'semantic/color.tokens.json'),
        muted({
          $value: {
            colorSpace: 'srgb',
            components: [0.29, 0.318, 0.349],
            hex: '#4a5159',
          },
        }).content,
      );
      const run = spawnSync(
        process.execPath,
        [
          '--experimental-strip-types',
          '--disable-warning=ExperimentalWarning',
          script,
          dir,
        ],
        { encoding: 'utf8' },
      );
      expect(run.status).toBe(1);
      expect(run.stderr).toContain('color.text.muted');
      expect(run.stderr).toContain('not a literal value');
      expect(run.stderr).toContain('Nothing was built.');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('tier rules', () => {
  it('passes a semantic alias with a description', () => {
    expect(messages([palette, muted({})])).toEqual([]);
  });

  it('rejects a semantic token holding a literal', () => {
    expect(
      messages([
        palette,
        muted({ $value: { colorSpace: 'srgb', components: [0, 0, 0] } }),
      ]),
    ).toContain(
      'A semantic token is a reference to another token, not a literal value',
    );
  });

  it('rejects a semantic token without a description', () => {
    expect(messages([palette, muted({ $description: ' ' })])).toContain(
      'A semantic token needs a $description',
    );
  });

  it('rejects a primitive that references another token', () => {
    const alias = file('primitive/alias.tokens.json', {
      color: { $type: 'color', copy: { $value: '{color.gray.600}' } },
    });
    expect(messages([palette, alias])).toContain(
      'A primitive holds a raw value, not a reference',
    );
  });

  it('rejects a file outside both tier folders', () => {
    expect(messages([file('color.tokens.json', {})])).toContain(
      'Token files live in primitive/ or semantic/',
    );
  });

  it('rejects a token file without the .tokens.json extension', () => {
    expect(messages([file('semantic/color.json', {})])).toContain(
      'Token files use the .tokens.json extension',
    );
  });

  it('rejects the same path in both tiers', () => {
    const twin = file('semantic/space.tokens.json', {
      space: {
        $type: 'dimension',
        200: { $value: '{space.200}', $description: 'Twin.' },
      },
    });
    expect(
      messages([palette, twin]).some((m) =>
        m.startsWith('Also defined in primitive/color.tokens.json'),
      ),
    ).toBe(true);
  });

  it('rejects a semantic composite with a literal part', () => {
    const border = file('semantic/border.tokens.json', {
      border: {
        $type: 'border',
        default: {
          $value: {
            color: '{color.gray.600}',
            width: { value: 1, unit: 'px' },
            style: 'solid',
          },
          $description: 'Edges.',
        },
      },
    });
    expect(messages([palette, border])).toContain(
      "A semantic border token's parts are all references to other tokens",
    );
  });
});

describe('modes', () => {
  it('accepts a dark value that is an alias of the same type', () => {
    expect(
      messages([
        palette,
        muted({
          $extensions: { [VENDOR]: { modes: { dark: '{color.gray.300}' } } },
        }),
      ]),
    ).toEqual([]);
  });

  it('rejects a dark value that is a literal', () => {
    const literal = { colorSpace: 'srgb', components: [0.8, 0.8, 0.8] };
    expect(
      messages([
        palette,
        muted({ $extensions: { [VENDOR]: { modes: { dark: literal } } } }),
      ]),
    ).toContain(
      'The dark value is a reference to another token, not a literal value',
    );
  });

  it('rejects a mode on a primitive', () => {
    const moded = file('primitive/moded.tokens.json', {
      size: {
        $type: 'dimension',
        m: {
          $value: { value: 1, unit: 'rem' },
          $extensions: { [VENDOR]: { modes: { dark: '{space.200}' } } },
        },
      },
    });
    expect(messages([palette, moded])).toContain(
      'Only semantic tokens vary by mode',
    );
  });

  it('rejects an unknown mode', () => {
    expect(
      messages([
        palette,
        muted({
          $extensions: { [VENDOR]: { modes: { dim: '{color.gray.300}' } } },
        }),
      ]),
    ).toContain('Unknown mode "dim"; Fossil\'s modes are dark');
  });
});

describe('references', () => {
  it('rejects a reference to a token that does not exist', () => {
    expect(
      messages([palette, muted({ $value: '{color.gray.700}' })]),
    ).toContain("$value references {color.gray.700}, which doesn't exist");
  });

  it('rejects a reference to a token of another type', () => {
    expect(messages([palette, muted({ $value: '{space.200}' })])).toContain(
      '$value references {space.200}, a dimension, where a color belongs',
    );
  });

  it('rejects a circular reference', () => {
    const loop = file('semantic/loop.tokens.json', {
      loop: {
        $type: 'number',
        a: { $value: '{loop.b}', $description: 'A.' },
        b: { $value: '{loop.a}', $description: 'B.' },
      },
    });
    expect(
      messages([loop]).some((m) => m.startsWith('Circular reference')),
    ).toBe(true);
  });
});

describe('DTCG values', () => {
  it('rejects a hex string as a colour', () => {
    const hex = file('primitive/hex.tokens.json', {
      color: { $type: 'color', ink: { $value: '#0f0f1038' } },
    });
    expect(messages([hex])).toContain(
      '$value: A color value is an object: { colorSpace, components, alpha?, hex? }',
    );
  });

  it('rejects a dimension in em', () => {
    const em = file('primitive/em.tokens.json', {
      track: {
        $type: 'dimension',
        wide: { $value: { value: 0.04, unit: 'em' } },
      },
    });
    expect(messages([em])).toContain(
      '$value: A dimension is { value, unit }, with unit "px" or "rem"',
    );
  });

  it('rejects a typography value missing a part', () => {
    const text = file('primitive/text.tokens.json', {
      text: {
        $type: 'typography',
        body: {
          $value: {
            fontFamily: 'Figtree',
            fontSize: { value: 1, unit: 'rem' },
          },
        },
      },
    });
    expect(messages([text])).toContain('$value: typography needs fontWeight');
  });
});

describe('lifecycle metadata', () => {
  const replaced = (
    extension: Record<string, unknown>,
    deprecated: unknown = 'Use color.text.default.',
  ) =>
    file('semantic/old.tokens.json', {
      color: {
        $type: 'color',
        text: {
          default: { $value: '{color.gray.600}', $description: 'Body text.' },
          old: {
            $value: '{color.gray.600}',
            $description: 'Old.',
            $deprecated: deprecated,
            $extensions: { [VENDOR]: extension },
          },
        },
      },
    });

  it('accepts a deprecated token with a replacement and a version', () => {
    expect(
      messages([
        palette,
        replaced({ replacedBy: '{color.text.default}', since: '0.3.0' }),
      ]),
    ).toEqual([]);
  });

  it('rejects a replacement that does not exist', () => {
    expect(
      messages([palette, replaced({ replacedBy: '{color.text.new}' })]),
    ).toContain("replacedBy points to {color.text.new}, which doesn't exist");
  });

  it('rejects replacedBy on a token that is not deprecated', () => {
    expect(
      messages([
        palette,
        replaced({ replacedBy: '{color.text.default}' }, false),
      ]),
    ).toContain('replacedBy only belongs on a deprecated token');
  });

  it('rejects a since that is not a version', () => {
    expect(messages([palette, replaced({ since: 'last week' })])).toContain(
      'since is the version that deprecated the token, such as "0.3.0"',
    );
  });

  it('rejects an unknown Fossil extension property', () => {
    expect(
      messages([
        palette,
        muted({
          $extensions: { [VENDOR]: { mode: { dark: '{color.gray.300}' } } },
        }),
      ]),
    ).toContain(`Unknown ${VENDOR} property mode`);
  });
});

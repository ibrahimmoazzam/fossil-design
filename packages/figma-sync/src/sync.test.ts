import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { format } from 'prettier';
import { beforeAll, describe, expect, it } from 'vitest';
import type { TokensFile } from '../../tokens/src/metadata.ts';
import {
  readTokenFiles,
  validate,
  VENDOR,
  type TokenFile,
} from '../../tokens/scripts/validate.ts';
import { diff, type Report } from './diff.ts';
import { FakeFigma, float32 } from './fake-figma.ts';
import { figmaTokens, type FigmaToken } from './model.ts';
import { sha256, type ReadPage, type Spec } from './runtime.ts';
import { CHANGED, script } from './scripts.ts';
import { readSnapshot } from './snapshot.ts';
import { applySpecs, scopesOf, variableSpecs } from './spec.ts';
import { applyEdits } from './write.ts';

// A frozen copy of the reference token source, so a value changed in Figma or by a fork doesn't
// break these tests. The live source has its own tests below.
const SOURCE = fileURLToPath(new URL('fixtures/tokens', import.meta.url));
const LIVE = fileURLToPath(new URL('../../tokens/src', import.meta.url));
const FORMAT_FROM = `${SOURCE}/semantic/color.tokens.json`;
const COMMIT = 'c0ffee0000000000000000000000000000000000';
const source = readTokenFiles(SOURCE);

/** Runs a script as use_figma does: as the body of an async function, with `figma` in scope. */
const run = (text: string, figma: FakeFigma): Promise<unknown> => {
  // eslint-disable-next-line @typescript-eslint/no-implied-eval -- running the generated script is what these tests are for
  const body = new Function('figma', `return (async () => {\n${text}\n})();`);
  return (body as (f: FakeFigma) => Promise<unknown>)(figma);
};

const modelOf = (files: readonly TokenFile[]) => {
  const { tokens, problems } = validate([...files]);
  expect(problems).toEqual([]);
  const model = figmaTokens(tokens);
  expect(model.problems).toEqual([]);
  return { tokens, model: model.tokens };
};

/** Custom property names as the token build makes them, for sources it hasn't built. */
const namesOf = (model: readonly FigmaToken[]): TokensFile => ({
  tokens: Object.fromEntries(
    model.map((t) => [
      t.path,
      {
        tier: t.collection,
        type: '',
        cssVar: `--fossil-${t.path.replaceAll('.', '-')}`,
        value: null,
      },
    ]),
  ),
});

const specsFor = (files: readonly TokenFile[], commit = COMMIT): Spec[] => {
  const { model } = modelOf(files);
  return applySpecs(variableSpecs(model, namesOf(model)), commit, 40);
};

const applyAll = async (figma: FakeFigma, files = source, commit = COMMIT) => {
  const results: unknown[] = [];
  for (const spec of specsFor(files, commit))
    results.push(await run(script(spec, 'test'), figma));
  return results as {
    created?: string[];
    updated?: string[];
    renamed?: string[];
    commit?: string;
  }[];
};

const readAll = async (figma: FakeFigma) => {
  const pages: { name: string; text: string }[] = [];
  for (let page = 1, count = 1; page <= count; page++) {
    const result = (await run(
      script({ kind: 'read', page, pageSize: 40 }, 'test'),
      figma,
    )) as ReadPage;
    count = result.pages;
    pages.push({
      name: `snapshot-${String(page)}.json`,
      text: JSON.stringify(result),
    });
  }
  return pages;
};

/** A copy of the token files with one file's JSON changed. */
const editFile = (
  files: readonly TokenFile[],
  path: string,
  change: (json: Record<string, Record<string, unknown>>) => void,
): TokenFile[] =>
  files.map((f) => {
    if (f.path !== path) return f;
    const json = JSON.parse(f.content) as Record<
      string,
      Record<string, unknown>
    >;
    change(json);
    return { path: f.path, content: JSON.stringify(json) };
  });

const semanticColor = (json: Record<string, Record<string, unknown>>) =>
  json.color as Record<string, Record<string, Record<string, unknown>>>;

/** Applies the source, lets a test edit Figma or the code, and diffs. */
const roundTrip = async (
  changeFigma: (figma: FakeFigma) => void,
  current: readonly TokenFile[] = source,
): Promise<Report> => {
  const figma = new FakeFigma();
  await applyAll(figma);
  changeFigma(figma);
  const snapshot = readSnapshot(await readAll(figma));
  return diff(modelOf(source).model, modelOf(current).model, snapshot);
};

/** A value the test knows is there. */
const must = <T>(value: T | undefined): T => {
  if (value === undefined) throw new Error('Expected a value');
  return value;
};

const rgba = (hex: string, a = 1) => ({
  r: parseInt(hex.slice(1, 3), 16) / 255,
  g: parseInt(hex.slice(3, 5), 16) / 255,
  b: parseInt(hex.slice(5, 7), 16) / 255,
  a,
});

describe('sha256 inside Figma', () => {
  it.each([
    '',
    'abc',
    'a'.repeat(55),
    'a'.repeat(56),
    'a'.repeat(64),
    'a'.repeat(119),
    'Bézier curves → 🎨',
    JSON.stringify(specsFor(source)[0]),
  ])('matches Node for %#', (text) => {
    expect(sha256(text)).toBe(createHash('sha256').update(text).digest('hex'));
  });
});

describe('the tokens Figma gets', () => {
  const { model } = modelOf(source);
  const token = (path: string) => model.find((t) => t.path === path);

  it('converts values to Figma units', () => {
    expect(token('color.gray.600')?.values).toEqual({
      Value: { hex: '#4a5159', alpha: 1 },
    });
    expect(token('color.alpha.black-400-8')?.values.Value).toEqual({
      hex: '#0f0f10',
      alpha: 0.08,
    });
    expect(token('space.100')?.values.Value).toBe(8);
    expect(token('radius.md')?.values.Value).toBe(8);
    expect(token('font.family.figtree')?.values.Value).toBe('Figtree');
    expect(token('font.weight.400')?.values.Value).toBe(400);
    expect(token('line-height.base')?.values.Value).toBe(1.6);
    expect(token('duration.150')?.values.Value).toBe(0.15);
    expect(token('easing.ease')?.values.Value).toEqual({
      bezier: [0.25, 0.1, 0.25, 1],
    });
    expect(token('motion.duration.fast')?.values.Light).toEqual({
      alias: 'duration.150',
    });
  });

  it('gives semantic tokens an alias in each mode', () => {
    expect(token('color.text.muted')?.values).toEqual({
      Light: { alias: 'color.gray.600' },
      Dark: { alias: 'color.gray.300' },
    });
    expect(token('color.border.strong')?.values).toEqual({
      Light: { alias: 'color.gray.500' },
      Dark: { alias: 'color.gray.500' },
    });
  });

  it('keeps the order the token files list them in', () => {
    const numbered = modelOf(source)
      .model.map((t) => t.path)
      .filter((p) => /^space\.\d+$/.test(p));
    expect(numbered).toEqual([
      'space.0',
      'space.025',
      'space.050',
      'space.100',
      'space.150',
      'space.200',
      'space.300',
      'space.400',
      'space.600',
      'space.1000',
    ]);
  });

  it('leaves composites and stroke styles in code', () => {
    for (const path of [
      'text.body',
      'border.default',
      'shadow.raised',
      'border.style.solid',
    ])
      expect(token(path), path).toBeUndefined();
  });

  it('scopes semantic variables, and hides primitives from every picker', () => {
    const scopes = (path: string) => scopesOf(must(token(path)));
    expect(scopes('color.text.muted')).toEqual(['TEXT_FILL']);
    expect(scopes('color.background.surface')).toEqual([
      'FRAME_FILL',
      'SHAPE_FILL',
    ]);
    expect(scopes('space.m')).toEqual(['GAP']);
    expect(scopes('radius.control')).toEqual(['CORNER_RADIUS']);
    expect(scopes('border.width.default')).toEqual(['STROKE_FLOAT']);
    expect(scopes('focus.ring.width')).toEqual([
      'STROKE_FLOAT',
      'EFFECT_FLOAT',
    ]);
    expect(scopes('focus.ring.offset')).toEqual(['EFFECT_FLOAT']);
    expect(scopes('color.gray.600')).toEqual([]);
    expect(scopes('layer.overlay')).toEqual([]);
    expect(scopes('motion.duration.fast')).toBeUndefined();
    expect(scopes('easing.ease')).toBeUndefined();
  });
});

describe('applying to a fresh file', () => {
  const figma = new FakeFigma();
  let first: Awaited<ReturnType<typeof applyAll>>;

  beforeAll(async () => {
    first = await applyAll(figma);
  });

  it('creates both collections, with their modes, and stamps the commit last', () => {
    expect(
      figma.collections.map((c) => [c.name, c.modes.map((m) => m.name)]),
    ).toEqual([
      ['Primitives', ['Value']],
      ['Semantic', ['Light', 'Dark']],
    ]);
    for (const c of figma.collections)
      expect(c.getSharedPluginData('fossil', 'commit')).toBe(COMMIT);
    expect(first.at(-1)).toMatchObject({
      commit: COMMIT,
      missing: [],
      orphans: [],
      unstamped: [],
    });
  });

  it('creates a stamped variable for every token, named by its path, with its code syntax', () => {
    const { model } = modelOf(source);
    expect(figma.all).toHaveLength(model.length);
    const muted = figma.variable('color.text.muted');
    expect(muted.name).toBe('color/text/muted');
    expect(muted.codeSyntax).toEqual({ WEB: 'var(--fossil-color-text-muted)' });
    expect(muted.description).toBe(
      'Secondary text. 7.38:1 on the page in light, 12.70:1 in dark.',
    );
    expect(figma.variable('color.border.hover').description).toBe(
      'A control&#39;s edge on hover. 7.38:1 on the page in light, 12.70:1 in dark.',
    );
  });

  it('aliases each semantic variable to the variable it references, in each mode', () => {
    const muted = figma.variable('color.text.muted');
    expect(muted.valuesByMode[figma.mode(muted, 'Light')]).toEqual({
      type: 'VARIABLE_ALIAS',
      id: figma.variable('color.gray.600').id,
    });
    expect(muted.valuesByMode[figma.mode(muted, 'Dark')]).toEqual({
      type: 'VARIABLE_ALIAS',
      id: figma.variable('color.gray.300').id,
    });
    const selected = figma.variable('color.border.selected');
    expect(selected.valuesByMode[figma.mode(selected, 'Light')]).toEqual({
      type: 'VARIABLE_ALIAS',
      id: figma.variable('color.highlight.default').id,
    });
  });

  it('holds primitive values in Figma units, with empty scopes', () => {
    const gray = figma.variable('color.gray.600');
    expect(gray.valuesByMode[figma.mode(gray, 'Value')]).toEqual(
      float32(rgba('#4a5159')),
    );
    expect(gray.scopes).toEqual([]);
    const space = figma.variable('space.100');
    expect(space.valuesByMode[figma.mode(space, 'Value')]).toBe(8);
    expect(figma.variable('space.m').scopes).toEqual(['GAP']);
  });

  it('holds durations in seconds and easing as a custom curve, and leaves their scopes alone', () => {
    const duration = figma.variable('duration.150');
    expect(duration.resolvedType).toBe('TIMING');
    expect(duration.valuesByMode[figma.mode(duration, 'Value')]).toBe(
      Math.fround(0.15),
    );
    const easing = figma.variable('easing.ease');
    expect(easing.resolvedType).toBe('EASING');
    expect(easing.valuesByMode[figma.mode(easing, 'Value')]).toEqual({
      type: 'CUSTOM_CUBIC_BEZIER',
      easingFunctionCubicBezier: {
        x1: 0.25,
        y1: Math.fround(0.1),
        x2: 0.25,
        y2: 1,
      },
    });
    const standard = figma.variable('motion.easing.standard');
    expect(standard.valuesByMode[figma.mode(standard, 'Light')]).toEqual({
      type: 'VARIABLE_ALIAS',
      id: easing.id,
    });
  });

  it('changes nothing when it runs again', async () => {
    const again = await applyAll(figma);
    for (const part of again.slice(0, -1))
      expect(part).toMatchObject({ created: [], updated: [], renamed: [] });
    expect(figma.all).toHaveLength(modelOf(source).model.length);
  });

  it('reads back as the same tokens, aliases included', async () => {
    const snapshot = readSnapshot(await readAll(figma));
    expect(snapshot.commit).toBe(COMMIT);
    expect(
      diff(modelOf(source).model, modelOf(source).model, snapshot),
    ).toEqual({ edits: [], pending: [], conflicts: [], refused: [] });
  });
});

describe('the live token source', () => {
  it('syncs without problems', () => {
    expect(modelOf(readTokenFiles(LIVE)).model.length).toBeGreaterThan(0);
  });

  it('takes code syntax from tokens.json', () => {
    const { model } = modelOf(readTokenFiles(LIVE));
    const built = JSON.parse(
      readFileSync(
        new URL('../../tokens/dist/tokens.json', import.meta.url),
        'utf8',
      ),
    ) as TokensFile;
    for (const spec of variableSpecs(model, built))
      expect(spec.code).toBe(
        `var(${JSON.stringify(built.tokens[spec.path]?.cssVar).replaceAll('"', '')})`,
      );
  });
});

describe('integrity', () => {
  const spec = must(specsFor(source)[0]);

  it('refuses to run a script whose data was changed', async () => {
    const text = script(spec, 'test').replace('"#4a5159"', '"#4a5158"');
    await expect(run(text, new FakeFigma())).rejects.toThrow(CHANGED);
  });

  it('refuses to run a script whose code was changed', async () => {
    const text = script(spec, 'test').replace(
      "changes.push('name');",
      "changes.push('label');",
    );
    await expect(run(text, new FakeFigma())).rejects.toThrow(CHANGED);
  });

  it('rejects a read result that was cut off, edited, or mixed with another read', async () => {
    const figma = new FakeFigma();
    await applyAll(figma);
    const pages = await readAll(figma);
    expect(pages.length).toBeGreaterThan(1);
    const one = must(pages[0]);
    const two = must(pages[1]);
    expect(() =>
      readSnapshot([
        { ...one, text: one.text.slice(0, one.text.length / 2) },
        two,
      ]),
    ).toThrow('cut off');
    expect(() =>
      readSnapshot([
        { ...one, text: one.text.replace('color/gray/600', 'color/gray/601') },
        two,
      ]),
    ).toThrow("doesn't match its hash");
    expect(() => readSnapshot([one])).toThrow('Page 2 of');
    const radius = figma.variable('radius.sm');
    radius.setValueForMode(figma.mode(radius, 'Value'), 6);
    const later = await readAll(figma);
    expect(() => readSnapshot([one, ...later.slice(1)])).toThrow(
      'different reads',
    );
  });
});

describe('applying safely', () => {
  it('checks a part before writing, so running parts out of order creates nothing', async () => {
    const figma = new FakeFigma();
    const specs = specsFor(source);
    await expect(
      run(script(must(specs.at(-2)), 'test'), figma),
    ).rejects.toThrow("isn't in Figma yet");
    expect(figma.all).toHaveLength(0);
  });

  it('refuses a name that an unstamped variable already has', async () => {
    const figma = new FakeFigma();
    await applyAll(figma);
    figma.remove(figma.variable('space.m'));
    const semantic = must(figma.collections.find((c) => c.name === 'Semantic'));
    figma.variables.createVariable('space/m', semantic, 'FLOAT');
    await expect(applyAll(figma)).rejects.toThrow(
      'another variable is already named space/m',
    );
  });

  it('refuses two variables stamped with the same path', async () => {
    const figma = new FakeFigma();
    await applyAll(figma);
    figma.variable('space.l').setSharedPluginData('fossil', 'path', 'space.m');
    await expect(applyAll(figma)).rejects.toThrow(
      'More than one variable is stamped with space.m',
    );
  });

  it('leaves a description alone on the next run, though Figma escapes it', async () => {
    const figma = new FakeFigma();
    const marked = editFile(source, 'semantic/color.tokens.json', (json) => {
      must(must(semanticColor(json).text).muted).$description =
        'Tom & Jerry\'s <b>"muted"</b> text, not &#39;.';
    });
    await applyAll(figma, marked);
    expect(figma.variable('color.text.muted').description).toBe(
      'Tom &amp; Jerry&#39;s &lt;b&gt;&quot;muted&quot;&lt;/b&gt; text, not &amp;#39;.',
    );
    for (const part of (await applyAll(figma, marked)).slice(0, -1))
      expect(part).toMatchObject({ updated: [] });
  });
});

describe('a rename in code', () => {
  it('renames the variable in place, so its id and bindings survive', async () => {
    const figma = new FakeFigma();
    await applyAll(figma);
    const id = figma.variable('color.text.muted').id;
    const renamed = editFile(source, 'semantic/color.tokens.json', (json) => {
      const text = must(semanticColor(json).text);
      text.subtle = { ...text.muted };
      text.muted = {
        ...text.muted,
        $deprecated: 'Renamed to color.text.subtle.',
        $extensions: {
          [VENDOR]: {
            ...must(
              text.muted?.$extensions as
                Record<string, Record<string, unknown>> | undefined,
            )[VENDOR],
            replacedBy: '{color.text.subtle}',
            since: '0.2.0',
          },
        },
      };
    });
    const results = await applyAll(figma, renamed);
    expect(results.flatMap((r) => r.renamed ?? [])).toEqual([
      'color.text.muted → color.text.subtle',
    ]);
    expect(results.flatMap((r) => r.created ?? [])).toEqual([]);
    const subtle = figma.variable('color.text.subtle');
    expect(subtle.id).toBe(id);
    expect(subtle.name).toBe('color/text/subtle');
    expect(subtle.codeSyntax.WEB).toBe('var(--fossil-color-text-subtle)');
  });
});

describe('the three-way diff', () => {
  const set = (
    figma: FakeFigma,
    path: string,
    mode: string,
    value: unknown,
  ) => {
    const v = figma.variable(path);
    v.setValueForMode(figma.mode(v, mode), value as never);
  };
  const alias = (figma: FakeFigma, path: string) => ({
    type: 'VARIABLE_ALIAS' as const,
    id: figma.variable(path).id,
  });

  it('brings back a value changed in Figma', async () => {
    const report = await roundTrip((f) => {
      set(f, 'color.gray.600', 'Value', rgba('#4b525a'));
    });
    expect(report).toMatchObject({ refused: [], conflicts: [], pending: [] });
    expect(report.edits).toEqual([
      {
        path: 'color.gray.600',
        mode: 'Value',
        from: { hex: '#4a5159', alpha: 1 },
        value: { hex: '#4b525a', alpha: 1 },
      },
    ]);
  });

  it('brings back an alias re-pointed in one mode', async () => {
    const report = await roundTrip((f) => {
      set(f, 'color.text.muted', 'Light', alias(f, 'color.gray.500'));
    });
    expect(report.edits).toEqual([
      {
        path: 'color.text.muted',
        mode: 'Light',
        from: { alias: 'color.gray.600' },
        value: { alias: 'color.gray.500' },
      },
    ]);
  });

  it('leaves a change made in code for the next apply', async () => {
    const changed = editFile(source, 'semantic/space.tokens.json', (json) => {
      must(
        (json.space as Record<string, Record<string, unknown> | undefined>).m,
      ).$value = '{space.300}';
    });
    const report = await roundTrip(() => undefined, changed);
    expect(report).toEqual({
      edits: [],
      conflicts: [],
      refused: [],
      pending: [
        'space.m (Light): {space.200} → {space.300}',
        'space.m (Dark): {space.200} → {space.300}',
      ],
    });
  });

  it('reports a value changed in both places as a conflict', async () => {
    const changed = editFile(source, 'semantic/space.tokens.json', (json) => {
      must(
        (json.space as Record<string, Record<string, unknown> | undefined>).m,
      ).$value = '{space.300}';
    });
    const report = await roundTrip((f) => {
      set(f, 'space.m', 'Light', alias(f, 'space.150'));
    }, changed);
    expect(report.edits).toEqual([]);
    expect(report.conflicts).toEqual([
      'space.m (Light) changed in both places: {space.200} became {space.150} in Figma and {space.300} in code. Settle it in code, then apply.',
    ]);
  });

  it.each([
    [
      'an addition',
      (f: FakeFigma) =>
        f.variables.createVariable(
          'color/text/brand',
          must(f.collections[1]),
          'COLOR',
        ),
      'color/text/brand was added in Figma. Tokens are added in code: add color.text.brand to a token file in a pull request, and the next apply creates the variable.',
    ],
    [
      'a deletion',
      (f: FakeFigma) => {
        f.remove(f.variable('radius.pill'));
      },
      'radius.pill was deleted in Figma. Tokens are deleted in code, in a pull request; until then, apply restores the variable.',
    ],
    [
      'a rename',
      (f: FakeFigma) => {
        f.variable('space.m').name = 'space/medium';
      },
      'space.m was renamed to space/medium in Figma. Renames happen in code: add the new token, deprecate space.m with replacedBy pointing at it, and the next apply renames the variable in place. Until then, apply restores the name.',
    ],
    [
      'a detached alias',
      (f: FakeFigma) => {
        set(f, 'color.text.muted', 'Dark', rgba('#cccccc'));
      },
      'color.text.muted (Dark) was detached from its alias and set to #cccccc. A semantic token only aliases other tokens: pick a variable for it in Figma, or change the primitive it aliases.',
    ],
    [
      'a primitive turned into an alias',
      (f: FakeFigma) => {
        set(f, 'color.gray.500', 'Value', alias(f, 'color.gray.600'));
      },
      'color.gray.500 (Value) became an alias of {color.gray.600} in Figma. A primitive holds a raw value: set one in Figma.',
    ],
  ])('refuses %s, with the change code needs', async (_, change, message) => {
    const report = await roundTrip(change);
    expect(report.edits).toEqual([]);
    expect(report.refused).toEqual([message]);
  });

  it('brings back a duration and a custom easing curve', async () => {
    const report = await roundTrip((f) => {
      set(f, 'duration.200', 'Value', 0.25);
      set(f, 'easing.ease', 'Value', {
        type: 'CUSTOM_CUBIC_BEZIER',
        easingFunctionCubicBezier: { x1: 0.2, y1: 0, x2: 0, y2: 1 },
      });
    });
    expect(report.refused).toEqual([]);
    expect(report.edits.map((e) => [e.path, e.value])).toEqual([
      ['duration.200', 0.25],
      ['easing.ease', { bezier: [0.2, 0, 0, 1] }],
    ]);
  });

  it('refuses one of Figma’s named easings', async () => {
    const report = await roundTrip((f) => {
      set(f, 'easing.ease', 'Value', { type: 'EASE_IN' });
    });
    expect(report.refused).toEqual([
      "easing.ease (Value) uses Figma's EASE_IN easing. Fossil's easing tokens are cubic Béziers, and Figma doesn't document the curve behind a preset: set a custom curve in Figma instead.",
    ]);
  });

  it('refuses an alias to a variable that isn’t Fossil’s', async () => {
    const report = await roundTrip((f) => {
      const mine = f.variables.createVariableCollection('Mine');
      const brand = f.variables.createVariable('brand', mine, 'COLOR');
      set(f, 'color.accent.default', 'Light', {
        type: 'VARIABLE_ALIAS',
        id: brand.id,
      });
    });
    expect(report.refused).toEqual([
      "color.accent.default (Light) aliases brand, which isn't one of Fossil's variables. Pick a Fossil variable for it in Figma.",
    ]);
  });
});

describe('writing Figma’s values to the token source', () => {
  const { tokens } = modelOf(source);
  const written = async (edits: Parameters<typeof applyEdits>[2]) => {
    const changed = await applyEdits(source, tokens, edits, FORMAT_FROM);
    for (const file of changed)
      expect(
        await format(file.content, { parser: 'json', singleQuote: true }),
      ).toBe(file.content);
    expect(
      validate(source.map((f) => changed.find((c) => c.path === f.path) ?? f))
        .problems,
    ).toEqual([]);
    return (path: string) =>
      JSON.parse(
        changed.find((c) => c.path === path)?.content ?? 'null',
      ) as Record<
        string,
        Record<string, Record<string, Record<string, unknown>>>
      >;
  };

  it('writes a colour as a DTCG colour object', async () => {
    const file = await written([
      {
        path: 'color.gray.600',
        mode: 'Value',
        from: undefined,
        value: { hex: '#4b525a', alpha: 1 },
      },
    ]);
    expect(
      file('primitive/color.tokens.json').color?.gray?.['600']?.$value,
    ).toEqual({
      colorSpace: 'srgb',
      components: [0.2941, 0.3216, 0.3529],
      hex: '#4b525a',
    });
  });

  it('keeps a dimension in its own unit', async () => {
    const file = await written([
      { path: 'space.100', mode: 'Value', from: undefined, value: 10 },
    ]);
    expect(file('primitive/space.tokens.json').space?.['100']?.$value).toEqual({
      value: 0.625,
      unit: 'rem',
    });
  });

  it('writes a duration in its own unit, and a curve as four numbers', async () => {
    const file = await written([
      { path: 'duration.200', mode: 'Value', from: undefined, value: 0.25 },
      {
        path: 'easing.ease',
        mode: 'Value',
        from: undefined,
        value: { bezier: [0.2, 0, 0, 1] },
      },
    ]);
    const motion = file('primitive/motion.tokens.json');
    expect(motion.duration?.['200']?.$value).toEqual({
      value: 250,
      unit: 'ms',
    });
    expect(motion.easing?.ease?.$value).toEqual([0.2, 0, 0, 1]);
  });

  it('replaces the first font and keeps the fallbacks', async () => {
    const file = await written([
      {
        path: 'font.family.figtree',
        mode: 'Value',
        from: undefined,
        value: 'Inter',
      },
    ]);
    expect(
      file('primitive/typography.tokens.json').font?.family?.figtree?.$value,
    ).toEqual(['Inter', 'system-ui', 'sans-serif']);
  });

  it('changes only the lines of the token it edits', async () => {
    const changed = await applyEdits(
      source,
      tokens,
      [
        {
          path: 'color.text.muted',
          mode: 'Light',
          from: undefined,
          value: { alias: 'color.gray.500' },
        },
      ],
      FORMAT_FROM,
    );
    const before = must(
      source.find((f) => f.path === 'semantic/color.tokens.json'),
    ).content.split('\n');
    const after = must(changed[0]).content.split('\n');
    expect(after).toHaveLength(before.length);
    expect(after.filter((line, i) => line !== before[i])).toEqual([
      '        "$value": "{color.gray.500}",',
    ]);
  });

  it('keeps each group in its file’s order, numbered tokens included', async () => {
    const changed = await applyEdits(
      source,
      tokens,
      [{ path: 'duration.200', mode: 'Value', from: undefined, value: 0.25 }],
      FORMAT_FROM,
    );
    const before = must(
      source.find((f) => f.path === 'primitive/motion.tokens.json'),
    ).content.split('\n');
    const after = must(changed[0]).content.split('\n');
    expect(after).toHaveLength(before.length);
    expect(after.filter((line, i) => line !== before[i])).toEqual([
      '        "value": 250,',
    ]);
  });

  it('writes a light alias and keeps the dark one', async () => {
    const file = await written([
      {
        path: 'color.border.strong',
        mode: 'Light',
        from: undefined,
        value: { alias: 'color.gray.600' },
      },
    ]);
    expect(
      file('semantic/color.tokens.json').color?.border?.strong,
    ).toMatchObject({
      $value: '{color.gray.600}',
      $extensions: { [VENDOR]: { modes: { dark: '{color.gray.500}' } } },
    });
  });

  it('drops the dark value once it matches the light one', async () => {
    const file = await written([
      {
        path: 'color.text.muted',
        mode: 'Dark',
        from: undefined,
        value: { alias: 'color.gray.600' },
      },
    ]);
    const muted = file('semantic/color.tokens.json').color?.text?.muted;
    expect(muted?.$value).toBe('{color.gray.600}');
    expect(muted).not.toHaveProperty('$extensions');
  });
});

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import stylelint from 'stylelint';
import { afterAll, describe, expect, it } from 'vitest';
import config, { fossil } from '../src/index.ts';

async function lint(
  code: string,
  options: { config?: stylelint.Config; file?: string } = {},
) {
  const { results } = await stylelint.lint({
    code,
    config: options.config ?? config,
    codeFilename: options.file ?? join(process.cwd(), 'Component.module.css'),
  });
  const [result] = results;
  if (!result) throw new Error('Stylelint returned no result');
  return result.warnings.map(({ rule, text }) => ({ rule, text }));
}

const rules = async (code: string) =>
  (await lint(code)).map(({ rule }) => rule);

describe('tokens only', () => {
  it.each([
    ['a colour', 'a { color: var(--fossil-color-text-default); }'],
    [
      'two spacing tokens',
      'a { padding: var(--fossil-space-m) var(--fossil-space-l); }',
    ],
    ['a border token', 'a { border: var(--fossil-border-default); }'],
    [
      'a transition with token durations',
      'a { transition: color var(--fossil-motion-duration-fast) var(--fossil-motion-easing-standard); }',
    ],
    [
      'a text style',
      'a { font-size: var(--fossil-text-body-font-size); font-weight: var(--fossil-text-body-font-weight); }',
    ],
    [
      'plain keywords',
      'a { color: inherit; background-color: transparent; padding: 0; fill: currentColor; }',
    ],
    [
      'a knob with a token fallback',
      'a { gap: var(--carousel-gap, var(--fossil-space-l)); }',
    ],
    [
      'a local custom property',
      'a { --dot-size: 6px; inline-size: var(--dot-size); }',
    ],
  ])('accepts %s', async (_, code) => {
    expect(await lint(code)).toEqual([]);
  });

  it.each([
    ['a hex colour', 'a { color: #fff; }'],
    ['a colour function', 'a { background-color: rgb(0 0 0); }'],
    ['a raw colour inside a shorthand', 'a { border: 1px solid #ccc; }'],
    ['a raw padding', 'a { padding: var(--fossil-space-m) 4px; }'],
    ['a raw gap', 'a { gap: 8px; }'],
    ['a raw radius', 'a { border-radius: 4px; }'],
    ['a raw font size', 'a { font-size: 1rem; }'],
    ['a raw font weight', 'a { font-weight: 600; }'],
    [
      'a raw duration inside a shorthand',
      'a { transition: color 150ms ease; }',
    ],
    [
      'arithmetic on spacing',
      'a { padding: calc(var(--fossil-space-m) + var(--fossil-space-xs)); }',
    ],
  ])('rejects %s', async (_, code) => {
    expect(await rules(code)).toContain(
      'scale-unlimited/declaration-strict-value',
    );
  });
});

describe('semantic tokens only', () => {
  it('rejects a primitive token', async () => {
    const warnings = await lint('a { color: var(--fossil-color-gray-500); }');
    expect(warnings).toContainEqual({
      rule: 'declaration-property-value-disallowed-list',
      text: expect.stringContaining('primitive token') as string,
    });
  });

  it('matches whole names, so a semantic token sharing a prefix passes', async () => {
    expect(
      await lint('a { border-radius: var(--fossil-radius-pill); }'),
    ).toEqual([]);
  });

  it('rejects a primitive aliased by a local custom property', async () => {
    expect(
      await rules('a { --tint: var(--fossil-color-blue-600); }'),
    ).toContain('declaration-property-value-disallowed-list');
  });

  it('rejects a raw colour in a local custom property or a shadow', async () => {
    expect(await rules('a { --tint: #1b4dff; }')).toContain(
      'declaration-property-value-disallowed-list',
    );
    expect(
      await rules('a { box-shadow: 0 1px 2px rgb(0 0 0 / 0.2); }'),
    ).toContain('declaration-property-value-disallowed-list');
  });
});

describe('custom properties', () => {
  it('rejects one that exists nowhere', async () => {
    expect(
      await rules('a { color: var(--fossil-color-text-defualt); }'),
    ).toContain('csstools/value-no-unknown-custom-properties');
  });
});

describe('margins', () => {
  it('accepts 0', async () => {
    expect(await lint('a { margin: 0; margin-block: 0; }')).toEqual([]);
  });

  it.each([
    'margin: 0 auto',
    'margin-top: var(--fossil-space-m)',
    'margin: -1px',
  ])('rejects %s', async (declaration) => {
    expect(await rules(`a { ${declaration}; }`)).toContain(
      'declaration-property-value-allowed-list',
    );
  });

  it('accepts a margin behind a disable comment with its reason', async () => {
    const code = `a {
  /* stylelint-disable-next-line declaration-property-value-allowed-list -- centres the page column */
  margin-inline: auto;
}`;
    expect(await lint(code)).toEqual([]);
  });
});

describe('disable comments', () => {
  it('require a reason', async () => {
    const code = `a {
  /* stylelint-disable-next-line declaration-property-value-allowed-list */
  margin-inline: auto;
}`;
    expect(await rules(code)).toContain('--report-descriptionless-disables');
  });

  it('must disable something', async () => {
    const code = `a {
  /* stylelint-disable-next-line declaration-property-value-allowed-list -- not needed */
  margin: 0;
}`;
    expect(await rules(code)).toContain('--report-needless-disables');
  });
});

describe('site tokens', () => {
  const dir = mkdtempSync(join(tmpdir(), 'fossil-stylelint-'));
  afterAll(() => {
    rmSync(dir, { recursive: true, force: true });
  });
  const siteTokens = join(dir, 'site-tokens.css');
  writeFileSync(
    siteTokens,
    ':root {\n  --site-color-heart: var(--fossil-color-blue-600);\n  --site-color-coffee: #6f4e37;\n}\n',
  );
  const siteConfig = fossil({ siteTokens: ['site-tokens.css'], root: dir });

  it('may alias primitives and hold raw values in its own file', async () => {
    const code =
      ':root {\n  --site-color-heart: var(--fossil-color-blue-600);\n  --site-color-coffee: #6f4e37;\n}\n';
    expect(await lint(code, { config: siteConfig, file: siteTokens })).toEqual(
      [],
    );
  });

  it('is known everywhere else', async () => {
    const code = 'a { color: var(--site-color-heart); }';
    expect(
      await lint(code, {
        config: siteConfig,
        file: join(dir, 'Heart.module.css'),
      }),
    ).toEqual([]);
  });

  it('gives no exemption to other files', async () => {
    const code = 'a { --tint: #6f4e37; }';
    expect(
      (
        await lint(code, {
          config: siteConfig,
          file: join(dir, 'Mug.module.css'),
        })
      ).map(({ rule }) => rule),
    ).toContain('declaration-property-value-disallowed-list');
  });
});

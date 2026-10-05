import { ESLint, type Linter } from 'eslint';
import tseslint from 'typescript-eslint';
import { describe, expect, it } from 'vitest';
import config, { fossil, layoutElements } from '../src/index.ts';

async function lint(
  code: string,
  options: { config?: Linter.Config[]; file?: string } = {},
) {
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: [
      { languageOptions: { parser: tseslint.parser } },
      ...(options.config ?? config),
    ],
  });
  const [result] = await eslint.lintText(code, {
    filePath: options.file ?? 'Component.tsx',
  });
  if (!result) throw new Error('ESLint returned no result');
  return result.messages.map(({ ruleId, severity, message }) => ({
    ruleId,
    severity,
    message,
  }));
}

describe('layout through Box', () => {
  it.each(layoutElements)('rejects a raw <%s>', async (element) => {
    expect(await lint(`export const A = () => <${element} />;`)).toEqual([
      {
        ruleId: 'no-restricted-syntax',
        severity: 2,
        message: expect.stringContaining(`<Box as="${element}">`) as string,
      },
    ]);
  });

  it.each([
    ['Box', '<Box as="section" />'],
    ['a component', '<Button>Save</Button>'],
    ['a member expression', '<motion.div />'],
    ['a native control', '<button type="button">Save</button>'],
    ['text', '<p>Hello</p>'],
  ])('accepts %s', async (_, jsx) => {
    expect(await lint(`export const A = () => ${jsx};`)).toEqual([]);
  });

  it('warns instead when asked', async () => {
    const [message] = await lint('export const A = () => <div />;', {
      config: fossil({ layoutElements: 'warn' }),
    });
    expect(message?.severity).toBe(1);
  });

  it('leaves files outside `files` alone', async () => {
    expect(
      await lint('export const A = () => <div />;', {
        config: fossil({ files: ['src/**/*.tsx'] }),
        file: 'stories/A.tsx',
      }),
    ).toEqual([]);
  });
});

describe('disable comments', () => {
  it('accepts a disable with a reason', async () => {
    expect(
      await lint(
        '// eslint-disable-next-line no-restricted-syntax -- a third-party slot needs a plain element\nexport const A = () => <div />;',
      ),
    ).toEqual([]);
  });

  it('rejects a disable without a reason', async () => {
    const messages = await lint(
      '// eslint-disable-next-line no-restricted-syntax\nexport const A = () => <div />;',
    );
    expect(messages.map(({ ruleId }) => ruleId)).toEqual([
      '@eslint-community/eslint-comments/require-description',
    ]);
  });

  it('rejects a disable that disables nothing', async () => {
    const messages = await lint(
      '// eslint-disable-next-line no-restricted-syntax -- no longer needed\nexport const A = () => <Box />;',
    );
    expect(messages).toEqual([
      expect.objectContaining({ ruleId: null, severity: 2 }),
    ]);
  });
});

describe('deprecations', () => {
  it('is off by default', () => {
    expect(
      config.some((entry) => entry.rules?.['@typescript-eslint/no-deprecated']),
    ).toBe(false);
  });

  it('flags a deprecated export when asked', async () => {
    const eslint = new ESLint({
      cwd: import.meta.dirname,
      overrideConfigFile: true,
      overrideConfig: [
        ...tseslint.configs.recommendedTypeChecked,
        {
          languageOptions: {
            parserOptions: {
              projectService: { allowDefaultProject: ['*.tsx'] },
              tsconfigRootDir: import.meta.dirname,
            },
          },
        },
        ...fossil({ deprecations: true }),
      ],
    });
    const [result] = await eslint.lintText(
      '/** @deprecated Use Next. */\nexport const Old = 1;\nexport const value = Old;\n',
      { filePath: 'Deprecated.tsx' },
    );
    expect(result?.messages.map(({ ruleId }) => ruleId)).toEqual([
      '@typescript-eslint/no-deprecated',
    ]);
  });
});

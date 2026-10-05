import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { layoutElements } from '@fossil-design/eslint-config';
import { ESLint } from 'eslint';
import stylelint from 'stylelint';
import tseslint from 'typescript-eslint';
import { describe, expect, it } from 'vitest';
import { boxElements } from '../packages/react/src/components/Box/variants.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const fixture = (name: string) =>
  readFileSync(new URL(`../smoke/off-system/${name}`, import.meta.url), 'utf8');

// Linted as if it were one of Fossil's own components.
const componentDir = `${root}packages/react/src/components/OffSystem/`;

describe("Fossil's own lint configs", () => {
  it('ban exactly the elements Box renders', () => {
    expect([...layoutElements].sort()).toEqual([...boxElements].sort());
  });

  it('reject the raw <div> in an off-system component', async () => {
    const eslint = new ESLint({
      cwd: root,
      // The fixture isn't in a tsconfig project, so type information is off for it alone.
      overrideConfig: [tseslint.configs.disableTypeChecked],
    });
    const [result] = await eslint.lintText(fixture('OffSystem.tsx'), {
      filePath: `${componentDir}OffSystem.tsx`,
    });
    expect(result?.messages.map(({ ruleId, line }) => [ruleId, line])).toEqual([
      ['no-restricted-syntax', 7],
    ]);
  });

  it('reject the margin, primitive token and hex colour in its stylesheet', async () => {
    const { results } = await stylelint.lint({
      code: fixture('off-system.module.css'),
      codeFilename: `${componentDir}off-system.module.css`,
      configFile: `${root}stylelint.config.js`,
    });
    const warnings = results[0]?.warnings ?? [];
    expect(warnings.map(({ rule, line }) => [rule, line]).sort()).toEqual(
      [
        ['declaration-property-value-allowed-list', 4],
        ['declaration-property-value-disallowed-list', 7],
        ['declaration-property-value-disallowed-list', 10],
        ['scale-unlimited/declaration-strict-value', 10],
      ].sort(),
    );
  });
});

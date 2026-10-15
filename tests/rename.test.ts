import { describe, expect, it } from 'vitest';
import {
  patterns,
  rename,
  repoOf,
  rewrites,
  rootName,
  type Identity,
} from '../scripts/rename.ts';

const fossil: Identity = {
  name: 'Fossil Design',
  cssPrefix: 'fossil',
  npmScope: '@fossil-design',
  repo: 'ibrahimmoazzam/fossil-design',
};
const acme: Identity = {
  name: 'Acme Design',
  cssPrefix: 'acme',
  npmScope: '@acme-design',
  repo: 'acme/acme-design',
};
const toAcme = (text: string) => rename(text, rewrites(fossil, acme));

/**
 * Every fixture is written from the two identities rather than spelled out, because `pnpm rename`
 * rewrites this file along with the rest of a fork: a literal `--fossil-space-m` becomes the
 * fork's prefix while the expectation beside it keeps Fossil's, and the case fails for the one
 * reason that proves the rename worked.
 */
describe('rename', () => {
  it('renames package names, imports and dependencies', () => {
    expect(toAcme(`import { Box } from '${fossil.npmScope}/react';`)).toBe(
      `import { Box } from '${acme.npmScope}/react';`,
    );
    expect(toAcme(`"${fossil.npmScope}/tokens": "workspace:*"`)).toBe(
      `"${acme.npmScope}/tokens": "workspace:*"`,
    );
    expect(toAcme(`'${fossil.npmScope}/tokens': patch`)).toBe(
      `'${acme.npmScope}/tokens': patch`,
    );
  });

  it('renames custom properties, the bin and the AGENTS.md markers', () => {
    expect(toAcme(`padding: var(--${fossil.cssPrefix}-space-m);`)).toBe(
      `padding: var(--${acme.cssPrefix}-space-m);`,
    );
    expect(toAcme(`npx ${fossil.cssPrefix}-agents-md --check`)).toBe(
      `npx ${acme.cssPrefix}-agents-md --check`,
    );
    expect(
      toAcme(`<!-- BEGIN:${fossil.npmScope.slice(1)}-agent-rules -->`),
    ).toBe(`<!-- BEGIN:${acme.npmScope.slice(1)}-agent-rules -->`);
  });

  it('renames the foundations markers, which the token build names after the prefix', () => {
    expect(toAcme(`<!-- ${fossil.cssPrefix}:foundations:start -->`)).toBe(
      `<!-- ${acme.cssPrefix}:foundations:start -->`,
    );
    expect(toAcme(`<!-- ${fossil.cssPrefix}:foundations:end -->`)).toBe(
      `<!-- ${acme.cssPrefix}:foundations:end -->`,
    );
  });

  it('renames the scope where a badge label spells it percent-encoded', () => {
    expect(
      toAcme(
        `https://img.shields.io/npm/v/${fossil.npmScope}/react?label=%40${fossil.npmScope.slice(1)}%2Freact`,
      ),
    ).toBe(
      `https://img.shields.io/npm/v/${acme.npmScope}/react?label=%40${acme.npmScope.slice(1)}%2Freact`,
    );
  });

  it('renames the repository in its URLs', () => {
    expect(toAcme(`git+https://github.com/${fossil.repo}.git`)).toBe(
      `git+https://github.com/${acme.repo}.git`,
    );
    expect(toAcme(`https://github.com/${fossil.repo}/issues`)).toBe(
      `https://github.com/${acme.repo}/issues`,
    );
  });

  it('names the workspace root after the repository', () => {
    expect(rootName(acme.repo)).toBe('acme-design');
    expect(rootName('acme-design')).toBe('acme-design');
  });

  it('leaves what only looks like the old names', () => {
    for (const text of [
      // The vendor key in a token file, which stays. The CSS prefix is rewritten with its -- and
      // - around it, or with its colon, so the bare word isn't one: the Figma stamp is the prefix
      // itself and never a literal here.
      `getSharedPluginData('${fossil.cssPrefix}', key)`,
      'com.ibrahimmoazzam.fossil',
      // Local names, generic already, so there is nothing to rename.
      'brand.config.json',
      '.claude/skills/fossil-figma-sync/SKILL.md',
      // Longer names that start with the old ones.
      `${fossil.npmScope}er/react`,
      `my-${fossil.cssPrefix}-agents-md`,
      `--${fossil.cssPrefix}ized-`,
      `${fossil.repo}-notes`,
    ])
      expect(toAcme(text)).toBe(text);
  });

  it("doesn't match a scope inside a longer one, when the new scope contains the old", () => {
    const longer = rewrites(acme, { ...acme, npmScope: '@acme-design-system' });
    expect(
      rename(
        `${acme.npmScope}/react and ${acme.npmScope}-system/react`,
        longer,
      ),
    ).toBe(`${acme.npmScope}-system/react and ${acme.npmScope}-system/react`);
  });

  it('rewrites nothing when nothing changes', () => {
    expect(rewrites(fossil, fossil)).toEqual([]);
    expect(rewrites(fossil, { ...fossil, name: 'Other' })).toEqual([]);
  });
});

describe('repoOf', () => {
  it('reads owner and name from the URLs package.json holds', () => {
    expect(repoOf(`git+https://github.com/${fossil.repo}.git`)).toBe(
      fossil.repo,
    );
    expect(repoOf(`https://github.com/${acme.repo}`)).toBe(acme.repo);
    expect(repoOf(`git@github.com:${acme.repo}.git`)).toBe(acme.repo);
  });

  it("refuses a repository that isn't on GitHub", () => {
    expect(() => repoOf(`https://gitlab.com/${acme.repo}.git`)).toThrow(
      "isn't a GitHub URL",
    );
  });
});

describe('patterns', () => {
  it('accept what brand.config.json accepts', () => {
    expect(patterns.cssPrefix.test('acme')).toBe(true);
    expect(patterns.cssPrefix.test('Acme')).toBe(false);
    expect(patterns.npmScope.test('@acme-design')).toBe(true);
    expect(patterns.npmScope.test('acme-design')).toBe(false);
    expect(patterns.repo.test('acme/acme-design')).toBe(true);
    expect(patterns.repo.test('https://github.com/acme/acme-design')).toBe(
      false,
    );
  });
});

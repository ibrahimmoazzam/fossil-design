import { existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { autolink } from './autolink.ts';
import { codeTarget, codeTerms, components } from './links.ts';
import { repo } from './repo.ts';
import { withSwatches } from './swatches.ts';

const root = fileURLToPath(new URL('../../../', import.meta.url));

describe('autolink', () => {
  it('links the first mention in each section, and again after a heading', () => {
    const out = autolink(
      'Use `Button`, then `Button`.\n\n## Next\n\nA `Button`.',
    );
    expect(out).toBe(
      'Use [`Button`](?path=/docs/actions-button--docs), then `Button`.\n\n## Next\n\nA [`Button`](?path=/docs/actions-button--docs).',
    );
  });

  it('links JSX to the component it names, once with the name itself', () => {
    expect(autolink('`<Box padding="l">`, `<div>` and `Box`')).toBe(
      '[`<Box padding="l">`](?path=/docs/layout-box--docs), `<div>` and `Box`',
    );
  });

  it('leaves headings, code blocks, links and URLs as they are', () => {
    const source = [
      '# Storybook',
      '```',
      'Storybook `Button`',
      '```',
      '[Storybook](https://example.com) and https://storybook.js.org/x',
    ].join('\n');
    expect(autolink(source)).toBe(source);
  });

  it('links names in running text only when they stand alone', () => {
    expect(autolink('Figma, Figmas and Polaris, not Polar.')).toBe(
      '[Figma](https://www.figma.com/), Figmas and [Polaris](https://shopify.dev/docs/api/polaris), not [Polar](https://polar.sh/).',
    );
    expect(autolink('Material Symbols')).toBe(
      '[Material Symbols](https://fonts.google.com/icons)',
    );
  });

  it('links an ADR, and each one in a list', () => {
    expect(autolink('See ADR 0013.')).toMatch(
      /^See \[ADR 0013\]\(\?path=\/docs\/architecture-decision-records--docs#0013-[a-z-]+\)\.$/,
    );
    expect(autolink('ADRs 0016 and 0017')).toMatch(
      /^ADRs \[0016\]\(.+#0016-[a-z-]+\) and \[0017\]\(.+#0017-[a-z-]+\)$/,
    );
  });

  it('links a semantic token, by path or custom property, to its group in the reference', () => {
    expect(autolink('`color.text.muted` and `--fossil-space-m`')).toBe(
      '[`color.text.muted`](?path=/docs/foundations-tokens--docs#color) and [`--fossil-space-m`](?path=/docs/foundations-tokens--docs#space)',
    );
    expect(autolink('`base.color.gray.600`')).toBe('`base.color.gray.600`');
  });

  it("doesn't link a page to itself, except to an ADR's place on it", () => {
    expect(autolink('`Button`', 'actions-button')).toBe('`Button`');
    expect(autolink('ADR 0001', 'architecture-decision-records')).toMatch(
      /^\[ADR 0001\]/,
    );
  });
});

describe('the links', () => {
  it('give every component with stories a docs page', () => {
    const folder = new URL('../src/components/', import.meta.url);
    const names = readdirSync(folder).filter((name) =>
      existsSync(new URL(`${name}/${name}.stories.tsx`, folder)),
    );
    expect(Object.keys(components).sort()).toEqual(names.sort());
  });

  it('point only at repository files that exist', () => {
    const inRepo = codeTerms
      .map((term) => [term, codeTarget(term)?.href ?? ''] as const)
      .filter(([, href]) => href.startsWith(`${repo}/`));
    expect(inRepo.length).toBeGreaterThan(20);
    for (const [term, href] of inRepo) {
      const path = href.replace(new RegExp(`^${repo}/(blob|tree)/main/`), '');
      expect(existsSync(`${root}${path}`), `${term}: ${path}`).toBe(true);
    }
  });
});

describe('withSwatches', () => {
  it('puts a swatch before each colour value, light and dark, and only in the colour table', () => {
    const reference = [
      '## color',
      '| Token | Custom property | Value | Dark | Use |',
      '| `color.a` | `--a` | #0f0f10 at 8% | #ffffff | A. |',
      '| `color.b` | `--b` | transparent |  | B. |',
      '## space',
      '| `space.m` | `--m` | #ffffff | M. |',
    ].join('\n');
    const lines = withSwatches(reference).split('\n');
    expect(lines[2]).toContain(
      '<span class="token-swatch" aria-hidden="true" style="color: rgb(15 15 16 / 0.08)"></span> #0f0f10 at 8% |',
    );
    expect(lines[2]).toContain(
      'style="color: rgb(255 255 255 / 1)"></span> #ffffff |',
    );
    expect(lines[3]).toBe('| `color.b` | `--b` | transparent |  | B. |');
    expect(lines[5]).toBe('| `space.m` | `--m` | #ffffff | M. |');
  });
});

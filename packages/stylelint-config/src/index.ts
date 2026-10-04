import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import lintLists from '@fossil-design/tokens/lint.json' with { type: 'json' };
import type { Config } from 'stylelint';

const require = createRequire(import.meta.url);

export interface FossilOptions {
  /**
   * The app's own token files, such as `src/styles/site-tokens.css`. Their custom properties
   * count as known everywhere. Inside them, and only there, primitive tokens and raw values
   * are allowed, so a site token can alias a Fossil primitive or hold a brand-specific colour.
   */
  siteTokens?: readonly string[];
  /** The directory `siteTokens` paths resolve from. Defaults to the working directory. */
  root?: string;
}

/**
 * Properties that must take a custom property or a plain keyword. Shorthands such as
 * `border`, `background`, `outline`, `transition` and `font` are expanded, and each
 * longhand that matches is checked.
 */
const tokenProperties = [
  '/color$/',
  'fill',
  'stroke',
  '/^padding/',
  'gap',
  'row-gap',
  'column-gap',
  '/radius$/',
  'font-family',
  'font-size',
  'font-weight',
  'letter-spacing',
  'line-height',
  '/duration$/',
];

const keywords = [
  'inherit',
  'initial',
  'unset',
  'revert',
  'revert-layer',
  'transparent',
  'currentColor',
  'currentcolor',
  'none',
  'normal',
  '0',
];

const rawColour =
  /#[\da-f]{3,8}(?![\w-])|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/i;

/** Matches any of `names` as a whole custom property name, so `--a-1` doesn't match `--a-10`. */
function matcher(names: readonly string[]): RegExp {
  const escaped = names.map((name) =>
    name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
  );
  return new RegExp(`(?:${escaped.join('|')})(?![\\w-])`);
}

const deprecatedNames = Object.keys(lintLists.deprecated);
const primitive =
  lintLists.primitive.length > 0 ? matcher(lintLists.primitive) : undefined;
const deprecated =
  deprecatedNames.length > 0 ? matcher(deprecatedNames) : undefined;

function disallowedMessage(property: string, value: string): string {
  const name = deprecatedNames.find((candidate) =>
    matcher([candidate]).test(value),
  );
  if (name) {
    const replacement = lintLists.deprecated[name]?.replacedBy;
    return `${name} in "${property}" is deprecated${replacement ? `. Use ${replacement}` : ''}`;
  }
  if (primitive?.test(value)) {
    return `"${value}" in "${property}" uses a primitive token. Use a semantic token; only site tokens may alias primitives`;
  }
  return `"${value}" in "${property}" is a raw colour. Use a semantic colour token`;
}

/**
 * Fossil Design's Stylelint config: semantic tokens only, no raw colours, spacing, radii,
 * fonts or durations, and no margins other than `0`.
 */
export function fossil({
  siteTokens = [],
  root = process.cwd(),
}: FossilOptions = {}): Config {
  const siteTokenFiles = siteTokens.map((file) => resolve(root, file));

  return {
    plugins: [
      require.resolve('stylelint-declaration-strict-value'),
      require.resolve('stylelint-value-no-unknown-custom-properties'),
    ],
    reportDescriptionlessDisables: true,
    reportNeedlessDisables: true,
    reportInvalidScopeDisables: true,
    rules: {
      'scale-unlimited/declaration-strict-value': [
        tokenProperties,
        {
          ignoreValues: keywords,
          ignoreFunctions: false,
          expandShorthand: true,
          recurseLonghand: true,
          disableFix: true,
          message: 'Expected a token for "${value}" of "${property}"',
        },
      ],
      'csstools/value-no-unknown-custom-properties': [
        true,
        {
          importFrom: [
            require.resolve('@fossil-design/tokens/tokens.css'),
            ...siteTokenFiles,
          ],
        },
      ],
      'declaration-property-value-disallowed-list': [
        {
          '/.*/': [primitive, deprecated, rawColour].filter(
            (pattern) => pattern !== undefined,
          ),
        },
        { message: disallowedMessage },
      ],
      'declaration-property-value-allowed-list': [
        { '/^margin/': ['0'] },
        {
          message: (property: string, value: string) =>
            `"${property}: ${value}" is a margin. Space with padding and gap; a margin other than 0 needs a disable comment with its reason`,
        },
      ],
    },
    overrides:
      siteTokenFiles.length > 0
        ? [
            {
              files: siteTokenFiles,
              rules: {
                'scale-unlimited/declaration-strict-value': null,
                'declaration-property-value-disallowed-list': deprecated
                  ? [{ '/.*/': [deprecated] }, { message: disallowedMessage }]
                  : null,
              },
            },
          ]
        : [],
  };
}

export default fossil();

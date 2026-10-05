import comments from '@eslint-community/eslint-plugin-eslint-comments';
import type { Linter } from 'eslint';

export interface FossilOptions {
  /**
   * How a raw layout element such as `<div>` is reported. Defaults to `'error'`; `'warn'`
   * suits an app still moving onto Fossil.
   */
  layoutElements?: 'error' | 'warn';
  /**
   * Adds `@typescript-eslint/no-deprecated`, which flags deprecated Fossil components and
   * props. It needs typescript-eslint's plugin and type information, so register both first,
   * for example with `tseslint.configs.recommendedTypeChecked`.
   */
  deprecations?: boolean;
  /** The files the JSX rule applies to. Defaults to every `.jsx` and `.tsx` file. */
  files?: string[];
}

/** The elements `<Box as="…">` renders. Kept equal to `boxElements` by a workspace test. */
export const layoutElements = [
  'div',
  'span',
  'section',
  'article',
  'aside',
  'header',
  'footer',
  'main',
  'nav',
  'ul',
  'ol',
  'li',
  'dl',
  'dt',
  'dd',
  'form',
  'fieldset',
  'figure',
] as const;

/**
 * `no-restricted-syntax` entries that ban each raw layout element. A config that sets its own
 * `no-restricted-syntax` replaces Fossil's, so spread these into it to keep both.
 */
export const layoutElementRestrictions = layoutElements.map((element) => ({
  selector: `JSXOpeningElement[name.type='JSXIdentifier'][name.name='${element}']`,
  message: `Use <Box as="${element}"> instead of a raw <${element}>. Box takes token-typed layout props; a disable needs a reason after "--".`,
}));

/**
 * Fossil Design's ESLint config: layout goes through `Box`, and every disable comment says
 * why. Spread it after your own configs.
 */
export function fossil({
  layoutElements: severity = 'error',
  deprecations = false,
  files = ['**/*.jsx', '**/*.tsx'],
}: FossilOptions = {}): Linter.Config[] {
  const configs: Linter.Config[] = [
    {
      name: 'fossil/disables',
      files: ['**/*.{js,mjs,cjs,jsx,ts,mts,cts,tsx}'],
      linterOptions: { reportUnusedDisableDirectives: 'error' },
      plugins: {
        '@eslint-community/eslint-comments': comments,
      },
      rules: {
        '@eslint-community/eslint-comments/require-description': [
          'error',
          {
            ignore: [
              'eslint-enable',
              'eslint-env',
              'exported',
              'global',
              'globals',
            ],
          },
        ],
      },
    },
    {
      name: 'fossil/layout',
      files,
      rules: {
        'no-restricted-syntax': [severity, ...layoutElementRestrictions],
      },
    },
  ];
  if (deprecations) {
    configs.push({
      name: 'fossil/deprecations',
      files: ['**/*.{ts,tsx,mts,cts}'],
      rules: { '@typescript-eslint/no-deprecated': 'error' },
    });
  }
  return configs;
}

const config: Linter.Config[] = fossil();

export default config;

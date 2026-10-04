import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { mediaQueries, tokenKeys } from '@fossil-design/tokens';
import tokensJson from '@fossil-design/tokens/tokens.json' with { type: 'json' };
import iconNames from '../icons.json' with { type: 'json' };
import { boxVariants, surfaceTokens } from '../src/components/Box/variants.ts';

const { tokens } = tokensJson;
const out = new URL('../src/generated/', import.meta.url);

function cssVar(path: string): string {
  const token = tokens[path];
  if (!token || typeof token.cssVar !== 'string') {
    throw new Error(
      `Box needs the token ${path}, which the token build doesn't have`,
    );
  }
  if (token.tier !== 'semantic') {
    throw new Error(
      `Box may only use semantic tokens, but ${path} is ${token.tier}`,
    );
  }
  return `var(${token.cssVar})`;
}

const kebab = (name: string) =>
  name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

type Rule = [className: string, declarations: Record<string, string>];

/** Props that can change at each breakpoint, as [prop, CSS property, value → CSS value]. */
const responsive: [
  prop: string,
  values: readonly string[],
  value: (key: string) => string,
][] = [
  ['paddingBlock', tokenKeys.space, (key) => cssVar(`space.${key}`)],
  ['paddingInline', tokenKeys.space, (key) => cssVar(`space.${key}`)],
  ['gap', tokenKeys.space, (key) => cssVar(`space.${key}`)],
  ['display', boxVariants.display, (key) => key],
  ['flexDirection', boxVariants.flexDirection, (key) => key],
  ['alignItems', boxVariants.alignItems, (key) => key],
  ['justifyContent', boxVariants.justifyContent, (key) => key],
];

const responsiveRules = (prefix: string): Rule[] =>
  responsive.flatMap(([prop, values, value]) =>
    values.map((key): Rule => [
      `${prefix}${kebab(prop)}-${key}`,
      { [kebab(prop)]: value(key) },
    ]),
  );

const surfaceRules = Object.entries(surfaceTokens).map(
  ([surface, { background, text }]): Rule => {
    const checked = tokens[text]?.contrast?.against ?? [];
    if (!checked.includes(background)) {
      throw new Error(
        `Surface "${surface}" pairs ${text} with ${background}, but the token build doesn't check that contrast`,
      );
    }
    return [
      `surface-${surface}`,
      { 'background-color': cssVar(background), color: cssVar(text) },
    ];
  },
);

const radiusRules = tokenKeys.radius.map((key): Rule => [
  `radius-${key}`,
  { 'border-radius': cssVar(`radius.${key}`) },
]);

function print(rules: Rule[], indent = ''): string {
  return rules
    .map(([className, declarations]) => {
      const body = Object.entries(declarations)
        .map(([property, value]) => `${indent}  ${property}: ${value};`)
        .join('\n');
      return `${indent}.${className} {\n${body}\n${indent}}`;
    })
    .join('\n\n');
}

// Source order is the cascade: base rules first, then each breakpoint from narrowest to widest.
const css = [
  "/* Box's classes, generated from @fossil-design/tokens by scripts/generate.ts. Don't edit this file. */",
  print([['box', { 'box-sizing': 'border-box', margin: '0', padding: '0' }]]),
  print(responsiveRules('')),
  print(surfaceRules),
  print(radiusRules),
  ...Object.entries(mediaQueries).map(
    ([breakpoint, query]) =>
      `@media ${query} {\n${print(responsiveRules(`${breakpoint}-`), '  ')}\n}`,
  ),
].join('\n\n');

mkdirSync(out, { recursive: true });
writeFileSync(new URL('box.module.css', out), `${css}\n`);

// Icons: each Material Symbol named in icons.json becomes a component, so consumers need no SVGR.
const require = createRequire(import.meta.url);

const pascal = (name: string) =>
  name.replace(/(?:^|[_-])([a-z0-9])/g, (_, c: string) => c.toUpperCase());

const icons = iconNames.map((name) => {
  const svg = readFileSync(
    require.resolve(`@material-symbols/svg-400/rounded/${name}.svg`),
    'utf8',
  );
  const viewBox = /viewBox="([^"]+)"/.exec(svg)?.[1];
  const paths = [...svg.matchAll(/<path d="([^"]+)"/g)].map(([, d]) => d);
  if (!viewBox || paths.length === 0) {
    throw new Error(`Can't read the Material Symbol ${name}`);
  }
  return `export const ${pascal(name)}Icon = createIcon('${pascal(name)}Icon', '${viewBox}', ${JSON.stringify(paths)});`;
});

writeFileSync(
  new URL('icons.ts', out),
  [
    "// Material Symbols (Apache-2.0, Google), generated from icons.json by scripts/generate.ts. Don't edit this file.",
    "import { createIcon } from '../components/Icon/createIcon.js';",
    '',
    ...icons,
    '',
  ].join('\n'),
);

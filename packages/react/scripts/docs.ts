/**
 * Writes the docs bundled in the package, so an agent in an app reads docs that match the
 * installed version. Everything comes from source: each component's JSDoc contract and props
 * through react-docgen-typescript, its examples from its stories tagged `example`, its variant
 * maps from the build, and the foundations and the token reference from the token build.
 *
 * It writes nothing and lists every problem if a component lacks part of its contract, a prop
 * lacks a description, or an example is missing or uses something an app doesn't have.
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  withCustomConfig,
  type ComponentDoc,
  type PropItem,
} from 'react-docgen-typescript';
import ts from 'typescript';
import { docgenOptions } from './docgen.ts';

export const SECTIONS = [
  'When to use',
  'When not to use',
  'States',
  'Accessibility',
] as const;
export const ACCESSIBILITY = ['Built in', 'Up to you'] as const;
export const EXAMPLE_TAG = 'example';

export interface Contract {
  summary: string;
  whenToUse: string;
  whenNotToUse: string;
  states: string;
  accessibility: { builtIn: string; upToYou: string };
}

export interface Example {
  name: string;
  description: string;
  /** The imports and the code, as an app would write them. */
  code: string;
  /** Values the example stands in for, which the app supplies: name and description. */
  placeholders: [string, string][];
}

export interface Prop {
  name: string;
  type: string;
  required: boolean;
  default?: string;
  description: string;
}

export interface ComponentDocs extends Contract {
  name: string;
  /** The Storybook group, such as `Actions`. */
  group: string;
  props: Prop[];
  variants?: Record<string, readonly string[]>;
  examples: Example[];
}

/** What the generator needs from outside: the source, the package's exports and its names. */
export interface Inputs {
  /** The package folder. */
  root: string;
  /** The package's runtime exports. */
  exports: Record<string, unknown>;
  /** The package name, such as `@fossil-design/react`. */
  packageName: string;
}

const list = (items: readonly string[]): string =>
  items.length < 2
    ? items.join('')
    : `${items.slice(0, -1).join(', ')} and ${String(items.at(-1))}`;
const quoted = (items: readonly string[]) => list(items.map((i) => `"${i}"`));

/** The text before a Markdown document's first heading at `level`, and each heading's text. */
function sections(
  text: string,
  level: number,
): { lead: string; parts: [string, string][] } {
  const marker = `${'#'.repeat(level)} `;
  const lead: string[] = [];
  const parts: [string, string[]][] = [];
  for (const line of text.split('\n')) {
    if (line.startsWith(marker))
      parts.push([line.slice(marker.length).trim(), []]);
    else (parts.at(-1)?.[1] ?? lead).push(line);
  }
  return {
    lead: lead.join('\n').trim(),
    parts: parts.map(([heading, lines]) => [heading, lines.join('\n').trim()]),
  };
}

/**
 * Reads a component's JSDoc contract: a summary, then `## When to use`, `## When not to use`,
 * `## States` and `## Accessibility`, which splits into `### Built in` and `### Up to you`.
 */
export function readContract(description: string): {
  contract?: Contract;
  problems: string[];
} {
  const problems: string[] = [];
  const { lead, parts } = sections(description, 2);
  if (lead === '')
    problems.push('the JSDoc has no summary before its sections');
  const headings = parts.map(([heading]) => heading);
  if (headings.join('\n') !== SECTIONS.join('\n'))
    problems.push(
      `the JSDoc needs the sections ${quoted(SECTIONS)}, in that order, but has ${headings.length === 0 ? 'none' : quoted(headings)}`,
    );
  const text = new Map(parts);
  for (const [heading, body] of parts)
    if (body === '') problems.push(`the JSDoc's "${heading}" section is empty`);

  const a11y = sections(text.get('Accessibility') ?? '', 3);
  const a11yHeadings = a11y.parts.map(([heading]) => heading);
  if (
    text.has('Accessibility') &&
    a11yHeadings.join('\n') !== ACCESSIBILITY.join('\n')
  )
    problems.push(
      `the JSDoc's "Accessibility" section needs ${quoted(ACCESSIBILITY.map((h) => `### ${h}`))}, but has ${a11yHeadings.length === 0 ? 'neither' : quoted(a11yHeadings)}`,
    );
  const a11yText = new Map(a11y.parts);
  for (const [heading, body] of a11y.parts)
    if (body === '')
      problems.push(`the JSDoc's "Accessibility › ${heading}" is empty`);

  if (problems.length > 0) return { problems };
  return {
    problems,
    contract: {
      summary: lead,
      whenToUse: text.get('When to use') ?? '',
      whenNotToUse: text.get('When not to use') ?? '',
      states: text.get('States') ?? '',
      accessibility: {
        builtIn: a11yText.get('Built in') ?? '',
        upToYou: a11yText.get('Up to you') ?? '',
      },
    },
  };
}

const unwrap = (node: ts.Expression): ts.Expression => {
  let inner = node;
  while (
    ts.isParenthesizedExpression(inner) ||
    ts.isSatisfiesExpression(inner) ||
    ts.isAsExpression(inner)
  )
    inner = inner.expression;
  return inner;
};

const nameOf = (node: ts.ObjectLiteralElementLike): string | undefined =>
  node.name !== undefined &&
  (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name))
    ? node.name.text
    : undefined;

function property(
  object: ts.ObjectLiteralExpression | undefined,
  name: string,
): ts.Expression | undefined {
  const found = object?.properties.find((p) => nameOf(p) === name);
  if (found === undefined) return undefined;
  if (ts.isPropertyAssignment(found)) return unwrap(found.initializer);
  if (ts.isShorthandPropertyAssignment(found)) return found.name;
  // A method, such as render() { … }: return it as a function expression of the same shape.
  if (ts.isMethodDeclaration(found)) return found as unknown as ts.Expression;
  return undefined;
}

const jsDocOf = (node: ts.Node): string =>
  ts
    .getJSDocCommentsAndTags(node)
    .filter(ts.isJSDoc)
    .map((doc) => ts.getTextOfJSDocComment(doc.comment) ?? '')
    .join('\n')
    .trim();

/** The indentation of the line a position is on. */
function lineIndent(file: ts.SourceFile, position: number): number {
  const { line } = file.getLineAndCharacterOfPosition(position);
  const text = file.text.slice(
    file.getPositionOfLineAndCharacter(line, 0),
    file.getLineEndOfPosition(position),
  );
  return text.length - text.trimStart().length;
}

/** Moves every line but the first left by up to `by` spaces. */
function dedent(text: string, by: number): string {
  return text
    .split('\n')
    .map((line, i) => {
      if (i === 0) return line;
      const indent = line.length - line.trimStart().length;
      return line.slice(Math.min(by, indent));
    })
    .join('\n');
}

/** A node's source, with its continuation lines moved left by the indentation of its first line. */
const sourceOf = (node: ts.Node, file: ts.SourceFile): string =>
  dedent(node.getText(file), lineIndent(file, node.getStart(file)));

const indent = (text: string, by: number) =>
  text
    .split('\n')
    .map((line) => (line === '' ? line : `${' '.repeat(by)}${line}`))
    .join('\n');

const isSpy = (node: ts.Expression) =>
  ts.isCallExpression(node) &&
  ts.isIdentifier(node.expression) &&
  node.expression.text === 'fn';

const isUndefined = (node: ts.Expression) =>
  ts.isIdentifier(node) && node.text === 'undefined';

const isText = (
  node: ts.Expression,
): node is ts.StringLiteral | ts.NoSubstitutionTemplateLiteral =>
  ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node);

function attribute(
  name: string,
  value: ts.Expression,
  file: ts.SourceFile,
): string {
  if (isText(value))
    return value.text.includes('"')
      ? `${name}={${JSON.stringify(value.text)}}`
      : `${name}="${value.text}"`;
  if (value.kind === ts.SyntaxKind.TrueKeyword) return name;
  return `${name}={${sourceOf(value, file)}}`;
}

function childrenText(value: ts.Expression, file: ts.SourceFile): string {
  if (isText(value))
    return /[{}<>]/.test(value.text)
      ? `{${JSON.stringify(value.text)}}`
      : value.text;
  if (ts.isJsxFragment(value)) {
    const first = value.children[0];
    const last = value.children.at(-1);
    if (first === undefined || last === undefined) return '';
    return dedent(
      file.text.slice(first.pos, last.end).trim(),
      lineIndent(file, value.getStart(file)) + 2,
    );
  }
  if (ts.isJsxElement(value) || ts.isJsxSelfClosingElement(value))
    return sourceOf(value, file);
  return `{${sourceOf(value, file)}}`;
}

/** JSX for an element, on one line when it fits in 80 characters. */
export function element(
  name: string,
  attributes: readonly string[],
  children?: string,
): string {
  const opening = `<${[name, ...attributes].join(' ')}`;
  const oneLine = !opening.includes('\n') && opening.length + 2 <= 80;
  const start = oneLine
    ? opening
    : `<${name}\n${attributes.map((a) => indent(a, 2)).join('\n')}\n`;
  if (children === undefined || children === '')
    return oneLine ? `${start} />` : `${start}/>`;
  const inline = `${start}>${children}</${name}>`;
  if (oneLine && !children.includes('\n') && inline.length <= 80) return inline;
  return `${start}>\n${indent(children, 2)}\n</${name}>`;
}

/** The identifiers a piece of code uses but doesn't declare, JSX components included. */
export function freeNames(code: string): string[] {
  const file = ts.createSourceFile(
    'example.tsx',
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const declared = new Set<string>();
  const used = new Set<string>();
  const bind = (name: ts.BindingName) => {
    if (ts.isIdentifier(name)) declared.add(name.text);
    else
      for (const e of name.elements)
        if (!ts.isOmittedExpression(e)) bind(e.name);
  };
  const isReference = (id: ts.Identifier): boolean => {
    const p = id.parent;
    if (ts.isPropertyAccessExpression(p)) return p.expression === id;
    if (ts.isQualifiedName(p)) return p.left === id;
    if (ts.isJsxAttribute(p)) return false;
    if (
      ts.isJsxOpeningElement(p) ||
      ts.isJsxSelfClosingElement(p) ||
      ts.isJsxClosingElement(p)
    )
      return /^[A-Z]/.test(id.text);
    if (ts.isBindingElement(p) && p.propertyName === id) return false;
    if (
      (ts.isPropertyAssignment(p) ||
        ts.isMethodDeclaration(p) ||
        ts.isPropertySignature(p) ||
        ts.isVariableDeclaration(p) ||
        ts.isParameter(p) ||
        ts.isBindingElement(p) ||
        ts.isFunctionDeclaration(p) ||
        ts.isFunctionExpression(p)) &&
      p.name === id
    )
      return false;
    return true;
  };
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) || ts.isParameter(node)) bind(node.name);
    if (
      (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)) &&
      node.name !== undefined
    )
      declared.add(node.name.text);
    if (ts.isIdentifier(node) && isReference(node)) used.add(node.text);
    ts.forEachChild(node, visit);
  };
  visit(file);
  return [...used].filter((name) => !declared.has(name)).sort();
}

const GLOBALS = new Set([
  ...Object.getOwnPropertyNames(globalThis),
  'window',
  'document',
]);

function importLine(names: readonly string[], from: string): string[] {
  if (names.length === 0) return [];
  const one = `import { ${names.join(', ')} } from '${from}';`;
  return [
    one.length <= 80
      ? one
      : `import {\n${names.map((n) => `  ${n},`).join('\n')}\n} from '${from}';`,
  ];
}

export interface StoriesFile {
  file: ts.SourceFile;
  meta?: ts.ObjectLiteralExpression;
  stories: {
    name: string;
    node: ts.VariableDeclaration;
    object: ts.ObjectLiteralExpression;
  }[];
  /** Module-level constants with a JSDoc comment, which an example may stand on. */
  placeholders: Map<string, string>;
}

export function readStories(
  path: string,
  source = readFileSync(path, 'utf8'),
): StoriesFile {
  const file = ts.createSourceFile(
    path,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const result: StoriesFile = { file, stories: [], placeholders: new Map() };
  for (const statement of file.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    const exported = statement.modifiers?.some(
      (m) => m.kind === ts.SyntaxKind.ExportKeyword,
    );
    for (const node of statement.declarationList.declarations) {
      if (!ts.isIdentifier(node.name) || node.initializer === undefined)
        continue;
      const value = unwrap(node.initializer);
      if (node.name.text === 'meta' && ts.isObjectLiteralExpression(value))
        result.meta = value;
      else if (exported === true && ts.isObjectLiteralExpression(value))
        result.stories.push({ name: node.name.text, node, object: value });
      else if (exported !== true && jsDocOf(node) !== '')
        result.placeholders.set(node.name.text, jsDocOf(node));
    }
  }
  return result;
}

function argsOf(
  object: ts.ObjectLiteralExpression | undefined,
): Map<string, ts.Expression> {
  const args = property(object, 'args');
  const map = new Map<string, ts.Expression>();
  if (args === undefined || !ts.isObjectLiteralExpression(args)) return map;
  for (const p of args.properties) {
    const name = nameOf(p);
    if (name === undefined) continue;
    if (ts.isPropertyAssignment(p)) map.set(name, unwrap(p.initializer));
    else if (ts.isShorthandPropertyAssignment(p)) map.set(name, p.name);
  }
  return map;
}

/** The code of one example story: its own render, or the component with the story's args. */
function exampleCode(
  component: string,
  stories: StoriesFile,
  story: StoriesFile['stories'][number],
  props: readonly Prop[],
): { code?: string; problems: string[] } {
  const { file } = stories;
  const render = property(story.object, 'render');
  if (render !== undefined) {
    const fn = render as ts.Node;
    if (
      !ts.isArrowFunction(fn) &&
      !ts.isFunctionExpression(fn) &&
      !ts.isMethodDeclaration(fn)
    )
      return { problems: ["its render isn't a function written in place"] };
    if (fn.parameters.length > 0)
      return {
        problems: [
          'its render takes args. Write it as an app would, with no args, or drop render and let the args make the example',
        ],
      };
    const body = fn.body;
    if (body === undefined) return { problems: ['its render has no body'] };
    if (!ts.isBlock(body))
      return { code: sourceOf(unwrap(body), file), problems: [] };
    const name =
      ts.isFunctionExpression(fn) && fn.name !== undefined
        ? fn.name.text
        : story.name;
    return { code: `function ${name}() ${sourceOf(body, file)}`, problems: [] };
  }

  const args = new Map([...argsOf(stories.meta), ...argsOf(story.object)]);
  const attributes: string[] = [];
  let children: string | undefined;
  const given = new Set<string>();
  for (const [name, value] of args) {
    if (isSpy(value) || isUndefined(value)) continue;
    given.add(name);
    if (name === 'children') children = childrenText(value, file);
    else attributes.push(attribute(name, value, file));
  }
  const missing = props
    .filter((p) => p.required && !given.has(p.name))
    .map((p) => p.name);
  if (missing.length > 0)
    return {
      problems: [
        `its args leave out ${list(missing.map((m) => `\`${m}\``))}, which ${missing.length === 1 ? 'is' : 'are'} required. Give the story a render that shows how an app supplies ${missing.length === 1 ? 'it' : 'them'}`,
      ],
    };
  return { code: element(component, attributes, children), problems: [] };
}

/** The stories tagged as examples, as an app would write them. */
export function readExamples(
  component: string,
  stories: StoriesFile,
  props: readonly Prop[],
  inputs: Inputs,
  reactExports: ReadonlySet<string>,
): { examples: Example[]; problems: string[] } {
  const problems: string[] = [];
  const examples: Example[] = [];
  for (const story of stories.stories) {
    const tags = property(story.object, 'tags');
    const isExample =
      tags !== undefined &&
      ts.isArrayLiteralExpression(tags) &&
      tags.elements.some((e) => isText(e) && e.text === EXAMPLE_TAG);
    if (!isExample) continue;
    const at = `the example story ${story.name}`;
    const description = jsDocOf(story.node);
    if (description === '')
      problems.push(
        `${at} needs a JSDoc comment saying why an app would do this`,
      );
    const { code, problems: codeProblems } = exampleCode(
      component,
      stories,
      story,
      props,
    );
    problems.push(...codeProblems.map((p) => `${at}: ${p}`));
    if (code === undefined) continue;

    const fossil: string[] = [];
    const react: string[] = [];
    const placeholders: [string, string][] = [];
    for (const name of freeNames(code)) {
      if (name in inputs.exports) fossil.push(name);
      else if (reactExports.has(name)) react.push(name);
      else if (stories.placeholders.has(name))
        placeholders.push([name, stories.placeholders.get(name) ?? '']);
      else if (!GLOBALS.has(name))
        problems.push(
          `${at} uses \`${name}\`, which an app doesn't have. Use ${inputs.packageName}'s and React's exports, or a module-level constant with a JSDoc comment saying what the app puts there`,
        );
    }
    const imports = [
      ...importLine(react, 'react'),
      ...importLine(fossil, inputs.packageName),
    ];
    examples.push({
      name: story.name,
      description,
      code: [...imports, ...(imports.length > 0 ? [''] : []), code].join('\n'),
      placeholders,
    });
  }
  if (examples.length === 0 && problems.length === 0)
    problems.push(
      `no story is tagged '${EXAMPLE_TAG}'. Tag one or more stories that show how an app uses it`,
    );
  return { examples, problems };
}

const typeOf = (prop: PropItem): string =>
  (prop.type.raw ?? prop.type.name).replace(/\s+/g, ' ');

const lowerFirst = (name: string) =>
  `${name.charAt(0).toLowerCase()}${name.slice(1)}`;

/** Each exported component that has its own folder under src/components. */
export function componentNames(inputs: Inputs): string[] {
  const folder = join(inputs.root, 'src/components');
  return readdirSync(folder)
    .filter(
      (name) =>
        name in inputs.exports && existsSync(join(folder, name, `${name}.tsx`)),
    )
    .sort();
}

/** Reads every component's docs from source, and every problem that stops them being complete. */
export function collect(inputs: Inputs): {
  components: ComponentDocs[];
  problems: string[];
} {
  const names = componentNames(inputs);
  const files = names.map((name) =>
    join(inputs.root, 'src/components', name, `${name}.tsx`),
  );
  const parser = withCustomConfig(
    join(inputs.root, 'tsconfig.json'),
    docgenOptions,
  );
  const docs = parser.parse(files);
  const reactExports = new Set(
    Object.keys(
      createRequire(join(inputs.root, 'package.json'))('react') as object,
    ),
  );

  const problems: string[] = [];
  const components: ComponentDocs[] = [];
  for (const [i, name] of names.entries()) {
    const file = files[i] ?? '';
    const fromFile = docs.filter((d) => d.filePath === file);
    for (const stray of fromFile.filter((d) => d.displayName !== name))
      problems.push(
        `${name}: react-docgen-typescript reads \`${stray.displayName}\` in ${name}.tsx as a component, because it has a JSDoc comment. Make that a line comment`,
      );
    const doc: ComponentDoc | undefined = fromFile.find(
      (d) => d.displayName === name,
    );
    if (doc === undefined) {
      problems.push(`${name}: react-docgen-typescript found no component`);
      continue;
    }
    const at = (p: string) => `${name}: ${p}`;
    const { contract, problems: contractProblems } = readContract(
      doc.description,
    );
    problems.push(...contractProblems.map(at));

    const props: Prop[] = Object.values(doc.props).map((p) => ({
      name: p.name,
      type: typeOf(p),
      required: p.required,
      ...(p.defaultValue === null || p.defaultValue === undefined
        ? {}
        : { default: String((p.defaultValue as { value: unknown }).value) }),
      description: p.description.trim(),
    }));
    for (const p of props.filter((p) => p.description === ''))
      problems.push(at(`the prop \`${p.name}\` has no JSDoc description`));

    const storiesPath = join(dirname(file), `${name}.stories.tsx`);
    if (!existsSync(storiesPath)) {
      problems.push(at(`there is no ${name}.stories.tsx`));
      continue;
    }
    const stories = readStories(storiesPath);
    const { examples, problems: exampleProblems } = readExamples(
      name,
      stories,
      props,
      inputs,
      reactExports,
    );
    problems.push(...exampleProblems.map(at));

    const title = property(stories.meta, 'title');
    const variants = inputs.exports[`${lowerFirst(name)}Variants`];
    if (contract !== undefined)
      components.push({
        name,
        group:
          title !== undefined && isText(title)
            ? (title.text.split('/')[0] ?? '')
            : '',
        ...contract,
        props,
        ...(typeof variants === 'object' && variants !== null
          ? { variants: variants as Record<string, readonly string[]> }
          : {}),
        examples,
      });
  }
  return { components, problems };
}

const cell = (text: string) =>
  text.replace(/\s*\n\s*/g, ' ').replaceAll('|', '\\|');
const code = (text: string) => `\`${text}\``;

/** One component's Markdown doc. */
export function componentMarkdown(
  component: ComponentDocs,
  packageName: string,
  header: string,
): string {
  const { name } = component;
  const lines = [
    `<!-- ${header} -->`,
    '',
    `# ${name}`,
    '',
    component.summary,
    '',
    '```tsx',
    `import { ${name} } from '${packageName}';`,
    '```',
    '',
    '## When to use',
    '',
    component.whenToUse,
    '',
    '## When not to use',
    '',
    component.whenNotToUse,
    '',
    '## States',
    '',
    component.states,
    '',
    '## Accessibility',
    '',
    '### Built in',
    '',
    component.accessibility.builtIn,
    '',
    '### Up to you',
    '',
    component.accessibility.upToYou,
    '',
    '## Props',
    '',
    '| Prop | Type | Default | Description |',
    '| --- | --- | --- | --- |',
    ...component.props.map(
      (p) =>
        `| ${code(p.name)}${p.required ? ' (required)' : ''} | ${code(cell(p.type))} | ${p.default === undefined ? '' : code(p.default)} | ${cell(p.description)} |`,
    ),
  ];
  if (component.variants !== undefined) {
    const defaults = new Map(component.props.map((p) => [p.name, p.default]));
    lines.push(
      '',
      '## Variants',
      '',
      `\`${lowerFirst(name)}Variants\` exports these values, for tools and docs to read.`,
      '',
      '| Prop | Values | Default |',
      '| --- | --- | --- |',
      ...Object.entries(component.variants).map(
        ([prop, values]) =>
          `| ${code(prop)} | ${values.map(code).join(', ')} | ${defaults.get(prop) === undefined ? '' : code(String(defaults.get(prop)))} |`,
      ),
    );
  }
  lines.push('', '## Examples');
  for (const example of component.examples)
    lines.push(
      '',
      `### ${example.name.replace(/(?<=[a-z])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])/g, ' ')}`,
      '',
      example.description,
      '',
      '```tsx',
      example.code,
      '```',
      ...(example.placeholders.length === 0
        ? []
        : [
            '',
            ...example.placeholders.map(
              ([placeholder, note]) => `- ${code(placeholder)}: ${note}`,
            ),
          ]),
    );
  return `${lines.join('\n')}\n`;
}

const firstSentence = (text: string) =>
  (/^.*?[.!?](?=\s|$)/s.exec(text)?.[0] ?? text).replace(/\s+/g, ' ');

/** The docs' index: what's here, and each component in a line. */
export function indexMarkdown(
  components: readonly ComponentDocs[],
  icons: readonly string[],
  packageName: string,
  version: string,
  header: string,
): string {
  const groups = new Map<string, ComponentDocs[]>();
  for (const c of components)
    groups.set(c.group, [...(groups.get(c.group) ?? []), c]);
  return `${[
    `<!-- ${header} -->`,
    '',
    `# ${packageName} ${version}`,
    '',
    `These docs ship inside ${packageName}, so they match the installed version. Read [foundations.md](foundations.md) before building UI, and a component's doc before using it.`,
    '',
    '- [foundations.md](foundations.md): the rules, escape hatches, gap logging and the token scales.',
    '- [tokens.md](tokens.md): every token, with its values in light and dark.',
    '- [components.json](components.json) and [tokens.json](tokens.json): the same, as JSON.',
    '',
    '## Components',
    ...[...groups].flatMap(([group, members]) => [
      '',
      `### ${group}`,
      '',
      ...members.map(
        (c) =>
          `- [\`${c.name}\`](components/${c.name}.md): ${firstSentence(c.summary)}`,
      ),
    ]),
    '',
    '## Icons',
    '',
    `${list(icons.map(code))}. Pass one to a component's \`icon\` prop, or pass any SVG component of your own.`,
  ].join('\n')}\n`;
}

/** Fills `{{name}}` placeholders, and fails on one it doesn't know. */
export function fill(
  text: string,
  values: Readonly<Record<string, string>>,
): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    const value = values[key];
    if (value === undefined)
      throw new Error(`docs-src has an unknown placeholder ${match}`);
    return value;
  });
}

const stripHeader = (markdown: string) =>
  markdown.replace(/^<!--.*?-->\n+/s, '');

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const require = createRequire(import.meta.url);
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
    name: string;
    version: string;
    bugs: string;
  };
  const config = JSON.parse(
    readFileSync(join(root, '../../fossil.config.json'), 'utf8'),
  ) as { name: string; cssPrefix: string; npmScope: string };
  const exports = (await import(
    pathToFileURL(join(root, 'dist/index.js')).href
  )) as Record<string, unknown>;
  const inputs: Inputs = { root, exports, packageName: pkg.name };

  const { components, problems } = collect(inputs);
  if (problems.length > 0) {
    for (const problem of problems) console.error(`✗ ${problem}`);
    console.error(
      `\n${String(problems.length)} problem${problems.length === 1 ? '' : 's'} in the component docs. Nothing was written.`,
    );
    process.exit(1);
  }

  const header = `${pkg.name} ${pkg.version}, generated from its source. Matches the installed version.`;
  const tokensDist = dirname(
    require.resolve('@fossil-design/tokens/tokens.json'),
  );
  const icons = Object.keys(exports).filter(
    (name) => name.endsWith('Icon') && name !== 'Icon',
  );
  const rules = fill(readFileSync(join(root, 'docs-src/rules.md'), 'utf8'), {
    name: config.name,
    prefix: config.cssPrefix,
    scope: config.npmScope,
    gapForm: `${pkg.bugs}/new?template=gap.yml`,
  });
  const foundations = [
    `<!-- ${header} -->`,
    '',
    '# Foundations',
    '',
    rules.trim(),
    '',
    '## Tokens',
    '',
    stripHeader(readFileSync(join(tokensDist, 'foundations.md'), 'utf8'))
      .trim()
      .replaceAll(/^## /gm, '### '),
  ].join('\n');

  const out = join(root, 'docs');
  rmSync(out, { recursive: true, force: true });
  mkdirSync(join(out, 'components'), { recursive: true });
  const write = (path: string, text: string) => {
    writeFileSync(join(out, path), text);
  };
  write(
    'index.md',
    indexMarkdown(components, icons, pkg.name, pkg.version, header),
  );
  write('foundations.md', `${foundations}\n`);
  write('tokens.md', readFileSync(join(tokensDist, 'tokens.md'), 'utf8'));
  write('tokens.json', readFileSync(join(tokensDist, 'tokens.json'), 'utf8'));
  write(
    'components.json',
    `${JSON.stringify(
      {
        package: pkg.name,
        version: pkg.version,
        components: Object.fromEntries(
          components.map(({ name, ...rest }) => [
            name,
            { doc: `components/${name}.md`, ...rest },
          ]),
        ),
        icons,
      },
      null,
      2,
    )}\n`,
  );
  for (const component of components)
    write(
      `components/${component.name}.md`,
      componentMarkdown(component, pkg.name, header),
    );
  console.log(
    `Wrote docs for ${String(components.length)} components into docs/.`,
  );
}

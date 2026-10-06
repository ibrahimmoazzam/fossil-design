import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import postcss from 'postcss';
import ts from 'typescript';

/** An attribute's value in JSX: a literal, or one of the component's own props passed through. */
export type Attribute = { value: string } | { ref: string };

/** A JSX element in a component's render, with what the spec needs from it. */
export interface Element {
  /** An element such as `button`, or a component such as `Box` or `Text`. */
  tag: string;
  /** Classes from the component's own CSS Module, in order. */
  classes: { name: string; conditional: boolean }[];
  /** Classes chosen by a prop's value, such as `styles[`tone-${tone}`]`. */
  modifiers: { prefix: string; prop: string }[];
  attributes: Record<string, Attribute>;
  /** What it renders as content, by name: `{children}`, `{title}` or `{tab.label}`. */
  renders: string[];
  children: Element[];
}

/** A rule from a CSS Module that styles one element: classes, attributes and a pseudo-element. */
export interface Rule {
  selector: string;
  classes: string[];
  attributes: string[];
  pseudoElement: string;
  declarations: { property: string; value: string }[];
  /** Classes and attributes count alike: a CSS Module has no ids or elements. */
  specificity: number;
  order: number;
}

export interface Stylesheet {
  rules: Rule[];
  /** Selectors that style a state, an animation or a relationship, which a Figma layer can't show. */
  skipped: string[];
}

export interface ComponentCode {
  name: string;
  /** The exported variant map, such as `buttonVariants`, in declaration order. */
  variants: Record<string, string[]>;
  /** Props with a literal default in the component's parameter list. */
  defaults: Record<string, string>;
  /** The props its own `<Name>Props` and `<Name>OwnProps` types declare. */
  props: string[];
  /** The JSX each return statement of the component renders, last return last. */
  renders: Element[][];
  stylesheet: Stylesheet;
}

const SELECTOR =
  /^\.(-?[_a-zA-Z][\w-]*)((?:\.-?[_a-zA-Z][\w-]*)*)((?:\[[^\]]+\])*)(::(?:before|after))?$/;

const normalise = (selector: string) => selector.replaceAll('"', "'").trim();

/** The rules in a CSS Module that style elements directly, with `composes` followed to their source. */
export function readStylesheet(file: string): Stylesheet {
  const rules: Rule[] = [];
  const skipped: string[] = [];
  const root = postcss.parse(readFileSync(file, 'utf8'), { from: file });
  let order = 0;
  root.walkRules((rule) => {
    const parent = rule.parent;
    if (parent?.type === 'atrule') {
      skipped.push(
        ...rule.selectors.map(
          (s) => `${normalise(s)} in @${(parent as postcss.AtRule).name}`,
        ),
      );
      return;
    }
    const own: Rule['declarations'] = [];
    rule.each((child) => {
      if (child.type !== 'decl') return;
      const composes = /^([\w-]+)\s+from\s+['"](.+)['"]$/.exec(child.value);
      if (child.prop === 'composes' && composes) {
        const [, name, from] = composes;
        const source = readStylesheet(join(dirname(file), String(from)));
        for (const r of source.rules)
          if (
            r.classes.length === 1 &&
            r.classes[0] === name &&
            r.attributes.length === 0 &&
            r.pseudoElement === ''
          )
            own.push(...r.declarations);
        return;
      }
      own.push({ property: child.prop, value: child.value });
    });
    for (const raw of rule.selectors) {
      const selector = normalise(raw);
      const match = SELECTOR.exec(selector);
      if (!match) {
        skipped.push(selector);
        continue;
      }
      const [, first, more = '', attributes = '', pseudoElement = ''] = match;
      const classes = [
        String(first),
        ...more.split('.').filter((c) => c !== ''),
      ];
      const attrs = [...attributes.matchAll(/\[[^\]]+\]/g)].map((m) => m[0]);
      rules.push({
        selector,
        classes,
        attributes: attrs,
        pseudoElement,
        declarations: own,
        specificity: classes.length + attrs.length,
        order: order++,
      });
    }
  });
  return { rules, skipped };
}

const unwrap = (node: ts.Expression): ts.Expression => {
  let e = node;
  while (
    ts.isParenthesizedExpression(e) ||
    ts.isAsExpression(e) ||
    ts.isSatisfiesExpression(e) ||
    ts.isNonNullExpression(e)
  )
    e = e.expression;
  return e;
};

/** The last name in an identifier or a property access: `children`, or `content` in `selected.content`. */
const lastName = (node: ts.Expression): string | undefined => {
  const e = unwrap(node);
  if (ts.isIdentifier(e)) return e.text;
  if (ts.isPropertyAccessExpression(e)) return e.name.text;
  return undefined;
};

/** Reads one component's variant map, defaults and JSX from its `.tsx` file. */
export function readComponent(directory: string, name: string): ComponentCode {
  const file = join(directory, `${name}.tsx`);
  const source = ts.createSourceFile(
    file,
    readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );

  // The CSS Module's default import, usually `styles`.
  let stylesName = '';
  let stylesFile = '';
  for (const statement of source.statements)
    if (
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      statement.moduleSpecifier.text === `./${name}.module.css` &&
      statement.importClause?.name
    ) {
      stylesName = statement.importClause.name.text;
      stylesFile = join(directory, statement.moduleSpecifier.text);
    }

  const consts = new Map<string, ts.Expression>();
  const variants: Record<string, string[]> = {};
  const props = new Set<string>();
  const members = (node: ts.Node) => {
    if (ts.isPropertySignature(node) || ts.isPropertyDeclaration(node)) {
      if (ts.isIdentifier(node.name)) props.add(node.name.text);
      return;
    }
    if (ts.isTypeReferenceNode(node)) return;
    ts.forEachChild(node, members);
  };
  const visitConsts = (node: ts.Node) => {
    if (
      (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) &&
      (node.name.text === `${name}Props` ||
        node.name.text === `${name}OwnProps`)
    )
      ts.forEachChild(node, members);
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer
    ) {
      consts.set(node.name.text, node.initializer);
      const map = unwrap(node.initializer);
      if (
        node.name.text ===
          `${name[0]?.toLowerCase() ?? ''}${name.slice(1)}Variants` &&
        ts.isObjectLiteralExpression(map)
      )
        for (const p of map.properties)
          if (ts.isPropertyAssignment(p) && ts.isIdentifier(p.name)) {
            const values = unwrap(p.initializer);
            if (ts.isArrayLiteralExpression(values))
              variants[p.name.text] = values.elements.flatMap((v) =>
                ts.isStringLiteral(v) ? [v.text] : [],
              );
          }
    }
    ts.forEachChild(node, visitConsts);
  };
  visitConsts(source);

  // The component's own function: `function Button(...)` inside forwardRef, `function Tabs`, or `TextRender`.
  let component: ts.FunctionDeclaration | ts.FunctionExpression | undefined;
  const findComponent = (node: ts.Node) => {
    if (
      (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node)) &&
      (node.name?.text === name || node.name?.text === `${name}Render`)
    )
      component ??= node;
    ts.forEachChild(node, findComponent);
  };
  findComponent(source);
  if (!component?.body)
    throw new Error(`Can't find the function that renders ${name}.`);

  const defaults: Record<string, string> = {};
  const parameter = component.parameters[0]?.name;
  if (parameter && ts.isObjectBindingPattern(parameter))
    for (const element of parameter.elements) {
      const prop = element.propertyName ?? element.name;
      const value = element.initializer && unwrap(element.initializer);
      if (!ts.isIdentifier(prop) || !value) continue;
      if (ts.isStringLiteral(value)) defaults[prop.text] = value.text;
      else if (value.kind === ts.SyntaxKind.TrueKeyword)
        defaults[prop.text] = 'true';
      else if (value.kind === ts.SyntaxKind.FalseKeyword)
        defaults[prop.text] = 'false';
    }

  const classesOf = (
    node: ts.Expression,
    conditional: boolean,
    into: Pick<Element, 'classes' | 'modifiers'>,
  ) => {
    const e = unwrap(node);
    if (
      ts.isPropertyAccessExpression(e) &&
      ts.isIdentifier(e.expression) &&
      e.expression.text === stylesName
    )
      into.classes.push({ name: e.name.text, conditional });
    else if (
      ts.isElementAccessExpression(e) &&
      ts.isIdentifier(e.expression) &&
      e.expression.text === stylesName
    ) {
      const key = unwrap(e.argumentExpression);
      if (ts.isStringLiteral(key) || ts.isNoSubstitutionTemplateLiteral(key))
        into.classes.push({ name: key.text, conditional });
      else if (
        ts.isTemplateExpression(key) &&
        key.templateSpans.length === 1 &&
        key.templateSpans[0]?.literal.text === ''
      ) {
        const prop = lastName(key.templateSpans[0].expression);
        if (prop) into.modifiers.push({ prefix: key.head.text, prop });
      } else if (ts.isIdentifier(key))
        into.modifiers.push({ prefix: '', prop: key.text });
    } else if (ts.isIdentifier(e)) {
      const value = consts.get(e.text);
      if (value && !inlining.has(e.text)) {
        inlining.add(e.text);
        classesOf(value, conditional, into);
        inlining.delete(e.text);
      }
    } else if (ts.isCallExpression(e))
      for (const arg of e.arguments) classesOf(arg, conditional, into);
    else if (ts.isBinaryExpression(e)) {
      classesOf(e.left, true, into);
      classesOf(e.right, true, into);
    } else if (ts.isConditionalExpression(e)) {
      classesOf(e.whenTrue, true, into);
      classesOf(e.whenFalse, true, into);
    }
  };

  const inlining = new Set<string>();

  /** The elements an expression can render: through conditions, maps, local constants and helpers. */
  const collect = (node: ts.Node, renders: string[]): Element[] => {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node))
      return [element(node)];
    if (ts.isJsxFragment(node)) return children(node.children, renders);
    if (ts.isJsxExpression(node))
      return node.expression ? collect(node.expression, renders) : [];
    if (!ts.isExpression(node)) return [];
    const e = unwrap(node);
    if (e !== node) return collect(e, renders);
    if (ts.isConditionalExpression(e))
      return [
        ...collect(e.whenTrue, renders),
        ...collect(e.whenFalse, renders),
      ];
    if (ts.isBinaryExpression(e))
      return [...collect(e.left, []), ...collect(e.right, renders)];
    if (ts.isArrowFunction(e) || ts.isFunctionExpression(e)) {
      if (ts.isBlock(e.body)) return returns(e.body, renders);
      return collect(e.body, renders);
    }
    if (ts.isCallExpression(e)) {
      const callee = unwrap(e.expression);
      if (ts.isIdentifier(callee) && callee.text === 'createElement')
        return [created(e)];
      const helper = ts.isIdentifier(callee)
        ? consts.get(callee.text)
        : undefined;
      const fromHelper =
        helper &&
        ts.isIdentifier(callee) &&
        !inlining.has(callee.text) &&
        (ts.isArrowFunction(unwrap(helper)) ||
          ts.isFunctionExpression(unwrap(helper)))
          ? inline(callee.text, helper, renders)
          : [];
      return [
        ...fromHelper,
        ...e.arguments.flatMap((a) => collect(a, renders)),
      ];
    }
    if (ts.isIdentifier(e)) {
      const value = consts.get(e.text);
      if (value && !inlining.has(e.text)) {
        const found = inline(e.text, value, renders);
        if (found.length > 0) return found;
      }
    }
    const rendered = lastName(e);
    if (rendered) renders.push(rendered);
    return [];
  };

  const inline = (key: string, value: ts.Expression, renders: string[]) => {
    inlining.add(key);
    const found = collect(value, renders);
    inlining.delete(key);
    return found;
  };

  const children = (
    nodes: ts.NodeArray<ts.JsxChild>,
    renders: string[],
  ): Element[] =>
    nodes.flatMap((child) => {
      if (ts.isJsxText(child)) {
        if (child.text.trim() !== '') renders.push(child.text.trim());
        return [];
      }
      return collect(child, renders);
    });

  const element = (node: ts.JsxElement | ts.JsxSelfClosingElement): Element => {
    const opening = ts.isJsxElement(node) ? node.openingElement : node;
    const result: Element = {
      tag: opening.tagName.getText(source),
      classes: [],
      modifiers: [],
      attributes: {},
      renders: [],
      children: [],
    };
    for (const attribute of opening.attributes.properties) {
      if (!ts.isJsxAttribute(attribute)) continue;
      const key = attribute.name.getText(source);
      const init = attribute.initializer;
      if (key === 'className') {
        if (init && ts.isJsxExpression(init) && init.expression)
          classesOf(init.expression, false, result);
        continue;
      }
      if (!init) {
        result.attributes[key] = { value: 'true' };
        continue;
      }
      if (ts.isStringLiteral(init)) {
        result.attributes[key] = { value: init.text };
        continue;
      }
      const value = ts.isJsxExpression(init) && init.expression;
      if (!value) continue;
      const v = unwrap(value);
      if (ts.isStringLiteral(v) || ts.isNoSubstitutionTemplateLiteral(v))
        result.attributes[key] = { value: v.text };
      else if (v.kind === ts.SyntaxKind.TrueKeyword)
        result.attributes[key] = { value: 'true' };
      else if (v.kind === ts.SyntaxKind.FalseKeyword)
        result.attributes[key] = { value: 'false' };
      else if (ts.isIdentifier(v)) result.attributes[key] = { ref: v.text };
      else if (ts.isTemplateExpression(v))
        result.attributes[key] = { value: v.getText(source) };
    }
    if (ts.isJsxElement(node))
      result.children = children(node.children, result.renders);
    return result;
  };

  /** `createElement(as, { className, ... }, ...children)`, read as the element it makes. */
  const created = (call: ts.CallExpression): Element => {
    const [tag, props, ...rest] = call.arguments;
    const result: Element = {
      tag: tag ? (lastName(tag) ?? tag.getText(source)) : '',
      classes: [],
      modifiers: [],
      attributes: {},
      renders: [],
      children: [],
    };
    const object = props && unwrap(props);
    if (object && ts.isObjectLiteralExpression(object))
      for (const p of object.properties) {
        if (!ts.isPropertyAssignment(p) || !ts.isIdentifier(p.name)) continue;
        const v = unwrap(p.initializer);
        if (p.name.text === 'className') classesOf(v, false, result);
        else if (ts.isStringLiteral(v))
          result.attributes[p.name.text] = { value: v.text };
        else if (ts.isIdentifier(v))
          result.attributes[p.name.text] = { ref: v.text };
      }
    result.children = rest.flatMap((child) => collect(child, result.renders));
    return result;
  };

  /** The JSX a function body returns, without entering nested functions. */
  const returns = (body: ts.Node, renders: string[]): Element[] => {
    const found: Element[] = [];
    const visit = (node: ts.Node) => {
      if (ts.isFunctionLike(node)) return;
      if (ts.isReturnStatement(node) && node.expression)
        found.push(...collect(node.expression, renders));
      else ts.forEachChild(node, visit);
    };
    ts.forEachChild(body, visit);
    return found;
  };

  const renders: Element[][] = [];
  const visitReturns = (node: ts.Node) => {
    if (ts.isFunctionLike(node)) return;
    if (ts.isReturnStatement(node) && node.expression) {
      const found = collect(node.expression, []);
      if (found.length > 0) renders.push(found);
    } else ts.forEachChild(node, visitReturns);
  };
  ts.forEachChild(component.body, visitReturns);

  return {
    name,
    variants,
    defaults,
    props: [...props],
    renders,
    stylesheet:
      stylesFile !== '' && existsSync(stylesFile)
        ? readStylesheet(stylesFile)
        : { rules: [], skipped: [] },
  };
}

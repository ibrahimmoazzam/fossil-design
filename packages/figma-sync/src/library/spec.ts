import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { TokensFile } from '../../../tokens/src/metadata.ts';
import { REM } from '../model.ts';
import {
  readComponent,
  readStylesheet,
  type ComponentCode,
  type Element,
  type Rule,
} from './code.ts';
import {
  COMPONENTS,
  HIDDEN_ELEMENTS,
  LEFT_OUT,
  type LibraryComponent,
} from './components.ts';
import type {
  AxisSpec,
  ComponentSpec,
  InstanceSpec,
  LayerSpec,
  Typography,
  VariantSpec,
} from './runtime.ts';

/** A layer as the spec builds it: what the check verifies, and what it leaves to the agent. */
export interface LayerFacts {
  spec: LayerSpec;
  /** Raw values for layout and size, which the agent follows and the check doesn't. */
  raw: Record<string, string>;
  /** Declarations that use a token but have no Figma field, such as a transition's duration. */
  codeOnly: string[];
}

export interface VariantFacts {
  name: string;
  values: Record<string, string>;
  layers: LayerFacts[];
  instances: InstanceSpec[];
}

export interface ComponentFacts {
  spec: ComponentSpec;
  variants: VariantFacts[];
  /** Selectors for states, animations and relationships that a Figma layer can't show. */
  skipped: string[];
  /** Layers left out of Figma, and why. */
  leftOut: Record<string, string>;
}

export interface Library {
  components: ComponentFacts[];
  /** Components left out of Figma, and why. */
  leftOut: Record<string, string>;
  problems: string[];
}

type Value =
  | { token: string; part?: string }
  | { keyword: 'transparent' | 'inherit' | 'none' }
  | { raw: string };

interface Cascaded {
  value: Value;
  specificity: number;
  order: number;
}

const TRANSPARENT = 'color.background.transparent';
const TEXT_PARTS = [
  'fontFamily',
  'fontSize',
  'fontWeight',
  'letterSpacing',
  'lineHeight',
] as const;
const FONT_PROPERTIES: Readonly<Record<string, (typeof TEXT_PARTS)[number]>> = {
  'font-family': 'fontFamily',
  'font-size': 'fontSize',
  'font-weight': 'fontWeight',
  'letter-spacing': 'letterSpacing',
  'line-height': 'lineHeight',
};
const SIDES = ['Top', 'Right', 'Bottom', 'Left'] as const;
const CORNERS = [
  'topLeftRadius',
  'topRightRadius',
  'bottomRightRadius',
  'bottomLeftRadius',
] as const;
/** Raw declarations worth passing to the agent: layout and size. */
const LAYOUT = new Set([
  'display',
  'flex-direction',
  'align-items',
  'justify-content',
  'align-self',
  'place-items',
  'inline-size',
  'block-size',
  'min-inline-size',
  'min-block-size',
  'max-inline-size',
  'max-block-size',
  'overflow',
  'overflow-x',
  'position',
  'inset',
  'inset-block-end',
  'inset-inline-end',
  'opacity',
  'text-align',
  'text-transform',
  'flex',
]);
const BOX_PROPS: Readonly<Record<string, readonly string[]>> = {
  padding: ['padding-block', 'padding-inline'],
  paddingBlock: ['padding-block'],
  paddingInline: ['padding-inline'],
  gap: ['gap'],
  display: ['display'],
  flexDirection: ['flex-direction'],
  alignItems: ['align-items'],
  justifyContent: ['justify-content'],
  surface: ['surface'],
  radius: ['radius'],
};
// Box's and Text's own rules come before a component's in the stylesheet, so a component's win ties.
const ORDER = { box: 0, text: 10_000, own: 20_000 };

const split = (value: string): string[] =>
  value.match(/(?:[^\s(]+(?:\([^)]*\))?)+/g) ?? [];

export function buildLibrary(
  componentsDir: string,
  boxCss: string,
  tokens: TokensFile,
  library: {
    components: Readonly<Record<string, LibraryComponent>>;
    leftOut: Readonly<Record<string, string>>;
    hidden: readonly string[];
  } = { components: COMPONENTS, leftOut: LEFT_OUT, hidden: HIDDEN_ELEMENTS },
): Library {
  const { components: TABLE, leftOut: LEFT, hidden: HIDDEN } = library;
  const problems: string[] = [];
  const byVar = new Map<string, { path: string; part?: string }>();
  for (const [path, t] of Object.entries(tokens.tokens)) {
    if (t.deprecated !== undefined) continue;
    if (typeof t.cssVar === 'string') byVar.set(t.cssVar, { path });
    else
      for (const [part, cssVar] of Object.entries(t.cssVar))
        byVar.set(cssVar, { path, part });
  }
  if (!(TRANSPARENT in tokens.tokens))
    problems.push(
      `There is no ${TRANSPARENT} token, which a transparent border binds to.`,
    );

  /** Custom properties a component stylesheet sets itself, as opposed to knobs an app may set. */
  const declared = new Set<string>();

  const parse = (value: string): Value => {
    const v = value.trim();
    // An app's knob with a token fallback: unset by default, so the fallback is the default.
    const knob = /^var\((--[\w-]+)\s*,\s*(.+)\)$/.exec(v);
    if (knob && !byVar.has(String(knob[1])) && !declared.has(String(knob[1])))
      return parse(String(knob[2]));
    const single = /^var\((--[\w-]+)(?:\s*,[^)]*)?\)$/.exec(v);
    if (single) {
      const found = byVar.get(String(single[1]));
      if (found) return { token: found.path, part: found.part };
      return { raw: v };
    }
    if (v === 'transparent') return { keyword: 'transparent' };
    if (v === 'inherit' || v === 'currentColor') return { keyword: 'inherit' };
    if (v === 'none') return { keyword: 'none' };
    return { raw: v };
  };

  const aliasOf = (path: string, part: string): string | undefined => {
    const alias = tokens.tokens[path]?.aliasOf;
    if (typeof alias !== 'object' || Array.isArray(alias)) return undefined;
    const target = (alias as Record<string, unknown>)[part];
    return typeof target === 'string' ? target : undefined;
  };

  const tokenValue = (path: string, part?: string): unknown => {
    const value = tokens.tokens[path]?.value;
    return part !== undefined && typeof value === 'object' && value !== null
      ? (value as Record<string, unknown>)[part]
      : value;
  };

  /** Pixels for a raw dimension, for the agent's notes. */
  const px = (raw: string): string => {
    const rem = /^(-?[\d.]+)rem$/.exec(raw);
    return rem ? `${raw} (${String(Number(rem[1]) * REM)}px)` : raw;
  };

  /** Turns declarations into Figma fields, with CSS's cascade: higher specificity, then later order. */
  const cascade = (
    rules: readonly { rule: Rule; offset: number }[],
    codeOnly: string[],
  ): Map<string, Cascaded> => {
    const fields = new Map<string, Cascaded>();
    const sorted = [...rules].sort(
      (a, b) =>
        a.rule.specificity - b.rule.specificity ||
        a.offset + a.rule.order - (b.offset + b.rule.order),
    );
    sorted.forEach(({ rule }, order) => {
      const set = (field: string, value: Value) => {
        fields.set(field, { value, specificity: rule.specificity, order });
      };
      for (const { property, value } of rule.declarations) {
        const parts = split(value);
        const one = parse(value);
        if (property === 'padding') {
          const [top, right = top, bottom = top, left = right] = parts;
          [top, right, bottom, left].forEach((p, i) => {
            set(`padding${SIDES[i] ?? ''}`, parse(String(p)));
          });
        } else if (property === 'padding-block') {
          const [start, end = start] = parts;
          set('paddingTop', parse(String(start)));
          set('paddingBottom', parse(String(end)));
        } else if (property === 'padding-inline') {
          const [start, end = start] = parts;
          set('paddingLeft', parse(String(start)));
          set('paddingRight', parse(String(end)));
        } else if (property === 'padding-inline-start') set('paddingLeft', one);
        else if (property === 'padding-inline-end') set('paddingRight', one);
        else if (property === 'padding-block-start') set('paddingTop', one);
        else if (property === 'padding-block-end') set('paddingBottom', one);
        else if (property === 'gap') set('itemSpacing', one);
        else if (property === 'border-radius' && parts.length === 1)
          for (const corner of CORNERS) set(corner, one);
        else if (property === 'background-color' || property === 'fill')
          set('fill', one);
        else if (property === 'border') {
          if ('token' in one) {
            set('stroke', { token: aliasOf(one.token, 'color') ?? one.token });
            set('strokeWeight', {
              token: aliasOf(one.token, 'width') ?? one.token,
            });
          } else set('strokeWeight', { raw: '0' });
        } else if (property === 'border-width') set('strokeWeight', one);
        else if (property === 'border-color') set('stroke', one);
        else if (property === 'color') set('color', one);
        else if (property === 'box-shadow') set('effect', one);
        else if (property in FONT_PROPERTIES)
          set(`font.${String(FONT_PROPERTIES[property])}`, one);
        else if (
          (property === 'inline-size' || property === 'block-size') &&
          'token' in one
        )
          set(property === 'inline-size' ? 'width' : 'height', one);
        else if (LAYOUT.has(property)) set(`raw.${property}`, { raw: value });
        else if (
          [...value.matchAll(/var\((--[\w-]+)/g)].some(([, name]) =>
            byVar.has(String(name)),
          )
        )
          codeOnly.push(`${property}: ${value.replaceAll(/\s+/g, ' ')}`);
      }
    });
    return fields;
  };

  const layerOf = (
    name: string,
    fields: Map<string, Cascaded>,
    where: string,
  ): LayerFacts => {
    const spec: LayerSpec = { name, bound: {} };
    const raw: Record<string, string> = {};
    const get = (field: string) => fields.get(field)?.value;
    const tokenOf = (value: Value | undefined, what: string) => {
      if (value === undefined || !('token' in value)) return undefined;
      if (value.part !== undefined) {
        problems.push(
          `${where}: ${what} uses part of the composite token ${value.token}.`,
        );
        return undefined;
      }
      return value.token;
    };
    for (const [field, cascaded] of fields) {
      const v = cascaded.value;
      if (field.startsWith('raw.') && 'raw' in v)
        raw[field.slice(4)] = px(v.raw.replaceAll(/\s+/g, ' '));
    }
    for (const field of [
      'paddingTop',
      'paddingRight',
      'paddingBottom',
      'paddingLeft',
      'itemSpacing',
      ...CORNERS,
      'width',
      'height',
    ]) {
      const v = get(field);
      const token = tokenOf(v, field);
      if (token !== undefined) spec.bound[field] = token;
      else if (v && 'raw' in v && v.raw !== '0') raw[field] = px(v.raw);
    }
    const weight = get('strokeWeight');
    const stroke = get('stroke');
    const noStroke =
      weight === undefined ||
      ('raw' in weight && /^0(px)?$/.test(weight.raw)) ||
      ('keyword' in weight && weight.keyword === 'none');
    if (!noStroke) {
      const w = tokenOf(weight, 'strokeWeight');
      if (w !== undefined) spec.bound.strokeWeight = w;
      else if ('raw' in weight) raw.strokeWeight = px(weight.raw);
      if (stroke && 'keyword' in stroke && stroke.keyword === 'transparent')
        spec.stroke = TRANSPARENT;
      else spec.stroke = tokenOf(stroke, 'stroke');
    }
    const fill = get('fill');
    if (fill && 'keyword' in fill && fill.keyword !== 'inherit') spec.fill = '';
    else if (fill) spec.fill = tokenOf(fill, 'fill');
    const effect = get('effect');
    if (effect && 'token' in effect) spec.effect = effect.token;
    spec.color = tokenOf(get('color'), 'color');

    const font = TEXT_PARTS.map((part) => [part, get(`font.${part}`)] as const);
    if (font.some(([, v]) => v !== undefined && !('keyword' in v))) {
      const first = font[0]?.[1];
      const typography: Typography = {};
      if (
        first &&
        'token' in first &&
        font.every(
          ([part, v]) =>
            v !== undefined &&
            'token' in v &&
            v.token === first.token &&
            v.part === part,
        )
      )
        typography.style = first.token;
      else
        for (const [part, v] of font) {
          if (v === undefined || 'keyword' in v) continue;
          if (part === 'lineHeight') {
            const n =
              'token' in v ? tokenValue(v.token, v.part) : Number(v.raw);
            if (typeof n === 'number' && Number.isFinite(n))
              typography.lineHeight = Math.round(n * 10000) / 100;
            continue;
          }
          if ('raw' in v) {
            problems.push(`${where}: ${part} is the raw value ${v.raw}.`);
            continue;
          }
          typography[part] =
            v.part !== undefined ? aliasOf(v.token, v.part) : v.token;
        }
      if (typography.style !== undefined) {
        const lh = tokenValue(typography.style, 'lineHeight');
        if (typeof lh === 'number')
          typography.lineHeight = Math.round(lh * 10000) / 100;
      }
      spec.typography = typography;
    }
    for (const [key, value] of Object.entries(spec))
      if (value === undefined) Reflect.deleteProperty(spec, key);
    return { spec, raw, codeOnly: [] };
  };

  const hasBindings = (l: LayerSpec) =>
    Object.keys(l.bound).length > 0 ||
    l.fill !== undefined ||
    l.stroke !== undefined ||
    l.effect !== undefined ||
    l.color !== undefined ||
    l.typography !== undefined;

  const box = readStylesheet(boxCss);
  const codes = new Map<string, ComponentCode>();
  const codeOf = (name: string): ComponentCode | undefined => {
    if (!codes.has(name)) {
      if (!existsSync(join(componentsDir, name, `${name}.tsx`)))
        return undefined;
      const code = readComponent(join(componentsDir, name), name);
      for (const rule of code.stylesheet.rules)
        for (const d of rule.declarations)
          if (d.property.startsWith('--')) declared.add(d.property);
      codes.set(name, code);
    }
    return codes.get(name);
  };

  const axesOf = (name: string): AxisSpec[] => {
    const code = codeOf(name);
    const table = TABLE[name];
    if (!code || !table) return [];
    const axes = Object.entries(code.variants).map(([prop, values]) => {
      const fallback = code.defaults[prop] ?? table.defaults?.[prop];
      if (fallback !== undefined && !values.includes(fallback))
        problems.push(
          `${name}: the default ${prop}, ${fallback}, isn't one of its variants.`,
        );
      return { name: prop, values, default: fallback ?? String(values[0]) };
    });
    for (const [axis, derived] of Object.entries(table.derived ?? {})) {
      if (!code.stylesheet.rules.some((r) => r.classes.includes(derived.class)))
        problems.push(
          `${name}: the derived axis ${axis} adds the class ${derived.class}, which ${name}.module.css doesn't have.`,
        );
      axes.push({ name: axis, values: ['false', 'true'], default: 'false' });
    }
    return axes;
  };

  const combos = (axes: readonly AxisSpec[]): Record<string, string>[] =>
    axes.reduce<Record<string, string>[]>(
      (all, axis) =>
        all.flatMap((combo) =>
          axis.values.map((value) => ({ ...combo, [axis.name]: value })),
        ),
      [{}],
    );

  const components: ComponentFacts[] = [];
  const names = readdirSync(componentsDir, { withFileTypes: true })
    .filter(
      (d) =>
        d.isDirectory() &&
        existsSync(join(componentsDir, d.name, `${d.name}.tsx`)),
    )
    .map((d) => d.name)
    .sort();
  for (const name of names)
    if (!(name in TABLE) && !(name in LEFT))
      problems.push(
        `${name} is a component with no entry in figma-sync's library table (src/library/components.ts). Add it, or list it in LEFT_OUT with the reason.`,
      );
  for (const name of Object.keys(TABLE))
    if (!names.includes(name))
      problems.push(
        `The library table lists ${name}, which isn't a component.`,
      );

  for (const name of names) {
    const table = TABLE[name];
    const code = codeOf(name);
    if (!table || !code) continue;
    const where = (layer: string) =>
      `${name}${layer === '' ? '' : ` ${layer}`}`;
    const axes = axesOf(name);
    const derived = table.derived ?? {};
    const derivedClasses = new Set(Object.values(derived).map((d) => d.class));

    for (const prop of Object.keys(table.properties ?? {}))
      if (prop !== 'children' && !code.props.includes(prop))
        problems.push(
          `${name}: the Figma property ${prop} isn't one of ${name}'s props.`,
        );

    const last = code.renders.at(-1) ?? [];
    let root: Element | undefined;
    const findClass = (
      elements: readonly Element[],
      cls: string,
    ): Element | undefined => {
      for (const e of elements) {
        if (e.classes.some((c) => c.name === cls)) return e;
        const inner = findClass(e.children, cls);
        if (inner) return inner;
      }
      return undefined;
    };
    if (table.root !== undefined) {
      for (const tree of [...code.renders].reverse())
        root ??= findClass(tree, table.root);
      if (!root)
        problems.push(`${name}: no element has the root class ${table.root}.`);
    } else root = last.length === 1 ? last[0] : undefined;
    if (!root) {
      if (table.root === undefined)
        problems.push(
          `${name}: its last return renders ${String(last.length)} elements, so name the root class in the library table.`,
        );
      continue;
    }

    const layersSeen = new Set<string>();
    const skipped = new Set(code.stylesheet.skipped);
    const variants: VariantFacts[] = [];

    for (const values of combos(axes)) {
      const facts: VariantFacts = {
        name: axes.map((a) => `${a.name}=${String(values[a.name])}`).join(', '),
        values,
        layers: [],
        instances: [],
      };
      const resolve = (
        attribute: Element['attributes'][string] | undefined,
      ) => {
        if (attribute === undefined) return undefined;
        if ('value' in attribute) return attribute.value;
        return values[attribute.ref] ?? code.defaults[attribute.ref];
      };

      const visit = (element: Element, isRoot: boolean) => {
        if (HIDDEN.includes(element.tag)) return;
        const own = element.classes.filter(
          (c) =>
            !c.conditional ||
            !derivedClasses.has(c.name) ||
            Object.entries(derived).some(
              ([axis, d]) => d.class === c.name && values[axis] === 'true',
            ),
        );
        const layerName = isRoot
          ? ''
          : ((element.classes.find((c) => !c.conditional) ?? element.classes[0])
              ?.name ??
            (element.tag === 'Text' ? element.renders[0] : undefined));
        const when = layerName ? table.when?.[layerName] : undefined;
        if (when && Object.entries(when).some(([k, v]) => values[k] !== v))
          return;

        const nested =
          element.tag !== name && element.tag !== 'Text' && element.tag in TABLE
            ? element.tag
            : undefined;
        if (nested) {
          const instance: InstanceSpec = { component: nested, variants: {} };
          const nestedTable = TABLE[nested];
          for (const axis of axesOf(nested)) {
            const d = nestedTable?.derived?.[axis.name];
            const value = d
              ? String(d.of(element))
              : (resolve(element.attributes[axis.name]) ?? axis.default);
            if (!axis.values.includes(value))
              problems.push(
                `${name}: its ${nested} has ${axis.name}=${value}, which isn't one of ${nested}'s variants.`,
              );
            instance.variants[axis.name] = value;
          }
          facts.instances.push(instance);
          for (const child of element.children) visit(child, false);
          return;
        }

        const active = new Set([
          ...own.map((c) => c.name),
          ...element.modifiers.map(
            (m) =>
              `${m.prefix}${values[m.prop] ?? code.defaults[m.prop] ?? ''}`,
          ),
        ]);
        const rules: { rule: Rule; offset: number }[] = [];
        const add = (
          sheet: readonly Rule[],
          classes: Set<string>,
          offset: number,
        ) => {
          for (const rule of sheet)
            if (rule.classes.every((c) => classes.has(c)))
              rules.push({ rule, offset });
        };
        if (element.tag === 'Box') {
          const classes = new Set(['box']);
          for (const [prop, prefixes] of Object.entries(BOX_PROPS)) {
            const value = resolve(element.attributes[prop]);
            if (value !== undefined)
              for (const prefix of prefixes) classes.add(`${prefix}-${value}`);
          }
          add(box.rules, classes, ORDER.box);
        }
        if (element.tag === 'Text' && name !== 'Text') {
          const text = codeOf('Text');
          const tone = resolve(element.attributes.tone);
          const classes = new Set([
            'text',
            resolve(element.attributes.variant) ?? 'body',
            ...(tone !== undefined ? [`tone-${tone}`] : []),
          ]);
          if (text) add(text.stylesheet.rules, classes, ORDER.text);
        }
        add(code.stylesheet.rules, active, ORDER.own);

        const plain = rules.filter(
          (r) => r.rule.attributes.length === 0 && r.rule.pseudoElement === '',
        );
        const codeOnly: string[] = [];
        if (layerName !== undefined) {
          const layer = layerOf(
            layerName,
            cascade(plain, codeOnly),
            where(layerName),
          );
          layer.codeOnly = codeOnly;
          if (isRoot || hasBindings(layer.spec)) {
            facts.layers.push(layer);
            if (!isRoot) layersSeen.add(layerName);
          }
          // A state, such as the selected tab, or a pseudo-element, such as a dot's mark.
          const states = new Map<string, Rule>();
          for (const { rule } of rules)
            if (rule.attributes.length > 0 || rule.pseudoElement !== '')
              states.set(rule.attributes.join('') + rule.pseudoElement, rule);
          for (const [suffix, state] of states) {
            const matching = rules.filter(
              ({ rule }) =>
                rule.pseudoElement === state.pseudoElement &&
                rule.attributes.every((a) => state.attributes.includes(a)),
            );
            // The root is the component itself, so its states are named by its class.
            const stateName = `${layerName !== '' ? layerName : (element.classes.find((c) => !c.conditional)?.name ?? '')}${suffix}`;
            const own = matching.filter(
              ({ rule }) =>
                rule.attributes.length > 0 || rule.pseudoElement !== '',
            );
            // A state such as an animation's closed frame adds nothing a layer binds.
            if (
              !hasBindings(
                layerOf(stateName, cascade(own, []), where(stateName)).spec,
              )
            )
              continue;
            const layer = layerOf(
              stateName,
              cascade(matching, []),
              where(stateName),
            );
            if (hasBindings(layer.spec)) {
              facts.layers.push(layer);
              layersSeen.add(stateName);
            }
          }
        } else {
          const layer = layerOf(
            '',
            cascade(plain, codeOnly),
            where('(no class)'),
          );
          if (hasBindings(layer.spec))
            problems.push(
              `${name}: a <${element.tag}> without a class has token bindings, so the library can't name its layer. Give it a class.`,
            );
        }
        for (const child of element.children) visit(child, false);
      };
      visit(root, true);
      variants.push(facts);
    }

    const listed = new Set([
      ...(table.layers ?? []),
      ...Object.keys(table.skip ?? {}),
    ]);
    for (const layer of layersSeen)
      if (!listed.has(layer))
        problems.push(
          `${name}: the layer ${layer} has token bindings but isn't in the library table's layers or skip.`,
        );
    for (const layer of listed)
      if (
        !layersSeen.has(layer) &&
        !code.stylesheet.rules.some((r) => r.classes[0] === layer)
      )
        problems.push(
          `${name}: the library table names the layer ${layer}, which ${name} doesn't have.`,
        );
    for (const layer of Object.keys(table.when ?? {}))
      if (!code.stylesheet.rules.some((r) => r.classes[0] === layer))
        problems.push(
          `${name}: the library table's when names ${layer}, which ${name} doesn't have.`,
        );

    const skip = table.skip ?? {};
    for (const v of variants)
      v.layers = v.layers.filter((l) => !(l.spec.name in skip));

    const rootLayers = variants.map((v) =>
      v.layers.find((l) => l.spec.name === ''),
    );
    components.push({
      spec: {
        name,
        description: describe(table),
        axes,
        properties: Object.entries(table.properties ?? {}).map(
          ([prop, type]) => ({
            name: prop,
            type,
          }),
        ),
        variants: variants.map((v): VariantSpec => ({
          name: v.name,
          layers: v.layers.map((l) => l.spec),
          instances: v.instances,
        })),
        colored: rootLayers.some((l) => l?.spec.color !== undefined),
      },
      variants,
      skipped: [...skipped],
      leftOut: skip,
    });
  }

  return {
    components,
    leftOut: { ...LEFT },
    problems: [...new Set(problems)],
  };
}

const describe = (table: LibraryComponent): string =>
  [
    table.description,
    ...Object.values(table.derived ?? {}).map((d) => d.means),
  ].join(' ');

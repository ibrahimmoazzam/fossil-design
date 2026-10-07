// Runs inside Figma, through the Figma MCP server's use_figma tool, like ../runtime.ts. The script
// generator transpiles both files together, and each script carries only the functions it calls,
// so a function here may call one there. Everything is a top-level function with no multi-line
// strings, and the imports and types are erased.

import {
  known,
  setStamp,
  sha256,
  stamp,
  type Figma,
  type FigmaVariable,
} from '../runtime.ts';

export type PropertyType = 'TEXT' | 'BOOLEAN' | 'INSTANCE_SWAP' | 'SLOT';

/** Text set in a Fossil text style, or with each part bound on its own. Values are token paths. */
export interface Typography {
  style?: string;
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  letterSpacing?: string;
  /** A percentage. Figma reads a number variable on line height as pixels, so it can't bind. */
  lineHeight?: number;
}

/** One layer of a variant, and the token each of its properties uses. */
export interface LayerSpec {
  /** The class or state selector that names the layer, or '' for the component itself. */
  name: string;
  /** Node fields, such as itemSpacing or paddingTop, bound to variables by token path. */
  bound: Record<string, string>;
  /** A colour token, or '' for no fill. */
  fill?: string;
  stroke?: string;
  /** An effect style, by token path. */
  effect?: string;
  /** The colour of text and icons inside, until a layer inside sets its own. */
  color?: string;
  /** The typography of text inside, until a layer inside sets its own. */
  typography?: Typography;
}

export interface InstanceSpec {
  component: string;
  variants: Record<string, string>;
}

export interface VariantSpec {
  /** Figma's variant name, `tone=primary, size=s`, or '' for a component without variants. */
  name: string;
  layers: LayerSpec[];
  instances: InstanceSpec[];
}

export interface AxisSpec {
  name: string;
  values: string[];
  default: string;
}

export interface ComponentSpec {
  name: string;
  description: string;
  axes: AxisSpec[];
  properties: { name: string; type: PropertyType }[];
  variants: VariantSpec[];
  /** Whether its root sets a colour. Text and icons inside an instance of it then keep their own. */
  colored: boolean;
}

export interface TextStyleSpec {
  path: string;
  name: string;
  description: string;
  /** Variables by token path, and the values Figma needs to load the font. */
  fontFamily: string;
  family: string;
  fontSize: string;
  size: number;
  fontWeight: string;
  weight: number;
  letterSpacing: string;
  tracking: number;
  /** A percentage. */
  lineHeight: number;
}

export interface EffectStyleSpec {
  path: string;
  name: string;
  description: string;
  /** Variables by token path, beside the values they hold in light mode. */
  color: string;
  rgba: { r: number; g: number; b: number; a: number };
  offsetX: string;
  offsetY: string;
  radius: string;
  spread: string;
  px: { offsetX: number; offsetY: number; radius: number; spread: number };
}

export interface IconSpec {
  /** The React export, such as `CloseIcon`. */
  name: string;
  /** The Material Symbol, such as `close`. */
  key: string;
  viewBox: string;
  paths: string[];
}

export interface StylesSpec {
  kind: 'styles';
  page: string;
  /** The colour token an icon's glyph takes in its main component. */
  iconColor: string;
  textStyles: TextStyleSpec[];
  effectStyles: EffectStyleSpec[];
  icons: IconSpec[];
}

export interface CheckSpec {
  kind: 'check';
  /** The foundations file's styles and icons, or the components file's components. */
  target: 'foundations' | 'components';
  /** The components file's page, by name. */
  page: string;
  commit: string;
  part: number;
  parts: number;
  components: ComponentSpec[];
  /** Every library component's name, so an instance of one is recognised in any part. */
  library: string[];
  textStyles: string[];
  effectStyles: string[];
  icons: string[];
}

export interface CheckResult {
  fossil: 'check';
  part: number;
  parts: number;
  commit: string;
  components: { name: string; problems: string[] }[];
  /** Problems with the page, styles and icons. */
  foundations: string[];
  hash: string;
}

interface Stamped {
  getSharedPluginData(namespace: string, key: string): string;
  setSharedPluginData(namespace: string, key: string, value: string): void;
}

interface Alias {
  readonly id: string;
}

export interface Paint {
  readonly type: string;
  readonly visible?: boolean;
  readonly color?: { r: number; g: number; b: number };
  readonly opacity?: number;
  readonly boundVariables?: { readonly color?: Alias };
}

export interface Shadow {
  readonly type: string;
  readonly color: { r: number; g: number; b: number; a: number };
  readonly offset: { x: number; y: number };
  readonly radius: number;
  readonly spread?: number;
  readonly visible: boolean;
  readonly blendMode: string;
  readonly boundVariables?: Readonly<Record<string, Alias | undefined>>;
}

export interface Spacing {
  readonly unit: string;
  readonly value?: number;
}

export interface FigmaTextStyle extends Stamped {
  readonly id: string;
  /** What another file imports it by, once the file is published. */
  readonly key: string;
  name: string;
  description: string;
  fontName: { family: string; style: string };
  fontSize: number;
  letterSpacing: Spacing;
  lineHeight: Spacing;
  readonly boundVariables?: Readonly<Record<string, Alias | undefined>>;
  setBoundVariable(field: string, variable: FigmaVariable | null): void;
}

export interface FigmaEffectStyle extends Stamped {
  readonly id: string;
  readonly key: string;
  name: string;
  description: string;
  effects: readonly Shadow[];
}

/** The parts of a node the library reads and writes. */
export interface SceneNode extends Stamped {
  readonly id: string;
  /** A component's, for importing it into another file. */
  readonly key?: string;
  readonly type: string;
  name: string;
  visible: boolean;
  x: number;
  y: number;
  readonly width: number;
  readonly height: number;
  readonly parent: SceneNode | null;
  readonly children?: readonly SceneNode[];
  fills?: readonly Paint[] | symbol;
  strokes?: readonly Paint[];
  readonly boundVariables?: Readonly<
    Record<string, Alias | readonly Alias[] | undefined>
  >;
  readonly effectStyleId?: string | symbol;
  readonly textStyleId?: string | symbol;
  readonly lineHeight?: Spacing | symbol;
  readonly variantProperties?: Readonly<Record<string, string>> | null;
  readonly componentPropertyDefinitions?: Readonly<
    Record<string, { type: string; variantOptions?: readonly string[] }>
  >;
  readonly defaultVariant?: SceneNode;
  description?: string;
  constraints?: { horizontal: string; vertical: string };
  getMainComponentAsync?(): Promise<SceneNode | null>;
  appendChild?(child: SceneNode): void;
  resize?(width: number, height: number): void;
  rescale?(scale: number): void;
  remove(): void;
}

export interface PageNode extends Stamped {
  readonly id: string;
  name: string;
  readonly children: readonly SceneNode[];
  appendChild(child: SceneNode): void;
}

/** The parts of the Plugin API the library uses, beside the sync's. */
export interface Canvas extends Figma {
  readonly root: { readonly children: readonly PageNode[] };
  readonly mixed: symbol;
  skipInvisibleInstanceChildren: boolean;
  createPage(): PageNode;
  setCurrentPageAsync(page: PageNode): Promise<void>;
  getLocalTextStylesAsync(): Promise<FigmaTextStyle[]>;
  getLocalEffectStylesAsync(): Promise<FigmaEffectStyle[]>;
  /** A style by id, the file's own or one imported from a library. */
  getStyleByIdAsync(id: string): Promise<Stamped | null>;
  createTextStyle(): FigmaTextStyle;
  createEffectStyle(): FigmaEffectStyle;
  listAvailableFontsAsync(): Promise<
    { fontName: { family: string; style: string } }[]
  >;
  loadFontAsync(font: { family: string; style: string }): Promise<void>;
  createComponent(): SceneNode;
  createSection(): SceneNode;
  createNodeFromSvg(svg: string): SceneNode;
  variables: Figma['variables'] & {
    /** A variable by id, the file's own or one imported from a library. */
    getVariableByIdAsync(id: string): Promise<FigmaVariable | null>;
    setBoundVariableForPaint(
      paint: Paint,
      field: 'color',
      variable: FigmaVariable,
    ): Paint;
    setBoundVariableForEffect(
      effect: Shadow,
      field: string,
      variable: FigmaVariable,
    ): Shadow;
  };
}

/** Figma keeps a description HTML-escaped: & < > " and ' come back as entities. */
export function decoded(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

/** The foundations file's Icons page, by its stamp. */
export function iconsPage(figma: Canvas): PageNode | undefined {
  return figma.root.children.find((p) => stamp(p, 'page') === 'icons');
}

/** The font style Figma names for a weight, from the fonts it has. */
export function fontStyleFor(
  fonts: readonly { fontName: { family: string; style: string } }[],
  family: string,
  weight: number,
): { family: string; style: string } | undefined {
  const names: Record<number, string[]> = {
    100: ['thin', 'hairline'],
    200: ['extralight', 'ultralight'],
    300: ['light'],
    400: ['regular', 'normal', 'book'],
    500: ['medium'],
    600: ['semibold', 'demibold'],
    700: ['bold'],
    800: ['extrabold', 'ultrabold'],
    900: ['black', 'heavy'],
  };
  const wanted = names[weight] ?? [];
  const found = fonts.find(
    (f) =>
      f.fontName.family === family &&
      wanted.includes(f.fontName.style.replaceAll(' ', '').toLowerCase()),
  );
  return found ? { ...found.fontName } : undefined;
}

/**
 * An icon's SVG. use_figma rewrites any script whose text contains an svg tag, which changes the
 * source Function.prototype.toString returns and so fails the integrity check. The tag is
 * therefore built here, at run time, with no tag written out in the source.
 */
export function svgOf(icon: IconSpec): string {
  const lt = '<';
  const paths = icon.paths.map((d) => `${lt}path d="${d}"/>`).join('');
  return `${lt}svg xmlns="http://www.w3.org/2000/svg" viewBox="${icon.viewBox}">${paths}${lt}/svg>`;
}

/**
 * Creates or updates Fossil's text styles, effect styles and icon glyphs, in the foundations file.
 * Running it again changes nothing. It returns their keys, which the components file imports them by.
 */
export async function styles(
  spec: StylesSpec,
  figma: Canvas,
): Promise<unknown> {
  const variables = await figma.variables.getLocalVariablesAsync();
  const byPath: Record<string, FigmaVariable> = {};
  for (const v of variables) if (stamp(v) !== '') byPath[stamp(v)] = v;
  const fonts = await figma.listAvailableFontsAsync();

  // Check everything before writing anything, because a failed script may keep its partial writes.
  const problems: string[] = [];
  const need = (path: string, what: string) => {
    if (!byPath[path])
      problems.push(
        `${what} binds to ${path}, which isn't in Figma. Run pnpm figma:apply and its scripts first.`,
      );
  };
  const loads: Record<string, { family: string; style: string }> = {};
  for (const t of spec.textStyles) {
    for (const path of [
      t.fontFamily,
      t.fontSize,
      t.fontWeight,
      t.letterSpacing,
    ])
      need(path, t.name);
    const font = fontStyleFor(fonts, t.family, t.weight);
    if (font) loads[t.path] = font;
    else
      problems.push(
        `${t.name} needs ${t.family} at weight ${String(t.weight)}, which this Figma file doesn't have.`,
      );
  }
  for (const e of spec.effectStyles)
    for (const path of [e.color, e.offsetX, e.offsetY, e.radius, e.spread])
      need(path, e.name);
  need(spec.iconColor, 'An icon');
  if (problems.length > 0) throw new Error(problems.join('\n'));

  const created: string[] = [];
  const updated: string[] = [];

  const textStyles = await figma.getLocalTextStylesAsync();
  for (const t of spec.textStyles) {
    let style = textStyles.find((s) => stamp(s) === t.path);
    const changes: string[] = [];
    if (!style) {
      style = figma.createTextStyle();
      setStamp(style, t.path);
      created.push(t.name);
    }
    if (style.name !== t.name) {
      style.name = t.name;
      changes.push('name');
    }
    if (decoded(style.description) !== t.description) {
      style.description = t.description;
      changes.push('description');
    }
    const font = known(loads[t.path], t.family);
    await figma.loadFontAsync(font);
    await figma.loadFontAsync(style.fontName);
    const bound = style.boundVariables ?? {};
    const parts: [string, string][] = [
      ['fontFamily', t.fontFamily],
      ['fontSize', t.fontSize],
      ['fontWeight', t.fontWeight],
      ['letterSpacing', t.letterSpacing],
    ];
    const rebind = parts.some(
      ([field, path]) => bound[field]?.id !== known(byPath[path], path).id,
    );
    if (
      rebind ||
      style.fontName.family !== font.family ||
      style.fontName.style !== font.style
    ) {
      style.fontName = font;
      style.fontSize = t.size;
      style.letterSpacing = { unit: 'PIXELS', value: t.tracking };
      for (const [field, path] of parts)
        style.setBoundVariable(field, known(byPath[path], path));
      changes.push('font');
    }
    const lh = style.lineHeight;
    if (
      lh.unit !== 'PERCENT' ||
      Math.abs((lh.value ?? 0) - t.lineHeight) > 0.01
    ) {
      style.lineHeight = { unit: 'PERCENT', value: t.lineHeight };
      changes.push('line height');
    }
    if (changes.length > 0 && !created.includes(t.name))
      updated.push(`${t.name}: ${changes.join(', ')}`);
  }

  const effectStyles = await figma.getLocalEffectStylesAsync();
  for (const e of spec.effectStyles) {
    let style = effectStyles.find((s) => stamp(s) === e.path);
    const changes: string[] = [];
    if (!style) {
      style = figma.createEffectStyle();
      setStamp(style, e.path);
      created.push(e.name);
    }
    if (style.name !== e.name) {
      style.name = e.name;
      changes.push('name');
    }
    if (decoded(style.description) !== e.description) {
      style.description = e.description;
      changes.push('description');
    }
    const fields: [string, string][] = [
      ['color', e.color],
      ['offsetX', e.offsetX],
      ['offsetY', e.offsetY],
      ['radius', e.radius],
      ['spread', e.spread],
    ];
    const current = style.effects;
    const first = current[0];
    if (
      current.length !== 1 ||
      first?.type !== 'DROP_SHADOW' ||
      fields.some(
        ([field, path]) =>
          first.boundVariables?.[field]?.id !== known(byPath[path], path).id,
      )
    ) {
      let shadow: Shadow = {
        type: 'DROP_SHADOW',
        color: e.rgba,
        offset: { x: e.px.offsetX, y: e.px.offsetY },
        radius: e.px.radius,
        spread: e.px.spread,
        visible: true,
        blendMode: 'NORMAL',
        showShadowBehindNode: false,
      } as Shadow;
      for (const [field, path] of fields)
        shadow = figma.variables.setBoundVariableForEffect(
          shadow,
          field,
          known(byPath[path], path),
        );
      style.effects = [shadow];
      changes.push('shadow');
    }
    if (changes.length > 0 && !created.includes(e.name))
      updated.push(`${e.name}: ${changes.join(', ')}`);
  }

  let page = iconsPage(figma);
  if (!page) {
    page = figma.createPage();
    page.name = spec.page;
    setStamp(page, 'icons', 'page');
    created.push(`the ${spec.page} page`);
  }
  await figma.setCurrentPageAsync(page);
  let section = page.children.find((n) => stamp(n, 'section') === 'icons');
  if (!section) {
    section = figma.createSection();
    section.name = 'Icons';
    setStamp(section, 'icons', 'section');
    page.appendChild(section);
    section.x = 0;
    section.y = 0;
  }
  const color = known(byPath[spec.iconColor], spec.iconColor);
  const glyphs = section.children ?? [];
  const ids: string[] = [];
  const keys: Record<string, string> = {};
  spec.icons.forEach((icon, i) => {
    let component = glyphs.find((n) => stamp(n, 'icon') === icon.key);
    const changes: string[] = [];
    if (!component) {
      component = figma.createComponent();
      setStamp(component, icon.key, 'icon');
      known(section, 'the Icons section').appendChild?.(component);
      component.resize?.(24, 24);
      component.fills = [];
      created.push(icon.name);
    }
    component.x = 32 + i * 56;
    component.y = 56;
    if (component.name !== icon.name) {
      component.name = icon.name;
      changes.push('name');
    }
    const source = sha256(JSON.stringify([icon.viewBox, icon.paths]));
    if (stamp(component, 'svg') !== source) {
      for (const child of [...(component.children ?? [])]) child.remove();
      const drawn = figma.createNodeFromSvg(svgOf(icon));
      drawn.rescale?.(24 / drawn.width);
      for (const child of [...(drawn.children ?? [])]) {
        component.appendChild?.(child);
        child.constraints = { horizontal: 'SCALE', vertical: 'SCALE' };
      }
      drawn.remove();
      setStamp(component, source, 'svg');
      changes.push('glyph');
    }
    for (const shape of component.children ?? []) {
      const fills: readonly Paint[] =
        typeof shape.fills === 'object' ? shape.fills : [];
      const paint = fills[0];
      if (fills.length !== 1 || paint?.boundVariables?.color?.id !== color.id) {
        shape.fills = [
          figma.variables.setBoundVariableForPaint(
            { type: 'SOLID', color: { r: 0, g: 0, b: 0 } },
            'color',
            color,
          ),
        ];
        if (!changes.includes('glyph')) changes.push('colour');
      }
    }
    ids.push(component.id);
    keys[icon.name] = component.key ?? '';
    if (changes.length > 0 && !created.includes(icon.name))
      updated.push(`${icon.name}: ${changes.join(', ')}`);
  });
  section.resize?.(Math.max(400, 64 + spec.icons.length * 56), 136);

  for (const s of await figma.getLocalTextStylesAsync())
    if (stamp(s) !== '') keys[s.name] = s.key;
  for (const s of await figma.getLocalEffectStylesAsync())
    if (stamp(s) !== '') keys[s.name] = s.key;
  return {
    fossil: 'styles',
    created,
    updated,
    page: page.id,
    icons: ids,
    keys,
  };
}

/**
 * The stamp on every variable and style the nodes use, by id. In the components file they come
 * from the foundations library, and an imported variable or style keeps its stamp.
 */
export async function stampsUsed(
  figma: Canvas,
  nodes: readonly SceneNode[],
): Promise<{
  paths: Record<string, string>;
  textStyles: Record<string, string>;
  effectStyles: Record<string, string>;
}> {
  const variableIds = new Set<string>();
  const textIds = new Set<string>();
  const effectIds = new Set<string>();
  const add = (alias: unknown) => {
    for (const a of Array.isArray(alias) ? alias : [alias])
      if (
        typeof a === 'object' &&
        a !== null &&
        typeof (a as Alias).id === 'string'
      )
        variableIds.add((a as Alias).id);
  };
  const walk = (n: SceneNode) => {
    for (const alias of Object.values(n.boundVariables ?? {})) add(alias);
    for (const paints of [n.fills, n.strokes])
      if (Array.isArray(paints))
        for (const p of paints as readonly Paint[])
          add(p.boundVariables?.color);
    if (typeof n.textStyleId === 'string' && n.textStyleId !== '')
      textIds.add(n.textStyleId);
    if (typeof n.effectStyleId === 'string' && n.effectStyleId !== '')
      effectIds.add(n.effectStyleId);
    for (const child of n.children ?? []) walk(child);
  };
  for (const n of nodes) walk(n);
  const paths: Record<string, string> = {};
  for (const id of variableIds) {
    const v = await figma.variables.getVariableByIdAsync(id);
    if (v) paths[id] = stamp(v);
  }
  // Not named styles, which would pull the styles script into the check's script.
  const stampsOf = async (ids: Set<string>) => {
    const found: Record<string, string> = {};
    for (const id of ids) {
      const s = await figma.getStyleByIdAsync(id);
      if (s) found[id] = stamp(s);
    }
    return found;
  };
  return {
    paths,
    textStyles: await stampsOf(textIds),
    effectStyles: await stampsOf(effectIds),
  };
}

/** A node's children, without entering instances, whose insides belong to their own components. */
export function ownNodes(node: SceneNode): SceneNode[] {
  const found: SceneNode[] = [];
  const walk = (n: SceneNode) => {
    for (const child of n.children ?? []) {
      found.push(child);
      if (child.type !== 'INSTANCE') walk(child);
    }
  };
  walk(node);
  return found;
}

/** Checks one variant, or a component without variants, against its spec. */
export async function checkVariant(
  node: SceneNode,
  spec: VariantSpec,
  context: {
    paths: Record<string, string>;
    textStyles: Record<string, string>;
    effectStyles: Record<string, string>;
    library: readonly string[];
    colored: Record<string, boolean>;
    mixed: symbol;
  },
): Promise<string[]> {
  const problems: string[] = [];
  const at = spec.name === '' ? '' : `${spec.name}: `;
  const name = (layer: string) => (layer === '' ? 'the component' : layer);
  const pathOf = (alias: Alias | readonly Alias[] | undefined): string => {
    if (alias === undefined) return '';
    const list: readonly Alias[] = Array.isArray(alias)
      ? (alias as readonly Alias[])
      : [alias as Alias];
    const paths = list.map((a) => context.paths[a.id] ?? '?');
    return paths.every((p) => p === paths[0]) ? (paths[0] ?? '') : 'mixed';
  };
  const visible = (paints: SceneNode['fills']): readonly Paint[] =>
    Array.isArray(paints)
      ? (paints as readonly Paint[]).filter((p) => p.visible !== false)
      : [];
  const paintPath = (
    paints: SceneNode['fills'],
    what: string,
    layer: string,
  ) => {
    if (paints === context.mixed) {
      problems.push(`${at}${name(layer)} has mixed ${what}s.`);
      return undefined;
    }
    const list = visible(paints);
    if (list.length === 0) return '';
    if (list.length > 1) {
      problems.push(
        `${at}${name(layer)} has ${String(list.length)} ${what}s, not one.`,
      );
      return undefined;
    }
    const color = list[0]?.boundVariables?.color;
    return color ? (context.paths[color.id] ?? '?') : 'unbound';
  };
  const expectPaint = (
    paints: SceneNode['fills'],
    what: string,
    layer: string,
    wanted: string,
  ) => {
    const found = paintPath(paints, what, layer);
    if (found === undefined || found === wanted) return;
    const says =
      found === ''
        ? `no ${what}`
        : found === 'unbound'
          ? `an unbound ${what}`
          : `its ${what} bound to ${found}`;
    problems.push(
      `${at}${name(layer)} has ${says}, not ${wanted === '' ? `no ${what}` : wanted}.`,
    );
  };

  // Figma stores a bound strokeWeight as the four sides' weights.
  const aliasesOf = (n: SceneNode, field: string) => {
    const b = n.boundVariables ?? {};
    if (field !== 'strokeWeight' || b.strokeWeight !== undefined)
      return b[field];
    const sides = ['Top', 'Right', 'Bottom', 'Left'].map(
      (side) => b[`stroke${side}Weight`] as Alias | undefined,
    );
    if (sides.every((a) => a === undefined)) return undefined;
    return sides.map((a) => a ?? { id: '' });
  };
  const all = [node, ...ownNodes(node)];
  const layers: Record<string, LayerSpec> = {};
  for (const layer of spec.layers) {
    layers[layer.name] = layer;
    const found =
      layer.name === '' ? [node] : all.filter((n) => n.name === layer.name);
    if (found.length === 0) {
      problems.push(`${at}there's no layer named ${layer.name}.`);
      continue;
    }
    for (const n of found) {
      for (const [field, token] of Object.entries(layer.bound)) {
        const bound = pathOf(aliasesOf(n, field));
        if (bound !== token)
          problems.push(
            `${at}${name(layer.name)}'s ${field} is ${bound === '' ? 'unbound' : `bound to ${bound}`}, not ${token}.`,
          );
      }
      if (layer.fill !== undefined)
        expectPaint(n.fills, 'fill', layer.name, layer.fill);
      if (layer.stroke !== undefined)
        expectPaint(n.strokes, 'stroke', layer.name, layer.stroke);
      if (layer.effect !== undefined) {
        const id = n.effectStyleId;
        const found =
          typeof id === 'string' ? context.effectStyles[id] : undefined;
        if (found !== layer.effect)
          problems.push(
            `${at}${name(layer.name)} has ${found ? `the effect style ${found}` : 'no Fossil effect style'}, not ${layer.effect}.`,
          );
      }
    }
  }

  // Text and icons take the colour and typography of the nearest layer that sets them, as in CSS.
  const inherit = async (
    n: SceneNode,
    color: string | undefined,
    typography: Typography | undefined,
  ): Promise<void> => {
    const own = n === node ? layers[''] : layers[n.name];
    const c = own?.color ?? color;
    const t = own?.typography ?? typography;
    if (n.type === 'TEXT') {
      if (c !== undefined) expectPaint(n.fills, 'fill', n.name, c);
      else if (paintPath(n.fills, 'fill', n.name) === 'unbound')
        problems.push(`${at}the text ${n.name} has an unbound fill.`);
      const styleId = n.textStyleId;
      const style =
        typeof styleId === 'string' ? context.textStyles[styleId] : undefined;
      if (t?.style !== undefined) {
        if (style !== t.style)
          problems.push(
            `${at}the text ${n.name} has ${style ? `the text style ${style}` : 'no Fossil text style'}, not ${t.style}.`,
          );
      } else if (t !== undefined) {
        for (const field of [
          'fontFamily',
          'fontSize',
          'fontWeight',
          'letterSpacing',
        ] as const) {
          const wanted = t[field];
          if (wanted === undefined) continue;
          const bound = pathOf(n.boundVariables?.[field]);
          if (bound !== wanted)
            problems.push(
              `${at}the text ${n.name}'s ${field} is ${bound === '' ? 'unbound' : `bound to ${bound}`}, not ${wanted}.`,
            );
        }
        const lh = n.lineHeight;
        if (
          t.lineHeight !== undefined &&
          (typeof lh !== 'object' ||
            lh.unit !== 'PERCENT' ||
            Math.abs((lh.value ?? 0) - t.lineHeight) > 0.01)
        )
          problems.push(
            `${at}the text ${n.name}'s line height isn't ${String(t.lineHeight)}%.`,
          );
      } else if (style === undefined)
        problems.push(`${at}the text ${n.name} has no Fossil text style.`);
      return;
    }
    if (
      c !== undefined &&
      n !== node &&
      ['VECTOR', 'BOOLEAN_OPERATION', 'STAR', 'POLYGON', 'ELLIPSE'].includes(
        n.type,
      ) &&
      !(n.name in layers)
    )
      expectPaint(n.fills, 'fill', n.name, c);
    if (n.type === 'INSTANCE') {
      const main = await n.getMainComponentAsync?.();
      const set = main?.parent?.type === 'COMPONENT_SET' ? main.parent : main;
      // An instance of a component that sets its own colour keeps it; an icon takes its parent's.
      if (set && context.colored[set.name]) return;
    }
    for (const child of n.children ?? []) await inherit(child, c, t);
  };
  await inherit(node, undefined, undefined);

  // Every library component inside, with its variants, and no others. A slot's example content
  // stands for the app's own, so instances in a slot don't count.
  const inSlot = (n: SceneNode): boolean => {
    for (let p = n.parent; p && p !== node; p = p.parent)
      if (p.type === 'SLOT') return true;
    return false;
  };
  const expected = spec.instances.map((i) => ({ ...i, matched: false }));
  for (const n of all) {
    if (n.type !== 'INSTANCE' || inSlot(n)) continue;
    const main = await n.getMainComponentAsync?.();
    const set = main?.parent?.type === 'COMPONENT_SET' ? main.parent : main;
    if (!set || !context.library.includes(set.name)) continue;
    const values = main?.variantProperties ?? {};
    const match = expected.find(
      (e) =>
        !e.matched &&
        e.component === set.name &&
        Object.entries(e.variants).every(([k, v]) => values[k] === v),
    );
    if (match) match.matched = true;
    else
      problems.push(
        `${at}it has a ${set.name} (${Object.entries(values)
          .map(([k, v]) => `${k}=${v}`)
          .join(', ')}) that the code doesn't render.`,
      );
  }
  for (const e of expected)
    if (!e.matched)
      problems.push(
        `${at}it needs a ${e.component} instance with ${Object.entries(
          e.variants,
        )
          .map(([k, v]) => `${k}=${v}`)
          .join(', ')}.`,
      );

  // Anything else drawn with a raw value instead of a variable.
  for (const n of all) {
    if (n.type === 'INSTANCE' || n.type === 'TEXT' || n.name in layers)
      continue;
    if (paintPath(n.fills, 'fill', n.name) === 'unbound')
      problems.push(`${at}${n.name} has an unbound fill.`);
    if (paintPath(n.strokes, 'stroke', n.name) === 'unbound')
      problems.push(`${at}${n.name} has an unbound stroke.`);
  }
  for (const n of all) {
    if (n.type === 'INSTANCE' || n.type === 'TEXT') continue;
    const record = n as unknown as Record<string, unknown>;
    for (const field of [
      'paddingTop',
      'paddingRight',
      'paddingBottom',
      'paddingLeft',
      'itemSpacing',
      'topLeftRadius',
      'topRightRadius',
      'bottomRightRadius',
      'bottomLeftRadius',
    ]) {
      const value = record[field];
      if (
        typeof value === 'number' &&
        value !== 0 &&
        n.boundVariables?.[field] === undefined &&
        !(field === 'itemSpacing' && record.layoutMode === 'NONE') &&
        !(n.name in layers && field in (layers[n.name]?.bound ?? {}))
      )
        problems.push(
          `${at}${n === node ? 'the component' : n.name}'s ${field} is ${String(value)}, not a variable.`,
        );
    }
  }
  return problems;
}

/**
 * Checks Fossil's Figma library against the spec, and reports every difference: in the
 * foundations file, its styles and icons; in the components file, its components.
 */
export async function check(
  spec: CheckSpec,
  figma: Canvas,
): Promise<CheckResult> {
  // use_figma starts with this on, which hides what's inside a hidden instance, such as a Button's icon.
  figma.skipInvisibleInstanceChildren = false;
  const foundations: string[] = [];
  const content = {
    part: spec.part,
    parts: spec.parts,
    commit: spec.commit,
    components: [] as { name: string; problems: string[] }[],
    foundations,
  };
  const result = (): CheckResult => ({
    fossil: 'check',
    ...content,
    hash: sha256(JSON.stringify(content)),
  });
  const tops: SceneNode[] = [];
  const walk = (nodes: readonly SceneNode[]) => {
    for (const n of nodes) {
      if (n.type === 'COMPONENT_SET' || n.type === 'COMPONENT') tops.push(n);
      else if (n.type === 'SECTION' || n.type === 'FRAME' || n.type === 'GROUP')
        walk(n.children ?? []);
    }
  };

  if (spec.target === 'foundations') {
    const text = (await figma.getLocalTextStylesAsync()).map((s) => stamp(s));
    const effect = (await figma.getLocalEffectStylesAsync()).map((s) =>
      stamp(s),
    );
    for (const path of spec.textStyles)
      if (!text.includes(path))
        foundations.push(`The text style for ${path} is missing.`);
    for (const path of spec.effectStyles)
      if (!effect.includes(path))
        foundations.push(`The effect style for ${path} is missing.`);
    const icons = iconsPage(figma);
    if (!icons) {
      foundations.push(
        'There is no Icons page. Run the styles script from pnpm figma:library-spec in the foundations file.',
      );
      return result();
    }
    await figma.setCurrentPageAsync(icons);
    walk(icons.children);
    for (const icon of spec.icons)
      if (!tops.some((n) => n.type === 'COMPONENT' && n.name === icon))
        foundations.push(`The icon ${icon} is missing.`);
    return result();
  }

  const page = figma.root.children.find((p) => p.name === spec.page);
  if (!page) {
    foundations.push(
      `There is no ${spec.page} page. Build the components on a page named ${spec.page}, in the components file.`,
    );
    return result();
  }
  await figma.setCurrentPageAsync(page);
  walk(page.children);
  const { paths, textStyles, effectStyles } = await stampsUsed(figma, tops);

  const colored: Record<string, boolean> = {};
  for (const c of spec.components) colored[c.name] = c.colored;
  for (const c of spec.components) {
    const problems: string[] = [];
    const found = tops.filter((n) => n.name === c.name);
    content.components.push({ name: c.name, problems });
    if (found.length !== 1) {
      problems.push(
        found.length === 0
          ? `There's no ${c.name} component on the Components page.`
          : `There are ${String(found.length)} components named ${c.name}.`,
      );
      continue;
    }
    const top = known(found[0], c.name);
    if (decoded(top.description ?? '') !== c.description)
      problems.push(`Its description isn't the spec's: "${c.description}"`);
    const variants: { node: SceneNode; spec: VariantSpec }[] = [];
    if (c.axes.length === 0) {
      if (top.type !== 'COMPONENT')
        problems.push(`It should be a component, not a ${top.type}.`);
      const v = c.variants[0];
      if (v) variants.push({ node: top, spec: v });
    } else {
      if (top.type !== 'COMPONENT_SET') {
        problems.push(
          `It should be a component set with variants, not a ${top.type}.`,
        );
        continue;
      }
      const definitions = top.componentPropertyDefinitions ?? {};
      for (const axis of c.axes) {
        const d = definitions[axis.name];
        if (d?.type !== 'VARIANT') {
          problems.push(`It has no variant property ${axis.name}.`);
          continue;
        }
        const options = [...(d.variantOptions ?? [])].sort().join(', ');
        if (options !== [...axis.values].sort().join(', '))
          problems.push(
            `Its ${axis.name} values are ${options}, not ${axis.values.join(', ')}.`,
          );
      }
      const defaults = top.defaultVariant?.variantProperties ?? {};
      for (const axis of c.axes)
        if (defaults[axis.name] !== axis.default)
          problems.push(
            `Its default variant has ${axis.name}=${String(defaults[axis.name])}, not ${axis.default}. Move the default variant to the top left.`,
          );
      const children = top.children ?? [];
      for (const v of c.variants) {
        const values: Record<string, string> = {};
        for (const pair of v.name.split(', ')) {
          const [k, val] = pair.split('=');
          values[String(k)] = String(val);
        }
        const node = children.find((n) =>
          Object.entries(values).every(
            ([k, val]) => n.variantProperties?.[k] === val,
          ),
        );
        if (node) variants.push({ node, spec: v });
        else problems.push(`The variant ${v.name} is missing.`);
      }
      if (children.length > c.variants.length)
        problems.push(
          `It has ${String(children.length)} variants, not ${String(c.variants.length)}.`,
        );
    }
    const definitions =
      top.type === 'COMPONENT_SET' || top.type === 'COMPONENT'
        ? (top.componentPropertyDefinitions ?? {})
        : {};
    const own = Object.entries(definitions)
      .filter(([, d]) => d.type !== 'VARIANT')
      .map(([key, d]) => ({ name: key.split('#')[0] ?? key, type: d.type }));
    for (const p of c.properties) {
      const match = own.find((o) => o.name === p.name);
      if (!match) problems.push(`It has no ${p.type} property ${p.name}.`);
      else if (match.type !== p.type)
        problems.push(
          `Its property ${p.name} is ${match.type}, not ${p.type}.`,
        );
    }
    for (const o of own)
      if (!c.properties.some((p) => p.name === o.name))
        problems.push(`Its property ${o.name} isn't one of the spec's.`);
    for (const v of variants)
      problems.push(
        ...(await checkVariant(v.node, v.spec, {
          paths,
          textStyles,
          effectStyles,
          library: spec.library,
          colored,
          mixed: figma.mixed,
        })),
      );
  }
  return result();
}

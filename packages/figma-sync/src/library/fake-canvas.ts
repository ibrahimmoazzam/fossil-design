import { FakeFigma } from '../fake-figma.ts';
import type { FigmaVariable } from '../runtime.ts';
import type {
  Canvas,
  FigmaEffectStyle,
  FigmaTextStyle,
  PageNode,
  Paint,
  SceneNode,
  Shadow,
  Spacing,
} from './runtime.ts';

interface Alias {
  type: 'VARIABLE_ALIAS';
  id: string;
}

/** Figma keeps a description HTML-escaped. */
const escaped = (text: string) =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const alias = (variable: FigmaVariable): Alias => ({
  type: 'VARIABLE_ALIAS',
  id: variable.id,
});

class Data {
  readonly #data = new Map<string, string>();

  getSharedPluginData(namespace: string, key: string): string {
    return this.#data.get(`${namespace}:${key}`) ?? '';
  }

  setSharedPluginData(namespace: string, key: string, value: string): void {
    this.#data.set(`${namespace}:${key}`, value);
  }
}

/** A node as the library scripts see it. Fields Figma has only on some node types are set by the test. */
export class FakeNode extends Data implements SceneNode {
  readonly id: string;
  readonly type: string;
  get key(): string | undefined {
    return this.type === 'COMPONENT' ? `key-${this.id}` : undefined;
  }
  name: string;
  visible = true;
  x = 0;
  y = 0;
  width = 0;
  height = 0;
  parent: FakeNode | null = null;
  #children: FakeNode[] | undefined;
  fills?: readonly Paint[] | symbol;
  strokes?: readonly Paint[];
  boundVariables: Record<string, Alias | Alias[] | undefined> = {};
  effectStyleId?: string;
  textStyleId?: string;
  lineHeight?: Spacing;
  variantProperties?: Record<string, string> | null;
  componentPropertyDefinitions?: Record<
    string,
    { type: string; variantOptions?: string[] }
  >;
  #description = '';
  constraints?: { horizontal: string; vertical: string };
  main?: FakeNode;
  readonly #canvas: FakeCanvas;
  [field: string]: unknown;

  constructor(canvas: FakeCanvas, id: string, type: string, name: string) {
    super();
    this.#canvas = canvas;
    this.id = id;
    this.type = type;
    this.name = name;
    if (type !== 'TEXT' && type !== 'VECTOR' && type !== 'POLYGON')
      this.#children = [];
  }

  /** Figma hides what's inside a hidden instance while skipInvisibleInstanceChildren is on. */
  get children(): FakeNode[] | undefined {
    if (
      this.type === 'INSTANCE' &&
      !this.visible &&
      this.#canvas.skipInvisibleInstanceChildren
    )
      return [];
    return this.#children;
  }

  get description(): string {
    return this.#description;
  }

  set description(text: string) {
    this.#description = escaped(text);
  }

  get defaultVariant(): FakeNode | undefined {
    return this.type === 'COMPONENT_SET' ? this.#children?.[0] : undefined;
  }

  /** The page it sits on directly, if it isn't inside another node. */
  page: Page | undefined;

  appendChild(child: SceneNode): void {
    const node = child as FakeNode;
    if (!this.#children)
      throw new Error(`A ${this.type} node can't have children`);
    node.remove();
    node.parent = this;
    this.#children.push(node);
  }

  remove(): void {
    const siblings = this.parent ? this.parent.#children : this.page?.children;
    if (siblings) siblings.splice(siblings.indexOf(this), 1);
    this.parent = null;
    this.page = undefined;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  rescale(scale: number): void {
    this.width *= scale;
    this.height *= scale;
    for (const child of this.#children ?? []) child.rescale(scale);
  }

  /** Binds a node field. Figma stores a bound strokeWeight as the four sides' weights. */
  setBoundVariable(field: string, variable: FigmaVariable): void {
    if (field === 'strokeWeight')
      for (const side of ['Top', 'Right', 'Bottom', 'Left'])
        this.boundVariables[`stroke${side}Weight`] = alias(variable);
    else this.boundVariables[field] = alias(variable);
  }

  getMainComponentAsync(): Promise<SceneNode | null> {
    return Promise.resolve(this.main ?? null);
  }
}

class Page extends Data implements PageNode {
  readonly id: string;
  name: string;
  readonly children: FakeNode[] = [];

  constructor(id: string, name: string) {
    super();
    this.id = id;
    this.name = name;
  }

  appendChild(child: SceneNode): void {
    const node = child as FakeNode;
    node.remove();
    node.page = this;
    this.children.push(node);
  }
}

class TextStyle extends Data implements FigmaTextStyle {
  readonly id: string;
  readonly key: string;
  name = '';
  #description = '';
  #fontName = { family: 'Inter', style: 'Regular' };
  fontSize = 12;
  #letterSpacing: Spacing = { unit: 'PIXELS', value: 0 };
  #lineHeight: Spacing = { unit: 'AUTO' };
  readonly boundVariables: Record<string, Alias | undefined> = {};
  readonly #canvas: FakeCanvas;

  constructor(canvas: FakeCanvas, id: string) {
    super();
    this.#canvas = canvas;
    this.id = id;
    this.key = `key-${id}`;
  }

  get description(): string {
    return this.#description;
  }

  set description(text: string) {
    this.#description = escaped(text);
  }

  get fontName(): { family: string; style: string } {
    return this.#fontName;
  }

  set fontName(font: { family: string; style: string }) {
    if (!this.#canvas.loaded.has(`${font.family} ${font.style}`))
      throw new Error(
        `Cannot write to node with unloaded font "${font.family} ${font.style}"`,
      );
    this.#fontName = font;
  }

  // Figma keeps numbers as 32-bit floats: 160 comes back as 160.0000023841858.
  get lineHeight(): Spacing {
    return this.#lineHeight;
  }

  set lineHeight(value: Spacing) {
    this.#lineHeight =
      value.value === undefined
        ? value
        : { unit: value.unit, value: Math.fround(value.value) };
  }

  get letterSpacing(): Spacing {
    return this.#letterSpacing;
  }

  set letterSpacing(value: Spacing) {
    this.#letterSpacing = {
      unit: value.unit,
      value: Math.fround(value.value ?? 0),
    };
  }

  setBoundVariable(field: string, variable: FigmaVariable | null): void {
    this.boundVariables[field] = variable ? alias(variable) : undefined;
  }
}

class EffectStyle extends Data implements FigmaEffectStyle {
  readonly id: string;
  readonly key: string;
  name = '';
  #description = '';
  effects: readonly Shadow[] = [];

  constructor(id: string) {
    super();
    this.id = id;
    this.key = `key-${id}`;
  }

  get description(): string {
    return this.#description;
  }

  set description(text: string) {
    this.#description = escaped(text);
  }
}

/** The variables of FakeFigma, plus the pages, nodes, styles and fonts the library scripts use. */
export class FakeCanvas extends FakeFigma implements Canvas {
  declare readonly variables: FakeFigma['variables'] &
    Pick<
      Canvas['variables'],
      'setBoundVariableForPaint' | 'setBoundVariableForEffect'
    >;
  readonly root: { children: Page[] } = { children: [] };
  readonly mixed = Symbol('mixed');
  skipInvisibleInstanceChildren = true;
  currentPage: Page;
  readonly textStyles: TextStyle[] = [];
  readonly effectStyles: EffectStyle[] = [];
  /** Styles imported from a library: found by id, never listed as the file's own. */
  readonly libraryStyles: (TextStyle | EffectStyle)[] = [];
  readonly loaded = new Set<string>();
  fonts: { family: string; style: string }[] = [];
  #next = 1;

  constructor() {
    super();
    this.currentPage = new Page(this.id(), 'Page 1');
    this.root.children.push(this.currentPage);
    Object.assign(this.variables, {
      setBoundVariableForPaint: (
        paint: Paint,
        _field: 'color',
        variable: FigmaVariable,
      ): Paint => ({ ...paint, boundVariables: { color: alias(variable) } }),
      setBoundVariableForEffect: (
        effect: Shadow,
        field: string,
        variable: FigmaVariable,
      ): Shadow => ({
        ...effect,
        boundVariables: { ...effect.boundVariables, [field]: alias(variable) },
      }),
    });
  }

  id(): string {
    return `f:${String(this.#next++)}`;
  }

  /** A node on the current page, or inside a parent. */
  node(type: string, name: string, parent?: FakeNode): FakeNode {
    const node = new FakeNode(this, this.id(), type, name);
    if (parent) parent.appendChild(node);
    else this.currentPage.appendChild(node);
    return node;
  }

  createPage(): Page {
    const page = new Page(this.id(), 'Page');
    this.root.children.push(page);
    return page;
  }

  setCurrentPageAsync(page: PageNode): Promise<void> {
    this.currentPage = page as Page;
    return Promise.resolve();
  }

  getLocalTextStylesAsync(): Promise<FigmaTextStyle[]> {
    return Promise.resolve([...this.textStyles]);
  }

  getLocalEffectStylesAsync(): Promise<FigmaEffectStyle[]> {
    return Promise.resolve([...this.effectStyles]);
  }

  getStyleByIdAsync(id: string): Promise<TextStyle | EffectStyle | null> {
    return Promise.resolve(
      [...this.textStyles, ...this.effectStyles, ...this.libraryStyles].find(
        (s) => s.id === id,
      ) ?? null,
    );
  }

  /** Makes this file a components file: its variables and styles now come from the foundations library. */
  override toLibrary(): void {
    super.toLibrary();
    this.libraryStyles.push(
      ...this.textStyles.splice(0),
      ...this.effectStyles.splice(0),
    );
  }

  createTextStyle(): FigmaTextStyle {
    const style = new TextStyle(this, this.id());
    this.textStyles.push(style);
    return style;
  }

  createEffectStyle(): FigmaEffectStyle {
    const style = new EffectStyle(this.id());
    this.effectStyles.push(style);
    return style;
  }

  listAvailableFontsAsync(): Promise<
    { fontName: { family: string; style: string } }[]
  > {
    return Promise.resolve(this.fonts.map((fontName) => ({ fontName })));
  }

  loadFontAsync(font: { family: string; style: string }): Promise<void> {
    if (
      font.family !== 'Inter' &&
      !this.fonts.some(
        (f) => f.family === font.family && f.style === font.style,
      )
    )
      return Promise.reject(new Error(`No font ${font.family} ${font.style}`));
    this.loaded.add(`${font.family} ${font.style}`);
    return Promise.resolve();
  }

  createComponent(): SceneNode {
    return this.node('COMPONENT', 'Component');
  }

  createSection(): SceneNode {
    return this.node('SECTION', 'Section');
  }

  /** A 48px frame holding one vector, as Material Symbols' SVGs draw. */
  createNodeFromSvg(svg: string): SceneNode {
    if (!svg.includes('<svg')) throw new Error('Not an SVG');
    const frame = this.node('FRAME', 'svg');
    frame.resize(48, 48);
    const vector = this.node('VECTOR', 'Vector', frame);
    vector.resize(26, 26);
    vector.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
    return frame;
  }
}

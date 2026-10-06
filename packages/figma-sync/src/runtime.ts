// Runs inside Figma, through the Figma MCP server's use_figma tool. The script generator transpiles
// this file, and each script carries only the functions it calls and hashes them, so everything
// here is a self-contained top-level function. The types are erased.

import type { PageNode, Paint, SceneNode } from './library/runtime.ts';

/** A value as the sync records it: a colour, a number, a string, or the token path of an alias. */
export type SyncValue =
  | { hex: string; alpha: number }
  | number
  | string
  | boolean
  | { alias: string; target?: string }
  | { bezier: [number, number, number, number] }
  /** One of Figma's named easings, which has no documented cubic Bézier. */
  | { preset: string };

export type CollectionKey = 'primitive' | 'semantic';

export interface CollectionSpec {
  key: CollectionKey;
  name: string;
  modes: string[];
}

export interface VariableSpec {
  path: string;
  name: string;
  collection: CollectionKey;
  type: 'COLOR' | 'FLOAT' | 'STRING' | 'TIMING' | 'EASING';
  /** Values by mode name. */
  values: Record<string, SyncValue>;
  /** Absent for timing and easing variables, which Figma doesn't let a script scope. */
  scopes?: string[];
  code: string;
  description: string;
  /** Paths this token had before a rename in code. A variable stamped with one is renamed in place. */
  renamedFrom: string[];
}

export interface ApplySpec {
  kind: 'apply';
  part: number;
  parts: number;
  collections: CollectionSpec[];
  variables: VariableSpec[];
}

export interface FinishSpec {
  kind: 'finish';
  commit: string;
  collections: CollectionSpec[];
  paths: string[];
}

export interface ReadSpec {
  kind: 'read';
  page: number;
  pageSize: number;
}

export type Spec = ApplySpec | FinishSpec | ReadSpec;

/** One variable as a read reports it. */
export interface ReadVariable {
  id: string;
  name: string;
  /** The stamped token path, or '' when the variable has none. */
  path: string;
  collection: string;
  type: string;
  values: Record<string, SyncValue>;
}

export interface ReadPage {
  fossil: 'read';
  page: number;
  pages: number;
  /** The hash of every page's variables, joined, so pages from different reads can't mix. */
  whole: string;
  commit: string;
  collections: { key: string; name: string; modes: string[] }[];
  variables: ReadVariable[];
  hash: string;
}

interface FigmaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}
interface FigmaAlias {
  type: 'VARIABLE_ALIAS';
  id: string;
}
interface FigmaEasing {
  type:
    | 'EASE_IN'
    | 'EASE_OUT'
    | 'EASE_IN_AND_OUT'
    | 'LINEAR'
    | 'EASE_IN_BACK'
    | 'EASE_OUT_BACK'
    | 'EASE_IN_AND_OUT_BACK'
    | 'CUSTOM_CUBIC_BEZIER'
    | 'GENTLE'
    | 'QUICK'
    | 'BOUNCY'
    | 'SLOW'
    | 'CUSTOM_SPRING'
    | 'HOLD';
  easingFunctionCubicBezier?: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };
}
type FigmaValue =
  FigmaColor | FigmaAlias | FigmaEasing | number | string | boolean;

interface Stamped {
  getSharedPluginData(namespace: string, key: string): string;
  setSharedPluginData(namespace: string, key: string, value: string): void;
}

export interface FigmaCollection extends Stamped {
  readonly id: string;
  name: string;
  readonly modes: readonly { modeId: string; name: string }[];
  addMode(name: string): string;
  renameMode(modeId: string, name: string): void;
}

export interface FigmaVariable extends Stamped {
  readonly id: string;
  name: string;
  readonly resolvedType: string;
  readonly variableCollectionId: string;
  readonly valuesByMode: Readonly<Record<string, FigmaValue>>;
  scopes: string[];
  description: string;
  readonly codeSyntax: Readonly<Record<string, string>>;
  setValueForMode(modeId: string, value: FigmaValue): void;
  setVariableCodeSyntax(platform: 'WEB', value: string): void;
}

/** The part of the Plugin API the sync uses. */
export interface Figma {
  variables: {
    getLocalVariableCollectionsAsync(): Promise<FigmaCollection[]>;
    getLocalVariablesAsync(): Promise<FigmaVariable[]>;
    createVariableCollection(name: string): FigmaCollection;
    createVariable(
      name: string,
      collection: FigmaCollection,
      type: string,
    ): FigmaVariable;
  };
  /** Pages, for finding the component library. Optional, so a variables-only fake can leave them out. */
  root?: { readonly children: readonly PageNode[] };
  setCurrentPageAsync?(page: PageNode): Promise<void>;
  skipInvisibleInstanceChildren?: boolean;
}

export function stamp(node: Stamped, key = 'path'): string {
  return node.getSharedPluginData('fossil', key);
}

export function setStamp(node: Stamped, value: string, key = 'path'): void {
  node.setSharedPluginData('fossil', key, value);
}

export function known<T>(value: T | undefined, what: string): T {
  if (value === undefined)
    throw new Error(`Fossil's sync lost track of ${what}.`);
  return value;
}

/** Fossil's collections, by the key stamped on each. */
export function fossilCollections(
  collections: readonly FigmaCollection[],
): Record<string, FigmaCollection> {
  const byKey: Record<string, FigmaCollection> = {};
  for (const c of collections) {
    const key = stamp(c, 'collection');
    if (key === '') continue;
    if (byKey[key])
      throw new Error(
        `Two variable collections are stamped as Fossil's ${key} collection. Delete one, then run the sync again.`,
      );
    byKey[key] = c;
  }
  return byKey;
}

/** Variables by the token path stamped on each. Two with one path is an error. */
export function stampedVariables(
  variables: readonly FigmaVariable[],
): Record<string, FigmaVariable> {
  const index: Record<string, FigmaVariable> = {};
  const duplicates: string[] = [];
  for (const v of variables) {
    const path = stamp(v);
    if (path === '') continue;
    if (index[path]) duplicates.push(path);
    index[path] = v;
  }
  if (duplicates.length > 0)
    throw new Error(
      `More than one variable is stamped with ${duplicates.join(', ')}. Delete the extra variables, then run the sync again.`,
    );
  return index;
}

export function toFigma(value: SyncValue): FigmaValue {
  if (typeof value !== 'object') return value;
  if ('hex' in value)
    return {
      r: parseInt(value.hex.slice(1, 3), 16) / 255,
      g: parseInt(value.hex.slice(3, 5), 16) / 255,
      b: parseInt(value.hex.slice(5, 7), 16) / 255,
      a: value.alpha,
    };
  if ('bezier' in value) {
    const [x1, y1, x2, y2] = value.bezier;
    return {
      type: 'CUSTOM_CUBIC_BEZIER',
      easingFunctionCubicBezier: { x1, y1, x2, y2 },
    };
  }
  throw new Error('Aliases are resolved separately, and code holds no presets');
}

export function fromFigma(
  value: FigmaValue,
  variables: readonly FigmaVariable[],
): SyncValue {
  const round = (n: number) => Math.round(n * 10000) / 10000;
  const channel = (n: number) =>
    Math.round(n * 255)
      .toString(16)
      .padStart(2, '0');
  if (typeof value === 'number') return round(value);
  if (typeof value !== 'object') return value;
  if ('type' in value && value.type === 'VARIABLE_ALIAS') {
    const target = variables.find((v) => v.id === value.id);
    const path = target ? stamp(target) : '';
    return path === ''
      ? { alias: '', target: target ? target.name : value.id }
      : { alias: path };
  }
  if ('type' in value) {
    const curve = value.easingFunctionCubicBezier;
    return value.type === 'CUSTOM_CUBIC_BEZIER' && curve
      ? {
          bezier: [
            round(curve.x1),
            round(curve.y1),
            round(curve.x2),
            round(curve.y2),
          ],
        }
      : { preset: value.type };
  }
  return {
    hex: `#${channel(value.r)}${channel(value.g)}${channel(value.b)}`,
    alpha: round(value.a),
  };
}

/** Creates Fossil's collections and modes where they're missing, and returns each mode's id. */
export function ensureCollections(
  figma: Figma,
  collections: FigmaCollection[],
  specs: readonly CollectionSpec[],
): {
  owned: Record<string, FigmaCollection>;
  modeIds: Record<string, Record<string, string>>;
} {
  const owned = fossilCollections(collections);
  const modeIds: Record<string, Record<string, string>> = {};
  for (const c of specs) {
    let collection = owned[c.key];
    if (!collection) {
      collection = figma.variables.createVariableCollection(c.name);
      collection.renameMode(
        known(collection.modes[0], 'the first mode').modeId,
        known(c.modes[0], 'the mode names'),
      );
      setStamp(collection, c.key, 'collection');
      owned[c.key] = collection;
      collections.push(collection);
    }
    for (const mode of c.modes)
      if (!collection.modes.some((m) => m.name === mode))
        collection.addMode(mode);
    const ids: Record<string, string> = {};
    for (const m of collection.modes) ids[m.name] = m.modeId;
    modeIds[c.key] = ids;
  }
  return { owned, modeIds };
}

/** Returns one page of the variables in Fossil's collections, with a hash of the page and of the whole read. */
export async function read(spec: ReadSpec, figma: Figma): Promise<ReadPage> {
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const variables = await figma.variables.getLocalVariablesAsync();
  const owned = fossilCollections(collections);
  const keyOf: Record<string, string> = {};
  for (const [key, c] of Object.entries(owned)) keyOf[c.id] = key;
  const records = variables
    .flatMap((v): ReadVariable[] => {
      const key = keyOf[v.variableCollectionId];
      const collection = collections.find(
        (c) => c.id === v.variableCollectionId,
      );
      if (key === undefined || collection === undefined) return [];
      const values: Record<string, SyncValue> = {};
      for (const mode of collection.modes) {
        const value = v.valuesByMode[mode.modeId];
        if (value !== undefined)
          values[mode.name] = fromFigma(value, variables);
      }
      return [
        {
          id: v.id,
          name: v.name,
          path: stamp(v),
          collection: key,
          type: v.resolvedType,
          values,
        },
      ];
    })
    .sort((a, b) =>
      `${a.collection}/${a.path || a.name}` <
      `${b.collection}/${b.path || b.name}`
        ? -1
        : 1,
    );
  const content = {
    page: spec.page,
    pages: Math.max(1, Math.ceil(records.length / spec.pageSize)),
    whole: sha256(JSON.stringify(records)),
    commit: owned.semantic ? stamp(owned.semantic, 'commit') : '',
    collections: Object.entries(owned).map(([key, c]) => ({
      key,
      name: c.name,
      modes: c.modes.map((m) => m.name),
    })),
    variables: records.slice(
      (spec.page - 1) * spec.pageSize,
      spec.page * spec.pageSize,
    ),
  };
  return { fossil: 'read', ...content, hash: sha256(JSON.stringify(content)) };
}

/** Checks that every variable is in Figma, reports any Fossil doesn't know, and only then stamps the commit. */
export async function finish(spec: FinishSpec, figma: Figma): Promise<unknown> {
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const variables = await figma.variables.getLocalVariablesAsync();
  const { owned } = ensureCollections(figma, collections, spec.collections);
  const index = stampedVariables(variables);
  const expected: Record<string, boolean> = {};
  for (const path of spec.paths) expected[path] = true;
  const missing = spec.paths.filter((path) => !index[path]);
  const ownedIds = Object.values(owned).map((c) => c.id);
  const inFossil = variables.filter((v) =>
    ownedIds.includes(v.variableCollectionId),
  );
  const orphans = inFossil
    .filter((v) => stamp(v) !== '' && !expected[stamp(v)])
    .map((v) => stamp(v));
  const unstamped = inFossil.filter((v) => stamp(v) === '').map((v) => v.name);
  if (missing.length === 0)
    for (const c of Object.values(owned)) setStamp(c, spec.commit, 'commit');

  // An orphan stays until no library component binds it; name the components that still do.
  const boundBy: Record<string, string[]> = {};
  const orphanIds: Record<string, string> = {};
  for (const v of inFossil)
    if (stamp(v) !== '' && !expected[stamp(v)]) orphanIds[v.id] = stamp(v);
  const page = figma.root?.children.find(
    (p) => stamp(p, 'page') === 'components',
  );
  if (page && figma.setCurrentPageAsync && orphans.length > 0) {
    await figma.setCurrentPageAsync(page);
    figma.skipInvisibleInstanceChildren = false;
    const ids = (value: unknown): string[] =>
      (Array.isArray(value) ? (value as unknown[]) : [value]).flatMap((a) =>
        typeof a === 'object' &&
        a !== null &&
        typeof (a as { id?: unknown }).id === 'string'
          ? [(a as { id: string }).id]
          : [],
      );
    const visit = (node: SceneNode, component: string) => {
      const name =
        node.type === 'COMPONENT_SET' ||
        (node.type === 'COMPONENT' && node.parent?.type !== 'COMPONENT_SET')
          ? node.name
          : component;
      const paints = [node.fills, node.strokes].flatMap((list) =>
        Array.isArray(list) ? (list as readonly Paint[]) : [],
      );
      for (const id of [
        ...Object.values(node.boundVariables ?? {}).flatMap(ids),
        ...paints.flatMap((p) => ids(p.boundVariables?.color)),
      ]) {
        const path = orphanIds[id];
        if (path !== undefined && name !== '' && !boundBy[path]?.includes(name))
          boundBy[path] = [...(boundBy[path] ?? []), name];
      }
      for (const child of node.children ?? []) visit(child, name);
    };
    for (const node of page.children) visit(node, '');
  }
  return {
    fossil: 'finish',
    commit: missing.length === 0 ? spec.commit : '',
    missing,
    orphans,
    boundBy,
    unstamped,
  };
}

/** Creates or updates one part of Fossil's variables. Running it again changes nothing. */
export async function apply(spec: ApplySpec, figma: Figma): Promise<unknown> {
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const variables = await figma.variables.getLocalVariablesAsync();
  const { owned, modeIds } = ensureCollections(
    figma,
    collections,
    spec.collections,
  );

  // Check everything before writing anything, because a failed script may keep its partial writes.
  const index = stampedVariables(variables);
  const problems: string[] = [];
  const plan = spec.variables.map((v) => {
    const renamed = v.renamedFrom.find((old) => index[old]);
    const existing =
      index[v.path] ?? (renamed !== undefined ? index[renamed] : undefined);
    if (existing && existing.resolvedType !== v.type)
      problems.push(
        `${v.path} is a ${existing.resolvedType} variable in Figma but a ${v.type} token in code. Delete the variable in Figma, then apply again.`,
      );
    const collectionId = known(owned[v.collection], v.collection).id;
    const clash = variables.find(
      (o) =>
        o !== existing &&
        o.variableCollectionId === collectionId &&
        o.name === v.name,
    );
    if (clash)
      problems.push(
        `${v.path}: another variable is already named ${v.name}${stamp(clash) ? ` (stamped ${stamp(clash)})` : ''}. Rename or delete it in Figma, then apply again.`,
      );
    return { spec: v, existing, renamed: existing && renamed ? renamed : '' };
  });
  const coming: Record<string, boolean> = {};
  for (const step of plan) {
    for (const value of Object.values(step.spec.values))
      if (
        typeof value === 'object' &&
        'alias' in value &&
        !index[value.alias] &&
        !coming[value.alias]
      )
        problems.push(
          `${step.spec.path} aliases ${value.alias}, which isn't in Figma yet. Run the apply scripts in order.`,
        );
    coming[step.spec.path] = true;
  }
  if (problems.length > 0) throw new Error(problems.join('\n'));

  const same = (a: FigmaValue | undefined, b: FigmaValue): boolean => {
    if (a === undefined) return false;
    // Figma keeps numbers as 32-bit floats: 1.2 comes back as 1.2000000476837158.
    if (typeof a === 'number' && typeof b === 'number')
      return Math.fround(a) === Math.fround(b);
    if (typeof a !== 'object' || typeof b !== 'object') return a === b;
    if ('type' in a || 'type' in b) {
      if (!('type' in a) || !('type' in b)) return false;
      if (a.type === 'VARIABLE_ALIAS')
        return b.type === 'VARIABLE_ALIAS' && a.id === b.id;
      if (b.type === 'VARIABLE_ALIAS') return false;
      const p = a.easingFunctionCubicBezier;
      const q = b.easingFunctionCubicBezier;
      if (a.type !== b.type || !p || !q) return a.type === b.type && !p && !q;
      return (
        Math.abs(p.x1 - q.x1) < 0.0005 &&
        Math.abs(p.y1 - q.y1) < 0.0005 &&
        Math.abs(p.x2 - q.x2) < 0.0005 &&
        Math.abs(p.y2 - q.y2) < 0.0005
      );
    }
    if (!('r' in a) || !('r' in b)) return false;
    return (
      Math.abs(a.r - b.r) < 0.5 / 255 &&
      Math.abs(a.g - b.g) < 0.5 / 255 &&
      Math.abs(a.b - b.b) < 0.5 / 255 &&
      Math.abs(a.a - b.a) < 0.005
    );
  };
  const created: string[] = [];
  const renamed: string[] = [];
  const updated: string[] = [];
  let unchanged = 0;
  for (const step of plan) {
    const v = step.spec;
    let variable = step.existing;
    const isNew = !variable;
    const changes: string[] = [];
    if (!variable) {
      variable = figma.variables.createVariable(
        v.name,
        known(owned[v.collection], v.collection),
        v.type,
      );
      variables.push(variable);
      created.push(v.path);
    } else if (step.renamed !== '') {
      renamed.push(`${step.renamed} → ${v.path}`);
    }
    if (variable.name !== v.name) {
      variable.name = v.name;
      changes.push('name');
    }
    if (stamp(variable) !== v.path) {
      setStamp(variable, v.path);
      index[v.path] = variable;
      changes.push('stamp');
    }
    if (variable.codeSyntax.WEB !== v.code) {
      variable.setVariableCodeSyntax('WEB', v.code);
      changes.push('code syntax');
    }
    // Figma keeps a description HTML-escaped: & < > " and ' come back as entities.
    const description = variable.description
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&');
    if (description !== v.description) {
      variable.description = v.description;
      changes.push('description');
    }
    if (v.scopes !== undefined && variable.scopes.join() !== v.scopes.join()) {
      variable.scopes = v.scopes;
      changes.push('scopes');
    }
    for (const [mode, value] of Object.entries(v.values)) {
      const wanted: FigmaValue =
        typeof value === 'object' && 'alias' in value
          ? {
              type: 'VARIABLE_ALIAS',
              id: known(index[value.alias], value.alias).id,
            }
          : toFigma(value);
      const modeId = known(modeIds[v.collection]?.[mode], `the ${mode} mode`);
      if (!same(variable.valuesByMode[modeId], wanted)) {
        variable.setValueForMode(modeId, wanted);
        changes.push(`${mode} value`);
      }
    }
    if (isNew) continue;
    if (changes.length > 0) updated.push(`${v.path}: ${changes.join(', ')}`);
    else unchanged += 1;
  }
  return {
    fossil: 'apply',
    part: `${String(spec.part)} of ${String(spec.parts)}`,
    created,
    renamed,
    updated,
    unchanged,
  };
}

/** SHA-256 of a string's UTF-8 bytes, as hex. Figma's plugin sandbox has no Web Crypto. */
export function sha256(text: string): string {
  const bytes: number[] = [];
  for (let i = 0; i < text.length; i++) {
    let code = text.charCodeAt(i);
    if (code >= 0xd800 && code < 0xdc00 && i + 1 < text.length) {
      const low = text.charCodeAt(i + 1);
      if (low >= 0xdc00 && low < 0xe000) {
        code = 0x10000 + ((code - 0xd800) << 10) + (low - 0xdc00);
        i++;
      }
    }
    if (code < 0x80) bytes.push(code);
    else if (code < 0x800) bytes.push(0xc0 | (code >> 6), 0x80 | (code & 63));
    else if (code < 0x10000)
      bytes.push(
        0xe0 | (code >> 12),
        0x80 | ((code >> 6) & 63),
        0x80 | (code & 63),
      );
    else
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 63),
        0x80 | ((code >> 6) & 63),
        0x80 | (code & 63),
      );
  }
  const length = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  for (let shift = 56; shift >= 0; shift -= 8)
    bytes.push(
      shift >= 32
        ? Math.floor(length / 2 ** shift) & 255
        : (length >>> shift) & 255,
    );

  const at = (list: readonly number[], i: number) => list[i] ?? 0;
  const k: number[] = [];
  for (let n = 2; k.length < 64; n++) {
    let prime = true;
    for (let d = 2; d * d <= n; d++) if (n % d === 0) prime = false;
    if (prime) k.push(((Math.cbrt(n) % 1) * 2 ** 32) | 0);
  }
  const rotate = (x: number, n: number) => (x >>> n) | (x << (32 - n));
  let h: [number, number, number, number, number, number, number, number] = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c,
    0x1f83d9ab, 0x5be0cd19,
  ];
  for (let block = 0; block < bytes.length; block += 64) {
    const w: number[] = [];
    for (let t = 0; t < 16; t++) {
      const i = block + 4 * t;
      w.push(
        (at(bytes, i) << 24) |
          (at(bytes, i + 1) << 16) |
          (at(bytes, i + 2) << 8) |
          at(bytes, i + 3),
      );
    }
    for (let t = 16; t < 64; t++) {
      const x = at(w, t - 15);
      const y = at(w, t - 2);
      const s0 = rotate(x, 7) ^ rotate(x, 18) ^ (x >>> 3);
      const s1 = rotate(y, 17) ^ rotate(y, 19) ^ (y >>> 10);
      w.push((at(w, t - 16) + s0 + at(w, t - 7) + s1) | 0);
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let t = 0; t < 64; t++) {
      const t1 =
        (hh +
          (rotate(e, 6) ^ rotate(e, 11) ^ rotate(e, 25)) +
          ((e & f) ^ (~e & g)) +
          at(k, t) +
          at(w, t)) |
        0;
      const t2 =
        ((rotate(a, 2) ^ rotate(a, 13) ^ rotate(a, 22)) +
          ((a & b) ^ (a & c) ^ (b & c))) |
        0;
      hh = g;
      g = f;
      f = e;
      e = (d + t1) | 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) | 0;
    }
    h = [
      (h[0] + a) | 0,
      (h[1] + b) | 0,
      (h[2] + c) | 0,
      (h[3] + d) | 0,
      (h[4] + e) | 0,
      (h[5] + f) | 0,
      (h[6] + g) | 0,
      (h[7] + hh) | 0,
    ];
  }
  return h.map((x) => (x >>> 0).toString(16).padStart(8, '0')).join('');
}

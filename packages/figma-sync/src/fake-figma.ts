import type { Figma, FigmaCollection, FigmaVariable } from './runtime.ts';

type Value = FigmaVariable['valuesByMode'][string];

class Data {
  readonly #data = new Map<string, string>();

  getSharedPluginData(namespace: string, key: string): string {
    return this.#data.get(`${namespace}:${key}`) ?? '';
  }

  setSharedPluginData(namespace: string, key: string, value: string): void {
    this.#data.set(`${namespace}:${key}`, value);
  }
}

class Collection extends Data implements FigmaCollection {
  modes: { modeId: string; name: string }[];
  readonly id: string;
  name: string;
  readonly #figma: FakeFigma;

  constructor(figma: FakeFigma, id: string, name: string) {
    super();
    this.#figma = figma;
    this.id = id;
    this.name = name;
    this.modes = [{ modeId: `${id}:0`, name: 'Mode 1' }];
  }

  addMode(name: string): string {
    // Professional and Education files allow four modes per collection.
    if (this.modes.length >= 4)
      throw new Error('in addMode: Limited to 4 modes only');
    const modeId = `${this.id}:${String(this.modes.length)}`;
    this.modes.push({ modeId, name });
    for (const v of this.#figma.all)
      if (v.variableCollectionId === this.id) v.fillMode(modeId);
    return modeId;
  }

  renameMode(modeId: string, name: string): void {
    const mode = this.modes.find((m) => m.modeId === modeId);
    if (!mode) throw new Error(`No mode ${modeId}`);
    mode.name = name;
  }
}

class Variable extends Data implements FigmaVariable {
  readonly id: string;
  readonly resolvedType: string;
  readonly variableCollectionId: string;
  readonly valuesByMode: Record<string, Value> = {};
  readonly codeSyntax: Record<string, string> = {};
  #scopes = ['ALL_SCOPES'];
  description = '';
  #name: string;
  readonly #figma: FakeFigma;

  constructor(
    figma: FakeFigma,
    id: string,
    name: string,
    collection: Collection,
    type: string,
  ) {
    super();
    this.#figma = figma;
    this.id = id;
    this.#name = name;
    this.resolvedType = type;
    this.variableCollectionId = collection.id;
    for (const mode of collection.modes) this.fillMode(mode.modeId);
  }

  get scopes(): string[] {
    return this.#scopes;
  }

  set scopes(scopes: string[]) {
    if (this.resolvedType === 'TIMING' || this.resolvedType === 'EASING')
      throw new Error('Cannot set scopes on this variable type');
    this.#scopes = scopes;
  }

  get name(): string {
    return this.#name;
  }

  set name(name: string) {
    this.#figma.checkName(this.variableCollectionId, name, this);
    this.#name = name;
  }

  fillMode(modeId: string): void {
    const defaults: Record<string, Value> = {
      COLOR: { r: 0, g: 0, b: 0, a: 1 },
      FLOAT: 0,
      STRING: '',
      TIMING: 0,
      EASING: { type: 'EASE_OUT' },
    };
    const first = Object.values(this.valuesByMode)[0];
    this.valuesByMode[modeId] = first ?? defaults[this.resolvedType] ?? 0;
  }

  setValueForMode(modeId: string, value: Value): void {
    if (!(modeId in this.valuesByMode)) throw new Error(`No mode ${modeId}`);
    if (
      typeof value === 'object' &&
      'type' in value &&
      value.type === 'VARIABLE_ALIAS'
    ) {
      const target = this.#figma.all.find((v) => v.id === value.id);
      if (!target) throw new Error(`No variable ${value.id} to alias`);
      if (target.resolvedType !== this.resolvedType)
        throw new Error('An alias must point at a variable of the same type');
    } else {
      const expected = {
        COLOR: 'object',
        FLOAT: 'number',
        STRING: 'string',
        TIMING: 'number',
        EASING: 'object',
      }[this.resolvedType];
      const easing = typeof value === 'object' && 'type' in value;
      if (
        typeof value !== expected ||
        easing !== (this.resolvedType === 'EASING')
      )
        throw new Error(
          `A ${this.resolvedType} variable can't hold ${JSON.stringify(value)}`,
        );
    }
    this.valuesByMode[modeId] = value;
  }

  setVariableCodeSyntax(platform: 'WEB', value: string): void {
    this.codeSyntax[platform] = value;
  }
}

/** An in-memory stand-in for the variables part of Figma's Plugin API, strict where Figma is. */
export class FakeFigma implements Figma {
  readonly all: Variable[] = [];
  readonly collections: Collection[] = [];
  #next = 1;

  readonly variables = {
    getLocalVariableCollectionsAsync: () =>
      Promise.resolve([...this.collections]),
    getLocalVariablesAsync: () => Promise.resolve([...this.all]),
    createVariableCollection: (name: string) => {
      const collection = new Collection(
        this,
        `VariableCollectionId:${this.#id()}`,
        name,
      );
      this.collections.push(collection);
      return collection;
    },
    createVariable: (
      name: string,
      collection: FigmaCollection,
      type: string,
    ) => {
      const owner = this.collections.find((c) => c.id === collection.id);
      if (!owner) throw new Error('No such collection');
      this.checkName(owner.id, name);
      const variable = new Variable(
        this,
        `VariableID:${this.#id()}`,
        name,
        owner,
        type,
      );
      this.all.push(variable);
      return variable;
    },
  };

  #id(): string {
    return String(this.#next++);
  }

  checkName(collectionId: string, name: string, self?: Variable): void {
    if (
      this.all.some(
        (v) =>
          v !== self &&
          v.variableCollectionId === collectionId &&
          v.name === name,
      )
    )
      throw new Error(
        `A variable named ${name} already exists in this collection`,
      );
  }

  /** The variable stamped with a token path. */
  variable(path: string): Variable {
    const found = this.all.find(
      (v) => v.getSharedPluginData('fossil', 'path') === path,
    );
    if (!found) throw new Error(`No variable stamped ${path}`);
    return found;
  }

  /** The id of a collection's mode, by name. */
  mode(variable: FigmaVariable, name: string): string {
    const collection = this.collections.find(
      (c) => c.id === variable.variableCollectionId,
    );
    const mode = collection?.modes.find((m) => m.name === name);
    if (!mode) throw new Error(`No mode ${name}`);
    return mode.modeId;
  }

  remove(variable: FigmaVariable): void {
    this.all.splice(this.all.indexOf(variable as Variable), 1);
  }
}

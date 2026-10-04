import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as fossil from './index.ts';

/** Folders that hold shared internals rather than a component. */
const internal = new Set(['Floating']);

const components = readdirSync(new URL('./components/', import.meta.url), {
  withFileTypes: true,
})
  .filter((entry) => entry.isDirectory() && !internal.has(entry.name))
  .map((entry) => entry.name);

describe('the package entry', () => {
  it.each(components)('exports %s', (name) => {
    expect(fossil).toHaveProperty(name);
  });
});

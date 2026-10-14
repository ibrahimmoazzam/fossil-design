// Writes the brand into a package that needs it at run time. A published package can't read
// brand.config.json, which sits outside its tarball, so the values are inlined here instead.
// Takes the destination as its argument, relative to the package it runs in.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import config from '../brand.config.json' with { type: 'json' };

const destination = process.argv[2];
if (!destination)
  throw new Error(
    'Usage: brand.ts <destination>, such as src/generated/brand.ts',
  );

mkdirSync(dirname(destination), { recursive: true });
writeFileSync(
  destination,
  [
    '// Generated from brand.config.json by scripts/brand.ts. Not committed; never edit it.',
    `export const name = ${JSON.stringify(config.name)};`,
    `export const prefix = ${JSON.stringify(config.cssPrefix)};`,
    `export const scope = ${JSON.stringify(config.npmScope)};`,
    '',
  ].join('\n'),
);
console.log(`brand: ${config.name} into ${destination}`);

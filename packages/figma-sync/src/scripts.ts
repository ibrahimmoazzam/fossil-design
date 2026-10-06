import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import type { CheckSpec, StylesSpec } from './library/runtime.ts';
import type { Spec } from './runtime.ts';

export const hash = (text: string): string =>
  createHash('sha256').update(text, 'utf8').digest('hex');

/**
 * Both runtimes' functions as plain JavaScript, by name. Figma's plugin sandbox isn't guaranteed
 * past ES2017. Indentation is dropped to keep scripts small; the runtimes have no multi-line
 * strings, so that changes nothing else. Imports are dropped too, since the two files are merged.
 */
const functions = (() => {
  const all = new Map<string, string>();
  for (const file of ['runtime.ts', 'library/runtime.ts']) {
    const js = ts
      .transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {
        compilerOptions: {
          target: ts.ScriptTarget.ES2017,
          module: ts.ModuleKind.ESNext,
          removeComments: true,
        },
      })
      .outputText.replaceAll(/^export /gm, '')
      .replaceAll(/^[ \t]+/gm, '');
    const starts = [...js.matchAll(/^(?:async )?function (\w+)\(/gm)];
    starts.forEach((match, i) => {
      const name = String(match[1]);
      if (all.has(name))
        throw new Error(`Both runtimes define a function called ${name}.`);
      all.set(
        name,
        js.slice(match.index, starts[i + 1]?.index ?? js.length).trimEnd(),
      );
    });
  }
  return all;
})();

/** The function a script runs, and every runtime function it calls, in the runtime's order. */
const included = (entry: string): string[] => {
  const names = new Set([entry, 'sha256']);
  for (let grew = true; grew;) {
    grew = false;
    for (const [name] of functions)
      if (
        !names.has(name) &&
        [...names].some((n) =>
          new RegExp(`\\b${name}\\(`).test(functions.get(n) ?? ''),
        )
      ) {
        names.add(name);
        grew = true;
      }
  }
  return [...functions.keys()].filter((name) => names.has(name));
};

export const CHANGED =
  'This script was changed after Fossil generated it. Generate it again and pass it to use_figma exactly as it is.';

/** A script for use_figma that refuses to run if anything in it was changed. */
export function script(
  spec: Spec | StylesSpec | CheckSpec,
  title: string,
): string {
  const names = included(spec.kind);
  const code = names.map((name) => functions.get(name) ?? '');
  const data = JSON.stringify(spec);
  // use_figma rewrites a script that contains an svg tag, so the functions' source changes and
  // the hash fails. Learnings, section 5.
  if ([...code, data].some((text) => /<\/?(?:svg|path)\b/i.test(text)))
    throw new Error(
      'A script for use_figma must not contain an svg tag: build the markup at run time, as svgOf does.',
    );
  return [
    `// Fossil Design figma-sync: ${title}.`,
    '// Pass this script to use_figma exactly as it is. It checks its own hash before it runs.',
    `const integrity = ${JSON.stringify(hash(code.join('\n') + data))};`,
    `const spec = ${data};`,
    ...code,
    `if (sha256([${names.join(', ')}].map(String).join('\\n') + JSON.stringify(spec)) !== integrity) throw new Error(${JSON.stringify(CHANGED)});`,
    `return await ${spec.kind}(spec, figma);`,
    '',
  ].join('\n');
}

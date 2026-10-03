import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { TokensFile } from '../src/metadata.ts';

/** Lists the deprecated tokens in a tokens.json, with their replacements. */
export function report({ tokens }: TokensFile): string {
  const deprecated = Object.entries(tokens).filter(
    ([, t]) => t.deprecated !== undefined,
  );
  if (deprecated.length === 0) return 'No deprecated tokens.';
  const lines = deprecated.map(([path, t]) => {
    const details = [
      t.replacedBy === undefined ? 'no replacement' : `use ${t.replacedBy}`,
      ...(t.since === undefined ? [] : [`since ${t.since}`]),
    ].join(', ');
    const reason = typeof t.deprecated === 'string' ? ` ${t.deprecated}` : '';
    return `  ${path} (${details}).${reason}`;
  });
  const count = deprecated.length;
  return [
    `${String(count)} deprecated token${count === 1 ? '' : 's'}:`,
    ...lines,
  ].join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = fileURLToPath(new URL('../dist/tokens.json', import.meta.url));
  if (!existsSync(file)) {
    console.error('No dist/tokens.json. Run pnpm --filter tokens build first.');
    process.exit(1);
  }
  console.log(report(JSON.parse(readFileSync(file, 'utf8')) as TokensFile));
}

/// <reference types="vite/client" />
import { slug } from './slug.ts';

const adrFiles = import.meta.glob<string>('../../../docs/decisions/0*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

/** Every ADR, in order, with its path from the repo root and the id of its title on the site. */
export const decisionRecords = Object.keys(adrFiles)
  .sort()
  .map((file) => {
    const source = adrFiles[file] ?? '';
    const title = /^# (.+)$/m.exec(source)?.[1] ?? '';
    return {
      path: `docs/decisions/${file.slice(file.lastIndexOf('/') + 1)}`,
      source,
      anchor: slug(title),
    };
  });

const pages: Record<string, string> = {
  'README.md': 'introduction',
  'docs/Learnings.md': 'research-learnings',
  'docs/drift-eval.md': 'research-drift-eval',
  'docs/key-decisions.md': 'architecture-key-decisions',
  'docs/decisions/README.md': 'architecture-decision-records',
  'packages/tokens/dist/foundations.md': 'foundations-overview',
  'packages/tokens/dist/tokens.md': 'foundations-tokens',
};

/** Where a repo file is shown on this site, or `undefined` when only GitHub has it. */
export function sitePath(path: string, hash?: string): string | undefined {
  const record = decisionRecords.find((r) => r.path === path);
  const page = record ? 'architecture-decision-records' : pages[path];
  if (page === undefined) return undefined;
  const anchor = hash ?? record?.anchor;
  return `?path=/docs/${page}--docs${anchor ? `#${anchor}` : ''}`;
}

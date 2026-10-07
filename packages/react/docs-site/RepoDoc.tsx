import { Markdown } from '@storybook/addon-docs/blocks';
import packageJson from '../package.json' with { type: 'json' };
import { sitePath } from './pages.ts';

const repo = packageJson.repository.url
  .replace(/^git\+/, '')
  .replace(/\.git$/, '');

/** Points a relative link in a repo file at that file's page on this site, or else on GitHub. */
function absolute(link: string, from: string): string {
  if (/^([a-z]+:|#)/i.test(link)) return link;
  const [target = '', hash] = link.split('#');
  const parts = from.split('/').slice(0, -1);
  for (const part of target.split('/')) {
    if (part === '..') parts.pop();
    else if (part !== '.' && part !== '') parts.push(part);
  }
  const path = parts.join('/');
  return (
    sitePath(path, hash) ??
    `${repo}/blob/main/${path}${hash === undefined ? '' : `#${hash}`}`
  );
}

/** Moves every heading outside a code block down by `levels`, so several files can share one page. */
function demote(markdown: string, levels: number): string {
  let fenced = false;
  return markdown
    .split('\n')
    .map((line) => {
      if (line.startsWith('```')) fenced = !fenced;
      return !fenced && /^#{1,5} /.test(line)
        ? '#'.repeat(levels) + line
        : line;
    })
    .join('\n');
}

/**
 * A Markdown file from the repo, shown as it is, so the site never holds a second copy.
 * `path` is the file's path from the repo root, for resolving its relative links.
 */
export function RepoDoc({
  source,
  path,
  headingShift = 0,
}: {
  source: string;
  path: string;
  headingShift?: number;
}) {
  const body = demote(
    source.replace(/^<!--[\s\S]*?-->\s*/, ''),
    headingShift,
  ).replace(
    /\]\(([^)\s]+)\)/g,
    (_, link: string) => `](${absolute(link, path)})`,
  );
  return <Markdown>{body}</Markdown>;
}

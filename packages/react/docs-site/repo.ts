import packageJson from '../package.json' with { type: 'json' };

/** The repository on GitHub, from the package's own metadata, so a fork links to itself. */
export const repo = packageJson.repository.url
  .replace(/^git\+/, '')
  .replace(/\.git$/, '');

/** A file or folder in the repository, on GitHub. */
export function onGitHub(path: string): string {
  return `${repo}/${path.endsWith('/') ? 'tree' : 'blob'}/main/${path.replace(/\/$/, '')}`;
}

/** A page on this site, as a link Storybook follows within the site. */
export function sitePage(page: string, anchor?: string): string {
  return `?path=/docs/${page}--docs${anchor ? `#${anchor}` : ''}`;
}

import brand from '../../../brand.config.json' with { type: 'json' };

/**
 * The site's own origin: the canonical link, and the absolute `og:image` URL a scraper needs.
 * Hard-coded rather than derived from the repository, because the site answers on a custom
 * domain. A fork puts its own here, or the GitHub Pages URL its repository is served from,
 * `https://<owner>.github.io/<name>`. `pnpm rename` leaves it alone: a domain isn't a name.
 */
export const siteUrl = 'https://fossil.ibrahimmoazzam.com';

/**
 * The front page's title, and the one a scraper reads. Storybook names itself in every tab
 * title and in the built page's, with no option to change either, so manager.ts renames the tab
 * and scripts/site-meta.ts rewrites the built page. A fork writes its own.
 */
export const siteTitle = `${brand.name}: Open-Source Agentic Design System`;

/**
 * One sentence, inside the ~160 characters a search result and a preview card show. It doesn't
 * repeat the name or "agentic": siteTitle sits above it everywhere it's read, so the pair has
 * room to say what Fossil is and then why it matters.
 */
export const siteDescription =
  'Built agent-first: tokens in git reach Figma and React, so design and coding agents seamlessly keep generated UI on-system, without a dedicated platform team.';

/** The preview card, as a scraper reads it. It fetches the image itself, so the URL is absolute. */
export const ogImage = {
  url: `${siteUrl}/og-image.png`,
  type: 'image/png',
  width: 1200,
  height: 630,
  alt: siteTitle,
};

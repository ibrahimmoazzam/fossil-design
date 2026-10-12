/**
 * Writes the docs site's metadata into Storybook's built index.html, after `storybook build`.
 *
 * Storybook's manager template hard-codes `<title><name> - Storybook</title>` and offers no
 * metadata beyond it, so a link to the site unfurled as "storybook - Storybook", with no
 * description and no image. manager.ts already renames the tab, but a scraper runs no
 * JavaScript and reads the built file as it stands.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  ogImage,
  siteDescription,
  siteTitle,
  siteUrl,
} from '../docs-site/meta.ts';

const escape = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;');

const meta = (key: 'name' | 'property', name: string, content: string) =>
  `<meta ${key}="${name}" content="${escape(content).replace(/"/g, '&quot;')}" />`;

/** The block's bounds, so a second run replaces what the first one wrote. */
export const START = '<!-- The site metadata, from scripts/site-meta.ts. -->';
export const END = '<!-- End of the site metadata. -->';

/** Every tag the head gains, in the order a reader would expect them. */
export function tags(): string[] {
  return [
    meta('name', 'description', siteDescription),
    `<link rel="canonical" href="${siteUrl}" />`,
    meta('property', 'og:type', 'website'),
    meta('property', 'og:site_name', siteTitle),
    meta('property', 'og:title', siteTitle),
    meta('property', 'og:description', siteDescription),
    meta('property', 'og:url', siteUrl),
    meta('property', 'og:image', ogImage.url),
    meta('property', 'og:image:type', ogImage.type),
    meta('property', 'og:image:width', String(ogImage.width)),
    meta('property', 'og:image:height', String(ogImage.height)),
    meta('property', 'og:image:alt', ogImage.alt),
    // X shows a card this wide only when it's told the image fills one.
    meta('name', 'twitter:card', 'summary_large_image'),
    meta('name', 'twitter:title', siteTitle),
    meta('name', 'twitter:description', siteDescription),
    meta('name', 'twitter:image', ogImage.url),
    meta('name', 'twitter:image:alt', ogImage.alt),
  ];
}

const TITLE = /<title>[^<]*<\/title>/;

/** The built page with the site's title and metadata in its head. Run twice, it's the same. */
export function withMeta(html: string): string {
  if (!TITLE.test(html))
    throw new Error(
      "Storybook's built index.html has no <title>, so its metadata has nowhere to go.",
    );
  const indent = '\n    ';
  const titled = html.replace(TITLE, `<title>${escape(siteTitle)}</title>`);
  const block = [START, ...tags(), END].join(indent);

  const from = titled.indexOf(START);
  if (from === -1)
    return titled.replace(TITLE, (title) => `${title}${indent}${block}`);

  const to = titled.indexOf(END, from);
  if (to === -1)
    throw new Error(
      `index.html has ${START} but no ${END} after it. Build the site again.`,
    );
  return titled.slice(0, from) + block + titled.slice(to + END.length);
}

function main() {
  const page = new URL('../storybook-static/index.html', import.meta.url);
  writeFileSync(page, withMeta(readFileSync(page, 'utf8')));
  console.log(`site-meta: ${siteTitle} — ${siteUrl}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();

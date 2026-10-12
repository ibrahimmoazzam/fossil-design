import { describe, expect, it } from 'vitest';
import {
  siteDescription,
  siteTitle,
  siteUrl,
  ogImage,
} from '../docs-site/meta.ts';
import { END, START, tags, withMeta } from './site-meta.ts';

/** Storybook's built head, trimmed to the parts the rewrite has to respect. */
const built = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />

    <title>storybook - Storybook</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />

    <link rel="icon" type="image/svg+xml" href="./favicon.svg" />
  </head>
</html>
`;

const content = (html: string, key: string) =>
  new RegExp(`<meta (?:name|property)="${key}" content="([^"]*)"`).exec(
    html,
  )?.[1];

describe('withMeta', () => {
  const html = withMeta(built);

  it('replaces the title Storybook built', () => {
    expect(html).toContain(`<title>${siteTitle}</title>`);
    expect(html).not.toContain('storybook - Storybook');
  });

  it('keeps the tags Storybook put after the title', () => {
    expect(html).toContain('<meta name="viewport"');
    expect(html).toContain('rel="icon"');
    expect(html).toContain('<meta charset="utf-8" />');
  });

  it('names the page for a scraper', () => {
    expect(content(html, 'og:title')).toBe(siteTitle);
    expect(content(html, 'twitter:title')).toBe(siteTitle);
    expect(content(html, 'description')).toBe(siteDescription);
    expect(content(html, 'og:description')).toBe(siteDescription);
    expect(content(html, 'og:url')).toBe(siteUrl);
    expect(html).toContain(`<link rel="canonical" href="${siteUrl}" />`);
  });

  it('gives the card an absolute image and the width that fills it', () => {
    expect(content(html, 'og:image')).toBe(ogImage.url);
    expect(content(html, 'twitter:image')).toBe(ogImage.url);
    expect(ogImage.url.startsWith('https://')).toBe(true);
    expect(content(html, 'twitter:card')).toBe('summary_large_image');
  });

  it('writes the same page twice', () => {
    expect(withMeta(html)).toBe(html);
  });

  it('fails on a page with no title to replace', () => {
    expect(() => withMeta('<html><head></head></html>')).toThrow(/no <title>/);
  });

  it('fails on a block left unclosed', () => {
    expect(() => withMeta(html.replace(END, ''))).toThrow(
      /Build the site again/,
    );
  });

  it('closes every tag it writes, with nothing loose in an attribute', () => {
    for (const tag of tags()) {
      expect(tag).toMatch(/^<(?:meta|link) [^<>]*\/>$/);
      expect(tag.split('"').length % 2).toBe(1);
    }
  });

  it('writes the block between its markers', () => {
    expect(html.indexOf(START)).toBeGreaterThan(html.indexOf(siteTitle));
    expect(html.indexOf(START)).toBeLessThan(html.indexOf(END));
  });
});

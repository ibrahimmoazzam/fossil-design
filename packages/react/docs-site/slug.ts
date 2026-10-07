/** The id GitHub, and Storybook's docs, give a heading: a slug of its text. */
export function slug(heading: string): string {
  return heading
    .replace(/[`*_]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N} -]/gu, '')
    .replace(/ /g, '-');
}

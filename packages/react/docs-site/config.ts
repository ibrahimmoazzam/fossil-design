import fossilConfig from '../../../fossil.config.json' with { type: 'json' };
import tokensFile from '@fossil-design/tokens/tokens.json';
import { fill, list } from '../scripts/template.ts';

/** The faces the semantic font tokens name first, such as `Space Grotesk`. */
const fonts = Object.entries(tokensFile.tokens)
  .filter(
    ([path, token]) =>
      token.tier === 'semantic' &&
      path.startsWith('font.family.') &&
      Array.isArray(token.value),
  )
  .map(([, token]) => String((token.value as unknown[])[0]));

/** Fills a page's `{{name}}`, `{{prefix}}`, `{{scope}}` and `{{fonts}}` from fossil.config.json and the tokens, so a fork's site names its own system. */
export function fromConfig(text: string): string {
  return fill(text, {
    name: fossilConfig.name,
    prefix: fossilConfig.cssPrefix,
    scope: fossilConfig.npmScope,
    fonts: list([...new Set(fonts)]),
  });
}

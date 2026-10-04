import { tokenKeys } from '@fossil-design/tokens';
import { describe, expect, it } from 'vitest';
import { boxVariants, surfaceTokens } from './components/Box/variants.ts';
import { textVariants } from './components/Text/Text.tsx';

describe('variant maps follow the tokens', () => {
  it('has a Text variant for every text style', () => {
    expect(textVariants.variant).toEqual([
      ...tokenKeys.text,
      ...tokenKeys['text.heading'].map((key) => `heading-${key}`),
    ]);
  });

  it('pairs every Box surface with a fill and a text colour', () => {
    expect(Object.keys(surfaceTokens)).toEqual(boxVariants.surface);
  });
});

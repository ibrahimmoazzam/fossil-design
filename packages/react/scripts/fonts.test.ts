import { describe, expect, it } from 'vitest';
import tokens from '@fossil-design/tokens/tokens.json';
import { loadedFonts, missingFonts, requiredFonts } from './fonts.ts';

const style = (fontFamily: string, fontWeight: number) => ({
  tier: 'semantic',
  type: 'typography',
  value: { fontFamily: [fontFamily, 'system-ui'], fontWeight },
});

const file = {
  tokens: {
    'text.body': style('Figtree', 400),
    'text.control': style('Figtree', 500),
    'text.heading.l': style('Space Grotesk', 700),
    // Not a text style, so it names no face to load.
    'font.family.body': { tier: 'semantic', value: ['Figtree', 'system-ui'] },
  },
};

describe('the faces the text styles use', () => {
  it('collects every weight set on each family', () => {
    expect(requiredFonts(file)).toEqual(
      new Map([
        ['Figtree', new Set([400, 500])],
        ['Space Grotesk', new Set([700])],
      ]),
    );
  });

  it('reads a Google Fonts URL, with + for spaces and ranges spelled out', () => {
    expect(
      loadedFonts(
        'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700&family=Sora:wght@300..500&display=swap',
      ),
    ).toEqual(
      new Map([
        ['Space Grotesk', new Set([400, 700])],
        ['Sora', new Set([300, 400, 500])],
      ]),
    );
  });

  it('reports a family that is never loaded', () => {
    expect(missingFonts('family=Figtree:wght@400;500', file)).toEqual([
      "doesn't load Space Grotesk, which the text styles use",
    ]);
  });

  it('reports a weight the family is loaded without', () => {
    expect(
      missingFonts(
        'family=Figtree:wght@400;500&family=Space+Grotesk:wght@400;500;600',
        file,
      ),
    ).toEqual([
      'loads Space Grotesk without weight 700, which the text styles set',
    ]);
  });

  it('allows a weight no text style asks for, such as bold for <strong>', () => {
    expect(
      missingFonts(
        'family=Figtree:wght@400;500;600;700&family=Space+Grotesk:wght@700',
        file,
      ),
    ).toEqual([]);
  });

  it("covers Fossil's own stylesheets, as the build checks them", () => {
    expect(requiredFonts(tokens).size).toBeGreaterThan(0);
  });
});

import { describe, expect, it } from 'vitest';
import { contrastRatio } from './contrast.ts';

const colour = (hex: string, alpha?: number) => ({
  colorSpace: 'srgb',
  components: [0, 0, 0],
  hex,
  ...(alpha !== undefined && { alpha }),
});

describe('contrast ratio', () => {
  it('follows WCAG 2.2: 21:1 for black on white, either way round, and 1:1 for a colour on itself', () => {
    expect(contrastRatio(colour('#000000'), colour('#ffffff'))).toBeCloseTo(
      21,
      5,
    );
    expect(contrastRatio(colour('#ffffff'), colour('#000000'))).toBeCloseTo(
      21,
      5,
    );
    expect(contrastRatio(colour('#777777'), colour('#777777'))).toBe(1);
  });

  it('gives #767676 on white 4.54:1, the darkest grey that passes AA', () => {
    expect(contrastRatio(colour('#767676'), colour('#ffffff'))).toBeCloseTo(
      4.54,
      2,
    );
  });

  it('leaves out a translucent colour, which depends on what lies beneath it', () => {
    expect(
      contrastRatio(colour('#000000', 0.5), colour('#ffffff')),
    ).toBeUndefined();
  });

  it('checks a translucent background at its worst, over white and over black', () => {
    // White on black at 60% over a white frame is #666666: 5.74:1. Over black it would be 21:1.
    expect(
      contrastRatio(colour('#ffffff'), colour('#000000', 0.6)),
    ).toBeCloseTo(5.74, 2);
    // Black text on the same veil fails over black, whatever it gives over white.
    expect(
      contrastRatio(colour('#000000'), colour('#000000', 0.6)),
    ).toBeCloseTo(1, 5);
  });
});

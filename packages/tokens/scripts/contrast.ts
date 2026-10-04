import { isRecord } from './validate.ts';

/** A DTCG colour's sRGB channels, 0 to 1, read from its 8-bit hex as WCAG defines them, and its alpha. */
const read = (
  colour: unknown,
): { rgb: number[]; alpha: number } | undefined => {
  if (!isRecord(colour) || colour.colorSpace !== 'srgb') return undefined;
  const alpha = typeof colour.alpha === 'number' ? colour.alpha : 1;
  if (typeof colour.hex === 'string' && /^#[0-9a-f]{6}$/i.test(colour.hex))
    return {
      rgb: [1, 3, 5].map(
        (i) => parseInt(String(colour.hex).slice(i, i + 2), 16) / 255,
      ),
      alpha,
    };
  return Array.isArray(colour.components) &&
    colour.components.every((c) => typeof c === 'number')
    ? { rgb: colour.components, alpha }
    : undefined;
};

/** WCAG 2.2's relative luminance. */
const luminance = ([r = 0, g = 0, b = 0]: number[]): number => {
  const linear = (c: number) =>
    c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
};

const ratio = (x: number[], y: number[]): number => {
  const [lighter, darker] = [luminance(x), luminance(y)].sort(
    (p, q) => q - p,
  ) as [number, number];
  return (lighter + 0.05) / (darker + 0.05);
};

/**
 * WCAG 2.2's contrast ratio of a foreground on a background, from 1 to 21. A translucent
 * background, such as a veil over a photo, is checked at its worst: laid over white and over
 * black, whichever gives less contrast. Undefined for a translucent foreground, or a colour that
 * isn't sRGB.
 */
export function contrastRatio(
  foreground: unknown,
  background: unknown,
): number | undefined {
  const fore = read(foreground);
  const back = read(background);
  if (fore === undefined || back === undefined || fore.alpha < 1)
    return undefined;
  if (back.alpha >= 1) return ratio(fore.rgb, back.rgb);
  const over = (beneath: number) =>
    back.rgb.map((c) => c * back.alpha + beneath * (1 - back.alpha));
  return Math.min(ratio(fore.rgb, over(1)), ratio(fore.rgb, over(0)));
}

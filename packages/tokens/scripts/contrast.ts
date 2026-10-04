import { isRecord } from './validate.ts';

/** A DTCG colour's sRGB channels, 0 to 1, read from its 8-bit hex as WCAG defines them. */
const channels = (colour: unknown): number[] | undefined => {
  if (!isRecord(colour) || colour.colorSpace !== 'srgb') return undefined;
  if (typeof colour.alpha === 'number' && colour.alpha < 1) return undefined;
  if (typeof colour.hex === 'string' && /^#[0-9a-f]{6}$/i.test(colour.hex))
    return [1, 3, 5].map(
      (i) => parseInt(String(colour.hex).slice(i, i + 2), 16) / 255,
    );
  return Array.isArray(colour.components) &&
    colour.components.every((c) => typeof c === 'number')
    ? colour.components
    : undefined;
};

/** WCAG 2.2's relative luminance. */
const luminance = ([r = 0, g = 0, b = 0]: number[]): number => {
  const linear = (c: number) =>
    c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
};

/**
 * WCAG 2.2's contrast ratio between two DTCG colours, from 1 to 21. Undefined when either isn't
 * an opaque sRGB colour, because a translucent one depends on what lies beneath it.
 */
export function contrastRatio(a: unknown, b: unknown): number | undefined {
  const x = channels(a);
  const y = channels(b);
  if (x === undefined || y === undefined) return undefined;
  const [lighter, darker] = [luminance(x), luminance(y)].sort(
    (p, q) => q - p,
  ) as [number, number];
  return (lighter + 0.05) / (darker + 0.05);
}

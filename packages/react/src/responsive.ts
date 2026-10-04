import type { Breakpoint } from '@fossil-design/tokens';

/** Where a responsive value applies: `base` is mobile, and each breakpoint overrides it from its min-width up. */
export type ResponsiveKey = 'base' | Breakpoint;

/**
 * One value for every width, or values per breakpoint, mobile first:
 * `{ base: 'm', tablet: 'l' }` is `m` on mobile and `l` from the tablet breakpoint up.
 */
export type Responsive<T> = T | Readonly<Partial<Record<ResponsiveKey, T>>>;

export type ClassKey<P extends string, V extends string> =
  `${P}-${V}` | `${Breakpoint}-${P}-${V}`;

/**
 * The classes for one responsive prop. `styles` must have a class for every value at every
 * breakpoint, so a prop value without CSS is a type error.
 */
export function responsiveClasses<P extends string, V extends string>(
  styles: Readonly<Record<ClassKey<P, V>, string>>,
  prop: P,
  value: Responsive<V> | undefined,
): string[] {
  if (value === undefined) return [];
  if (typeof value === 'string') return [styles[`${prop}-${value}` as const]];
  return (Object.entries(value) as [ResponsiveKey, V | undefined][]).flatMap(
    ([key, v]) => {
      if (v === undefined) return [];
      return [
        key === 'base'
          ? styles[`${prop}-${v}` as const]
          : styles[`${key}-${prop}-${v}` as const],
      ];
    },
  );
}

/**
 * A longhand prop over its shorthand. A wider breakpoint still wins over a narrower one, so
 * `padding={{ tablet: 'l' }} paddingBlock="s"` gives `l` on every side from tablet up.
 */
export function preferLonghand<V extends string>(
  longhand: Responsive<V> | undefined,
  shorthand: Responsive<V> | undefined,
): Responsive<V> | undefined {
  if (longhand === undefined) return shorthand;
  if (shorthand === undefined) return longhand;
  const merged: Partial<Record<ResponsiveKey, V>> =
    typeof shorthand === 'string' ? { base: shorthand } : { ...shorthand };
  const long = typeof longhand === 'string' ? { base: longhand } : longhand;
  for (const [key, value] of Object.entries(long) as [
    ResponsiveKey,
    V | undefined,
  ][]) {
    if (value !== undefined) merged[key] = value;
  }
  return merged;
}

export function cx(...classNames: (string | false | undefined)[]): string {
  return classNames.filter(Boolean).join(' ');
}

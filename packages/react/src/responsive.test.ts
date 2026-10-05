import { describe, expect, it } from 'vitest';
import {
  preferLonghand,
  responsiveClasses,
  type ClassKey,
} from './responsive.ts';

// Every class a test can ask for, named after its key.
const styles = new Proxy(
  {},
  { get: (_, key) => `class:${String(key)}` },
) as Readonly<Record<ClassKey<'gap', 's' | 'm' | 'l'>, string>>;

describe('responsiveClasses', () => {
  it('gives one class for a single value', () => {
    expect(responsiveClasses(styles, 'gap', 'm')).toEqual(['class:gap-m']);
  });

  it('gives a class per breakpoint, default without a prefix', () => {
    expect(
      responsiveClasses(styles, 'gap', { default: 's', tablet: 'l' }),
    ).toEqual(['class:gap-s', 'class:tablet-gap-l']);
  });

  it('gives nothing for an unset prop or breakpoint', () => {
    expect(responsiveClasses(styles, 'gap', undefined)).toEqual([]);
    expect(responsiveClasses(styles, 'gap', { tablet: undefined })).toEqual([]);
  });
});

describe('preferLonghand', () => {
  it('keeps the longhand at the same breakpoint', () => {
    expect(preferLonghand('xs', 'l')).toEqual({ default: 'xs' });
  });

  it('lets a wider breakpoint of the shorthand through', () => {
    expect(preferLonghand('s', { default: 'm', tablet: 'l' })).toEqual({
      default: 's',
      tablet: 'l',
    });
  });

  it('falls back to whichever is set', () => {
    expect(preferLonghand(undefined, 'm')).toBe('m');
    expect(preferLonghand({ tablet: 'l' }, undefined)).toEqual({ tablet: 'l' });
  });
});

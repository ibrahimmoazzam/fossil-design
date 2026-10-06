import {
  createElement,
  forwardRef,
  type ForwardedRef,
  type ReactElement,
} from 'react';
import type { Responsive } from '../../responsive.js';
import {
  Box,
  type AlignItems,
  type BoxElement,
  type BoxProps,
  type JustifyContent,
} from '../Box/Box.js';

export const stackVariants = {
  direction: ['row', 'column'],
} as const;

export type StackDirection = (typeof stackVariants.direction)[number];

export type StackProps<E extends BoxElement = 'div'> = Omit<
  BoxProps<E>,
  'display' | 'flexDirection' | 'alignItems' | 'justifyContent'
> & {
  /** Defaults to `column`. */
  direction?: Responsive<StackDirection>;
  /** Alignment across the direction, such as `center`. */
  align?: Responsive<AlignItems>;
  /** Distribution along the direction, such as `space-between`. */
  justify?: Responsive<JustifyContent>;
};

function StackRender(
  { direction = 'column', align, justify, ...rest }: StackProps<BoxElement>,
  ref: ForwardedRef<HTMLElement>,
) {
  return createElement(Box<BoxElement>, {
    ...rest,
    ref,
    display: 'flex',
    flexDirection: direction,
    alignItems: align,
    justifyContent: justify,
  });
}

const StackWithRef = forwardRef(StackRender);
StackWithRef.displayName = 'Stack';

/**
 * Children in a row or a column, spaced by `gap`. The usual way to lay things out.
 *
 * ## When to use
 *
 * - Items one above another, such as a heading over its text, with even space between.
 * - A row of items, such as buttons, aligned and spaced.
 * - A direction that changes per breakpoint: `direction={{ default: 'column', tablet: 'row' }}`.
 *
 * ## When not to use
 *
 * - A grid, or a display that changes per breakpoint: use `Box`.
 * - Space around one element: give its container padding. There's no margin prop.
 *
 * ## States
 *
 * None: it isn't interactive.
 *
 * ## Accessibility
 *
 * ### Built in
 *
 * Renders a `div` unless `as` names another element, such as `ul` or `nav`, which keeps its
 * native role.
 *
 * ### Up to you
 *
 * Keep the visual order the same as the source order, which keyboard and screen reader users
 * follow. Choose the element that matches the content.
 */
export const Stack = StackWithRef as <E extends BoxElement = 'div'>(
  props: StackProps<E>,
) => ReactElement | null;

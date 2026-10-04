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
  align?: Responsive<AlignItems>;
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
 * Children in a row or a column, spaced by `gap`. The usual way to lay things out; reach for
 * `Box` when a layout needs grid, or a display that changes per breakpoint.
 */
export const Stack = StackWithRef as <E extends BoxElement = 'div'>(
  props: StackProps<E>,
) => ReactElement | null;

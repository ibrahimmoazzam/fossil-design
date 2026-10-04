import type { TokenKey } from '@fossil-design/tokens';
import {
  createElement,
  forwardRef,
  type ComponentPropsWithRef,
  type CSSProperties,
  type ForwardedRef,
  type ReactElement,
} from 'react';
import styles from '../../generated/box.module.css';
import {
  cx,
  preferLonghand,
  responsiveClasses,
  type Responsive,
} from '../../responsive.js';
import { boxVariants, type boxElements } from './variants.js';

export type SpaceToken = TokenKey<'space'>;
export type GapToken = SpaceToken;
export type RadiusToken = TokenKey<'radius'>;
export type Surface = (typeof boxVariants.surface)[number];
export type BoxElement = (typeof boxElements)[number];
export type Display = (typeof boxVariants.display)[number];
export type FlexDirection = (typeof boxVariants.flexDirection)[number];
export type AlignItems = (typeof boxVariants.alignItems)[number];
export type JustifyContent = (typeof boxVariants.justifyContent)[number];

/** The only inline styles `Box` takes: layout that tokens can't express. */
export type BoxStyle = Pick<
  CSSProperties,
  'gridTemplateAreas' | 'gridTemplateColumns' | 'aspectRatio' | 'transform'
>;

export interface BoxOwnProps {
  /** Padding on every side. `paddingBlock` and `paddingInline` override it. */
  padding?: Responsive<SpaceToken>;
  /** Padding above and below. */
  paddingBlock?: Responsive<SpaceToken>;
  /** Padding at the start and end of the line. */
  paddingInline?: Responsive<SpaceToken>;
  /** Space between children, when `display` is flex or grid. */
  gap?: Responsive<GapToken>;
  display?: Responsive<Display>;
  flexDirection?: Responsive<FlexDirection>;
  alignItems?: Responsive<AlignItems>;
  justifyContent?: Responsive<JustifyContent>;
  /** A fill and the text colour that is contrast-checked against it, set together. */
  surface?: Surface;
  radius?: RadiusToken;
  style?: BoxStyle;
  className?: string;
}

export type BoxProps<E extends BoxElement = 'div'> = BoxOwnProps & {
  /** The element to render. Defaults to `div`. */
  as?: E;
} & Omit<ComponentPropsWithRef<E>, keyof BoxOwnProps | 'as'>;

function BoxRender(
  {
    as = 'div',
    padding,
    paddingBlock,
    paddingInline,
    gap,
    display,
    flexDirection,
    alignItems,
    justifyContent,
    surface,
    radius,
    className,
    ...rest
  }: BoxProps<BoxElement>,
  ref: ForwardedRef<HTMLElement>,
) {
  return createElement(as, {
    ...rest,
    ref,
    className: cx(
      styles.box,
      ...responsiveClasses(
        styles,
        'padding-block',
        preferLonghand(paddingBlock, padding),
      ),
      ...responsiveClasses(
        styles,
        'padding-inline',
        preferLonghand(paddingInline, padding),
      ),
      ...responsiveClasses(styles, 'gap', gap),
      ...responsiveClasses(styles, 'display', display),
      ...responsiveClasses(styles, 'flex-direction', flexDirection),
      ...responsiveClasses(styles, 'align-items', alignItems),
      ...responsiveClasses(styles, 'justify-content', justifyContent),
      surface && styles[`surface-${surface}`],
      radius && styles[`radius-${radius}`],
      className,
    ),
  });
}

const BoxWithRef = forwardRef(BoxRender);
BoxWithRef.displayName = 'Box';

/**
 * The base layout component: every other element on the page that isn't text, a control or
 * media is a `Box`. Its props take token keys and keywords, never raw values, and each can
 * change per breakpoint, mobile first. It has no margin prop: space with `padding` and `gap`.
 */
export const Box = BoxWithRef as <E extends BoxElement = 'div'>(
  props: BoxProps<E>,
) => ReactElement | null;

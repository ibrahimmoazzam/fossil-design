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
  /** The CSS display. `gap` applies when it is flex or grid. */
  display?: Responsive<Display>;
  /** The main axis, when `display` is flex. */
  flexDirection?: Responsive<FlexDirection>;
  /** Alignment across the main axis, when `display` is flex or grid. */
  alignItems?: Responsive<AlignItems>;
  /** Distribution along the main axis, when `display` is flex or grid. */
  justifyContent?: Responsive<JustifyContent>;
  /** A fill and the text colour that is contrast-checked against it, set together. */
  surface?: Surface;
  /** Rounds the corners, with a radius token. */
  radius?: RadiusToken;
  /**
   * The sanctioned escape, for layout tokens can't express: `gridTemplateAreas`,
   * `gridTemplateColumns`, `aspectRatio` and `transform` only.
   */
  style?: BoxStyle;
  /** Classes from the app's own stylesheet, added to Fossil's. */
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
 * The base layout component: every element on the page that isn't text, a control or media is a
 * `Box`. Its props take token keys and keywords, never raw values, and each can change per
 * breakpoint, mobile first. It has no margin prop: space with `padding` and `gap`.
 *
 * ## When to use
 *
 * - A layout `Stack` can't do: a grid, or a display that changes per breakpoint.
 * - A landmark or a list with padding or a fill of its own: `as="nav"`, `as="main"`, `as="ul"`.
 * - A filled region: `surface` sets the fill and its text colour together.
 *
 * ## When not to use
 *
 * - Children in one row or one column: use `Stack`.
 * - Text: use `Text`. Links and buttons: use `Link` and `Button`. Media: use `Figure` or `Clip`.
 * - One of a set of parallel pieces of content: use `Card`.
 *
 * ## States
 *
 * None: it isn't interactive.
 *
 * ## Accessibility
 *
 * ### Built in
 *
 * Renders the element `as` names, so a landmark or a list keeps its native role. `surface` pairs
 * each fill only with a text colour the token build checks for WCAG AA contrast.
 *
 * ### Up to you
 *
 * Choose the element that matches the content: `nav` for navigation, `main` once per page, `ul`
 * for a list. Give a second landmark of the same kind an `aria-label`. Text on a surface takes its
 * paired colour; a `tone` on `Text` overrides it, so leave `tone` off there.
 */
export const Box = BoxWithRef as <E extends BoxElement = 'div'>(
  props: BoxProps<E>,
) => ReactElement | null;

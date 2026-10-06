import {
  createElement,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from 'react';
import { cx } from '../../responsive.js';
import styles from './VisuallyHidden.module.css';

export const visuallyHiddenElements = [
  'span',
  'div',
  'p',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
] as const;

export type VisuallyHiddenElement = (typeof visuallyHiddenElements)[number];

export interface VisuallyHiddenProps extends HTMLAttributes<HTMLElement> {
  /** Defaults to `span`. A heading that names a section only for screen readers takes `h2` to `h6`. */
  as?: VisuallyHiddenElement;
  /** What assistive technology reads. */
  children: ReactNode;
}

/**
 * Content for assistive technology only: hidden on screen, still read out. Prefer visible text
 * where there's room.
 *
 * ## When to use
 *
 * - Context the layout makes plain to sighted readers but not to screen readers, such as
 *   "(opens in a new tab)".
 * - A heading that names a section only for screen readers: `as="h2"`.
 *
 * ## When not to use
 *
 * - A name for an icon-only button or an icon: use the `label` prop of `Button` or `Icon`.
 * - A caption: `Figure` and `Clip` take `captionHidden`.
 * - Hiding content from everyone: don't render it.
 *
 * ## States
 *
 * None: it isn't interactive.
 *
 * ## Accessibility
 *
 * ### Built in
 *
 * Hidden with `clip-path`, which keeps it in the accessibility tree and in the reading order.
 *
 * ### Up to you
 *
 * Put nothing focusable inside: focus on something nobody can see fails WCAG 2.4.7. Keep it short;
 * it's read in line with the visible text.
 */
export function VisuallyHidden({
  as = 'span',
  className,
  ...rest
}: VisuallyHiddenProps): ReactElement {
  // Annotated: an inferred createElement type would copy this @types/react version's props into
  // the declaration, which consumers on another version can't read.
  return createElement(as, {
    ...rest,
    className: cx(styles.visuallyHidden, className),
  });
}

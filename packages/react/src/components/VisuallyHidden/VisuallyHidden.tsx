import { createElement, type HTMLAttributes, type ReactNode } from 'react';
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
  children: ReactNode;
}

/**
 * Content for assistive technology only: hidden on screen, still read out. Prefer visible text
 * where there's room; use this for context the layout already makes obvious to sighted readers.
 */
export function VisuallyHidden({
  as = 'span',
  className,
  ...rest
}: VisuallyHiddenProps) {
  return createElement(as, {
    ...rest,
    className: cx(styles.visuallyHidden, className),
  });
}

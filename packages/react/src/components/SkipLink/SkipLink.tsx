import type { ReactNode } from 'react';
import styles from './SkipLink.module.css';

export interface SkipLinkProps {
  /** The id of the page's main content, as a fragment: `#main`. */
  href: `#${string}`;
  /** The link's text, such as "Skip to content". */
  children: ReactNode;
}

/**
 * The first focusable element on the page: it lets keyboard and screen reader users jump past
 * the navigation to the main content. Hidden until focused.
 *
 * ## When to use
 *
 * - Once per page, before the navigation, pointing at the main content.
 *
 * ## When not to use
 *
 * - Any other link to a place on the page: use `Link` with a `#fragment` `href`.
 *
 * ## States
 *
 * Above the viewport until it has focus, then in view with a focus ring.
 *
 * ## Accessibility
 *
 * ### Built in
 *
 * A native link that comes into view on focus, for WCAG 2.4.1 (Bypass Blocks), and stays in the tab
 * order. Its movement stops under `prefers-reduced-motion`.
 *
 * ### Up to you
 *
 * Render it first, before the navigation. Give the target the `id` that `href` names, and
 * `tabIndex={-1}` so focus lands on it. Keep the text plain: "Skip to content".
 */
export function SkipLink({ href, children }: SkipLinkProps) {
  return (
    <a href={href} className={styles.skipLink}>
      {children}
    </a>
  );
}

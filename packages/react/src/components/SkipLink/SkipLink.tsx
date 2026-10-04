import type { ReactNode } from 'react';
import styles from './SkipLink.module.css';

export interface SkipLinkProps {
  /** The id of the page's main content, as a fragment: `#main`. */
  href: `#${string}`;
  children: ReactNode;
}

/**
 * The first focusable element on the page: it lets keyboard and screen reader users jump past
 * the navigation to the main content. Hidden until focused. Put it before the navigation, and
 * give the target an `id` and `tabIndex={-1}` so focus lands on it.
 */
export function SkipLink({ href, children }: SkipLinkProps) {
  return (
    <a href={href} className={styles.skipLink}>
      {children}
    </a>
  );
}

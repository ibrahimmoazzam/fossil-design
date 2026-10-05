import {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  type ComponentPropsWithRef,
  type ReactNode,
} from 'react';
import { ArrowOutwardIcon } from '../../generated/icons.js';
import { cx } from '../../responsive.js';
import { Box } from '../Box/Box.js';
import type { IconComponent } from '../Icon/createIcon.js';
import { Icon } from '../Icon/Icon.js';
import { VisuallyHidden } from '../VisuallyHidden/VisuallyHidden.js';
import styles from './Link.module.css';

export const linkVariants = {
  tone: ['inherit', 'accent'],
} as const;

export type LinkTone = (typeof linkVariants.tone)[number];

export type LinkProps = Omit<ComponentPropsWithRef<'a'>, 'className'> & {
  /** `inherit` takes the surrounding text colour; `accent` marks a link in running text. */
  tone?: LinkTone;
  /**
   * Style the single child instead of rendering an `<a>`: a router's link, such as `next/link`,
   * or a `<button>` for an action that reads like a link. The child keeps its own element, props
   * and ref.
   */
  asChild?: boolean;
  /** A decorative icon after the text, saying what the link or action does. */
  icon?: IconComponent;
  className?: string;
};

interface ChildProps {
  className?: string;
  target?: string;
  children?: ReactNode;
}

/**
 * A link with a dotted underline that fills in on hover and focus, in the link's own colour.
 * A link that opens a new tab gets an outward arrow and says so to screen readers.
 */
export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { tone = 'inherit', asChild = false, icon, className, children, ...rest },
  ref,
) {
  const child = asChild ? Children.only(children) : undefined;
  if (asChild && !isValidElement<ChildProps>(child)) {
    throw new Error('Link with asChild needs a single element as its child');
  }
  const target = isValidElement<ChildProps>(child)
    ? child.props.target
    : rest.target;
  const opensInNewTab = target === '_blank';
  const trailing = opensInNewTab ? ArrowOutwardIcon : icon;

  const content = (text: ReactNode) => (
    <>
      <Box as="span" className={styles.text}>
        {text}
      </Box>
      {trailing && (
        <Box as="span" className={styles.icon}>
          <Icon icon={trailing} />
        </Box>
      )}
      {opensInNewTab && <VisuallyHidden> (opens in a new tab)</VisuallyHidden>}
    </>
  );
  const classes = cx(styles.link, styles[`tone-${tone}`], className);

  if (isValidElement<ChildProps>(child)) {
    return cloneElement(
      child,
      { ...rest, className: cx(classes, child.props.className) },
      content(child.props.children),
    );
  }
  return (
    <a ref={ref} {...rest} className={classes}>
      {content(children)}
    </a>
  );
});

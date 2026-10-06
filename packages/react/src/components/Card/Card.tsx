import { forwardRef, type ReactNode } from 'react';
import { cx } from '../../responsive.js';
import { Box } from '../Box/Box.js';
import { Text } from '../Text/Text.js';
import styles from './Card.module.css';

export const cardElements = ['article', 'section', 'div', 'li'] as const;
export const cardHeadingElements = ['h2', 'h3', 'h4', 'h5', 'h6'] as const;

export type CardElement = (typeof cardElements)[number];
export type CardHeadingElement = (typeof cardHeadingElements)[number];

export type CardProps = {
  /** Defaults to `article`. Use `li` for a card in a list. */
  as?: CardElement;
  /** The card's body, set in the prose style. */
  children: ReactNode;
  /** Classes from the app's own stylesheet, added to Fossil's. */
  className?: string;
} & (
  | {
      /** The card's heading, at the level `titleAs` names. */
      title: ReactNode;
      /** The title's heading level, so it fits the page outline. */
      titleAs: CardHeadingElement;
    }
  | { title?: never; titleAs?: never }
);

/**
 * A bordered surface for one of a set of parallel pieces of content, read as units rather than
 * as consecutive paragraphs. The title takes the highlight colour, and the body the prose style.
 * Without a title, open the body with a bold lead instead.
 *
 * ## When to use
 *
 * - A set of parallel items, such as projects, principles or features, each read on its own.
 * - A card in a list or a carousel: `as="li"` in a list, or as a child of `Carousel`.
 *
 * ## When not to use
 *
 * - A single block of running text: use `Text` in a `Stack`.
 * - A filled region with no border, or a layout container: use `Box` with `surface`.
 * - A card that is itself a link: it has no link behaviour. Put a `Link` in the body.
 *
 * ## States
 *
 * None: it isn't interactive.
 *
 * ## Accessibility
 *
 * ### Built in
 *
 * An `article` by default, so each card is its own unit. The title is a real heading, at the level
 * `titleAs` names. The title and body colours meet WCAG AA contrast on the card, in light and dark.
 *
 * ### Up to you
 *
 * Choose `titleAs` to fit the page outline, one level below the section's heading. Use `as="li"`
 * when the cards sit in a list.
 */
export const Card = forwardRef<HTMLElement, CardProps>(function Card(
  { as = 'article', title, titleAs, children, className },
  ref,
) {
  return (
    <Box
      ref={ref}
      as={as}
      surface="surface"
      padding="l"
      radius="surface"
      display="flex"
      flexDirection="column"
      gap="xs"
      className={cx(styles.card, className)}
    >
      {title !== undefined && (
        <Text as={titleAs} variant="heading-xs" tone="highlight">
          {title}
        </Text>
      )}
      <Text as="div" variant="prose" tone="muted" className={styles.body}>
        {children}
      </Text>
    </Box>
  );
});

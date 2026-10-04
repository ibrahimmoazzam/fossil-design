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
  className?: string;
} & (
  | {
      title: ReactNode;
      /** The title's heading level, so it fits the page outline. */
      titleAs: CardHeadingElement;
    }
  | { title?: never; titleAs?: never }
);

/**
 * A surface for one of a set of parallel pieces of content, read as units rather than as
 * consecutive paragraphs. Without a title, open the body with a bold lead instead.
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

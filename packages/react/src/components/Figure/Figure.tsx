import type { ReactNode } from 'react';
import { cx } from '../../responsive.js';
import { Box } from '../Box/Box.js';
import { Text } from '../Text/Text.js';
import styles from './Figure.module.css';

export interface FigureProps {
  /** The media: a plain `<img>`, `next/image`, `<picture>` or `<video>`. Fossil frames it. */
  children: ReactNode;
  /**
   * Shown under the media, and tied to it as its caption. Without one, only the frame renders:
   * a `<figure>` exists to pair media with a caption.
   */
  caption?: ReactNode;
  /** Size the figure from the app's stylesheet, such as a width at a breakpoint. */
  className?: string;
}

/**
 * An image or video in a hairline frame, with an optional caption. The app supplies the media,
 * with its own `alt`: describe what it shows, or use `alt=""` when the caption or the
 * surrounding text already does.
 */
export function Figure({ children, caption, className }: FigureProps) {
  const frame = (
    <Box className={cx(styles.frame, caption === undefined && className)}>
      {children}
    </Box>
  );
  if (caption === undefined) return frame;
  return (
    <Box
      as="figure"
      display="flex"
      flexDirection="column"
      gap="s"
      className={className}
    >
      {frame}
      <Text
        as="figcaption"
        variant="caption"
        tone="muted"
        className={styles.caption}
      >
        {caption}
      </Text>
    </Box>
  );
}

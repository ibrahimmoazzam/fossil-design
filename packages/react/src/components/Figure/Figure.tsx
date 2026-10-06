import type { ReactNode } from 'react';
import { cx } from '../../responsive.js';
import { Box } from '../Box/Box.js';
import { Text } from '../Text/Text.js';
import hidden from '../VisuallyHidden/VisuallyHidden.module.css';
import styles from './Figure.module.css';

export interface FigureProps {
  /** The media: a plain `<img>`, `next/image`, `<picture>` or `<video>`. Fossil frames it. */
  children: ReactNode;
  /**
   * Shown under the media, and tied to it as its caption. Without one, only the frame renders:
   * a `<figure>` exists to pair media with a caption.
   */
  caption?: ReactNode;
  /**
   * Keeps the caption for assistive technology but off the screen, for media the surrounding
   * text already describes in full.
   */
  captionHidden?: boolean;
  /** Size the figure from the app's stylesheet, such as a width at a breakpoint. */
  className?: string;
}

/**
 * An image or video in a hairline frame, with an optional caption. The app supplies the media,
 * with its own `alt`.
 *
 * ## When to use
 *
 * - An image, diagram or video that belongs with the text around it, captioned or not.
 * - Media from `next/image`, `<picture>` or `<video>`, framed the same way as a plain `<img>`.
 *
 * ## When not to use
 *
 * - A short, silent, looping screen recording: use `Clip`, which adds the pause control.
 * - An icon: use `Icon`.
 *
 * ## States
 *
 * None: it isn't interactive.
 *
 * ## Accessibility
 *
 * ### Built in
 *
 * With a caption, a `<figure>` and `<figcaption>`, which browsers use to name the figure.
 * `captionHidden` keeps the caption for screen readers, off the screen. Without a caption only the
 * frame renders, since a `<figure>` exists to pair media with its caption.
 *
 * ### Up to you
 *
 * Write the media's `alt`: describe what it shows, or use `alt=""` when the caption or the
 * surrounding text already does. Give a video with sound its own captions.
 */
export function Figure({
  children,
  caption,
  captionHidden = false,
  className,
}: FigureProps) {
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
        className={captionHidden ? hidden.visuallyHidden : styles.caption}
      >
        {caption}
      </Text>
    </Box>
  );
}

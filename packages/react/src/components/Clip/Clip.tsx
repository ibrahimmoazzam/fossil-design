'use client';

import { useRef, type ReactNode } from 'react';
import { PauseIcon, PlayArrowIcon } from '../../generated/icons.js';
import { Figure } from '../Figure/Figure.js';
import { Icon } from '../Icon/Icon.js';
import styles from './Clip.module.css';
import { useClipPlayback } from './useClipPlayback.js';

export interface ClipProps {
  /** A silent, looping recording. */
  src: string;
  /**
   * A still frame, shown before playback and to anyone who prefers no motion. Without one the
   * first frame is used, which can't load until the video does.
   */
  poster?: string;
  /**
   * What the clip shows. Required: a silent recording is video-only content, and WCAG 1.2.1
   * asks for a text alternative with the same information. Describe what happens.
   */
  caption: ReactNode;
  /** Keeps the caption for assistive technology only, when the surrounding text already says it all. */
  captionHidden?: boolean;
  /** Classes from the app's own stylesheet, added to Fossil's. */
  className?: string;
}

/**
 * A short, silent interface recording: what a GIF used to be, at a fraction of the bytes.
 * It plays on its own, so WCAG 2.2.2 requires a way to stop it, and the toggle is part of the
 * component rather than an option. It starts paused for anyone who prefers reduced motion.
 *
 * ## When to use
 *
 * - A short, silent, looping screen recording that shows an interaction, in place of an animated
 *   GIF.
 * - The same playback for a video framed by something else, such as a card: use
 *   `useClipPlayback`.
 *
 * ## When not to use
 *
 * - Video with sound or narration: use a `<video>` with controls, in a `Figure`.
 * - A still image: use `Figure`.
 *
 * ## States
 *
 * Playing or paused. It plays while on screen unless the reader prefers reduced motion or has
 * pressed pause, and always pauses off screen.
 *
 * ## Accessibility
 *
 * ### Built in
 *
 * A play and pause button named for what it will do, "Play" or "Pause" (WCAG 2.2.2). Paused for
 * anyone who prefers reduced motion, until they press play. Muted, so it never makes a sound. The
 * caption is required: it is the text alternative WCAG 1.2.1 asks for.
 *
 * ### Up to you
 *
 * Write a `caption` that describes what happens in the clip. Give a `poster`, so readers who don't
 * play it still see a frame.
 */
export function Clip({
  src,
  poster,
  caption,
  captionHidden,
  className,
}: ClipProps) {
  const video = useRef<HTMLVideoElement>(null);
  const { playing, toggle } = useClipPlayback(video);
  return (
    <Figure
      caption={caption}
      captionHidden={captionHidden}
      className={className}
    >
      <video
        ref={video}
        src={src}
        poster={poster}
        muted
        loop
        playsInline
        preload="metadata"
      />
      {/* The button carries the name, so the icon stays decorative and isn't announced twice. */}
      <button
        type="button"
        className={styles.toggle}
        aria-label={playing ? 'Pause' : 'Play'}
        onClick={toggle}
      >
        <Icon icon={playing ? PauseIcon : PlayArrowIcon} size="l" />
      </button>
    </Figure>
  );
}

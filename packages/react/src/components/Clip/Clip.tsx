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
  className?: string;
}

/**
 * A short, silent interface recording: what a GIF used to be, at a fraction of the bytes.
 * It plays on its own, so WCAG 2.2.2 requires a way to stop it, and the toggle is part of the
 * component rather than an option. It starts paused for anyone who prefers reduced motion.
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

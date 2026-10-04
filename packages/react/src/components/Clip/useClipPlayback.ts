'use client';

import { useEffect, useState, type RefObject } from 'react';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion.js';

/**
 * Playback for a silent, looping clip. It follows the reader's motion preference until they
 * press play or pause, and never plays off screen. For a clip framed by something other than
 * `Clip`, such as a card.
 */
export function useClipPlayback(video: RefObject<HTMLVideoElement | null>) {
  const reduceMotion = usePrefersReducedMotion();
  /** null until someone presses the toggle. */
  const [pressed, setPressed] = useState<boolean | null>(null);
  const [onScreen, setOnScreen] = useState(false);
  // What the toggle names comes from the element itself, not from what was asked of it, so its
  // label stays true while the motion preference is still unknown before hydration.
  const [playing, setPlaying] = useState(false);

  // Unknown is not "no": until the preference is known, a reader who asked for no motion must
  // not see the very frames they asked not to.
  const wantsPlay = pressed ?? reduceMotion === false;

  useEffect(() => {
    const element = video.current;
    if (!element) return;
    const sync = () => {
      setPlaying(!element.paused);
    };
    element.addEventListener('play', sync);
    element.addEventListener('pause', sync);
    return () => {
      element.removeEventListener('play', sync);
      element.removeEventListener('pause', sync);
    };
  }, [video]);

  useEffect(() => {
    const element = video.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      setOnScreen(entry?.isIntersecting ?? false);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [video]);

  // Off-screen clips stay paused: a page can hold several, and decoding unseen video costs battery.
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    if (wantsPlay && onScreen) void element.play().catch(() => undefined);
    else element.pause();
  }, [wantsPlay, onScreen, video]);

  return {
    playing,
    toggle: () => {
      setPressed(!playing);
    },
  };
}

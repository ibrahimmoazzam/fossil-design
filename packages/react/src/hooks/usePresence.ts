'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Resolves once every transition running on an element has settled. CSS transitions show up
 * in getAnimations(), so a transition reversed or cut short still counts, which transitionend
 * alone gets wrong. With none running, as under reduced motion, it resolves on the next frame.
 */
export function afterTransitions(
  element: Element | null,
  done: () => void,
): () => void {
  let live = true;
  const finish = () => {
    if (live) done();
  };
  const running = element?.getAnimations() ?? [];
  if (running.length === 0) {
    const frame = requestAnimationFrame(finish);
    return () => {
      live = false;
      cancelAnimationFrame(frame);
    };
  }
  void Promise.allSettled(running.map((animation) => animation.finished)).then(
    finish,
  );
  return () => {
    live = false;
  };
}

/**
 * Keeps an element mounted after `open` turns false, until its CSS transitions finish, so it
 * can animate out. Attach `ref` to the element that transitions.
 */
export function usePresence<T extends HTMLElement>(open: boolean) {
  const ref = useRef<T | null>(null);
  const [closing, setClosing] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    setClosing(!open);
  }

  useEffect(() => {
    if (!closing) return;
    return afterTransitions(ref.current, () => {
      setClosing(false);
    });
  }, [closing]);

  return {
    ref,
    mounted: open || closing,
    state: open ? 'open' : 'closed',
  } as const;
}

'use client';

import {
  Children,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '../../generated/icons.js';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion.js';
import { useIsomorphicLayoutEffect } from '../../hooks/useIsomorphicLayoutEffect.js';
import { usePresence } from '../../hooks/usePresence.js';
import { cx } from '../../responsive.js';
import { Box, type SpaceToken } from '../Box/Box.js';
import { Button } from '../Button/Button.js';
import styles from './Carousel.module.css';

export const carouselVariants = {
  indicator: ['buttons', 'dots'],
} as const;

export type CarouselIndicator = (typeof carouselVariants.indicator)[number];

export interface CarouselProps {
  /** Names the scrolling list, and the controls that move it. */
  label: string;
  /** One card per child. The carousel lays them out and never styles them. */
  children: ReactNode;
  /** Previous and next buttons, or one dot per card where 44px buttons would crowd the cards. */
  indicator?: CarouselIndicator;
  /** Space between cards. Defaults to `l`. */
  gap?: SpaceToken;
  /**
   * Classes from the app's own stylesheet, which set the carousel's knobs: `--carousel-gutter`,
   * the inset at both ends; `--carousel-item-width`, a fixed card width; and `--carousel-bleed`,
   * room around the cards for a focus ring or a shadow.
   */
  className?: string;
  /** Data attributes go on the root, for tools that look for them, such as a smooth-scroll library. */
  [data: `data-${string}`]: string | number | boolean | undefined;
}

/** Fractional scroll positions never compare exactly. */
const EPSILON = 1;

interface Reach {
  scrollable: boolean;
  canPrev: boolean;
  canNext: boolean;
  /** The card nearest the leading edge. */
  active: number;
}

const AT_REST: Reach = {
  scrollable: false,
  canPrev: false,
  canNext: false,
  active: 0,
};

/**
 * A scrolling region must be reachable by keyboard, and the cards may hold nothing focusable, so
 * the track is a tab stop while there's somewhere to scroll. Set on the element, at commit and on
 * every measurement, so it's right before the first paint rather than a render later.
 */
function syncTabStop(track: HTMLElement) {
  if (track.scrollWidth - track.clientWidth > EPSILON) track.tabIndex = 0;
  else track.removeAttribute('tabindex');
}

/** The scrollLeft that puts a card at the content edge, not under the track's padding. */
function scrollLeftFor(track: HTMLElement, item: HTMLElement) {
  const inset =
    Number.parseFloat(getComputedStyle(track).paddingInlineStart) || 0;
  return item.offsetLeft - inset;
}

/**
 * A horizontally scrolling list of cards. Scrolling is the browser's own, with scroll snap, so
 * the wheel, a trackpad, touch, the arrow keys and focus all move it, and the cards stay in
 * normal flow for screen readers. The controls appear only while the cards overflow.
 *
 * ## When to use
 *
 * - A row of parallel cards, such as projects, wider than the screen, where scrolling sideways is
 *   expected.
 * - `indicator="dots"` where 44px buttons would crowd small cards.
 *
 * ## When not to use
 *
 * - Content everyone must see: a carousel hides most of its cards. Lay them out in a grid with
 *   `Box`.
 * - Views of one thing, one at a time: use `Tabs`.
 *
 * ## States
 *
 * The controls appear once the cards overflow. The backward or forward button is unavailable at
 * either end. With dots, the dot for the card at the leading edge is current.
 *
 * ## Accessibility
 *
 * ### Built in
 *
 * The cards are a list named by `label`, in normal flow. While the cards overflow, the track is a
 * tab stop, so the arrow keys scroll it. The buttons are named "Scroll {label} backward" and
 * "forward", and stay focusable at either end with `aria-disabled`. Each dot is named
 * "{label}: 2 of 6" and marks the current card. Smooth scrolling stops under
 * `prefers-reduced-motion`.
 *
 * ### Up to you
 *
 * Give it a `label` naming the set, such as "Projects". Pass one child per card.
 */
export function Carousel({
  label,
  children,
  indicator = 'buttons',
  gap = 'l',
  className,
  ...data
}: CarouselProps) {
  const trackRef = useRef<HTMLUListElement>(null);
  const trackId = useId();
  const reduceMotion = usePrefersReducedMotion();
  const [reach, setReach] = useState<Reach>(AT_REST);
  const count = Children.count(children);
  const {
    ref: controlsRef,
    mounted: controlsMounted,
    state: controlsState,
  } = usePresence<HTMLDivElement>(reach.scrollable);

  useIsomorphicLayoutEffect(() => {
    if (trackRef.current) syncTabStop(trackRef.current);
  }, [count]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const measure = () => {
      syncTabStop(track);
      const max = track.scrollWidth - track.clientWidth;
      const items = Array.from(track.children) as HTMLElement[];
      // At the very end the last card may be too narrow to reach the leading edge.
      let active = 0;
      if (track.scrollLeft >= max - EPSILON) {
        active = items.length - 1;
      } else {
        let best = Infinity;
        items.forEach((item, i) => {
          const distance = Math.abs(
            scrollLeftFor(track, item) - track.scrollLeft,
          );
          if (distance < best) {
            best = distance;
            active = i;
          }
        });
      }
      const next: Reach = {
        scrollable: max > EPSILON,
        canPrev: track.scrollLeft > EPSILON,
        canNext: track.scrollLeft < max - EPSILON,
        active,
      };
      // The same object back skips the render, so a scroll costs one only when a control changes.
      setReach((prev) =>
        prev.scrollable === next.scrollable &&
        prev.canPrev === next.canPrev &&
        prev.canNext === next.canNext &&
        prev.active === next.active
          ? prev
          : next,
      );
    };

    track.addEventListener('scroll', measure, { passive: true });
    // Observing calls back once straight away, which takes the first measurement. The cards are
    // observed too: an image arriving or a font swapping in changes whether the track overflows.
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    for (const item of track.children) observer.observe(item);
    return () => {
      track.removeEventListener('scroll', measure);
      observer.disconnect();
    };
  }, [count]);

  // scrollTo on the track moves only the track; scrollIntoView would move the page too.
  const scrollTrackTo = (left: number) => {
    trackRef.current?.scrollTo({
      left,
      behavior: reduceMotion === false ? 'smooth' : 'auto',
    });
  };

  const step = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const items = Array.from(track.children) as HTMLElement[];
    const target =
      direction === 1
        ? items.find(
            (item) => scrollLeftFor(track, item) > track.scrollLeft + EPSILON,
          )
        : items.findLast(
            (item) => scrollLeftFor(track, item) < track.scrollLeft - EPSILON,
          );
    scrollTrackTo(
      target ? scrollLeftFor(track, target) : direction * track.scrollWidth,
    );
  };

  const goTo = (index: number) => {
    const track = trackRef.current;
    const item = track?.children[index];
    if (track && item instanceof HTMLElement)
      scrollTrackTo(scrollLeftFor(track, item));
  };

  return (
    <Box {...data} className={cx(styles.carousel, className)}>
      <Box
        ref={trackRef}
        as="ul"
        id={trackId}
        role="list"
        aria-label={label}
        gap={gap}
        className={styles.track}
      >
        {Children.map(children, (child) => (
          <Box as="li" className={styles.item}>
            {child}
          </Box>
        ))}
      </Box>

      {controlsMounted &&
        (indicator === 'dots' ? (
          <Box
            ref={controlsRef}
            data-state={controlsState}
            className={styles.dots}
            style={{ '--count': count } as CSSProperties}
          >
            {Array.from({ length: count }, (_, i) => (
              <button
                key={i}
                type="button"
                className={styles.dot}
                style={{ '--i': i } as CSSProperties}
                aria-label={`${label}: ${String(i + 1)} of ${String(count)}`}
                aria-controls={trackId}
                aria-current={i === reach.active ? 'true' : undefined}
                onClick={() => {
                  goTo(i);
                }}
              />
            ))}
          </Box>
        ) : (
          <Box
            ref={controlsRef}
            data-state={controlsState}
            className={styles.controls}
          >
            <Button
              icon={ChevronLeftIcon}
              label={`Scroll ${label} backward`}
              aria-controls={trackId}
              aria-disabled={!reach.canPrev}
              className={styles.control}
              onClick={() => {
                if (reach.canPrev) step(-1);
              }}
            />
            <Button
              icon={ChevronRightIcon}
              label={`Scroll ${label} forward`}
              aria-controls={trackId}
              aria-disabled={!reach.canNext}
              className={styles.control}
              onClick={() => {
                if (reach.canNext) step(1);
              }}
            />
          </Box>
        ))}
    </Box>
  );
}

'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { CloseIcon } from '../../generated/icons.js';
import { afterTransitions } from '../../hooks/usePresence.js';
import { cx } from '../../responsive.js';
import { Box } from '../Box/Box.js';
import { Button } from '../Button/Button.js';
import { Text } from '../Text/Text.js';
import styles from './Modal.module.css';

export interface ModalPanelProps {
  className: string;
  children: ReactNode;
}

export interface ModalRenderPanel {
  /** Whether the modal is open. Render the panel while it is, and animate it out when it isn't. */
  open: boolean;
  /** Spread onto the element that animates. It carries the panel's look, header and content. */
  panelProps: ModalPanelProps;
  /** Call when the exit animation has finished. The dialog closes then. */
  onExitComplete: () => void;
}

export interface ModalProps {
  /** Whether the dialog is open. Keep it in state, and set it from `onOpenChange`. */
  open: boolean;
  /** Called with `false` for every way out: the close button, Escape and a click outside. */
  onOpenChange: (open: boolean) => void;
  /** Names the dialog, and shows as its heading. */
  title: string;
  /** The title's heading level, so it fits the page outline. Defaults to `h2`. */
  titleAs?: 'h2' | 'h3' | 'h4';
  /** Extra controls in the header, between the title and the close button. */
  headerContent?: ReactNode;
  /** Sizes the panel from the app's stylesheet. */
  className?: string;
  /** The dialog's content, under its header. */
  children: ReactNode;
  /**
   * Renders the panel yourself, to animate it with a library such as Motion. Fossil keeps the
   * dialog, focus, Escape, the scrim and the scroll lock, and closes the dialog when you call
   * `onExitComplete`.
   */
  renderPanel?: (props: ModalRenderPanel) => ReactNode;
  /**
   * Called with `true` when the dialog opens and `false` once it has finished closing, exit
   * animation included. Use it to pause and resume a smooth-scroll library.
   */
  onShowingChange?: (showing: boolean) => void;
}

/**
 * A modal dialog on the native `<dialog>`, which provides the focus trap, Escape, an inert page
 * behind and the top layer. Fossil adds the exit animation, focus on the title when it opens, a
 * scroll lock and dismissal by clicking outside.
 *
 * ## When to use
 *
 * - A task or detail that needs the reader's full attention before they go back to the page, such
 *   as a project's details or a confirmation.
 *
 * ## When not to use
 *
 * - Detail beside a control, with the page still usable: use `Popover`.
 * - A short label for a control: use `Tooltip`.
 * - Content that could sit on the page, or a flow of several steps: give it a section or a page.
 *
 * ## States
 *
 * Open and closed, animated both ways. It stays up until its exit animation ends, and
 * `onShowingChange` reports when it starts and stops showing.
 *
 * ## Accessibility
 *
 * ### Built in
 *
 * A native modal `<dialog>`: focus stays inside, the page behind is inert, and Escape closes it.
 * Focus starts on the title, which names the dialog, and goes back to the trigger on close. A close
 * button named "Close". The page behind doesn't scroll. Animations stop under
 * `prefers-reduced-motion`.
 *
 * ### Up to you
 *
 * Keep `open` in state and set it to `false` in `onOpenChange`, which every way out calls. Give
 * it a `title` that says what it is. Open it from a `Button`, so focus has somewhere to go back to.
 */
export function Modal({
  open,
  onOpenChange,
  title,
  titleAs = 'h2',
  headerContent,
  className,
  children,
  renderPanel,
  onShowingChange,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const titleId = useId();

  // Closing outlives `open`: the dialog stays up until the exit animation ends.
  const [closing, setClosing] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    setClosing(!open);
  }
  const showing = open || closing;
  const exitComplete = useCallback(() => {
    setClosing(false);
  }, []);

  // showModal() has no declarative form. Focus starts on the title, so nothing in the header
  // reacts before the reader moves on.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (showing && !dialog.open) {
      dialog.showModal();
      titleRef.current?.focus({ preventScroll: true });
    } else if (!showing && dialog.open) {
      dialog.close();
    }
  }, [showing]);

  const reported = useRef(false);
  useEffect(() => {
    if (reported.current === showing) return;
    reported.current = showing;
    onShowingChange?.(showing);
  }, [showing, onShowingChange]);

  // A modal dialog makes the page inert but leaves it scrollable. The scrollbar's width is held
  // as padding, so the page doesn't reflow when it goes.
  useEffect(() => {
    if (!showing) return;
    const root = document.documentElement;
    const { overflow, paddingRight } = root.style;
    const scrollbar = window.innerWidth - root.clientWidth;
    root.style.overflow = 'hidden';
    if (scrollbar > 0) root.style.paddingRight = `${String(scrollbar)}px`;
    return () => {
      root.style.overflow = overflow;
      root.style.paddingRight = paddingRight;
    };
  }, [showing]);

  // Fossil's own panel ends its exit when its transitions do. A rendered panel calls onExitComplete.
  useEffect(() => {
    if (!closing || renderPanel) return;
    return afterTransitions(panelRef.current, exitComplete);
  }, [closing, renderPanel, exitComplete]);

  const content = (
    <>
      <Box className={styles.header}>
        <Text
          ref={titleRef}
          as={titleAs}
          id={titleId}
          variant="heading-s"
          tabIndex={-1}
          className={styles.title}
        >
          {title}
        </Text>
        {headerContent !== undefined && (
          <Box className={styles.headerContent}>{headerContent}</Box>
        )}
        <Button
          icon={CloseIcon}
          label="Close"
          size="s"
          onClick={() => {
            onOpenChange(false);
          }}
        />
      </Box>
      {children}
    </>
  );

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      data-state={open ? 'open' : 'closed'}
      // Only while the heading it names is showing; a closed dialog would point at nothing.
      aria-labelledby={showing ? titleId : undefined}
      onCancel={(event) => {
        // Escape would close at once; take it over so the panel can animate out.
        event.preventDefault();
        onOpenChange(false);
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onOpenChange(false);
      }}
    >
      <Box className={styles.scrim} />
      {renderPanel
        ? renderPanel({
            open,
            panelProps: {
              className: cx(styles.panel, className),
              children: content,
            },
            onExitComplete: exitComplete,
          })
        : showing && (
            <Box
              ref={panelRef}
              className={cx(styles.panel, styles.animated, className)}
            >
              {content}
            </Box>
          )}
    </dialog>
  );
}

'use client';

import {
  FloatingArrow,
  FloatingFocusManager,
  FloatingPortal,
  arrow,
  autoUpdate,
  flip,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useMergeRefs,
  useRole,
  type Placement,
} from '@floating-ui/react';
import {
  cloneElement,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { usePresence } from '../../hooks/usePresence.js';
import {
  ORIGIN,
  elementRef,
  usePortalRoot,
  type Side,
} from '../Floating/floating.js';
import styles from './Popover.module.css';

const GAP = 8;
const ARROW_WIDTH = 14;
const ARROW_HEIGHT = 7;

export interface PopoverProps {
  /** The popover's body. Unlike a tooltip's, it may hold links and controls. */
  content: ReactNode;
  /** The trigger: one element that can hold a ref, such as a Button. */
  children: ReactElement;
  /** Names the popover for screen readers. */
  label: string;
  /** The preferred side. It flips when there isn't room. Defaults to `bottom`. */
  placement?: Placement;
  /** Draws an arrow to the trigger. */
  arrow?: boolean;
  /** The open state, to control it. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * A click-triggered panel beside its trigger, for content that may be interactive. It isn't
 * modal: the page stays live, Escape or a click outside closes it, and tabbing past its end
 * closes it and moves on.
 */
export function Popover({
  content,
  children,
  label,
  placement = 'bottom',
  arrow: showArrow = false,
  open: controlledOpen,
  onOpenChange,
}: PopoverProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = (next: boolean) => {
    setUncontrolledOpen(next);
    onOpenChange?.(next);
  };
  const [arrowElement, setArrowElement] = useState<SVGSVGElement | null>(null);

  const {
    refs,
    floatingStyles,
    context,
    placement: resolved,
  } = useFloating({
    open,
    onOpenChange: setOpen,
    placement,
    transform: false,
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(showArrow ? GAP + ARROW_HEIGHT : GAP),
      flip({ padding: GAP }),
      shift({ padding: GAP }),
      ...(showArrow ? [arrow({ element: arrowElement, padding: GAP })] : []),
    ],
  });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    useClick(context),
    useDismiss(context),
    useRole(context, { role: 'dialog' }),
  ]);

  const [portalRoot, findPortalRoot] = usePortalRoot();
  // Floating UI's setters are stable bound functions, which its docs pass as callback refs.
  // eslint-disable-next-line @typescript-eslint/unbound-method -- bound setters, typed as methods
  const { setReference, setFloating } = refs;
  const {
    ref: presenceRef,
    mounted,
    state,
  } = usePresence<HTMLDivElement>(open);
  const triggerRef = useMergeRefs([
    setReference,
    elementRef(children),
    findPortalRoot,
  ]);
  const floatingRef = useMergeRefs([setFloating, presenceRef]);
  const side = resolved.split('-')[0] as Side;

  return (
    <>
      {cloneElement(
        children,
        getReferenceProps({ ...(children.props as object), ref: triggerRef }),
      )}
      <FloatingPortal root={portalRoot}>
        {mounted && (
          <FloatingFocusManager context={context} modal={false}>
            {/* eslint-disable-next-line no-restricted-syntax -- Floating UI positions this element with inline position, top and left, which Box's style prop doesn't take */}
            <div
              ref={floatingRef}
              className={styles.popover}
              aria-label={label}
              data-state={state}
              style={{ ...floatingStyles, transformOrigin: ORIGIN[side] }}
              {...getFloatingProps()}
            >
              {content}
              {showArrow && (
                <FloatingArrow
                  ref={setArrowElement}
                  context={context}
                  className={styles.arrow}
                  width={ARROW_WIDTH}
                  height={ARROW_HEIGHT}
                  tipRadius={2}
                />
              )}
            </div>
          </FloatingFocusManager>
        )}
      </FloatingPortal>
    </>
  );
}

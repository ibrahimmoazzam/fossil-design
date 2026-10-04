'use client';

import {
  FloatingArrow,
  FloatingPortal,
  arrow,
  autoUpdate,
  flip,
  offset,
  safePolygon,
  shift,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useMergeRefs,
  useRole,
  type Placement,
} from '@floating-ui/react';
import {
  cloneElement,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { useIsomorphicLayoutEffect } from '../../hooks/useIsomorphicLayoutEffect.js';
import { usePresence } from '../../hooks/usePresence.js';
import {
  ORIGIN,
  elementRef,
  usePortalRoot,
  type Side,
} from '../Floating/floating.js';
import styles from './Tooltip.module.css';

const GAP = 6;
const ARROW_WIDTH = 12;
const ARROW_HEIGHT = 6;

export interface TooltipProps {
  /** The tooltip's text. Nodes are allowed, so a mark can sit beside it. Nothing interactive: use a Popover. */
  content: ReactNode;
  /** The trigger: one element that can hold a ref, such as a Button. */
  children: ReactElement;
  /** The preferred side. It flips when there isn't room. Defaults to `top`. */
  placement?: Placement;
  /** Draws an arrow to the trigger. */
  arrow?: boolean;
  /** Milliseconds before hover opens it. Focus opens it at once. */
  delay?: number;
  /** The open state, to control it. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Text CSS settles a box's width before it wraps, so a sentence that wraps keeps the full max
 * width beside its shorter lines. Once laid out, the surface narrows to the furthest any line
 * reaches. The surface may be mid-scale, so the client rects are divided back out of it.
 */
function fitToLines(surface: HTMLElement) {
  surface.style.width = '';
  const box = surface.getBoundingClientRect();
  const scale = box.width / surface.offsetWidth || 1;
  const range = document.createRange();
  const walker = document.createTreeWalker(surface, NodeFilter.SHOW_TEXT);
  let reach = 0;
  while (walker.nextNode()) {
    range.selectNodeContents(walker.currentNode);
    for (const line of range.getClientRects())
      reach = Math.max(reach, line.right);
  }
  if (!reach) return;
  const { paddingRight, borderRightWidth } = getComputedStyle(surface);
  const width = Math.ceil(
    (reach - box.left) / scale +
      Number.parseFloat(paddingRight) +
      Number.parseFloat(borderRightWidth),
  );
  // Rounding alone can land a pixel under; only a real saving is applied.
  if (width < surface.offsetWidth - 1)
    surface.style.width = `${String(width)}px`;
}

/**
 * A short label for a control, shown on hover and focus and read as the control's description.
 * It stays open while the pointer travels onto it, and Escape dismisses it (WCAG 1.4.13).
 */
export function Tooltip({
  content,
  children,
  placement = 'top',
  arrow: showArrow = false,
  delay = 150,
  open: controlledOpen,
  onOpenChange,
}: TooltipProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = (next: boolean) => {
    setUncontrolledOpen(next);
    onOpenChange?.(next);
  };
  // Held in state, so the arrow mounting re-runs the positioning that measures it.
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
    // top and left rather than a transform, so the CSS scale has transform to itself.
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
    useHover(context, {
      move: false,
      delay: { open: delay, close: 0 },
      handleClose: safePolygon(),
    }),
    useFocus(context),
    useDismiss(context),
    useRole(context, { role: 'tooltip' }),
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
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  useIsomorphicLayoutEffect(() => {
    if (open && surfaceRef.current) fitToLines(surfaceRef.current);
  }, [open, content]);

  const triggerRef = useMergeRefs([
    setReference,
    elementRef(children),
    findPortalRoot,
  ]);
  const floatingRef = useMergeRefs([setFloating, presenceRef, surfaceRef]);
  const side = resolved.split('-')[0] as Side;

  return (
    <>
      {cloneElement(
        children,
        getReferenceProps({ ...(children.props as object), ref: triggerRef }),
      )}
      <FloatingPortal root={portalRoot}>
        {mounted && (
          <div
            ref={floatingRef}
            className={styles.tooltip}
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
        )}
      </FloatingPortal>
    </>
  );
}

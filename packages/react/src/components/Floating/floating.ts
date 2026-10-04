'use client';

import {
  useCallback,
  useState,
  version,
  type ReactElement,
  type Ref,
} from 'react';

/** Where the surface grows from, so it scales out of its trigger. */
export const ORIGIN = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
} as const;

export type Side = keyof typeof ORIGIN;

/**
 * The ref on a trigger element. React 19 passes it as a prop; React 18 keeps it on the element,
 * where React 19 warns about reading it.
 */
export function elementRef(
  element: ReactElement,
): Ref<HTMLElement> | undefined {
  if (Number.parseInt(version, 10) >= 19) {
    return (element.props as { ref?: Ref<HTMLElement> }).ref;
  }
  return (element as unknown as { ref?: Ref<HTMLElement> }).ref;
}

/**
 * A modal <dialog> paints in the top layer, above anything portalled to <body>, so a trigger
 * inside one needs its surface rendered in there too. The root stays null, which the portal
 * reads as "wait", until the trigger has mounted and the right one is known.
 */
export function usePortalRoot() {
  const [root, setRoot] = useState<HTMLElement | null>(null);
  const findRoot = useCallback((node: HTMLElement | null) => {
    if (node) setRoot(node.closest('dialog') ?? document.body);
  }, []);
  return [root, findRoot] as const;
}

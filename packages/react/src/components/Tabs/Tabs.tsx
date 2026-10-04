'use client';

import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion.js';
import { cx } from '../../responsive.js';
import { Box } from '../Box/Box.js';
import styles from './Tabs.module.css';

export const tabsVariants = {
  align: ['center', 'start'],
} as const;

export type TabsAlign = (typeof tabsVariants.align)[number];

export interface TabItem {
  /** Stable across renders: it keys the selection and builds the element ids. */
  id: string;
  /** What the tab reads as: text, or text with a mark. */
  label: ReactNode;
  /** The panel's content while this tab is selected. */
  content: ReactNode;
}

export interface TabsProps {
  /** Names the tab list for screen readers. */
  label: string;
  tabs: readonly TabItem[];
  /** The selected tab's id, to control the selection. */
  value?: string;
  /** The tab selected at first, when uncontrolled. Defaults to the first. */
  defaultValue?: string;
  /** Called on every change, keyboard ones included. */
  onValueChange?: (id: string) => void;
  /** Where the pill of tabs sits under the panel. Defaults to `center`. */
  align?: TabsAlign;
  /**
   * Renders the selected tab's background yourself, to animate it between tabs with a library
   * such as Motion. Spread `className` onto it.
   */
  renderIndicator?: (props: { className: string }) => ReactNode;
  className?: string;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Tabs as a segmented control: the panel, with the pill of tabs beneath it. Follows the ARIA
 * tabs pattern, with one tab stop for the list, arrow keys, Home and End to move between tabs,
 * and selection that follows focus.
 */
export function Tabs({
  label,
  tabs,
  value,
  defaultValue,
  onValueChange,
  align = 'center',
  renderIndicator,
  className,
}: TabsProps) {
  const baseId = useId();
  const reduceMotion = usePrefersReducedMotion();
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? tabs[0]?.id);
  const selectedId = value ?? uncontrolled;
  // A tab removed from under the selection falls back to the first, rather than blanking the panel.
  const selected = tabs.find((tab) => tab.id === selectedId) ?? tabs[0];

  const tabRefs = useRef(new Map<string, HTMLButtonElement>());
  const listRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const tabId = (id: string) => `${baseId}-tab-${id}`;
  const panelId = (id: string) => `${baseId}-panel-${id}`;

  const select = (id: string) => {
    setUncontrolled(id);
    onValueChange?.(id);
  };

  // A panel with nothing focusable in it needs a tab stop of its own to be reachable; one that
  // has its own controls doesn't, and the pattern says to leave it out.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (panel) panel.tabIndex = panel.querySelector(FOCUSABLE) ? -1 : 0;
  }, [selected?.id]);

  // The browser doesn't scroll a keyboard-focused tab into a scrolling pill. scrollTo on the
  // list moves only the list; scrollIntoView would move the page too.
  const reveal = (tab: HTMLButtonElement | undefined) => {
    const list = listRef.current;
    if (!list || !tab) return;
    const bounds = list.getBoundingClientRect();
    const box = tab.getBoundingClientRect();
    const inset = box.height / 4;
    const overshoot =
      box.left < bounds.left + inset
        ? box.left - bounds.left - inset
        : box.right > bounds.right - inset
          ? box.right - bounds.right + inset
          : 0;
    if (overshoot === 0) return;
    list.scrollTo({
      left: list.scrollLeft + overshoot,
      behavior: reduceMotion === false ? 'smooth' : 'auto',
    });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const from = tabs.findIndex(
      (tab) => tabRefs.current.get(tab.id) === event.target,
    );
    if (from === -1) return;
    const next = {
      ArrowRight: (from + 1) % tabs.length,
      ArrowLeft: (from - 1 + tabs.length) % tabs.length,
      Home: 0,
      End: tabs.length - 1,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    const target = tabs[next];
    if (!target) return;
    const tab = tabRefs.current.get(target.id);
    select(target.id);
    tab?.focus();
    reveal(tab);
  };

  if (!selected) return null;

  return (
    <Box className={cx(styles.tabs, className)}>
      <Box
        ref={panelRef}
        role="tabpanel"
        id={panelId(selected.id)}
        aria-labelledby={tabId(selected.id)}
        className={styles.panel}
      >
        <Box key={selected.id} className={styles.panelContent}>
          {selected.content}
        </Box>
      </Box>

      <Box className={cx(styles.listRow, styles[`align-${align}`])}>
        <Box
          ref={listRef}
          role="tablist"
          aria-label={label}
          className={styles.list}
          onKeyDown={onKeyDown}
        >
          {tabs.map((tab) => {
            const isSelected = tab.id === selected.id;
            return (
              <button
                key={tab.id}
                ref={(node) => {
                  if (node) tabRefs.current.set(tab.id, node);
                  else tabRefs.current.delete(tab.id);
                }}
                type="button"
                role="tab"
                id={tabId(tab.id)}
                aria-selected={isSelected}
                // Only the selected panel is mounted, so only its tab has an element to point at.
                aria-controls={isSelected ? panelId(tab.id) : undefined}
                tabIndex={isSelected ? 0 : -1}
                className={styles.tab}
                onClick={() => {
                  select(tab.id);
                }}
              >
                {isSelected &&
                  (renderIndicator ? (
                    renderIndicator({ className: styles.chip })
                  ) : (
                    <span aria-hidden="true" className={styles.chip} />
                  ))}
                <span className={styles.label}>
                  {tab.label}
                  <span aria-hidden="true" className={styles.ghost}>
                    {tab.label}
                  </span>
                </span>
              </button>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}

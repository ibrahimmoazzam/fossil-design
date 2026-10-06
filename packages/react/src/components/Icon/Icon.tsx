import { cx } from '../../responsive.js';
import type { IconComponent } from './createIcon.js';
import styles from './Icon.module.css';

export const iconVariants = {
  size: ['s', 'm', 'l'],
} as const;

export type IconSize = (typeof iconVariants.size)[number];

export interface IconProps {
  /** The SVG component: one of Fossil's, such as `CloseIcon`, or the app's own. */
  icon: IconComponent;
  /**
   * The accessible name, for an icon that means something on its own. Omit it when visible
   * text or the control around the icon already says what it is: the icon is then hidden from
   * assistive technology.
   */
  label?: string;
  /** Omit it to match the surrounding text. */
  size?: IconSize;
  /** Classes from the app's own stylesheet, added to Fossil's. */
  className?: string;
}

/**
 * An icon, decorative unless it has a `label`. It sizes to the surrounding text and takes its
 * colour, unless `size` picks an icon size.
 *
 * ## When to use
 *
 * - An icon beside text that says the same thing in words: leave out `label`.
 * - An icon that means something on its own, with no text beside it: give it a `label`.
 * - One of Fossil's icons, such as `CloseIcon`, or any SVG component of the app's own.
 *
 * ## When not to use
 *
 * - An icon that does something when pressed: use `Button` with `icon` and `label`.
 * - An icon in a button or a link: pass it to their `icon` prop, which sizes and spaces it.
 *
 * ## States
 *
 * None: it isn't interactive.
 *
 * ## Accessibility
 *
 * ### Built in
 *
 * Without `label` it is `aria-hidden` and not focusable, so screen readers skip it. With `label`
 * it has `role="img"` and that name. It takes the text colour, so it contrasts as the text does.
 *
 * ### Up to you
 *
 * Decide whether the icon is decorative. Give a meaningful one a short `label` that says what it
 * means, not what it looks like.
 */
export function Icon({ icon: Svg, label, size, className }: IconProps) {
  const a11y = label
    ? { role: 'img', 'aria-label': label }
    : { 'aria-hidden': true, focusable: 'false' as const };
  return (
    <Svg
      {...a11y}
      className={cx(styles.icon, size && styles[`size-${size}`], className)}
    />
  );
}

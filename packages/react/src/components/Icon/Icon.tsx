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
  className?: string;
}

/** An icon, decorative unless it has a `label`. */
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

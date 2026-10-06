import { forwardRef, type ComponentPropsWithRef, type ReactNode } from 'react';
import { cx } from '../../responsive.js';
import type { IconComponent } from '../Icon/createIcon.js';
import { Icon } from '../Icon/Icon.js';
import styles from './Button.module.css';

export const buttonVariants = {
  tone: ['primary', 'secondary'],
  size: ['s', 'm'],
} as const;

export type ButtonTone = (typeof buttonVariants.tone)[number];
export type ButtonSize = (typeof buttonVariants.size)[number];

type NativeButtonProps = Omit<
  ComponentPropsWithRef<'button'>,
  'className' | 'children' | 'aria-label'
>;

export type ButtonProps = NativeButtonProps & {
  /** `primary` for the main action in a view, `secondary` for the rest. Defaults to `secondary`. */
  tone?: ButtonTone;
  /** Defaults to `m`, 44px tall. */
  size?: ButtonSize;
  /** Classes from the app's own stylesheet, added to Fossil's. */
  className?: string;
} & (
    | {
        /** The button's text, which names it. */
        children: ReactNode;
        /** A decorative icon before the text. */
        icon?: IconComponent;
        label?: never;
      }
    | {
        children?: never;
        /** The only content: the button is round, and `label` names it. */
        icon: IconComponent;
        /** The accessible name of an icon-only button, such as "Close". */
        label: string;
      }
  );

/**
 * A native `<button>`, `type="button"` unless set otherwise: text, an icon and text, or an
 * icon alone with a `label`.
 *
 * ## When to use
 *
 * - An action on this page: saving, opening a modal, showing more.
 * - `tone="primary"` for the main action in a view, and `secondary` for the rest.
 * - A form's submit button, with `type="submit"`.
 *
 * ## When not to use
 *
 * - Going to another page or URL: use `Link`.
 * - An action inside running text that should read like a link: use `Link` with `asChild` around
 *   a `<button>`.
 *
 * ## States
 *
 * Hover, `:focus-visible` with a focus ring, and disabled. Size `m` is at least 44px tall, and
 * size `s` 32px, with text or an icon alone.
 *
 * ## Accessibility
 *
 * ### Built in
 *
 * Native button behaviour: Enter and Space press it, and `disabled` takes it out of the tab order.
 * A focus ring on keyboard focus. An icon beside text is decorative and hidden from screen readers;
 * an icon-only button is named by `label`. Size `m` meets the 44px target of WCAG 2.5.5, and `s`
 * the 24px minimum of 2.5.8. Transitions stop under `prefers-reduced-motion`.
 *
 * ### Up to you
 *
 * Give an icon-only button a `label` naming the action, such as "Close". Write text that says what
 * happens: "Save changes", not "OK". Prefer size `m` on touch screens.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      tone = 'secondary',
      size = 'm',
      icon,
      label,
      className,
      children,
      type = 'button',
      ...rest
    },
    ref,
  ) {
    const iconOnly = children === undefined;
    return (
      <button
        ref={ref}
        type={type}
        aria-label={label}
        {...rest}
        className={cx(
          styles.button,
          styles[`tone-${tone}`],
          styles[`size-${size}`],
          iconOnly && styles.iconOnly,
          className,
        )}
      >
        {icon && <Icon icon={icon} size={size} />}
        {children}
      </button>
    );
  },
);

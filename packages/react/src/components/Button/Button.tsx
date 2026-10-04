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
  className?: string;
} & (
    | {
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
 * A native `<button>`, `type="button"` unless set otherwise. Text, an icon and text, or an icon
 * alone with a `label`. For navigation use `Link`.
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

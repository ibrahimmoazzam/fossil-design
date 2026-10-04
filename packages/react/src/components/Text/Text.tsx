import {
  createElement,
  forwardRef,
  type ComponentPropsWithRef,
  type ForwardedRef,
  type ReactElement,
} from 'react';
import { cx } from '../../responsive.js';
import styles from './Text.module.css';

export const textElements = [
  'p',
  'span',
  'div',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'strong',
  'em',
  'small',
  'label',
  'legend',
  'figcaption',
  'blockquote',
  'li',
  'dt',
  'dd',
] as const;

/** The text styles, one per text token, and the text colours. */
export const textVariants = {
  variant: [
    'body',
    'prose',
    'small',
    'caption',
    'fine',
    'label',
    'control',
    'heading-xs',
    'heading-s',
    'heading-m',
    'heading-l',
    'heading-xl',
  ],
  tone: ['default', 'muted', 'accent', 'highlight'],
} as const;

export type TextElement = (typeof textElements)[number];
export type TextVariant = (typeof textVariants.variant)[number];
export type HeadingVariant = Extract<TextVariant, `heading-${string}`>;
export type TextTone = (typeof textVariants.tone)[number];

interface TextOwnProps {
  /** The text colour. Omit it to inherit, which keeps a surface's paired text colour. */
  tone?: TextTone;
  className?: string;
}

export type TextProps<E extends TextElement = 'p'> = TextOwnProps &
  Omit<ComponentPropsWithRef<E>, keyof TextOwnProps | 'as' | 'variant'> &
  (
    | {
        /** A heading style says nothing about the outline, so it needs an element. */
        variant: HeadingVariant;
        as: E;
      }
    | {
        /** The text style. Defaults to `body`. */
        variant?: Exclude<TextVariant, HeadingVariant>;
        /** The element to render. Defaults to `p`. */
        as?: E;
      }
  );

function TextRender(
  {
    as = 'p',
    variant = 'body',
    tone,
    className,
    ...rest
  }: TextProps<TextElement>,
  ref: ForwardedRef<HTMLElement>,
) {
  return createElement(as, {
    ...rest,
    ref,
    className: cx(
      styles.text,
      styles[variant],
      tone && styles[`tone-${tone}`],
      className,
    ),
  });
}

const TextWithRef = forwardRef(TextRender);
TextWithRef.displayName = 'Text';

/**
 * Text in one of the token text styles. The style sets size, weight and spacing; the element
 * sets meaning, so a heading style needs `as` to say which heading level it is.
 */
export const Text = TextWithRef as <E extends TextElement = 'p'>(
  props: TextProps<E>,
) => ReactElement | null;
